const Bull = require('bull');
const { processAccountFetch } = require('../utils/accountProcessor');
const Account = require('../models/Account');
const IORedis = require('ioredis');

// Redis client để kết nối với Redis
const redisClient = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1', // Use environment variable, fallback to localhost for local dev
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined, // Use password if provided
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Khởi tạo hàng đợi với kết nối Redis sử dụng IORedis
const reportQueue = new Bull('report-fetch-queue', {
  createClient: function (type) {
    switch (type) {
      case 'client':
        return redisClient;
      case 'subscriber':
        return new IORedis({
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });
      case 'bclient':
        return new IORedis({
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });
      default:
        throw new Error('Không rõ loại Redis client: ' + type);
    }
  },
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