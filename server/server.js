const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load env vars
dotenv.config();

// Khởi tạo Redis và Bull Queue
const reportQueue = require('./queues/reportQueue');

// Xử lý sự kiện hoàn thành và lỗi từ queue
reportQueue.on('completed', (job, result) => {
  console.log(`Job #${job.id} hoàn thành cho tài khoản ${job.data.account.user.name}: ${result.totalItems} items`);
});

reportQueue.on('failed', (job, error) => {
  console.error(`Job #${job.id} thất bại cho tài khoản ${job.data.account.user.name}:`);
  console.error(error);
});

reportQueue.on('stalled', (job) => {
  console.warn(`Job #${job.id} bị treo (stalled), hệ thống sẽ thử lại...`);
});

// Tạo thư mục cache nếu chưa tồn tại
const cacheDir = path.join(__dirname, '..', 'cache', 'reports');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Khởi tạo Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected');
    
    // Tạo tài khoản admin mặc định nếu chưa có người dùng nào
    const createDefaultAdmin = require('./utils/createDefaultAdmin');
    createDefaultAdmin();
  })
  .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/accounts', require('./routes/accountRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'build', 'index.html'));
  });
}

// Xử lý lỗi 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Server Error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Bull queue đã được khởi động và sẵn sàng xử lý công việc');
}); 