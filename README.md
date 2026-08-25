# Quỹ của chúng mình 💕

Website React + Firebase Authentication + Firestore dành cho đúng 2 người.

## Chức năng

- Đăng nhập bằng 2 tài khoản riêng.
- Mỗi tháng có một tổng quỹ chung.
- Nếu tháng mới chưa có quỹ, website tự mở hộp hỏi quỹ tháng.
- Chỉ cần một người nhập và lưu, người còn lại thấy ngay.
- Có thể điều chỉnh tổng quỹ bất kỳ lúc nào.
- Thêm khoản chi với:
  - nội dung
  - số tiền
  - người chi
  - ngày chi
- Tự động tính:
  - Tổng tiền tháng
  - Đã chi
  - Còn lại
- Dữ liệu đồng bộ realtime qua Firestore.

## 1. Tạo Firebase

Vào Firebase Console và tạo một project.

Bật:

1. Authentication → Sign-in method → Email/Password
2. Firestore Database → Create database

Tạo đúng 2 tài khoản trong Authentication.

## 2. Lấy Firebase config

Firebase Console → Project settings → Your apps → Web app.

Copy config vào:

`src/firebase.js`

Thay:

- YOUR_API_KEY
- YOUR_PROJECT
- YOUR_PROJECT_ID
- YOUR_MESSAGING_SENDER_ID
- YOUR_APP_ID

## 3. Lấy UID của 2 người

Firebase Console → Authentication → Users.

Copy UID của hai tài khoản.

Sau đó thay `USER_1_UID` và `USER_2_UID` ở:

- `src/App.jsx`
- `firestore.rules`

Lưu ý: phải thay ở cả hai file.

## 4. Deploy Firestore Rules

Firebase Console → Firestore Database → Rules.

Copy nội dung `firestore.rules` vào đó rồi Publish.

## 5. Chạy website

Cài Node.js.

Mở Terminal tại thư mục project:

```bash
npm install
npm run dev
```

Sau đó mở địa chỉ Vite hiển thị, thường là:

http://localhost:5173

## 6. Đưa website lên GitHub + Vercel

Có thể push toàn bộ project lên GitHub, sau đó import repository vào Vercel.

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

Firebase không cần server riêng. Firestore chính là backend lưu dữ liệu.

## Cấu trúc dữ liệu

Firestore:

```text
months
  └── 2026-08
       ├── fund
       ├── month
       ├── updatedBy
       └── updatedAt

expenses
  └── randomDocumentId
       ├── month
       ├── amount
       ├── note
       ├── date
       ├── payerUid
       ├── payerName
       ├── createdBy
       └── createdAt
```

Mỗi tháng dùng một document riêng, ví dụ `2026-08`, `2026-09`.

Vì vậy khi sang tháng mới, website tự thấy document tháng đó chưa tồn tại và hỏi hai bạn nhập quỹ mới.


## Nếu website chỉ hiện vòng tròn loading
Mở F12 → Console để xem lỗi Firestore. Bản này không còn treo vô hạn khi Firestore trả lỗi; màn hình sẽ hiển thị mã lỗi để dễ sửa.

Đảm bảo trong Firebase: Firestore Database đã được tạo, Firestore Rules đã Publish, và tài khoản đang đăng nhập thuộc đúng một trong hai UID được phép.
