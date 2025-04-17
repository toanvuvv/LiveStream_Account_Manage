const fs = require('fs');
const path = require('path');

/**
 * Lưu dữ liệu vào file cache
 * @param {number} userId - ID của người dùng
 * @param {string} startDate - Ngày bắt đầu (format: YYYY-MM-DD)
 * @param {string} endDate - Ngày kết thúc (format: YYYY-MM-DD)
 * @param {Object} data - Dữ liệu cần lưu
 * @returns {Promise<string>} Đường dẫn đến file cache
 */
const saveToCache = async (userId, startDate, endDate, data) => {
  // Tạo thư mục cho user nếu chưa tồn tại
  const userDir = path.join(__dirname, '../../cache/reports', userId.toString());
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  // Tạo tên file cache với format: startDate_endDate.json
  const filename = `${startDate}_${endDate}.json`;
  const filePath = path.join(userDir, filename);

  // Ghi dữ liệu vào file
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
  
  return filePath;
};

/**
 * Đọc dữ liệu từ file cache
 * @param {number} userId - ID của người dùng
 * @param {string} startDate - Ngày bắt đầu (format: YYYY-MM-DD)
 * @param {string} endDate - Ngày kết thúc (format: YYYY-MM-DD)
 * @returns {Promise<Object|null>} Dữ liệu từ cache hoặc null nếu không tìm thấy
 */
const getFromCache = async (userId, startDate, endDate) => {
  const filename = `${startDate}_${endDate}.json`;
  const filePath = path.join(__dirname, '../../cache/reports', userId.toString(), filename);
  console.log(`Đang đọc cache tại đường dẫn: ${filePath}`);

  try {
    if (fs.existsSync(filePath)) {
      console.log(`File cache ${filename} tồn tại.`);
      const data = await fs.promises.readFile(filePath, 'utf8');
      const parsedData = JSON.parse(data);
      
      // Log thông tin về dữ liệu cache
      if (parsedData && parsedData.data) {
        console.log(`Đã đọc cache: ${parsedData.data.length} items.`);
        
        // Log 2 item đầu và cuối để kiểm tra
        if (parsedData.data.length > 0) {
          console.log(`Cache item đầu tiên:`, JSON.stringify(parsedData.data[0]).substring(0, 100) + '...');
          if (parsedData.data.length > 1) {
            console.log(`Cache item cuối cùng:`, JSON.stringify(parsedData.data[parsedData.data.length - 1]).substring(0, 100) + '...');
          }
        }
      } else {
        console.log(`Dữ liệu cache không hợp lệ hoặc rỗng.`);
      }
      
      return parsedData;
    }
    console.log(`Không tìm thấy file cache: ${filename}`);
    return null;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

/**
 * Kiểm tra xem dữ liệu cache có tồn tại không
 * @param {number} userId - ID của người dùng
 * @param {string} startDate - Ngày bắt đầu (format: YYYY-MM-DD)
 * @param {string} endDate - Ngày kết thúc (format: YYYY-MM-DD)
 * @returns {boolean} True nếu cache tồn tại, false nếu không
 */
const cacheExists = (userId, startDate, endDate) => {
  const filename = `${startDate}_${endDate}.json`;
  const filePath = path.join(__dirname, '../../cache/reports', userId.toString(), filename);
  return fs.existsSync(filePath);
};

/**
 * Xóa file cache
 * @param {number} userId - ID của người dùng
 * @param {string} startDate - Ngày bắt đầu (format: YYYY-MM-DD)
 * @param {string} endDate - Ngày kết thúc (format: YYYY-MM-DD)
 * @returns {Promise<boolean>} True nếu xóa thành công, false nếu không
 */
const clearCache = async (userId, startDate, endDate) => {
  const filename = `${startDate}_${endDate}.json`;
  const filePath = path.join(__dirname, '../../cache/reports', userId.toString(), filename);
  
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Xóa tất cả file cache của một người dùng
 * @param {number} userId - ID của người dùng
 * @returns {Promise<boolean>} True nếu xóa thành công, false nếu không
 */
const clearAllUserCache = async (userId) => {
  const userDir = path.join(__dirname, '../../cache/reports', userId.toString());
  
  try {
    if (fs.existsSync(userDir)) {
      // Đọc tất cả các file trong thư mục
      const files = await fs.promises.readdir(userDir);
      
      // Xóa từng file
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.promises.unlink(path.join(userDir, file));
        }
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error clearing user cache:', error);
    return false;
  }
};

module.exports = {
  saveToCache,
  getFromCache,
  cacheExists,
  clearCache,
  clearAllUserCache
}; 