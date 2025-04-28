import axios from 'axios';
import authService from './authService';

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';

// Tạo axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Timeout sau 30 giây
});

// Thêm interceptor để thêm token xác thực vào mỗi request
api.interceptors.request.use(
  config => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Thêm interceptor để retry request khi lỗi mạng
api.interceptors.response.use(
  response => response,
  async error => {
    const { config } = error;
    
    // Nếu không phải lỗi timeout hoặc lỗi mạng, reject ngay lập tức
    if (!error.message.includes('Network Error') && !error.code === 'ECONNABORTED') {
      return Promise.reject(error);
    }
    
    // Kiểm tra xem request đã được retry chưa
    config.__retryCount = config.__retryCount || 0;
    
    // Giới hạn số lần retry
    if (config.__retryCount >= 2) {
      return Promise.reject(error);
    }
    
    // Tăng số lần retry
    config.__retryCount += 1;
    
    // Tạo promise để delay 1500ms trước khi retry
    const delayRetry = new Promise(resolve => {
      setTimeout(() => resolve(), 1500);
    });
    
    // Sau khi delay, retry request
    await delayRetry;
    console.log(`Retry API request lần thứ ${config.__retryCount}...`);
    return api(config);
  }
);

// API endpoints cho tài khoản
export const accountApi = {
  // Lấy danh sách tất cả tài khoản
  getAccounts: (groupId = '') => {
    return api.get(`/accounts${groupId ? `?groupId=${groupId}` : ''}`);
  },
  
  // Lấy thông tin chi tiết của một tài khoản
  getAccount: (id) => {
    return api.get(`/accounts/${id}`);
  },
  
  // Thêm tài khoản mới
  addAccount: (accountData) => {
    return api.post('/accounts', accountData);
  },
  
  // Cập nhật cookies
  updateCookies: (id, cookies) => {
    return api.put(`/accounts/${id}/cookies`, { cookies });
  },
  
  // Chuyển nhóm
  changeGroup: (id, groupId) => {
    return api.put(`/accounts/${id}/group`, { groupId });
  },
  
  // Xóa tài khoản
  deleteAccount: (id) => {
    return api.delete(`/accounts/${id}`);
  },
  
  // Test cookies
  testCookies: (id) => {
    return api.get(`/accounts/${id}/test-cookies`);
  }
};

// API endpoints cho nhóm
export const groupApi = {
  // Lấy danh sách tất cả nhóm
  getGroups: () => {
    return api.get('/groups');
  },
  
  // Lấy thông tin chi tiết của một nhóm
  getGroup: (id) => {
    return api.get(`/groups/${id}`);
  },
  
  // Tạo nhóm mới
  createGroup: (groupData) => {
    return api.post('/groups', groupData);
  },
  
  // Cập nhật nhóm
  updateGroup: (id, groupData) => {
    return api.put(`/groups/${id}`, groupData);
  },
  
  // Xóa nhóm
  deleteGroup: (id) => {
    return api.delete(`/groups/${id}`);
  },
  
  // Lấy danh sách tài khoản trong nhóm
  getGroupAccounts: (id) => {
    return api.get(`/groups/${id}/accounts`);
  }
};

// API endpoints cho báo cáo
export const reportApi = {
  // Lấy báo cáo từ cache
  getReports: (params) => {
    return api.get('/reports', { params });
  },
  
  // Fetch dữ liệu báo cáo mới
  fetchReports: (reportData, progressCallback) => {
    // Bổ sung progressCallback vào request config
    const config = {
      onUploadProgress: progressEvent => {
        if (progressCallback) {
          progressCallback('Đang gửi yêu cầu fetch...');
        }
      }
    };
    
    // Nếu có progressCallback thì gửi kèm trong body để backend có thể gửi
    // cập nhật tiến trình thông qua Server-Sent Events hoặc WebSocket
    const requestData = {
      ...reportData,
      enableProgressUpdates: progressCallback ? true : false
    };
    
    return api.post('/reports/fetch', requestData, config)
      .then(response => {
        // Gọi callback với thông báo hoàn thành nếu có
        if (progressCallback) {
          progressCallback('Đã hoàn tất fetch dữ liệu!');
        }
        return response;
      })
      .catch(error => {
        // Gọi callback với thông báo lỗi nếu có
        if (progressCallback) {
          progressCallback('Đã xảy ra lỗi khi fetch dữ liệu');
        }
        throw error;
      });
  },
  
  // Xuất báo cáo ra Excel
  exportReports: (params) => {
    return api.get('/reports/export', { 
      params,
      responseType: 'blob' // Quan trọng: chỉ định response type là blob để xử lý file
    }).then(response => {
      // Tạo URL từ blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bao_cao_${params.startDate}_${params.endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    });
  },
  
  // Lấy danh sách kênh
  getChannels: () => {
    return api.get('/reports/channels');
  },
  
  // Lấy dữ liệu chuyển đổi từ API v3/report/list
  fetchConversionData: (data) => {
    return api.post('/reports/conversion', data);
  },
  
  // Lấy dữ liệu đối soát từ API billing_list
  fetchSettlementData: (data) => {
    return api.post('/reports/settlement', data);
  },
  
  // Thêm hàm mới để gọi API lấy các kỳ đối soát hợp lệ
  fetchValidSettlementPeriods: async (data) => {
    return await api.post('/reports/settlement-periods', data);
  }
};

// API endpoints cho phiên livestream
export const sessionApi = {
  // Lấy danh sách phiên livestream của một tài khoản
  getAccountSessions: (accountId, page = 1, limit = 10) => {
    return api.get(`/sessions/${accountId}?page=${page}&limit=${limit}`);
  },
  
  // Lấy thông tin chi tiết của một phiên livestream
  getSessionDetail: (accountId, sessionId) => {
    return api.get(`/sessions/${accountId}/${sessionId}`);
  }
};

export const fetchStatusApi = {
  getFetchStatus: (params) => {
    return api.get('/reports/fetch-status', { params });
  }
};

export default api; 