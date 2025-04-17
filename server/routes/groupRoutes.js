const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { protect, admin, checkGroupAccess } = require('../middleware/authMiddleware');

// Lấy danh sách nhóm - người dùng chỉ thấy nhóm họ có quyền
router.get('/', protect, groupController.getGroups);

// Lấy thông tin nhóm - kiểm tra quyền truy cập nhóm
router.get('/:id', protect, checkGroupAccess, groupController.getGroup);

// Tạo nhóm mới - chỉ admin mới được tạo
router.post('/', protect, admin, groupController.createGroup);

// Cập nhật nhóm - chỉ admin mới được cập nhật
router.put('/:id', protect, admin, groupController.updateGroup);

// Xóa nhóm - chỉ admin mới được xóa
router.delete('/:id', protect, admin, groupController.deleteGroup);

// Lấy danh sách tài khoản trong nhóm - kiểm tra quyền truy cập nhóm
router.get('/:id/accounts', protect, checkGroupAccess, groupController.getGroupAccounts);

module.exports = router; 