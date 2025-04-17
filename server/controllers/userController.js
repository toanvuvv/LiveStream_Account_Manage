const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Tạo token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// @desc    Đăng nhập người dùng
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Kiểm tra xem người dùng có tồn tại
    const user = await User.findOne({ username }).select('+password');
    
    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    // Kiểm tra mật khẩu
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    // Tạo và gửi token
    const token = generateToken(user._id);
    
    res.json({
      _id: user._id,
      username: user.username,
      role: user.role,
      groupAccess: user.groupAccess,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Lỗi đăng nhập' });
  }
};

// @desc    Tạo mới người dùng (chỉ admin mới có quyền)
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const { username, password, role, groupAccess } = req.body;

    // Kiểm tra xem người dùng đã tồn tại chưa
    const userExists = await User.findOne({ username });
    
    if (userExists) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    }

    // Tạo người dùng mới
    const user = await User.create({
      username,
      password,
      role,
      groupAccess,
      createdBy: req.user._id
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      role: user.role,
      groupAccess: user.groupAccess
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Lỗi tạo người dùng' });
  }
};

// @desc    Lấy tất cả người dùng (chỉ admin)
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).populate('groupAccess', 'name');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Lỗi lấy danh sách người dùng' });
  }
};

// @desc    Lấy thông tin người dùng theo ID (admin hoặc chính người dùng đó)
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('groupAccess', 'name');
    
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra quyền: chỉ admin hoặc chính người dùng đó mới được xem
    if (req.user.role !== 'admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Lỗi lấy thông tin người dùng' });
  }
};

// @desc    Cập nhật người dùng (admin hoặc chính người dùng đó)
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra quyền: admin có thể cập nhật bất kỳ, user chỉ được cập nhật chính mình
    if (req.user.role !== 'admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    // Admin có thể cập nhật tất cả các trường, user chỉ được đổi mật khẩu
    if (req.user.role === 'admin') {
      if (req.body.username) user.username = req.body.username;
      if (req.body.role) user.role = req.body.role;
      if (req.body.groupAccess) user.groupAccess = req.body.groupAccess;
    }
    
    // Cả admin và user đều có thể cập nhật mật khẩu
    if (req.body.password) user.password = req.body.password;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      role: updatedUser.role,
      groupAccess: updatedUser.groupAccess
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Lỗi cập nhật người dùng' });
  }
};

// @desc    Xóa người dùng (chỉ admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    await user.deleteOne();
    res.json({ message: 'Người dùng đã được xóa' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Lỗi xóa người dùng' });
  }
}; 