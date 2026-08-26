# Quỹ của chúng mình 💕

Website nhỏ để hai người cùng quản lý quỹ và chi tiêu theo tháng.

## Firebase đã cấu hình
- Project: `bubududu-e2544`
- 2 UID được phép truy cập đã được đưa vào Firestore Rules.
- Authentication: Email/Password
- Database: Cloud Firestore

## Chức năng
- Đăng nhập bằng 2 tài khoản riêng.
- Quỹ riêng theo từng tháng.
- Đầu tháng mới nếu chưa có quỹ, website sẽ hỏi quỹ tháng đó.
- Chỉ cần một người nhập quỹ, cả hai cùng thấy.
- Có thể điều chỉnh tổng quỹ.
- Thêm khoản chi với tên khoản chi, số tiền, người chi và ngày chi.
- Đồng bộ realtime giữa hai điện thoại.
- Giao diện cũ, đơn giản, mobile-friendly.
- Nếu Firebase lỗi, website hiển thị mã lỗi thay vì loading vô hạn.

## Deploy không cần Node.js
1. Tạo GitHub repository.
2. Upload toàn bộ file trong thư mục này bằng trình duyệt.
3. Import repository vào Vercel.
4. Framework: Vite.
5. Build command: `npm run build`.
6. Output directory: `dist`.
