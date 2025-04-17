const express = require('express');
const router = express.Router();
const {
  loginUser,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Route công khai
router.post('/login', loginUser);

// Routes yêu cầu đăng nhập
router.route('/')
  .post(protect, admin, createUser) // Chỉ admin mới được tạo người dùng
  .get(protect, admin, getUsers);   // Chỉ admin mới được xem danh sách

router.route('/:id')
  .get(protect, getUserById)       // Admin hoặc chính user đó mới xem được (kiểm tra trong controller)
  .put(protect, updateUser)        // Admin hoặc chính user đó mới sửa được (kiểm tra trong controller)
  .delete(protect, admin, deleteUser); // Chỉ admin mới được xóa

module.exports = router; 