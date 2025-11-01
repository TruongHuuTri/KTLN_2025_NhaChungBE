# 💰 Luồng Thanh Toán Phí Duy Trì Cho Landlord

## 📋 Tổng Quan

Hệ thống tự động tạo hóa đơn phí duy trì hàng tháng cho tất cả landlord vào ngày 1 mỗi tháng. Landlord có thể thanh toán qua ZaloPay giống như các hóa đơn thông thường.

## 🔄 Luồng Hoạt Động

### 1. Tự Động Tạo Hóa Đơn (Cron Job)

- **Thời gian**: Ngày 1 mỗi tháng lúc 0h00
- **Service**: `MaintenanceFeeService`
- **Logic**:
  - Tìm tất cả landlord đang hoạt động (`role = 'landlord'`, `isActive = true`)
  - Kiểm tra xem đã tạo hóa đơn cho tháng hiện tại chưa
  - Tạo hóa đơn mới cho mỗi landlord:
    - **Loại**: `maintenance_fee`
    - **Số tiền**: 200,000 VNĐ (mặc định, có thể config)
    - **Ngày đến hạn**: Ngày 5 của tháng hiện tại
    - **Mô tả**: "Phí duy trì tháng MM/YYYY - Phí sử dụng hệ thống"
  - Không có `tenantId`, `roomId`, `contractId`, `items` (vì là phí hệ thống)

### 2. Xem Danh Sách Hóa Đơn Phí Duy Trì

#### Endpoint: GET `landlord/invoices`

**Request**:
```http
GET /api/landlord/invoices
Authorization: Bearer <landlord_token>
```

**Response**:
```json
[
  {
    "invoiceId": 1234,
    "landlordId": 500,
    "invoiceType": "maintenance_fee",
    "amount": 200000,
    "dueDate": "2025-11-05T00:00:00.000Z",
    "status": "pending",
    "description": "Phí duy trì tháng 11/2025 - Phí sử dụng hệ thống",
    "createdAt": "2025-11-01T00:00:00.000Z",
    "updatedAt": "2025-11-01T00:00:00.000Z"
  },
  {
    "invoiceId": 1000,
    "landlordId": 500,
    "invoiceType": "maintenance_fee",
    "amount": 200000,
    "dueDate": "2025-10-05T00:00:00.000Z",
    "status": "paid",
    "description": "Phí duy trì tháng 10/2025 - Phí sử dụng hệ thống",
    "paymentMethod": "zalopay",
    "paidDate": "2025-10-12T14:30:00.000Z",
    "createdAt": "2025-10-01T00:00:00.000Z",
    "updatedAt": "2025-10-12T14:30:00.000Z"
  }
]
```

### 3. Tạo QR Code Thanh Toán ZaloPay

#### Endpoint: POST `payments/generate-zalopay-qr`

**Request**:
```http
POST /api/payments/generate-zalopay-qr
Authorization: Bearer <landlord_token>
Content-Type: application/json

{
  "invoiceId": 1234
}
```

**Response**:
```json
{
  "orderId": "ORD_1730415600000_1234",
  "qrCodeUrl": "https://gateway.zalopay.vn/qr/xxxxx",
  "qrCodeData": "00020101021238570010A0000007750110Zalopay5204505053037045406200.005802VN62110901xxxxxxxxx6304xxxx",
  "expiryAt": "2025-11-02T00:00:00.000Z",
  "amount": 200000,
  "isZaloPayQR": true
}
```

### 4. Thanh Toán Qua ZaloPay

- Landlord quét QR code bằng ứng dụng ZaloPay
- Xác nhận thanh toán
- ZaloPay gọi callback về hệ thống
- Hệ thống tự động cập nhật:
  - `invoice.status` → `'paid'`
  - `invoice.paidDate` → thời gian hiện tại
  - `invoice.paymentMethod` → `'zalopay'`
  - `payment_order.status` → `'paid'`
  - `payment_order.paidAt` → thời gian hiện tại

### 5. Kiểm Tra Trạng Thái Thanh Toán

#### Endpoint: GET `payments/status/:orderId`

**Request**:
```http
GET /api/payments/status/ORD_1730415600000_1234
Authorization: Bearer <landlord_token>
```

**Response**:
```json
{
  "orderId": "ORD_1730415600000_1234",
  "status": "paid",
  "paidAt": "2025-11-01T14:30:00.000Z",
  "paymentMethod": "zalopay"
}
```

## ⚙️ Cấu Hình

### Environment Variables

Thêm vào file `.env`:

```env
# Bật/tắt tự động tạo hóa đơn phí duy trì (mặc định: true)
MAINTENANCE_FEE_ENABLED=true

# Số tiền phí duy trì hàng tháng (VNĐ) (mặc định: 200000)
MAINTENANCE_FEE_AMOUNT=200000
```

### Cron Schedule

Cron job chạy tự động:
- **Schedule**: `0 0 1 * *` (0h sáng ngày 1 mỗi tháng)
- **Service**: `MaintenanceFeeService.generateMonthlyMaintenanceInvoices()`

## 📝 Lưu Ý Kỹ Thuật

### Schema Changes

**Invoice Schema**:
- `tenantId`: Optional (cho phí duy trì)
- `roomId`: Optional (cho phí duy trì)
- `contractId`: Optional (cho phí duy trì)
- `invoiceType`: Thêm `'maintenance_fee'`

**PaymentOrder Schema**:
- `tenantId`: Optional (cho phí duy trì)
- `orderType`: Thêm `'maintenance_fee'`

### API Compatibility

- Tất cả các API thanh toán hiện có đều hoạt động với hóa đơn phí duy trì
- Không cần endpoint mới cho thanh toán
- Landlord xem hóa đơn qua endpoint `landlord/invoices` hiện có
- QR code ZaloPay hoạt động bình thường

## 🧪 Testing

### Manual Trigger

Có thể test tính năng bằng cách gọi endpoint manual:

```http
POST /api/landlord/test/generate-maintenance-fee
Authorization: Bearer <landlord_token>
```

**Response**:
```json
{
  "message": "Generated 5 maintenance fee invoices",
  "count": 5
}
```

### Kiểm Tra Hóa Đơn

```http
GET /api/landlord/invoices?invoiceType=maintenance_fee
Authorization: Bearer <landlord_token>
```

## 📊 Dashboard Integration

Hóa đơn phí duy trì được tính vào:
- Tổng doanh thu của hệ thống
- Thống kê theo tháng (nếu có dashboard admin)
- Lịch sử thanh toán của landlord

Lưu ý: `revenue.totalPaid` trong dashboard landlord KHÔNG bao gồm phí duy trì (vì đó là doanh thu OUT, không phải IN).

## 🔍 Troubleshooting

### Hóa đơn không được tạo tự động

1. Kiểm tra `MAINTENANCE_FEE_ENABLED=true` trong `.env`
2. Kiểm tra cron job có chạy không (xem log)
3. Kiểm tra có landlord nào `isActive=true` không

### QR code không hoạt động

1. Kiểm tra cấu hình ZaloPay trong `.env`
2. Kiểm tra callback URL đã được config đúng chưa
3. Xem log của ZaloPay API

### Thanh toán không cập nhật

1. Kiểm tra ZaloPay callback URL có hoạt động không
2. Kiểm tra signature verification trong callback
3. Xem log của `ZaloPayCallbackController`
