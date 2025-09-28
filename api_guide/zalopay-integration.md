# ZaloPay Integration API Guide

## Tổng quan

Hệ thống tích hợp ZaloPay để xử lý thanh toán hóa đơn thuê nhà trọ. Bao gồm tạo QR code, xử lý callback và redirect.

## Endpoints

### 1. Tạo QR Code ZaloPay

**Endpoint:** `POST /api/payments/generate-zalopay-qr`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "invoiceId": 123
}
```

**Response:**
```json
{
  "orderId": "ORD_1759029284633_123",
  "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6e...",
  "qrCodeData": "https://qcgateway.zalopay.vn/openinapp?order=eyJ6cHRyYW5zdG9rZW4iOiJBQ1l1R0J3WWRnaVVvRmIzdWN3SnQtT2ciLCJhcHBpZCI6MjU1NH0=",
  "expiryAt": "2025-09-28T02:46:59.978Z",
  "amount": 1000000,
  "zalopayResponse": {
    "return_code": 1,
    "return_message": "Giao dịch thành công",
    "order_url": "https://qcgateway.zalopay.vn/openinapp?order=...",
    "order_token": "ACYuGBwYdgiUoFb3ucwJt-Og"
  }
}
```

### 2. Kiểm tra trạng thái thanh toán

**Endpoint:** `GET /api/payments/status/:orderId`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "orderId": "ORD_1759029284633_123",
  "status": "paid",
  "paidAt": "2025-09-28T10:15:02.000Z",
  "paymentMethod": "zalopay"
}
```

### 3. Lấy danh sách hóa đơn chờ thanh toán

**Endpoint:** `GET /api/payments/pending-invoices`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
[
  {
    "invoiceId": 123,
    "amount": 1000000,
    "dueDate": "2025-09-30T00:00:00.000Z",
    "invoiceType": "rent",
    "roomNumber": "A101",
    "isQrGenerated": true,
    "canPay": true
  }
]
```

## Callback Endpoints (Không cần auth)

### 1. ZaloPay Callback (Server-to-Server)

**Endpoint:** `POST /api/payments/zalopay/callback`

**Request Body (từ ZaloPay):**
```json
{
  "data": "{\"app_id\":2554,\"app_trans_id\":\"250928_284634\",\"amount\":10000,\"zp_trans_id\":250928000010931,\"status\":1}",
  "mac": "c20b72f869216fcd0d5d60a8d56ade97c55e62a676bb7518c8aded7b90eb987e",
  "type": 1
}
```

**Response:**
```json
{
  "return_code": 1,
  "return_message": "OK"
}
```

### 2. User Redirect (Sau khi thanh toán)

**Endpoint:** `GET /api/payments/zalopay/return`

**Query Parameters:**
- `app_trans_id`: Mã giao dịch
- `amount`: Số tiền
- `status`: Trạng thái

**Response:** HTML page hiển thị kết quả thanh toán

## Environment Variables

```env
# ZaloPay Sandbox Configuration
ZALOPAY_APP_ID=2554
ZALOPAY_KEY1=sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn
ZALOPAY_KEY2=trMrHtvjo6myautxDUiAcYsVtaeQ8nhf

# ZaloPay API URLs
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
ZALOPAY_CALLBACK_URL=https://your-domain.com/api/payments/zalopay/callback
ZALOPAY_REDIRECT_URL=https://your-domain.com/api/payments/zalopay/return

# QR Code Settings
QR_CODE_SIZE=200
```

## Flow Thanh Toán

### 1. Tạo QR Code
```bash
curl -X POST "http://localhost:3001/api/payments/generate-zalopay-qr" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": 123}'
```

### 2. User quét QR và thanh toán
- User mở ZaloPay app
- Quét QR code
- Xác nhận thanh toán

### 3. ZaloPay gửi callback
- ZaloPay POST callback về server
- Server xử lý và cập nhật database
- Server trả về `{"return_code": 1, "return_message": "OK"}`

### 4. User redirect
- ZaloPay redirect user về `/return` endpoint
- Hiển thị trang thành công

## Error Handling

### Common Errors

**Invoice not found:**
```json
{
  "statusCode": 404,
  "message": "Invoice not found",
  "error": "Not Found"
}
```

**Invoice already paid:**
```json
{
  "statusCode": 400,
  "message": "Invoice already paid",
  "error": "Bad Request"
}
```

**ZaloPay API error:**
```json
{
  "statusCode": 500,
  "message": "ZaloPay API error: Giao dịch thất bại",
  "error": "Internal Server Error"
}
```

## Testing

### 1. Test tạo QR
```bash
# Tạo invoice trước
curl -X POST "http://localhost:3001/api/payments/generate-zalopay-qr" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": 123}'
```

### 2. Test callback
```bash
curl -X POST "http://localhost:3001/api/payments/zalopay/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "data": "{\"app_id\":2554,\"app_trans_id\":\"test_123\",\"amount\":10000,\"status\":1}",
    "mac": "test_mac",
    "type": 1
  }'
```

### 3. Test redirect
```bash
curl "http://localhost:3001/api/payments/zalopay/return?app_trans_id=test_123&amount=10000&status=1"
```

## Production Deployment

### 1. Environment Setup
- Thay đổi `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2` thành production keys
- Cập nhật `ZALOPAY_ENDPOINT` thành production URL
- Set `ZALOPAY_CALLBACK_URL` và `ZALOPAY_REDIRECT_URL` thành domain thật

### 2. Security
- Callback endpoints không cần auth (ZaloPay gọi trực tiếp)
- Validate MAC checksum trong callback
- Rate limiting cho callback endpoints

### 3. Monitoring
- Log tất cả callback requests
- Monitor payment success rate
- Alert khi callback fails

## Troubleshooting

### Callback không nhận được
1. Kiểm tra `ZALOPAY_CALLBACK_URL` có đúng không
2. Đảm bảo endpoint public accessible
3. Check firewall/security groups

### QR code không quét được
1. Verify ZaloPay API response
2. Check `order_url` trong response
3. Test với ZaloPay sandbox

### Payment status không update
1. Check callback logs
2. Verify database connection
3. Check payment order creation

## Support

- ZaloPay Documentation: https://developers.zalopay.vn/
- Sandbox Testing: https://sb-openapi.zalopay.vn/
- Production API: https://openapi.zalopay.vn/
