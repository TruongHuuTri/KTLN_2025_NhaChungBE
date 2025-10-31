## Luồng hoá đơn thủ công cho FE tích hợp

Mục tiêu: Chủ nhà nhập số liệu (điện, nước, phí khác) → Backend tạo hoá đơn → Người thuê xem hoá đơn của mình → Tạo QR/đơn thanh toán → Theo dõi/confirm thanh toán.

### 0) Lấy hợp đồng của chủ nhà (để chọn, không phải nhập tay)
- Endpoint: GET `landlord/contracts`
- Auth: JWT (role landlord)
- Response (rút gọn):
```json
[
  {
    "contractId": 123,
    "landlordId": 500,
    "roomId": 88,
    "status": "active",
    "startDate": "2025-09-01T00:00:00.000Z",
    "endDate": "2026-09-01T00:00:00.000Z",
    "monthlyRent": 1200000,
    "deposit": 5000000,
    "tenants": [ { "tenantId": 1001, "status": "active", "monthlyRent": 1200000 } ],
    "roomInfo": { "roomNumber": "P802", "currentOccupancy": 1 }
  }
]
```

- Endpoint: GET `landlord/contracts/:id`
- Mục đích: Lấy chi tiết hợp đồng (nếu cần hiển thị thêm trước khi tạo hoá đơn)

### 1) Chủ nhà tạo hoá đơn thủ công
- Endpoint: POST `landlord/invoices/manual`
- Auth: JWT (role landlord)
- Body ví dụ:
```json
{
  "contractId": 123,
  "month": 10,
  "year": 2025,
  "dueDate": "2025-11-15T00:00:00.000Z",
  "electricityStart": 1200,
  "electricityEnd": 1325,
  "electricityUnitPrice": 4000,
  "waterStart": 300,
  "waterEnd": 312,
  "waterUnitPrice": 12000,
  "otherItems": [
    { "description": "Internet", "amount": 100000, "type": "internet" },
    { "description": "Rác", "amount": 30000, "type": "garbage" }
  ],
  "includeRent": true,
  "rentAmountOverride": 0,
  "note": "Ghi chú thêm nếu có"
}
```
- Lưu ý:
  - Nếu không gửi `dueDate` → mặc định ngày 15 của `month/year`.
  - Nếu không gửi `electricityUnitPrice/waterUnitPrice` → lấy từ `room.utilities`.
  - `includeRent` mặc định true. Có thể đặt false để bỏ tiền thuê tháng.
  - Ít nhất phải có một khoản phải thu > 0, otherwise 400.

Response (rút gọn):
```json
{
  "invoiceId": 4567,
  "tenantId": 1001,
  "landlordId": 500,
  "contractId": 123,
  "roomId": 88,
  "invoiceType": "monthly_rent",
  "amount": 1530000,
  "dueDate": "2025-11-15T00:00:00.000Z",
  "status": "pending",
  "description": "Hóa đơn tháng 10/2025 - Tiền thuê tháng 10/2025; Điện: 125 kWh x 4,000đ; Nước: 12 m³ x 12,000đ; Internet; Rác",
  "items": [
    { "description": "Tiền thuê tháng 10/2025", "amount": 1200000, "type": "rent" },
    { "description": "Điện: 125 kWh x 4,000đ", "amount": 500000, "type": "electricity" },
    { "description": "Nước: 12 m³ x 12,000đ", "amount": 144000, "type": "water" },
    { "description": "Internet", "amount": 100000, "type": "internet" },
    { "description": "Rác", "amount": 30000, "type": "garbage" }
  ]
}
```

### 2) Người thuê xem danh sách hoá đơn của mình
- Endpoint: GET `users/me/invoices`
- Auth: JWT (role user)
- Response (rút gọn):
```json
[
  { "invoiceId": 4567, "amount": 1530000, "status": "pending", "dueDate": "2025-11-15T00:00:00.000Z", "invoiceType": "monthly_rent", "description": "..." },
  { "invoiceId": 4566, "amount": 5000000, "status": "paid", "dueDate": "2025-10-01T00:00:00.000Z", "invoiceType": "initial_payment", "paidDate": "2025-09-30T10:15:02.000Z" }
]
```

### 3) Tạo QR/đơn thanh toán cho hoá đơn
- Endpoint: POST `payments/generate-qr`
- Auth: JWT (role user)
- Body:
```json
{ "invoiceId": 4567 }
```
- Response: trả về `orderId`, `qrCodeUrl`, `qrCodeData`, `expiryAt`, `amount`.
```json
{
  "orderId": "ORD_1759208983621_4567",
  "qrCodeUrl": "https://.../qr.png",
  "qrCodeData": "...",
  "expiryAt": "2025-10-31T10:45:00.000Z",
  "amount": 1530000,
  "isZaloPayQR": true
}
```

### 4) Kiểm tra trạng thái thanh toán
- Endpoint: GET `payments/status/:orderId`
- Response ví dụ:
```json
{ "orderId": "ORD_1759208983621_4567", "status": "paid", "paidAt": "2025-10-31T10:15:02.000Z", "paymentMethod": "zalopay" }
```

### 5) Xác nhận thanh toán thủ công (nếu không dùng callback)
- Endpoint: PUT `payments/confirm`
- Body:
```json
{ "orderId": "ORD_1759208983621_4567", "paymentMethod": "zalopay" }
```
- Kết quả: cập nhật `payment-orders` và `invoices` → `status = paid`, set `paidAt/paidDate`, `paymentMethod`.

### 6) Ghi chú tích hợp FE
- Tab “Hoá đơn” của người thuê: gọi `GET users/me/invoices` để hiển thị list.
- Nút “Thanh toán”: gọi `POST payments/generate-qr` → mở QR trả về (`qrCodeUrl`/`qrCodeData`).
- Poll trạng thái: `GET payments/status/:orderId` mỗi 3–5s cho đến khi `status = paid`.
- Nếu order hết hạn: `POST payments/regenerate-qr/:orderId` để xin QR mới.

### 7) Trạng thái/loại hoá đơn
- `status`: `pending`, `paid`, `overdue`, `cancelled`.
- `invoiceType`: `monthly_rent`, `initial_payment`, `utilities`, `deposit`, ... (tùy thực tế từng hoá đơn).

### 8) Lưu ý môi trường
- Auto tạo hoá đơn tháng đã tắt mặc định.
- Chủ nhà phải dùng `POST landlord/invoices/manual` để phát hành hoá đơn tháng.


