const { fetchReportList } = require('./apiClient');
const { saveToCache, clearAllUserCache } = require('./cacheManager');
const moment = require('moment');

/**
 * Hàm helper để fetch tất cả các trang từ API report/list
 * @param {string} cookies - Chuỗi cookies của tài khoản
 * @param {Object} params - Các tham số cho API
 * @returns {Promise<Array>} - Mảng dữ liệu từ tất cả các trang
 */
// async function fetchAllPages(cookies, params) {
//   let allData = [];
//   let currentPage = 1;
//   let hasMoreData = true;
//   let totalItems = 0;
//   let totalCount = 0;
//   const maxRetries = 3;
//   const timeout = 30000; // 30 giây timeout mỗi request
  
//   console.log(`Bắt đầu fetch dữ liệu từ ${new Date(params.start_time).toISOString()} đến ${new Date(params.end_time).toISOString()}`);
//   console.log(`Sử dụng page_size = ${params.page_size || 500}, timeout = ${timeout}ms, maxRetries = ${maxRetries}`);

//   // Fetch tất cả các trang cho khoảng thời gian đã cho
//   while (hasMoreData) {
//     console.log(`Đang fetch trang ${currentPage}...`);
    
//     const apiParams = {
//       ...params,
//       page_number: currentPage
//     };

//     let retries = 0;
//     let success = false;
//     let result;

//     // Thử lại tối đa maxRetries lần
//     while (retries < maxRetries && !success) {
//       try {
//         console.log(`Gọi fetchReportList với page_number=${apiParams.page_number}, retry ${retries + 1}/${maxRetries}`);
        
//         // Tạo promise với timeout
//         const fetchPromise = fetchReportList(cookies, apiParams);
//         const timeoutPromise = new Promise((_, reject) => 
//           setTimeout(() => reject(new Error(`Request timeout sau ${timeout}ms`)), timeout)
//         );
        
//         // Race giữa fetch và timeout
//         result = await Promise.race([fetchPromise, timeoutPromise]);
        
//         if (result.code !== 0) {
//           console.error(`API trả về lỗi: ${result.message || 'Không xác định'} (code: ${result.code})`);
//           throw new Error('API trả về lỗi: ' + (result.message || 'Không xác định'));
//         }
        
//         // Fetch thành công
//         success = true;
//       } catch (error) {
//         retries++;
//         console.error(`Lỗi khi fetch trang ${currentPage}, retry ${retries}/${maxRetries}: ${error.message}`);
        
//         // Nếu đã retry đủ số lần, throw error
//         if (retries >= maxRetries) {
//           throw new Error(`Đã thử lại ${maxRetries} lần nhưng vẫn thất bại: ${error.message}`);
//         }
        
//         // Tăng thời gian delay theo số lần retry
//         const delayTime = 2000 * retries;
//         console.log(`Chờ ${delayTime}ms trước khi thử lại...`);
//         await new Promise(resolve => setTimeout(resolve, delayTime));
//       }
//     }

//     // Nếu code chạy đến đây, fetch đã thành công
//     // Lấy thông tin tổng số items nếu đây là trang đầu tiên
//     if (currentPage === 1) {
//       totalCount = result.data.total_count || 0;
//       console.log(`Tổng số items theo API: ${totalCount}`);
//     }

//     // Thêm dữ liệu từ trang hiện tại vào mảng kết quả
//     const pageItems = result.data && result.data.items ? result.data.items : [];
//     console.log(`Nhận được ${pageItems.length} items từ trang ${currentPage}`);
    
//     if (pageItems.length > 0) {
//       const previousLength = allData.length;
//       allData = [...allData, ...pageItems];
//       console.log(`Đã thêm ${pageItems.length} items vào allData. Độ dài allData: ${previousLength} -> ${allData.length}`);
//       totalItems += pageItems.length;
//       console.log(`Tổng số items đã fetch: ${totalItems}/${totalCount}`);
//     }

//     // Kiểm tra xem có cần fetch tiếp không
//     if (pageItems.length === 0) {
//       // Không còn items nào nữa
//       console.log(`Không còn items nào ở trang ${currentPage}, dừng fetch.`);
//       hasMoreData = false;
//     } else if (totalItems >= totalCount) {
//       // Đã fetch đủ số lượng theo totalCount
//       console.log(`Đã fetch đủ ${totalItems}/${totalCount} items, dừng fetch.`);
//       hasMoreData = false;
//     } else {
//       // Còn items, tiếp tục fetch trang tiếp theo
//       console.log(`Đã fetch ${totalItems}/${totalCount} items, tiếp tục fetch trang tiếp theo.`);
//       currentPage++;
//     }
    
//     // Thêm một delay để tránh gọi API quá nhanh
//     // Delay động dựa trên kích thước dữ liệu trang hiện tại
//     const dynamicDelay = Math.min(1000 + pageItems.length * 10, 2000);
//     console.log(`Chờ ${dynamicDelay}ms trước khi fetch trang tiếp theo...`);
//     await new Promise(resolve => setTimeout(resolve, dynamicDelay));
//   }

//   console.log(`Đã hoàn tất fetch tất cả ${currentPage} trang với tổng cộng ${totalItems}/${totalCount} items.`);
//   console.log(`allData có tổng cộng ${allData.length} items.`);
  
//   if (allData.length > 0) {
//     console.log(`Item đầu tiên:`, JSON.stringify(allData[0]).substring(0, 100) + '...');
//     if (allData.length > 1) {
//       console.log(`Item cuối cùng:`, JSON.stringify(allData[allData.length - 1]).substring(0, 100) + '...');
//     }
//   }
  
//   return allData;
// }

/**
 * Xử lý quá trình fetch dữ liệu cho một tài khoản
 * @param {Object} account - Tài khoản cần xử lý
 * @param {string} startDate - Ngày bắt đầu (YYYY-MM-DD)
 * @param {string} endDate - Ngày kết thúc (YYYY-MM-DD)
 * @param {number} channelId - ID kênh (tùy chọn)
 * @param {Object} job - Đối tượng job từ Bull để cập nhật tiến độ
 * @returns {Promise<Object>} - Kết quả xử lý
 */
async function processAccountFetch(account, startDate, endDate, channelId, job = null) {
  try {
    console.log(`[Account ${account.user.name}] Bắt đầu xử lý...`);
    
    // Báo cáo tiến độ 5%
    if (job) await job.progress(5);

    const decryptedCookies = account.getDecryptedCookies();
    if (!decryptedCookies || decryptedCookies.trim() === '') {
      throw new Error('Cookies rỗng hoặc không hợp lệ');
    }

    if (account.cookie_expired) {
      console.log(`[Account ${account.user.name}] Cookies đã hết hạn, bỏ qua fetch.`);
      throw new Error('Cookies đã hết hạn');
    }

    // Báo cáo tiến độ 10%
    if (job) await job.progress(10);

    // Kiểm tra độ dài cookies
    console.log(`[Account ${account.user.name}] Cookies length: ${decryptedCookies.length}, Cookies sample: ${decryptedCookies.substring(0, 20)}...`);

    // Chuyển đổi định dạng ngày từ YYYY-MM-DD thành timestamp
    const start = moment(startDate).startOf('day').valueOf();
    const end = moment(endDate).endOf('day').valueOf();
    console.log(`[Account ${account.user.name}] Thời gian đã chuyển đổi: ${startDate} -> ${new Date(start).toISOString()}, ${endDate} -> ${new Date(end).toISOString()}`);

    const params = {
      start_time: start,
      end_time: end,
      aff_channel_id: channelId || 0,
      page_size: 500,
      page_number: 1,
    };

    // Báo cáo tiến độ 20%
    if (job) await job.progress(20);

    console.log(`[Account ${account.user.name}] Bắt đầu fetch dữ liệu...`);
    
    // Override fetchAllPages để báo cáo tiến độ
    const result = await fetchAllPagesWithProgress(decryptedCookies, params, job);
    console.log(`[Account ${account.user.name}] Fetch hoàn tất, nhận được ${result.length} items.`);
    
    // Báo cáo tiến độ 80%
    if (job) await job.progress(80);

    // Xóa tất cả cache cũ của người dùng này
    console.log(`[Account ${account.user.name}] Xóa tất cả cache cũ của người dùng`);
    await clearAllUserCache(account.user.id);
    
    // Báo cáo tiến độ 90%
    if (job) await job.progress(90);
    
    // Lưu vào cache
    console.log(`[Account ${account.user.name}] Lưu ${result.length} items vào cache...`);
    await saveToCache(
      account.user.id,
      startDate,
      endDate,
      {
        data: result,
        params: {
          startDate,
          endDate,
          channelId: params.aff_channel_id
        }
      }
    );
    console.log(`[Account ${account.user.name}] Đã lưu cache thành công.`);

    // Cập nhật cookie_expired nếu fetch thành công
    if (account.cookie_expired) {
      account.cookie_expired = false;
      await account.save();
      console.log(`[Account ${account.user.name}] Đã cập nhật cookie_expired = false`);
    }

    // Báo cáo tiến độ 100%
    if (job) await job.progress(100);

    return {
      accountId: account._id,
      userId: account.user.id,
      userName: account.user.name,
      success: true,
      totalItems: result.length,
    };
  } catch (error) {
    console.error(`[Account ${account.user.name}] Lỗi: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
    } else if (error.request) {
      console.error('Request was sent but no response received');
      console.error('Request details:', JSON.stringify(error.request._currentUrl || error.request));
    }

    // Đánh dấu cookie đã hết hạn nếu fetch thất bại và lỗi liên quan đến cookies
    if (!account.cookie_expired && 
        (error.message.includes('cookie') || 
         error.message.includes('đăng nhập') || 
         error.message.includes('xác thực') ||
         error.message.includes('Cookies') ||
         error.message.includes('hết hạn'))) {
      account.cookie_expired = true;
      await account.save();
      console.log(`[Account ${account.user.name}] Đã cập nhật cookie_expired = true`);
    }

    throw error; // Để Bull xử lý retry hoặc báo lỗi
  }
}

/**
 * Hàm helper để fetch tất cả các trang từ API report/list với báo cáo tiến độ
 * @param {string} cookies - Chuỗi cookies của tài khoản
 * @param {Object} params - Các tham số cho API
 * @param {Object} job - Đối tượng job từ Bull để cập nhật tiến độ
 * @returns {Promise<Array>} - Mảng dữ liệu từ tất cả các trang
 */
async function fetchAllPagesWithProgress(cookies, params, job = null) {
  let allData = [];
  let totalItems = 0;
  let totalCount = 0;
  const maxRetries = 3;
  const timeout = 30000; // 30 giây timeout mỗi request
  const concurrencyLimit = 5; // Số trang fetch cùng lúc

  console.log(`Bắt đầu fetch dữ liệu từ ${new Date(params.start_time).toISOString()} đến ${new Date(params.end_time).toISOString()}`);
  console.log(`Sử dụng page_size = ${params.page_size || 500}, timeout = ${timeout}ms, maxRetries = ${maxRetries}, concurrencyLimit = ${concurrencyLimit}`);

  // Hàm fetch một trang
  async function fetchPage(pageNumber) {
    const apiParams = {
      ...params,
      page_number: pageNumber
    };

    let retries = 0;
    let success = false;
    let result;

    while (retries < maxRetries && !success) {
      try {
        console.log(`Gọi fetchReportList với page_number=${apiParams.page_number}, retry ${retries + 1}/${maxRetries}`);
        
        const fetchPromise = fetchReportList(cookies, apiParams);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Request timeout sau ${timeout}ms`)), timeout)
        );
        
        result = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (result.code !== 0) {
          console.error(`API trả về lỗi: ${result.message || 'Không xác định'} (code: ${result.code})`);
          throw new Error('API trả về lỗi: ' + (result.message || 'Không xác định'));
        }
        
        success = true;
      } catch (error) {
        retries++;
        console.error(`Lỗi khi fetch trang ${pageNumber}, retry ${retries}/${maxRetries}: ${error.message}`);
        
        if (retries >= maxRetries) {
          throw new Error(`Đã thử lại ${maxRetries} lần nhưng vẫn thất bại: ${error.message}`);
        }
        
        const delayTime = 2000 * retries;
        console.log(`Chờ ${delayTime}ms trước khi thử lại...`);
        await new Promise(resolve => setTimeout(resolve, delayTime));
      }
    }

    return result;
  }

  // Fetch trang đầu tiên để lấy totalCount
  console.log(`Đang fetch trang 1 để lấy totalCount...`);
  const firstPageResult = await fetchPage(1);
  totalCount = firstPageResult.data.total_count || 0;
  console.log(`Tổng số items theo API: ${totalCount}`);

  const pageItems = firstPageResult.data && firstPageResult.data.items ? firstPageResult.data.items : [];
  allData = [...pageItems];
  totalItems += pageItems.length;
  console.log(`Nhận được ${pageItems.length} items từ trang 1`);
  console.log(`Tổng số items đã fetch: ${totalItems}/${totalCount}`);

  // Tính số trang cần fetch
  const pageSize = params.page_size || 500;
  const totalPages = Math.ceil(totalCount / pageSize);
  console.log(`Tổng số trang cần fetch: ${totalPages}`);

  // Tạo danh sách các trang còn lại
  const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

  // Hàm fetch nhiều trang với concurrency limit
  async function fetchPagesConcurrently(pages) {
    for (let i = 0; i < pages.length; i += concurrencyLimit) {
      const batch = pages.slice(i, i + concurrencyLimit);
      console.log(`Đang fetch batch trang: ${batch.join(', ')}`);

      const results = await Promise.all(
        batch.map(async (pageNumber) => {
          try {
            const result = await fetchPage(pageNumber);
            return { pageNumber, result };
          } catch (error) {
            console.error(`Lỗi khi fetch trang ${pageNumber}: ${error.message}`);
            return { pageNumber, error };
          }
        })
      );

      // Xử lý kết quả
      for (const { pageNumber, result, error } of results) {
        if (error) {
          console.error(`Bỏ qua trang ${pageNumber} do lỗi: ${error.message}`);
          continue;
        }

        const pageItems = result.data && result.data.items ? result.data.items : [];
        console.log(`Nhận được ${pageItems.length} items từ trang ${pageNumber}`);
        
        if (pageItems.length > 0) {
          const previousLength = allData.length;
          allData = [...allData, ...pageItems];
          console.log(`Đã thêm ${pageItems.length} items vào allData. Độ dài allData: ${previousLength} -> ${allData.length}`);
          totalItems += pageItems.length;
          console.log(`Tổng số items đã fetch: ${totalItems}/${totalCount}`);
          
          // Báo cáo tiến độ từ 20% đến 80%
          if (job && totalCount > 0) {
            const progressPercent = Math.min(80, 20 + Math.round((totalItems / totalCount) * 60));
            await job.progress(progressPercent);
          }
        }
      }

      // Thêm delay giữa các batch để tránh gọi API quá nhanh
      const dynamicDelay = Math.min(1000 + batch.length * 100, 2000);
      console.log(`Chờ ${dynamicDelay}ms trước khi fetch batch tiếp theo...`);
      await new Promise(resolve => setTimeout(resolve, dynamicDelay));
    }
  }

  // Fetch các trang còn lại song song
  if (remainingPages.length > 0) {
    await fetchPagesConcurrently(remainingPages);
  }

  console.log(`Đã hoàn tất fetch tất cả ${totalPages} trang với tổng cộng ${totalItems}/${totalCount} items.`);
  console.log(`allData có tổng cộng ${allData.length} items.`);
  
  if (allData.length > 0) {
    console.log(`Item đầu tiên:`, JSON.stringify(allData[0]).substring(0, 100) + '...');
    if (allData.length > 1) {
      console.log(`Item cuối cùng:`, JSON.stringify(allData[allData.length - 1]).substring(0, 100) + '...');
    }
  }
  
  return allData;
}

module.exports = {
  processAccountFetch,
  fetchAllPages: fetchAllPagesWithProgress
}; 