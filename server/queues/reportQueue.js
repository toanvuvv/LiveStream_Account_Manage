const Bull = require('bull');
const { processAccountFetch } = require('../utils/accountProcessor');
const Account = require('../models/Account');
const IORedis = require('ioredis');

// Kiểm tra nếu Redis bị vô hiệu hóa
if (process.env.DISABLE_REDIS === 'true') {
  console.log('⚠️ Redis đã bị vô hiệu hóa theo cấu hình. Sử dụng chế độ giả lập.');
  
  const dummyQueue = {
    process: (concurrency, callback) => {
      console.log('Queue đang chạy ở chế độ giả lập - Redis bị vô hiệu hóa');
      return callback;
    },
    add: (data) => {
      console.log('Thêm job vào queue giả lập:', data);
      return Promise.resolve({ id: 'dummy' });
    },
    on: () => {}
  };
  
  module.exports = dummyQueue;
  
} else {
  // Redis client để kết nối với Redis
  let redisConfig = {};

  // Log các biến môi trường Redis (che giấu mật khẩu)
  console.log('Thông tin kết nối Redis:');
  console.log('REDIS_URL tồn tại:', !!process.env.REDIS_URL);
  console.log('REDIS_HOST:', process.env.REDIS_HOST);
  console.log('REDIS_PORT:', process.env.REDIS_PORT);

  // Ưu tiên sử dụng REDIS_URL nếu tồn tại (Railway cung cấp)
  if (process.env.REDIS_URL) {
    try {
      // Parse URL để lấy các thành phần riêng lẻ
      const redisUrl = new URL(process.env.REDIS_URL);
      
      // Tạo cấu hình kết nối rõ ràng thay vì dùng string URL
      redisConfig = {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port) || 6379,
        username: redisUrl.username || 'default',
        password: redisUrl.password,
        // Kích hoạt TLS nếu protocol là rediss://
        tls: redisUrl.protocol === 'rediss:' ? {
          rejectUnauthorized: false
        } : undefined
      };

      console.log('Đã cấu hình Redis từ URL với host:', redisUrl.hostname, 'port:', redisUrl.port);
    } catch (error) {
      console.error('Lỗi khi phân tích REDIS_URL:', error);
      
      // Thử dùng URL trực tiếp nếu parse bị lỗi
      redisConfig = process.env.REDIS_URL;
      console.log('Sử dụng REDIS_URL trực tiếp');
    }
  } else {
    // Ngược lại sử dụng các biến riêng lẻ
    redisConfig = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined
    };
    console.log('Sử dụng cấu hình Redis từ các biến riêng lẻ');
  }

  try {
    // Nếu kết nối thất bại, thử bỏ TLS
    const redisClient = new IORedis(redisConfig);

    // Khởi tạo hàng đợi với kết nối Redis sử dụng IORedis
    const reportQueue = new Bull('report-fetch-queue', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });

    // Kiểm tra kết nối Redis
    redisClient.ping().then((result) => {
      console.log('Kết nối Redis thành công:', result);
    }).catch((error) => {
      console.error('Lỗi khi kết nối Redis:', error);
      console.error('Chi tiết lỗi:', error.message);
    });

    // Giới hạn số lượng job xử lý đồng thời
    reportQueue.process(5, async (job) => {
      try {
        console.log(`Bắt đầu xử lý job #${job.id}`);
        const { accountId, startDate, endDate, channelId } = job.data;
        console.log(`Tìm tài khoản với ID: ${accountId}`);
        const account = await Account.findById(accountId);
        if (!account) {
          throw new Error(`Không tìm thấy tài khoản với ID: ${accountId}`);
        }
        console.log(`Đã tìm thấy tài khoản: ${account.user.name}, bắt đầu xử lý`);
        const result = await processAccountFetch(account, startDate, endDate, channelId, job);
        console.log(`Xử lý thành công job #${job.id} cho tài khoản ${account.user.name}`);
        return result;
      } catch (error) {
        console.error(`Lỗi khi xử lý job #${job.id}:`, error);
        throw error;
      }
    });

    module.exports = reportQueue;
  } catch (error) {
    console.error('Lỗi nghiêm trọng khi khởi tạo Redis/Bull:', error);
    
    // Tạo một queue giả để không gây crash ứng dụng
    const dummyQueue = {
      process: (concurrency, callback) => {
        console.log('Queue đang chạy ở chế độ giả lập do lỗi Redis');
        return callback;
      },
      add: (data) => {
        console.log('Thêm job vào queue giả lập:', data);
        return Promise.resolve({ id: 'dummy' });
      },
      on: () => {}
    };
    module.exports = dummyQueue;
  }
}