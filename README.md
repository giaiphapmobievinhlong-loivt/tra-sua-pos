# 🧋 Trà Sữa POS

Hệ thống quản lý bán hàng cho quán trà sữa. Xây dựng bằng **Next.js 14** + **PostgreSQL (Neon)**, deploy lên **Vercel**.

## Tính năng

- 🛒 **Bán Hàng**: POS giao diện nhanh, hỗ trợ giỏ hàng, thanh toán, tiền thối
- 💰 **Thu Chi**: Quản lý dòng tiền hàng ngày (nhập nguyên liệu, chi phí khác)
- 📋 **Đơn Hàng**: Xem lịch sử đơn theo ngày, chi tiết từng đơn
- 📊 **Báo Cáo**: Doanh thu, lợi nhuận ước tính, biểu đồ theo giờ

## Cài đặt & Deploy

### 1. Tạo Database (Neon DB - miễn phí)
1. Đăng ký tài khoản tại [neon.tech](https://neon.tech)
2. Tạo project mới
3. Copy **Connection String** (dạng `postgresql://...`)

### 2. Deploy lên Vercel
1. Push code lên GitHub
2. Kết nối repo với [Vercel](https://vercel.com)
3. Thêm Environment Variables:
   ```
   DATABASE_URL=postgresql://your-neon-connection-string
   JWT_SECRET=random-secret-string-ít-nhất-32-ký-tự
   ```
4. Deploy!

### 3. Khởi tạo Database
Sau khi deploy, truy cập:
```
https://your-app.vercel.app/api/setup
```
Sẽ tự động tạo tables và thêm dữ liệu mẫu.

### Tài khoản mặc định
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| thu | staff123 | staff |

## Chạy Local

```bash
# Cài dependencies
npm install

# Copy env
cp .env.example .env
# Điền DATABASE_URL và JWT_SECRET vào .env

# Khởi tạo DB
curl http://localhost:3000/api/setup

# Chạy dev
npm run dev
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Recharts
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Neon (serverless)
- **Auth**: JWT (jose) + HTTP-only cookies
- **Deploy**: Vercel

## Cấu trúc thư mục

```
app/
├── (app)/           # Pages cần auth
│   ├── ban-hang/    # Trang bán hàng POS
│   ├── thu-chi/     # Quản lý thu chi
│   ├── don-hang/    # Lịch sử đơn hàng
│   └── bao-cao/     # Báo cáo doanh thu
├── api/             # API Routes
│   ├── auth/        # Login/Logout
│   ├── products/    # Danh sách sản phẩm
│   ├── orders/      # Tạo & xem đơn hàng
│   ├── transactions/# Thu chi
│   ├── reports/     # Báo cáo
│   └── setup/       # Khởi tạo DB
├── login/           # Trang đăng nhập
components/
├── Sidebar.tsx      # Sidebar navigation
lib/
├── db.ts            # Kết nối database
└── auth.ts          # JWT utilities
```
