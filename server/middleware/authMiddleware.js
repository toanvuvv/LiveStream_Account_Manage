const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware bảo vệ route yêu cầu đăng nhập
exports.protect = async (req, res, next) => {
  let token;

  // Kiểm tra token trong headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Lấy token từ header
      token = req.headers.authorization.split(' ')[1];
      
      // Giải mã token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Lấy thông tin người dùng từ ID trong token
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ error: 'Người dùng không tồn tại' });
      }
      
      next();
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }
  } else {
    res.status(401).json({ error: 'Không được phép truy cập, cần đăng nhập' });
  }
};

// Middleware giới hạn quyền chỉ cho admin
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Không có quyền truy cập, chỉ dành cho admin' });
  }
};

// Middleware kiểm tra quyền truy cập nhóm
exports.checkGroupAccess = (req, res, next) => {
  // Nếu là admin thì có quyền truy cập tất cả
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Lấy ID nhóm từ parameter
  const groupId = req.params.groupId || req.body.groupId;
  
  if (!groupId) {
    return res.status(400).json({ error: 'Cần chỉ định ID nhóm' });
  }
  
  // Kiểm tra xem người dùng có quyền truy cập nhóm này không
  const hasAccess = req.user.groupAccess.some(
    (group) => group.toString() === groupId.toString()
  );
  
  if (hasAccess) {
    next();
  } else {
    res.status(403).json({ error: 'Không có quyền truy cập nhóm này' });
  }
};

// Middleware kiểm tra quyền truy cập tài khoản dựa trên nhóm
exports.checkAccountAccess = async (req, res, next) => {
  try {
    // Nếu là admin thì có quyền truy cập tất cả
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Lấy ID tài khoản từ parameter
    const accountId = req.params.id || req.params.accountId;
    
    if (!accountId) {
      return res.status(400).json({ error: 'Cần chỉ định ID tài khoản' });
    }
    
    // Import model Account
    const Account = require('../models/Account');
    
    // Lấy thông tin tài khoản để kiểm tra nhóm
    const account = await Account.findById(accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }
    
    // Kiểm tra xem người dùng có quyền truy cập nhóm của tài khoản này không
    const hasAccess = req.user.groupAccess.some(
      (group) => group.toString() === account.group.toString()
    );
    
    if (hasAccess) {
      next();
    } else {
      res.status(403).json({ error: 'Không có quyền truy cập tài khoản này' });
    }
  } catch (error) {
    console.error('Account access check error:', error);
    res.status(500).json({ error: 'Lỗi kiểm tra quyền truy cập' });
  }
}; 