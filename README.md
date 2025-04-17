# LiveStream Account Management

Hệ thống quản lý tài khoản và báo cáo hoa hồng cho người làm livestream affiliate.

## Tính năng chính

- Thêm nick mới bằng cách paste JSON từ extension
- Quản lý nhóm (thêm, sửa, xóa)
- Fetch dữ liệu báo cáo hoa hồng từ API
- Hiển thị hoa hồng, doanh thu, số đơn theo bảng
- Lọc dữ liệu theo kênh (livestream, video, mạng xã hội)
- Sắp xếp và lọc theo ngưỡng hoa hồng
- Xuất báo cáo ra Excel
- Xem danh sách phiên livestream và chi tiết phiên
- Các tính năng quản lý nick: test cookies, cập nhật cookies, đổi nhóm, xóa nick

## Cài đặt

### Yêu cầu

- Node.js (v16 trở lên)
- MongoDB (cài đặt local hoặc MongoDB Atlas)

### Bước 1: Clone project

```bash
git clone <repository-url>
cd LiveStream_Acc_Management
```

### Bước 2: Cài đặt dependencies

```bash
npm install
cd client
npm install
cd ..
```

### Bước 3: Cấu hình môi trường

Tạo file `.env` với nội dung:

```
MONGODB_URI=mongodb://localhost:27017/livestream_acc_management
PORT=5000
JWT_SECRET=your_jwt_secret_key
CRYPTO_SECRET=your_crypto_secret_key
NODE_ENV=development
```

### Bước 4: Chạy ứng dụng

Để chạy cả frontend và backend:

```bash
npm run dev
```

Chỉ chạy backend:

```bash
npm run server
```

Chỉ chạy frontend:

```bash
npm run client
```

## Hướng dẫn sử dụng

### Thêm Nick Mới

1. Vào trang "Thêm Nick Mới"
2. Paste dữ liệu JSON từ extension vào textarea
3. Chọn nhóm từ dropdown (hoặc tạo nhóm mới)
4. Nhấn "Thêm Nick"

### Quản Lý Nhóm

1. Vào trang "Quản Lý Nhóm"
2. Tạo nhóm mới, sửa hoặc xóa nhóm
3. Xem danh sách nick trong nhóm

### Fetch Dữ Liệu Báo Cáo

1. Vào trang chủ
2. Chọn khoảng thời gian (từ ngày - đến ngày)
3. Chọn nhóm và kênh (nếu cần)
4. Nhấn "Fetch Dữ Liệu Mới"

### Xem Danh Sách Phiên Live

1. Vào trang "Danh Sách Nick"
2. Nhấn nút "Xem Phiên" bên cạnh nick muốn xem
3. Xem danh sách phiên livestream
4. Nhấn vào một phiên để xem chi tiết

## Cấu trúc dự án

```
LiveStream_Acc_Management/
  ├── server/               # Backend
  │   ├── models/           # MongoDB models
  │   ├── controllers/      # API controllers
  │   ├── routes/           # API routes
  │   ├── utils/            # Helper functions
  │   ├── middleware/       # Express middleware
  │   └── server.js         # Express server
  ├── client/               # Frontend (React)
  │   ├── public/           # Static files
  │   └── src/              # React source code
  │       ├── components/   # React components
  │       ├── services/     # API services
  │       ├── App.js        # Main app component
  │       └── index.js      # Entry point
  ├── cache/                # Cache directory for reports
  ├── .env                  # Environment variables
  └── package.json          # Project dependencies
```

## Lưu ý bảo mật

- Cookies của người dùng được mã hóa bằng CryptoJS trước khi lưu vào database.
- Đặt `CRYPTO_SECRET` khác với `JWT_SECRET` để tăng tính bảo mật.
- Trong môi trường production, đảm bảo sử dụng HTTPS và cấu hình CORS phù hợp. 