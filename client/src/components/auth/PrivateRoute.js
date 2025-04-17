import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import authService from '../../services/authService';

const PrivateRoute = ({ requireAdmin = false }) => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();
  
  // Nếu chưa đăng nhập, chuyển đến trang đăng nhập
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Nếu yêu cầu quyền admin nhưng người dùng không phải admin
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/accounts" replace />;
  }
  
  // Nếu đã đăng nhập và có đủ quyền, hiển thị component con
  return <Outlet />;
};

export default PrivateRoute; 