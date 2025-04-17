const User = require('../models/User');

/**
 * Tạo tài khoản admin mặc định nếu chưa có người dùng nào trong hệ thống
 */
const createDefaultAdmin = async () => {
  try {
    // Kiểm tra xem đã có người dùng nào chưa
    const count = await User.countDocuments();
    
    if (count === 0) {
      console.log('Không tìm thấy người dùng nào. Tạo tài khoản admin mặc định...');
      
      // Tạo tài khoản admin mặc định
      await User.create({
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      });
      
      console.log('Đã tạo tài khoản admin mặc định:');
      console.log('Tên đăng nhập: admin');
      console.log('Mật khẩu: admin123');
      console.log('Hãy đổi mật khẩu sau khi đăng nhập lần đầu!');
    }
  } catch (error) {
    console.error('Lỗi khi tạo tài khoản admin mặc định:', error);
  }
};

module.exports = createDefaultAdmin; 