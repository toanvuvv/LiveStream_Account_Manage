# Hướng dẫn sử dụng tên miền tùy chỉnh

## Cách 1: Sử dụng file hosts (cách đơn giản nhất)

1. Mở file hosts với quyền quản trị viên:
   - Windows: `C:\Windows\System32\drivers\etc\hosts`
   - macOS/Linux: `/etc/hosts`

2. Thêm dòng sau vào file:
   ```
   127.0.0.1 hnmedia.account
   ```

3. Lưu file và khởi động lại trình duyệt

4. Bây giờ bạn có thể truy cập ứng dụng qua `http://hnmedia.account:5000`

## Cách 2: Sử dụng Traefik như reverse proxy

1. Đảm bảo port 80 không được sử dụng bởi ứng dụng khác

2. Chạy ứng dụng với Traefik:
   ```
   docker-compose -f docker-compose.traefik.yml up -d
   ```

3. Truy cập ứng dụng tại `http://hnmedia.account`
   (Vẫn cần thêm entry vào file hosts như Cách 1)

4. Xem dashboard Traefik tại `http://localhost:8080`

## Cách 3: Sử dụng tên miền thật (cho môi trường production)

1. Đăng ký tên miền thật (ví dụ: hnmedia.account) từ nhà cung cấp tên miền

2. Cấu hình DNS A record trỏ đến IP của máy chủ

3. Cấu hình SSL/TLS với Let's Encrypt

4. Bổ sung thêm cấu hình HTTPS trong Traefik

## Lưu ý

- Nếu bạn muốn thay đổi tên miền, hãy cập nhật trong file hosts và các file Docker Compose
- Nếu sử dụng Traefik, có thể thêm nhiều tên miền bằng cách thêm label 