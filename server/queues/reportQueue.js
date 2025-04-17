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
  // Cấu hình đơn giản để kết nối với Redis trong Docker
  const redisConfig = {
    host: 'localhost', // Kết nối với Redis đang chạy trên máy local
    port: 6379,    // Port mặc định của Redis
  };

  console.log('Đang kết nối tới Redis trên localhost');

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