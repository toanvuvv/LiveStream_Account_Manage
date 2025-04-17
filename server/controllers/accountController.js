const Account = require('../models/Account');
const Group = require('../models/Group');
const { testCookies } = require('../utils/apiClient');

/**
 * @desc    Thêm tài khoản (nick) mới
 * @route   POST /api/accounts
 * @access  Public
 */
exports.addAccount = async (req, res) => {
  try {
    const { user, cookies, groupId } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!user || !user.id || !user.name || !cookies || !groupId) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp đầy đủ thông tin (user.id, user.name, cookies, groupId)'
      });
    }

    // Kiểm tra group có tồn tại không
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Nhóm không tồn tại'
      });
    }

    // Kiểm tra xem nick đã tồn tại chưa
    let account = await Account.findOne({ 'user.id': user.id });
    
    if (account) {
      return res.status(400).json({
        success: false,
        error: 'Tài khoản đã tồn tại',
        accountId: account._id
      });
    }

    // Test cookies trước khi thêm
    const isValid = await testCookies(cookies);
    
    // Tạo account mới
    account = new Account({
      user,
      cookies,
      group: groupId,
      cookie_expired: !isValid
    });

    await account.save();

    res.status(201).json({
      success: true,
      data: {
        id: account._id,
        user: account.user,
        group: account.group,
        cookie_expired: account.cookie_expired
      },
      message: 'Thêm tài khoản thành công'
    });
  } catch (error) {
    console.error('Add account error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Cập nhật cookies cho tài khoản
 * @route   PUT /api/accounts/:id/cookies
 * @access  Public
 */
exports.updateCookies = async (req, res) => {
  try {
    const { cookies } = req.body;
    
    if (!cookies) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp cookies mới'
      });
    }

    // Test cookies mới
    const isValid = await testCookies(cookies);

    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản'
      });
    }

    account.cookies = cookies;
    account.cookie_expired = !isValid;
    account.updated_at = Date.now();

    await account.save();

    res.status(200).json({
      success: true,
      data: {
        id: account._id,
        user: account.user,
        cookie_expired: account.cookie_expired
      },
      message: 'Cập nhật cookies thành công'
    });
  } catch (error) {
    console.error('Update cookies error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Chuyển tài khoản sang nhóm khác
 * @route   PUT /api/accounts/:id/group
 * @access  Public
 */
exports.changeGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp ID của nhóm mới'
      });
    }

    // Kiểm tra group có tồn tại không
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Nhóm không tồn tại'
      });
    }

    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản'
      });
    }

    account.group = groupId;
    account.updated_at = Date.now();

    await account.save();

    res.status(200).json({
      success: true,
      data: {
        id: account._id,
        user: account.user,
        group: account.group
      },
      message: 'Chuyển nhóm thành công'
    });
  } catch (error) {
    console.error('Change group error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Xóa tài khoản
 * @route   DELETE /api/accounts/:id
 * @access  Public
 */
exports.deleteAccount = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản'
      });
    }

    await Account.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Xóa tài khoản thành công'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Lấy danh sách tất cả tài khoản
 * @route   GET /api/accounts
 * @access  Private
 */
exports.getAccounts = async (req, res) => {
  try {
    const { groupId } = req.query;
    let query = {};
    
    // Nếu có groupId, lọc theo nhóm cụ thể
    if (groupId) {
      query.group = groupId;
    }
    
    // Nếu không phải admin, chỉ hiển thị tài khoản thuộc nhóm mà user có quyền
    if (req.user.role !== 'admin') {
      // Nếu đã có groupId và user không có quyền truy cập vào nhóm đó
      if (groupId && !req.user.groupAccess.includes(groupId)) {
        return res.status(403).json({
          success: false,
          error: 'Không có quyền truy cập nhóm này'
        });
      }
      
      // Chỉ lấy tài khoản thuộc các nhóm mà user có quyền
      query.group = { $in: req.user.groupAccess };
    }

    const accounts = await Account.find(query)
      .populate('group', 'name')
      .select('-cookies')
      .sort({ 'user.name': 1 });

    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Lấy thông tin chi tiết của một tài khoản
 * @route   GET /api/accounts/:id
 * @access  Public
 */
exports.getAccount = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id)
      .populate('group', 'name')
      .select('-cookies');
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản'
      });
    }

    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Kiểm tra cookies còn hạn hay không
 * @route   GET /api/accounts/:id/test-cookies
 * @access  Public
 */
exports.testAccountCookies = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài khoản'
      });
    }

    // Giải mã cookies
    const decryptedCookies = account.getDecryptedCookies();
    
    // Test cookies
    const isValid = await testCookies(decryptedCookies);
    
    // Cập nhật trạng thái cookie_expired nếu cần
    if (account.cookie_expired !== !isValid) {
      account.cookie_expired = !isValid;
      await account.save();
    }

    res.status(200).json({
      success: true,
      data: {
        id: account._id,
        cookie_valid: isValid,
        cookie_expired: !isValid
      },
      message: isValid ? 'Cookies còn hạn' : 'Cookies đã hết hạn'
    });
  } catch (error) {
    console.error('Test cookies error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
}; 