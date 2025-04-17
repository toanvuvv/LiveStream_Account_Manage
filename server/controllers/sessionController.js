const Account = require('../models/Account');
const { fetchSessionList, fetchSessionDetail } = require('../utils/apiClient');

/**
 * @desc    Lấy danh sách phiên livestream của một tài khoản
 * @route   GET /api/sessions/:accountId
 * @access  Public
 */
exports.getAccountSessions = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Lấy thông tin tài khoản
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản'
      });
    }

    // Giải mã cookies
    const decryptedCookies = account.getDecryptedCookies();

    // Tham số cho API sessionList
    const params = {
      page: parseInt(page),
      pageSize: parseInt(limit)
    };

    try {
      // Gọi API để lấy danh sách phiên
      const result = await fetchSessionList(decryptedCookies, params);
      
      if (result.code !== 0) {
        // Nếu API trả về lỗi, đánh dấu cookie đã hết hạn
        if (!account.cookie_expired) {
          account.cookie_expired = true;
          await account.save();
        }
        
        return res.status(400).json({
          success: false,
          error: 'API trả về lỗi: ' + (result.message || result.msg || 'Không xác định'),
          code: result.code
        });
      }

      // Nếu fetch thành công, đảm bảo cookie_expired = false
      if (account.cookie_expired) {
        account.cookie_expired = false;
        await account.save();
      }

      // Trả về dữ liệu
      res.status(200).json({
        success: true,
        data: {
          total: result.data.total || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          sessions: result.data.list || []
        }
      });
    } catch (error) {
      // Nếu có lỗi khi gọi API, đánh dấu cookie đã hết hạn
      if (!account.cookie_expired) {
        account.cookie_expired = true;
        await account.save();
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Get account sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Lấy thông tin chi tiết của một phiên livestream
 * @route   GET /api/sessions/:accountId/:sessionId
 * @access  Public
 */
exports.getSessionDetail = async (req, res) => {
  try {
    const { accountId, sessionId } = req.params;
    
    // Lấy thông tin tài khoản
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản'
      });
    }

    // Giải mã cookies
    const decryptedCookies = account.getDecryptedCookies();

    // Tham số cho API dashboard-overview
    const params = {
      session_id: sessionId
    };

    try {
      // Gọi API để lấy chi tiết phiên
      const result = await fetchSessionDetail(decryptedCookies, params);
      
      if (result.code !== 0) {
        // Nếu API trả về lỗi, đánh dấu cookie đã hết hạn
        if (!account.cookie_expired) {
          account.cookie_expired = true;
          await account.save();
        }
        
        return res.status(400).json({
          success: false,
          error: 'API trả về lỗi: ' + (result.message || result.msg || 'Không xác định'),
          code: result.code
        });
      }

      // Nếu fetch thành công, đảm bảo cookie_expired = false
      if (account.cookie_expired) {
        account.cookie_expired = false;
        await account.save();
      }

      // Chuyển đổi dữ liệu từ API mới để phù hợp với cấu trúc cũ mà frontend đang sử dụng
      const apiData = result.data;
      
      // Chuyển đổi số giây sang định dạng hh:mm:ss
      const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      };
      
      const avgViewTimeInSeconds = Math.floor(apiData.avgViewTime / 1000);
      const formattedAvgViewTime = formatTime(avgViewTimeInSeconds);
      
      const transformedData = {
        basic_info: {
          title: `Phiên livestream #${sessionId}`, // Vì API mới không trả về tiêu đề
          status: apiData.status, // Giữ nguyên trạng thái
          start_time: Math.floor(Date.now() / 1000 - avgViewTimeInSeconds), // Mặc định là thời gian hiện tại trừ đi thời gian xem trung bình
          end_time: apiData.status === 1 ? Math.floor(Date.now() / 1000) : null // Nếu status = 1 (đã kết thúc)
        },
        // Thống kê chung
        view_count: apiData.views || 0,
        views: apiData.views || 0,
        like_count: apiData.engagementData?.likes || 0,
        comment_count: apiData.engagementData?.comments || 0,
        new_follower_count: apiData.engagementData?.newFollowers || 0,
        
        // Thống kê đơn hàng
        order_count: apiData.placedOrder || 0,
        confirmed_order_count: apiData.confirmedOrder || 0,
        gmv: apiData.placedGmv || 0,
        confirmed_gmv: apiData.confirmedGmv || 0,
        placedItemsSold: apiData.placedItemsSold || 0,
        confirmedItemsSold: apiData.confirmedItemsSold || 0,
        
        // Thêm các thông tin khác
        viewers: apiData.viewers || 0,
        users_count: apiData.viewers || 0,
        pcu: apiData.pcu || 0,
        atc: apiData.atc || 0,
        ctr: apiData.ctr || 0,
        co: apiData.co || 0,
        confirmedCo: apiData.confirmedCo || 0,
        avgViewTime: apiData.avgViewTime || 0,
        formattedAvgViewTime: formattedAvgViewTime,
        
        // Thông tin phút
        liveViewers: apiData.ccu || 0,
        commentsLastMinute: apiData.commentsWhithinLastOneMinute || 0,
        atcLastMinute: apiData.atcWhithinLastOneMinute || 0,
        
        // Thông tin người mua
        buyers: apiData.buyers || 0,
        confirmedBuyers: apiData.confirmedBuyers || 0,
        engagedViewers: apiData.engagedViewers || 0,
        
        // Dữ liệu gốc để frontend có thể linh hoạt sử dụng
        raw_data: apiData
      };

      // Trả về dữ liệu đã chuyển đổi
      res.status(200).json({
        success: true,
        data: transformedData
      });
    } catch (error) {
      // Nếu có lỗi khi gọi API, đánh dấu cookie đã hết hạn
      if (!account.cookie_expired) {
        account.cookie_expired = true;
        await account.save();
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Get session detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
}; 