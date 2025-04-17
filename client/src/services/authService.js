import axios from 'axios';

// Sửa lại URL API cho môi trường production, sử dụng URL tương đối
const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

// Lưu token và thông tin user vào localStorage
const setUserData = (userData) => {
  localStorage.setItem('user', JSON.stringify({
    id: userData._id,
    username: userData.username,
    role: userData.role,
    token: userData.token
  }));
};

// Lấy token từ localStorage
const getToken = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user ? user.token : null;
};

// Lấy thông tin user từ localStorage
const getUserData = () => {
  return JSON.parse(localStorage.getItem('user'));
};

// Xóa thông tin user khỏi localStorage
const removeUserData = () => {
  localStorage.removeItem('user');
};

// Thêm token vào header của request
const setAuthHeader = () => {
  const token = getToken();
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Đăng nhập
const login = async (username, password) => {
  try {
    const response = await axios.post(`${API_URL}/api/users/login`, {
      username,
      password
    });
    
    if (response.data.token) {
      setUserData(response.data);
      setAuthHeader();
    }
    
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Lỗi đăng nhập' };
  }
};

// Đăng xuất
const logout = () => {
  removeUserData();
  setAuthHeader();
};

// Khởi tạo header khi load trang
const initAuthHeader = () => {
  setAuthHeader();
};

// Kiểm tra user đã đăng nhập chưa
const isAuthenticated = () => {
  return getToken() !== null;
};

// Kiểm tra user có quyền admin không
const isAdmin = () => {
  const user = getUserData();
  return user && user.role === 'admin';
};

const authService = {
  login,
  logout,
  getToken,
  getUserData,
  initAuthHeader,
  isAuthenticated,
  isAdmin
};

export default authService; 