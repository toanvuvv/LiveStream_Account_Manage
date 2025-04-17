const Group = require('../models/Group');
const Account = require('../models/Account');
const User = require('../models/User');

/**
 * @desc    Tạo nhóm mới
 * @route   POST /api/groups
 * @access  Public
 */
exports.createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp tên nhóm'
      });
    }

    // Kiểm tra xem nhóm đã tồn tại chưa
    const existingGroup = await Group.findOne({ name });
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        error: 'Nhóm đã tồn tại'
      });
    }

    const group = await Group.create({
      name,
      description: description || ''
    });

    res.status(201).json({
      success: true,
      data: group,
      message: 'Tạo nhóm thành công'
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Lấy danh sách tất cả các nhóm
 * @route   GET /api/groups
 * @access  Private
 */
exports.getGroups = async (req, res) => {
  try {
    let groups;
    
    // Nếu là admin, hiển thị tất cả các nhóm
    if (req.user.role === 'admin') {
      groups = await Group.find().sort({ name: 1 });
    } else {
      // Nếu là user thường, chỉ hiển thị các nhóm mà user có quyền truy cập
      groups = await Group.find({ _id: { $in: req.user.groupAccess } }).sort({ name: 1 });
    }

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Lấy thông tin chi tiết của một nhóm
 * @route   GET /api/groups/:id
 * @access  Public
 */
exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy nhóm'
      });
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Cập nhật thông tin nhóm
 * @route   PUT /api/groups/:id
 * @access  Public
 */
exports.updateGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp tên nhóm'
      });
    }

    // Kiểm tra xem nhóm có tồn tại không
    let group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy nhóm'
      });
    }

    // Nếu tên đã thay đổi, kiểm tra xem tên mới đã tồn tại chưa
    if (name !== group.name) {
      const existingGroup = await Group.findOne({ name });
      if (existingGroup) {
        return res.status(400).json({
          success: false,
          error: 'Tên nhóm đã tồn tại'
        });
      }
    }

    group.name = name;
    group.description = description || '';
    group.updated_at = Date.now();

    await group.save();

    res.status(200).json({
      success: true,
      data: group,
      message: 'Cập nhật nhóm thành công'
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Xóa nhóm
 * @route   DELETE /api/groups/:id
 * @access  Public
 */
exports.deleteGroup = async (req, res) => {
  try {
    // Kiểm tra xem nhóm có tồn tại không
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy nhóm'
      });
    }

    // Kiểm tra xem có tài khoản nào trong nhóm không
    const accountCount = await Account.countDocuments({ group: req.params.id });
    if (accountCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Không thể xóa nhóm khi có tài khoản trong nhóm'
      });
    }

    await Group.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Xóa nhóm thành công'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
};

/**
 * @desc    Lấy danh sách tài khoản trong nhóm
 * @route   GET /api/groups/:id/accounts
 * @access  Public
 */
exports.getGroupAccounts = async (req, res) => {
  try {
    // Kiểm tra xem nhóm có tồn tại không
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy nhóm'
      });
    }

    const accounts = await Account.find({ group: req.params.id })
      .select('-cookies')
      .sort({ 'user.name': 1 });

    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (error) {
    console.error('Get group accounts error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server: ' + error.message
    });
  }
}; 