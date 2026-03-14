# 🧋 Trà Sữa Nhà Mèo — POS System

Hệ thống quản lý bán hàng cho quán trà sữa. Xây dựng bằng **Next.js 14** + **PostgreSQL (Neon)**, deploy lên **Vercel**.

## Tính năng

- 🛒 **Bán Hàng** — POS nhanh, hỗ trợ giỏ hàng, combo, discount, thanh toán tiền mặt/chuyển khoản
- 🌐 **Đặt hàng online** — Khách order qua web `/order`, thanh toán MoMo/chuyển khoản, theo dõi đơn real-time
- 💰 **Thu Chi** — Quản lý dòng tiền hàng ngày
- 📋 **Đơn Hàng** — Quản lý đơn tại quán & giao hàng, xác nhận thanh toán
- 📊 **Báo Cáo** — Doanh thu theo ngày/tháng, biểu đồ theo giờ, top sản phẩm
- ⚙️ **Quản Lý** — Menu, nhân viên, discount, QR bàn, cài đặt cửa hàng

## Cài đặt & Deploy

### 1. Tạo Database (Neon DB)
1. Đăng ký tại [neon.tech](https://neon.tech)
2. Tạo project → copy **Connection String**

### 2. Deploy lên Vercel
1. Push code lên GitHub
2. Kết nối repo với [Vercel](https://vercel.com)
3. Thêm Environment Variables:
   ```
   DATABASE_URL=postgresql://your-neon-connection-string
   JWT_SECRET=random-secret-ít-nhất-32-ký-tự
   GOONG_API_KEY=your-goong-api-key
   ```
4. Deploy!

### 3. Khởi tạo Database
Sau khi deploy, truy cập **một lần**:
```
https://your-domain.vercel.app/api/setup
```

### 4. Seed menu
```
https://your-domain.vercel.app/api/seed-menu?secret=YOUR_JWT_SECRET_FIRST_8_CHARS
```

## Tài khoản mặc định

| Username | Password | Role |
|---|---|---|
| admin | admin123 | Admin |
| thu | staff123 | Staff |

> ⚠️ Đổi mật khẩu ngay sau khi deploy!

## Tech Stack

- **Frontend**: Next.js 14 App Router, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon serverless)
- **Deploy**: Vercel
- **Auth**: JWT (jose) + bcryptjs
- **Maps**: Goong.io (address autocomplete)
