const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { protect, admin, checkAccountAccess } = require('../middleware/authMiddleware');

// Lấy danh sách tài khoản - chỉ lấy các tài khoản thuộc nhóm mà user có quyền
router.get('/', protect, accountController.getAccounts);

// Lấy thông tin tài khoản - kiểm tra quyền dựa trên nhóm
router.get('/:id', protect, checkAccountAccess, accountController.getAccount);

// Thêm tài khoản mới - chỉ admin mới được thêm
router.post('/', protect, admin, accountController.addAccount);

// Cập nhật cookies - cần quyền truy cập tài khoản
router.put('/:id/cookies', protect, checkAccountAccess, accountController.updateCookies);

// Chuyển nhóm - chỉ admin mới được chuyển
router.put('/:id/group', protect, admin, accountController.changeGroup);

// Xóa tài khoản - chỉ admin mới được xóa
router.delete('/:id', protect, admin, accountController.deleteAccount);

// Test cookies - cần quyền truy cập tài khoản
router.get('/:id/test-cookies', protect, checkAccountAccess, accountController.testAccountCookies);

module.exports = router; 