const Account = require('../models/Account');
const { fetchReportList, normalizeTimestampToVNTime } = require('../utils/apiClient');
const { saveToCache, getFromCache, cacheExists, clearAllUserCache } = require('../utils/cacheManager');
const moment = require('moment');
const ExcelJS = require('exceljs');
const reportQueue = require('../queues/reportQueue');
const { fetchAllPages } = require('../utils/accountProcessor');
const { createApiClient } = require('../utils/apiClient');

// Không cần MAX_CONCURRENT_FETCHES nữa vì sẽ xử lý tuần tự
// const MAX_CONCURRENT_FETCHES = 5;

/**
 * @desc    Lấy trạng thái fetch dữ liệu
 * @route   GET /api/reports/fetch-status
 * @access  Public
 */
exports.getFetchStatus = async (req, res) => {
  try {
    const { startDate, endDate, groupId, channelId } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp ngày bắt đầu và kết thúc' });
    }

    let accounts = [];
    if (groupId) {
      accounts = await Account.find({ group: groupId });
    } else {
      accounts = await Account.find();
    }

    let completed = 0;
    for (const account of accounts) {
      const isCacheExists = await cacheExists(account.user.id, startDate, endDate);
      if (isCacheExists) completed++;
    }

    res.status(200).json({
      success: true,
      data: {
        totalAccounts: accounts.length,
        completedAccounts: completed,
        isCompleted: completed === accounts.length
      }
    });
  } catch (error) {
    console.error('Get fetch status error:', error);
    res.status(500).json({ success: false, error: 'Lỗi server: ' + error.message });
  }
};

/**
 * @desc    Fetch dữ liệu từ API report/list cho một hoặc nhiều tài khoản
 * @route   POST /api/reports/fetch
 * @access  Public
 */
exports.fetchReports = async (req, res) => {
  try {
    console.log('===== BẮT ĐẦU FETCH REPORTS =====');
    console.log('Request body:', JSON.stringify(req.body));
    
    const { startDate, endDate, accountIds, groupId, channelId } = req.body;
    
    // Kiểm tra dữ liệu đầu vào
    if (!startDate || !endDate) {
      console.log('ERROR: Thiếu startDate hoặc endDate');
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp ngày bắt đầu và kết thúc'
      });
    }

    // Lấy danh sách tài khoản cần fetch
    let accounts = [];
    let queryCondition = '';
    
    if (accountIds && accountIds.length > 0) {
      queryCondition = `accountIds: [${accountIds.join(', ')}]`;
      accounts = await Account.find({ _id: { $in: accountIds } });
    } else if (groupId) {
      queryCondition = `groupId: ${groupId}`;
      accounts = await Account.find({ group: groupId });
    } else {
      queryCondition = 'tất cả tài khoản';
      accounts = await Account.find();
    }

    console.log(`Tìm thấy ${accounts.length} tài khoản theo điều kiện: ${queryCondition}`);
    
    if (accounts.length === 0) {
      console.log('ERROR: Không tìm thấy tài khoản nào');
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản nào'
      });
    }

    // In ra danh sách tài khoản sẽ fetch
    console.log('===== DANH SÁCH TÀI KHOẢN FETCH =====');
    accounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.user.name} (ID: ${account._id})`);
    });

    // Khai báo các biến để lưu kết quả
    let results = [];
    let errors = [];

    // Thêm tất cả tài khoản vào hàng đợi
    const jobs = accounts.map(async (account) => {
      // Truyền ID tài khoản thay vì toàn bộ đối tượng
      const job = await reportQueue.add({
        accountId: account._id,
        startDate,
        endDate,
        channelId
      });
      
      console.log(`Đã thêm tài khoản ${account.user.name} (ID: ${account._id}) vào hàng đợi với jobId: ${job.id}`);
      
      return {
        jobId: job.id,
        accountId: account._id,
        userName: account.user.name
      };
    });

    // Chờ tất cả công việc được thêm vào hàng đợi
    const jobResults = await Promise.all(jobs);
    
    // Trả về phản hồi ngay lập tức cho client với ID công việc
    console.log(`Đã thêm ${jobResults.length} tài khoản vào hàng đợi xử lý`);
    
    return res.status(200).json({
      success: true,
      data: {
        message: 'Đã thêm tất cả tài khoản vào hàng đợi xử lý',
        totalAccounts: accounts.length,
        jobIds: jobResults.map(job => job.jobId)
      }
    });
  } catch (error) {
    console.error('===== LỖI SERVER =====');
    console.error('Fetch reports error:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message,
      source: 'reportController',
      controller: 'fetchReports'
    });
  }
};

/**
 * @desc    Lấy kết quả fetch từ hàng đợi
 * @route   GET /api/reports/fetch-results
 * @access  Public
 */
exports.getFetchResults = async (req, res) => {
  try {
    const { jobIds } = req.query;
    
    if (!jobIds) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp danh sách jobIds'
      });
    }
    
    const jobIdArray = jobIds.split(',');
    const results = [];
    const errors = [];
    let completed = 0;
    let active = 0;
    let waiting = 0;
    let failed = 0;
    
    // Kiểm tra trạng thái từng công việc
    for (const jobId of jobIdArray) {
      try {
        const job = await reportQueue.getJob(jobId);
        
        if (!job) {
          errors.push({
            jobId,
            error: 'Không tìm thấy công việc'
          });
          continue;
        }
        
        const state = await job.getState();
        const account = await Account.findById(job.data.accountId);
        const userName = account ? account.user.name : 'unknown';
        
        // Tính toán tiến độ
        switch (state) {
          case 'completed':
            completed++;
            try {
              const result = job.returnvalue;
              results.push({
                ...result,
                jobId: job.id,
                status: 'completed',
                progress: 100
              });
            } catch (error) {
              errors.push({
                jobId,
                accountId: job.data.accountId,
                userName,
                status: 'completed_error',
                error: 'Lỗi khi truy xuất kết quả'
              });
            }
            break;
          case 'failed':
            failed++;
            const failedReason = job.failedReason;
            errors.push({
              jobId,
              accountId: job.data.accountId,
              userName,
              status: 'failed',
              error: failedReason || 'Công việc thất bại'
            });
            break;
          case 'active':
            active++;
            const progress = await job.progress();
            results.push({
              jobId: job.id,
              accountId: job.data.accountId,
              userName,
              status: 'active',
              progress: progress || 0
            });
            break;
          default:
            waiting++;
            results.push({
              jobId: job.id,
              accountId: job.data.accountId,
              userName,
              status: state,
              progress: 0
            });
            break;
        }
      } catch (error) {
        console.error(`Lỗi khi kiểm tra job ${jobId}:`, error);
        errors.push({
          jobId,
          error: `Lỗi khi kiểm tra: ${error.message}`
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        totalJobs: jobIdArray.length,
        completedJobs: completed,
        activeJobs: active,
        waitingJobs: waiting,
        failedJobs: failed,
        isCompleted: completed + failed === jobIdArray.length,
        results,
        errors
      }
    });
  } catch (error) {
    console.error('Get fetch results error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Lấy dữ liệu báo cáo từ cache
 * @route   GET /api/reports
 * @access  Public
 */
exports.getReports = async (req, res) => {
  try {
    const { startDate, endDate, groupId, channelId, sort, threshold } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp ngày bắt đầu và kết thúc'
      });
    }

    // Tìm tất cả tài khoản (theo nhóm nếu có)
    let query = {};
    if (groupId) {
      query.group = groupId;
    }

    const accounts = await Account.find(query)
      .populate('group', 'name')
      .sort({ 'user.name': 1 });

    if (accounts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản nào'
      });
    }

    // Lấy dữ liệu từ cache cho tất cả tài khoản
    const reportsData = [];
    
    for (const account of accounts) {
      const cacheData = await getFromCache(account.user.id, startDate, endDate);
      
      if (cacheData) {
        // Tính tổng doanh thu, hoa hồng và số đơn
        let totalCommission = 0;
        let totalAmount = 0;
        let totalOrders = 0;
        let mcnName = '';
        let mcnRate = '';
        
        // Lọc theo kênh nếu có
        let filteredData = cacheData.data;
        if (channelId && parseInt(channelId) !== 0) {
          filteredData = filteredData.filter(item => 
            item.aff_channel_id === parseInt(channelId)
          );
        }
        
        // Tính tổng và lấy thông tin MCN từ dữ liệu đầu tiên nếu có
        if (filteredData.length > 0) {
          // Lấy thông tin MCN từ item đầu tiên
          mcnName = filteredData[0].linked_mcn_name || '';
          mcnRate = filteredData[0].linked_mcn_commission_rate || '';
        }
        
        // Tính tổng
        filteredData.forEach(item => {
          totalCommission += item.affiliate_net_commission || 0;
          totalAmount += item.actual_amount || 0;
          totalOrders += 1; // Mỗi item là một đơn hàng
        });
        
        // Lọc theo ngưỡng nếu có
        if (threshold) {
          const thresholdValue = parseFloat(threshold);
          if (totalCommission < thresholdValue) {
            continue; // Bỏ qua tài khoản này nếu hoa hồng nhỏ hơn ngưỡng
          }
        }
        
        reportsData.push({
          accountId: account._id,
          userId: account.user.id,
          userName: account.user.name,
          group: account.group,
          cookieExpired: account.cookie_expired,
          commission: totalCommission,
          revenue: totalAmount,
          orders: totalOrders,
          channel: channelId || '0',
          linked_mcn_name: mcnName,
          linked_mcn_commission_rate: mcnRate
        });
      }
    }
    
    // Sắp xếp dữ liệu nếu có yêu cầu
    if (sort) {
      const [field, order] = sort.split(':');
      const sortOrder = order === 'desc' ? -1 : 1;
      
      reportsData.sort((a, b) => {
        if (field === 'commission') {
          return sortOrder * (a.commission - b.commission);
        } else if (field === 'revenue') {
          return sortOrder * (a.revenue - b.revenue);
        } else if (field === 'orders') {
          return sortOrder * (a.orders - b.orders);
        } else {
          return 0;
        }
      });
    }

    res.status(200).json({
      success: true,
      count: reportsData.length,
      data: reportsData,
      params: {
        startDate,
        endDate,
        groupId: groupId || null,
        channelId: channelId || '0'
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Xuất báo cáo ra file Excel
 * @route   GET /api/reports/export
 * @access  Public
 */
exports.exportReports = async (req, res) => {
  try {
    const { startDate, endDate, groupId, channelId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp ngày bắt đầu và kết thúc'
      });
    }

    // Lấy dữ liệu báo cáo
    let query = {};
    if (groupId) {
      query.group = groupId;
    }

    const accounts = await Account.find(query)
      .populate('group', 'name')
      .sort({ 'user.name': 1 });

    if (accounts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản nào'
      });
    }

    // Lấy dữ liệu từ cache và tính tổng
    const reportsData = [];
    
    for (const account of accounts) {
      const cacheData = await getFromCache(account.user.id, startDate, endDate);
      
      if (cacheData) {
        let totalCommission = 0;
        let totalAmount = 0;
        let totalOrders = 0;
        let mcnName = '';
        let mcnRate = '';
        
        // Lọc theo kênh nếu có
        let filteredData = cacheData.data;
        if (channelId && parseInt(channelId) !== 0) {
          filteredData = filteredData.filter(item => 
            item.aff_channel_id === parseInt(channelId)
          );
        }
        
        // Lấy thông tin MCN từ item đầu tiên nếu có
        if (filteredData.length > 0) {
          mcnName = filteredData[0].linked_mcn_name || '';
          mcnRate = filteredData[0].linked_mcn_commission_rate || '';
        }
        
        // Tính tổng
        filteredData.forEach(item => {
          totalCommission += item.affiliate_net_commission || 0;
          totalAmount += item.actual_amount || 0;
          totalOrders += 1;
        });
        
        reportsData.push({
          userName: account.user.name,
          groupName: account.group ? account.group.name : 'Chưa phân nhóm',
          mcnName: mcnName,
          mcnRate: mcnRate,
          commission: totalCommission,
          revenue: totalAmount,
          orders: totalOrders
        });
      }
    }

    // Tạo file Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo Hoa hồng');
    
    // Thêm header
    worksheet.columns = [
      { header: 'Tên Nick', key: 'userName', width: 20 },
      { header: 'Nhóm', key: 'groupName', width: 15 },
      { header: 'MCN', key: 'mcnName', width: 15 },
      { header: 'Tỷ lệ MCN', key: 'mcnRate', width: 15 },
      { header: 'Hoa Hồng', key: 'commission', width: 15 },
      { header: 'Doanh Thu', key: 'revenue', width: 15 },
      { header: 'Số Đơn', key: 'orders', width: 10 }
    ];
    
    // Định dạng header
    worksheet.getRow(1).font = { bold: true };
    
    // Thêm dữ liệu
    reportsData.forEach(report => {
      // Format tỷ lệ MCN nếu có
      let formattedMcnRate = report.mcnRate;
      if (report.mcnRate) {
        const percentage = parseFloat(report.mcnRate) / 100;
        formattedMcnRate = `${percentage.toFixed(2)}%`;
      }
      
      worksheet.addRow({
        userName: report.userName,
        groupName: report.groupName,
        mcnName: report.mcnName || '-',
        mcnRate: formattedMcnRate || '-',
        commission: report.commission,
        revenue: report.revenue,
        orders: report.orders
      });
    });
    
    // Định dạng số tiền
    worksheet.getColumn('commission').numFmt = '#,##0';
    worksheet.getColumn('revenue').numFmt = '#,##0';
    
    // Tạo tên file
    const fileName = `bao_cao_${startDate}_${endDate}.xlsx`;
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    
    // Ghi file vào response
    await workbook.xlsx.write(res);
    
    // Kết thúc response
    res.end();
  } catch (error) {
    console.error('Export reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Lấy thông tin các kênh (livestream, video, mạng xã hội)
 * @route   GET /api/reports/channels
 * @access  Public
 */
exports.getChannels = async (req, res) => {
  try {
    // Danh sách các kênh có sẵn
    const channels = [
      { id: 0, name: 'Tất cả kênh' },
      { id: 1, name: 'Mạng xã hội' },
      { id: 2, name: 'Video' },
      { id: 3, name: 'Livestream' }
    ];

    res.status(200).json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Lấy dữ liệu chuyển đổi từ API report/list
 * @route   POST /api/reports/conversion
 * @access  Public
 */
exports.fetchConversionData = async (req, res) => {
  try {
    console.log('Đang xử lý yêu cầu fetchConversionData');
    const { accountId, startDate, endDate } = req.body;
    
    // Kiểm tra dữ liệu đầu vào
    if (!accountId || !startDate || !endDate) {
      console.log('Thiếu thông tin cần thiết:', { accountId, startDate, endDate });
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp ID tài khoản, ngày bắt đầu và kết thúc'
      });
    }

    console.log('Tìm tài khoản với ID:', accountId);
    const account = await Account.findById(accountId);
    if (!account) {
      console.log('Không tìm thấy tài khoản với ID:', accountId);
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản'
      });
    }

    // Chuyển đổi định dạng ngày từ YYYY-MM-DD thành unix timestamp (seconds) với hàm normalizeTimestampToVNTime
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    console.log('Thời gian gốc (milliseconds):', { startTime, endTime });
    
    const startTimestamp = normalizeTimestampToVNTime(startTime);
    const endTimestamp = normalizeTimestampToVNTime(endTime);
    
    console.log('Thời gian đã chuyển đổi (seconds, múi giờ VN):', { startTimestamp, endTimestamp });
    
    // Fetch dữ liệu từ API
    console.log('Giải mã cookies và gọi API');
    const cookies = account.getDecryptedCookies();
    console.log('Đã giải mã cookies, gọi fetchAllPages với tham số API v3:');
    console.log({ 
      purchase_time_s: startTimestamp,
      purchase_time_e: endTimestamp 
    });
    
    // Chuẩn bị tham số cho hàm fetchAllPages (thay vì gọi trực tiếp fetchReportList)
    const params = {
      start_time: startTime, // Chuyển sang milliseconds để tương thích
      end_time: endTime,     // Chuyển sang milliseconds để tương thích
      page_size: 500,
      page_number: 1
    };
    
    // Sử dụng fetchAllPages để lấy tất cả dữ liệu từ nhiều trang
    const allData = await fetchAllPages(cookies, params);
   
    console.log('Kết quả từ API: Nhận được', allData.length, 'items');
    
    // Cập nhật trạng thái cookie nếu fetch thành công
    if (account.cookie_expired) {
      console.log('Cập nhật trạng thái cookie_expired thành false');
      account.cookie_expired = false;
      await account.save();
    }
    
    console.log('Trả về dữ liệu thành công');
    res.status(200).json({
      success: true,
      data: {
        items: allData,
        total: allData.length
      },
      message: 'Lấy dữ liệu chuyển đổi thành công'
    });
  } catch (error) {
    console.error('fetchConversionData error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Lấy dữ liệu đối soát từ API billing_list
 * @route   POST /api/reports/settlement
 * @access  Public
 */
exports.fetchSettlementData = async (req, res) => {
  try {
    const { accountId, startDate, endDate } = req.body;
    
    if (!accountId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp ID tài khoản, ngày bắt đầu và kết thúc'
      });
    }

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản'
      });
    }

    // Sử dụng hàm normalizeTimestampToVNTime thay vì chuyển đổi trực tiếp
    const startTimestamp = normalizeTimestampToVNTime(new Date(startDate).getTime());
    const endTimestamp = normalizeTimestampToVNTime(new Date(endDate).getTime());
    
    const cookies = account.getDecryptedCookies();
    
    const apiURL = 'https://affiliate.shopee.vn/api/v1/payment/billing_list';
    const queryParams = {
      order_completed_start_time: startTimestamp,
      order_completed_end_time: endTimestamp
    };
    
    const client = createApiClient(cookies);
    
    const response = await client.get(apiURL, {
      params: queryParams,
      timeout: 30000
    });

    if (account.cookie_expired) {
      account.cookie_expired = false;
      await account.save();
    }
    
    res.status(200).json({
      success: true,
      data: response.data,
      message: 'Lấy dữ liệu đối soát thành công'
    });
  } catch (error) {
    if (error.response && error.response.status === 401) {
      try {
        const account = await Account.findById(req.body.accountId);
        if (account) {
          account.cookie_expired = true;
          await account.save();
        }
      } catch (err) {}
      
      return res.status(401).json({
        success: false,
        error: 'Cookie đã hết hạn. Vui lòng đăng nhập lại.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Lấy dữ liệu đối soát có kiểm tra hợp lệ cho nhiều kỳ
 * @route   POST /api/reports/settlement-periods
 * @access  Public
 */
exports.fetchValidSettlementPeriods = async (req, res) => {
  try {
    const { accountId, periods } = req.body;
    
    if (!accountId || !periods || !Array.isArray(periods) || periods.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp ID tài khoản và danh sách các kỳ đối soát'
      });
    }

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản'
      });
    }

    // Kiểm tra các kỳ trong tương lai và bỏ qua
    const today = new Date();
    const todayTimestamp = normalizeTimestampToVNTime(today.getTime());
    const validPeriods = [];
    
    // Giải mã cookies một lần để dùng cho tất cả các request
    const cookies = account.getDecryptedCookies();
    const client = createApiClient(cookies);
    const apiURL = 'https://affiliate.shopee.vn/api/v1/payment/billing_list';
    
    // Xử lý tuần tự để tránh quá tải API
    for (const period of periods) {
      try {
        const { key, name, startTimestamp, endTimestamp } = period;
        
        // Bỏ qua kỳ trong tương lai
        if (endTimestamp > todayTimestamp) {
          console.log(`Bỏ qua kỳ ${name} (kỳ trong tương lai)`);
          continue;
        }
        
        console.log(`Đang lấy dữ liệu cho kỳ ${name}: startTimestamp=${startTimestamp}, endTimestamp=${endTimestamp}`);
        
        const queryParams = {
          order_completed_start_time: startTimestamp,
          order_completed_end_time: endTimestamp
        };
        
        const response = await client.get(apiURL, {
          params: queryParams,
          timeout: 30000
        });
        
        const data = response.data?.data || { list: [], income_breakdown: {} };
        
        // Kiểm tra tính hợp lệ của dữ liệu
        const isValid = data?.list?.length > 0;
        
        if (isValid) {
          console.log(`Kỳ ${name} có dữ liệu hợp lệ`);
          validPeriods.push({
            key,
            name,
            startTimestamp,
            endTimestamp,
            data
          });
        } else {
          console.log(`Kỳ ${name} không có dữ liệu`);
        }
      } catch (error) {
        console.error(`Lỗi khi lấy dữ liệu cho kỳ ${period.name}:`, error.message);
        // Tiếp tục với kỳ tiếp theo nếu có lỗi
        continue;
      }
    }
    
    // Cập nhật trạng thái cookie nếu fetch thành công
    if (account.cookie_expired) {
      account.cookie_expired = false;
      await account.save();
    }
    
    res.status(200).json({
      success: true,
      data: validPeriods,
      message: `Lấy dữ liệu thành công cho ${validPeriods.length}/${periods.length} kỳ đối soát`
    });
  } catch (error) {
    if (error.response && error.response.status === 401) {
      try {
        const account = await Account.findById(req.body.accountId);
        if (account) {
          account.cookie_expired = true;
          await account.save();
        }
      } catch (err) {}
      
      return res.status(401).json({
        success: false,
        error: 'Cookie đã hết hạn. Vui lòng đăng nhập lại.'
      });
    }
    
    console.error('fetchValidSettlementPeriods error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
}; 