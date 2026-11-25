# Kết nối SQL Server Express

Ứng dụng dùng `localhost:1433`, database `SmartHome`, Windows Authentication và tin cậy chứng chỉ máy chủ, theo cấu hình trong `.env`.

1. Mở `schema.sql` trong SSMS, kết nối tới `.\SQLEXPRESS` bằng Windows Authentication dưới đúng tài khoản Windows sẽ chạy ứng dụng, rồi chạy toàn bộ script. Script tự tạo database và các bảng nếu chưa có.
2. Chạy `npm run dev` tại thư mục dự án. Lệnh này khởi động API SQL và giao diện web; giao diện chuyển các yêu cầu `/api` tới API.
3. Mở `http://localhost:5173`. Kiểm tra API/database tại `http://localhost:4000/api/health`.

Nếu SQL Server dùng cổng khác, sửa `SQL_PORT` trong `.env`. Windows Authentication sử dụng tài khoản Windows của tiến trình Node.js; chạy ứng dụng bằng cùng tài khoản có quyền vào database.
