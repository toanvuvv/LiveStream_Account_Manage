# Hướng dẫn chạy ứng dụng với Docker

## Chuẩn bị

Đảm bảo bạn đã cài đặt:
- [Docker](https://www.docker.com/products/docker-desktop)
- [Docker Compose](https://docs.docker.com/compose/install/) (thường được cài đặt cùng Docker Desktop)

## Cách chạy ứng dụng

1. Mở terminal tại thư mục gốc của dự án

2. Chạy lệnh sau để khởi động ứng dụng:
   ```
   docker-compose up -d
   ```

3. Ứng dụng sẽ khởi chạy tại địa chỉ: http://localhost:5000

4. Để dừng ứng dụng, chạy:
   ```
   docker-compose down
   ```

## Lưu ý

- Ứng dụng được cấu hình để sử dụng MongoDB Atlas từ file .env. Nếu bạn muốn sử dụng MongoDB local thông qua Docker, hãy bỏ comment các phần liên quan trong docker-compose.yml và thay đổi biến môi trường MONGODB_URI.

- Thư mục `cache` được mount vào container để lưu trữ các báo cáo và dữ liệu tạm thời.

## Rebuild image

Nếu bạn có thay đổi code và muốn rebuild image:

```
docker-compose up -d --build
``` 