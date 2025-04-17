const axios = require('axios');

/**
 * Hàm chuẩn hóa timestamp về múi giờ Việt Nam (+0700)
 * @param {number} timestamp - Timestamp tính bằng milliseconds
 * @returns {number} Timestamp đã chuẩn hóa về múi giờ VN tính bằng seconds
 */
const normalizeTimestampToVNTime = (timestamp) => {
  // Tạo đối tượng date từ timestamp (UTC)
  const utcDate = new Date(timestamp);
  
  // Tính toán timestamp cho múi giờ Việt Nam (+0700) bằng cách thêm 7 giờ vào UTC
  // Đối với VN timezone offset là +7 giờ = +7 * 60 * 60 * 1000 ms
  const vnOffset = 7 * 60 * 60 * 1000; // 7 giờ tính bằng ms
  
  // Chuyển timestamp sang giây và trả về
  const seconds = Math.floor(timestamp / 1000);
  
  // Tạo timestamp theo giờ Việt Nam để log ra cho dễ theo dõi
  const vnTime = new Date(utcDate.getTime() + vnOffset).toISOString();
  
  // In ra log để debug khi cần
  console.log(`Original timestamp: ${timestamp}, Converted to seconds: ${seconds}`);
  console.log(`UTC Date: ${utcDate.toISOString()}, VN Time (+0700): ${vnTime}`);
  
  return seconds;
};

/**
 * Tạo API client với cookies đã cung cấp
 * @param {string} cookies - Chuỗi cookies
 * @returns {Object} Axios instance với cookies đã cấu hình
 */
const createApiClient = (cookies) => {
  const client = axios.create({
    baseURL: 'https://affiliate.shopee.vn/api',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  // Thêm interceptor để xử lý lỗi
  client.interceptors.response.use(
    response => response,
    error => {
      if (error.response) {
        // Xử lý lỗi từ API
        console.error('API Error:', error.response.data);
        return Promise.reject(error.response.data);
      }
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Tạo API client cho Creator Shopee
 * @param {string} cookies - Chuỗi cookies
 * @returns {Object} Axios instance với cookies đã cấu hình
 */
const createCreatorApiClient = (cookies) => {
  const client = axios.create({
    baseURL: 'https://creator.shopee.vn/supply/api',
    headers: {
      'Cookie': cookies,
      'Content-Type': 'application/json',
      'accept': 'application/json',
      'language': 'en',
      'x-env': 'live',
      'x-region': 'vn',
      'x-region-domain': 'vn',
      'x-region-timezone': '+0700',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
    }
  });

  // Thêm interceptor để xử lý lỗi
  client.interceptors.response.use(
    response => response,
    error => {
      if (error.response) {
        // Xử lý lỗi từ API
        console.error('Creator API Error:', error.response.data);
        return Promise.reject(error.response.data);
      }
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Fetch dữ liệu từ API report/list
 * @param {string} cookies - Chuỗi cookies
 * @param {Object} params - Các tham số cho API
 * @returns {Promise<Object>} Kết quả từ API
 */
const fetchReportList = async (cookies, params) => {
  try {
    // Validate cookies
    if (!cookies?.trim()) {
      throw new Error('Invalid or empty cookies');
    }

    // Convert timestamps to seconds và chuẩn hóa về múi giờ Việt Nam
    const v3Params = {
      page_size: params.page_size || 500,
      page_num: params.page_number || 1,
      purchase_time_s: normalizeTimestampToVNTime(params.start_time),
      purchase_time_e: normalizeTimestampToVNTime(params.end_time),
      version: 1,
      ...(params.aff_channel_id && params.aff_channel_id !== 0 && { aff_channel_id: params.aff_channel_id }),
    };

    // Define headers
    const headers = {
      accept: 'application/json',
      'affiliate-program-type': '1',
      'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
    };

    // Make API request
    const client = createApiClient(cookies);
    const response = await client.get('/v3/report/list', {
      params: v3Params,
      headers,
      timeout: 30000,
    });

    const v3Response = response.data;

    // Format response to match legacy structure
    const v1Response = {
      code: v3Response.code,
      message: v3Response.msg || v3Response.message,
      data: {
        page_number: v3Response.data?.page_num || v3Params.page_num,
        page_size: v3Response.data?.page_size || v3Params.page_size,
        total_count: v3Response.data?.total_count || 0,
        items: (v3Response.data?.list || [])
          .filter(item => {
            // Filter out Invalid checkouts and ensure all orders have display_order_status of 1 or 2
            if (item.checkout_status === 'Invalid') return false;
            return item.orders?.length > 0 && item.orders.every(order => 
              order.display_order_status === 1 || order.display_order_status === 2
            );
          })
          .map(item => {
            // Convert amount from raw (assumed multiplied by 100,000) to VND
            const convertAmount = amount =>
              Math.round((typeof amount === 'string' ? parseFloat(amount) : amount || 0) / 100000);

            const totalActualAmount = item.orders?.reduce((sum, order) => 
              sum + (order.items?.reduce((acc, orderItem) => acc + (orderItem.actual_amount || 0), 0) || 0), 0) || 0;

            const firstItem = item.orders?.[0]?.items?.[0];

            return {
              affiliate_net_commission: convertAmount(item.affiliate_net_commission),
              actual_amount: convertAmount(totalActualAmount),
              aff_channel_id: firstItem?.channel || 0,
              linked_mcn_id: item.linked_mcn_id || '',
              linked_mcn_name: item.linked_mcn_name || '',
              linked_mcn_commission_rate: item.linked_mcn_commission_rate || '',
              campaign_mcn_id: item.campaign_mcn_id || '0',
              campaign_mcn_name: item.campaign_mcn_name || '',
              mcn_management_fee_commission: convertAmount(item.mcn_management_fee_commission),
              mcn_agreement_id: item.mcn_agreement_id || '',
              purchase_time: item.purchase_time,
              checkout_id: item.checkout_id,
              checkout_status: item.checkout_status,
              internal_source: item.internal_source || '',
              direct_source: item.direct_source || '',
              indirect_source: item.indirect_source || '',
              first_external_source: item.first_external_source || '',
              last_external_source: item.last_external_source || '',
              orders: item.orders,
            };
          }),
      },
    };

    return v1Response;
  } catch (error) {
    // Handle API request errors
    if (error.response) {
      throw new Error(
        `API Error ${error.response.status}: ${
          error.response.data?.message ||
          error.response.data?.error ||
          error.response.data?.msg ||
          'Unknown API error'
        }`
      );
    }
    if (error.request) {
      throw new Error('Network timeout or no response from server');
    }
    throw new Error(error.message);
  }
};

/**
 * Fetch danh sách phiên livestream (API sessionList)
 * @param {string} cookies - Chuỗi cookies
 * @param {Object} params - Các tham số cho API
 * @returns {Promise<Object>} Kết quả từ API
 */
const fetchSessionList = async (cookies, params) => {
  const client = createCreatorApiClient(cookies);
  const defaultParams = {
    page: 1,
    pageSize: 10,
    ...params
  };
  
  const response = await client.get('/lm/sellercenter/realtime/sessionList', { 
    params: defaultParams
  });
  // console.log(response.data)
  return response.data;
};

/**
 * Fetch thông tin chi tiết của một phiên livestream (API dashboard-overview)
 * @param {string} cookies - Chuỗi cookies
 * @param {Object} params - Các tham số cho API
 * @returns {Promise<Object>} Kết quả từ API
 */

const fetchSessionDetail = async (cookies, params) => {
  const client = createCreatorApiClient(cookies);
  const response = await client.get(`/lm/sellercenter/realtime/dashboard/overview`, { 
    params: { sessionId: params.session_id }
  });
  return response.data;
};

/**
 * Test cookies bằng cách gọi API v3/report/list với dữ liệu chỉ 1 ngày và page_size=10
 * @param {string} cookies - Chuỗi cookies cần kiểm tra
 * @returns {Promise<boolean>} True nếu cookies còn hạn, false nếu hết hạn
 */
const testCookies = async (cookies) => {
  try {
    const client = createApiClient(cookies);
    // Lấy timestamp hiện tại và timestamp của 1 ngày trước đó
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const response = await client.get('/v3/report/list', {
      params: {
        page_size: 10,
        page_num: 1,
        purchase_time_s: normalizeTimestampToVNTime(oneDayAgo),
        purchase_time_e: normalizeTimestampToVNTime(now),
        version: 1
      }
    });
    
    // Kiểm tra code trả về từ API (0 thường là thành công)
    return response.data && response.data.code === 0;
  } catch (error) {
    console.error('Cookie test failed:', error);
    return false;
  }
};

/**
 * Trích xuất CSRF token từ cookies
 * @param {string} cookies - Chuỗi cookies
 * @returns {string} CSRF token
 */
const extractCsrfToken = (cookies) => {
  // Thử tìm CSRF token từ cookies
  // Pattern có thể thay đổi tùy thuộc vào cấu trúc cookies thực tế
  const csrfMatch = cookies.match(/csrftoken=([^;]+)/);
  return csrfMatch ? csrfMatch[1] : '';
};

/**
 * Lấy danh sách phiên livestream từ creator.shopee.vn
 * @param {string} cookies - Chuỗi cookies
 * @param {Object} params - Các tham số (page, pageSize, name, orderBy, sort)
 * @returns {Promise<Object>} Kết quả từ API chứa danh sách phiên livestream
 */
// const fetchCreatorSessionList = async (cookies, params = {}) => {
//   const client = createCreatorApiClient(cookies);
//   const defaultParams = {
//     page: 1,
//     pageSize: 10,
//     ...params
//   };
  
//   const response = await client.get('/lm/sellercenter/realtime/sessionList', { 
//     params: defaultParams
//   });
//   return response.data;
// };

/**
 * Lấy chi tiết dashboard của một phiên livestream cụ thể từ creator.shopee.vn
//  * @param {string} cookies - Chuỗi cookies
//  * @param {number} sessionId - ID của phiên livestream
//  * @returns {Promise<Object>} Kết quả từ API chứa thông tin chi tiết của phiên livestream
//  */
// const fetchCreatorSessionDetail = async (cookies, sessionId) => {
//   const client = createCreatorApiClient(cookies);
//   const response = await client.get(`/lm/sellercenter/realtime/dashboard/overview`, { 
//     params: { sessionId }
//   });
//   return response.data;
// };

module.exports = {
  createApiClient,
  createCreatorApiClient,
  fetchReportList,
  fetchSessionList,
  fetchSessionDetail,
  testCookies,
  normalizeTimestampToVNTime,
  // fetchCreatorSessionList,
  // fetchCreatorSessionDetail
}; 