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
    getJob: () => Promise.resolve(null),
    on: () => {}
  };
  
  module.exports = dummyQueue;
  
} else {
  // Cấu hình Redis từ biến môi trường
  const redisConfig = {
    host: process.env.REDIS_HOST || 'redis', // Mặc định là tên service trong Docker
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || 'your_secure_redis_password',
    maxRetriesPerRequest: null, // Không giới hạn số lần thử lại
    enableReadyCheck: false,    // Tắt kiểm tra sẵn sàng để tránh lỗi
    retryStrategy: (times) => {
      console.log(`Đang thử kết nối lại Redis lần thứ ${times}`);
      return Math.min(times * 100, 3000); // Tăng dần thời gian thử lại tối đa 3s
    }
  };

  console.log('Thông tin kết nối Redis:');
  console.log('REDIS_HOST:', redisConfig.host);
  console.log('REDIS_PORT:', redisConfig.port);
  console.log('REDIS_PASSWORD:', redisConfig.password ? '******' : 'không có');

  try {
    // Khởi tạo hàng đợi với kết nối Redis
    const reportQueue = new Bull('report-fetch-queue', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,  // Giữ 100 job hoàn thành gần nhất
        removeOnFail: 100,      // Giữ 100 job thất bại gần nhất
      },
    });

    // Kiểm tra kết nối Redis
    const redisClient = new IORedis(redisConfig);
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
      getJob: () => Promise.resolve(null),
      on: () => {}
    };
    module.exports = dummyQueue;
  }
}