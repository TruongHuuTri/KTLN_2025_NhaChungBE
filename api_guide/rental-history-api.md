# API Rental History & Contract Termination - Implementation Guide

## Tổng quan

API này cho phép:
- User hủy hợp đồng thuê (terminate contract)
- Xem lịch sử thuê phòng (rental history)
- Tự động active lại bài đăng khi hợp đồng hết hạn/bị hủy
- Tự động expire contracts hết hạn (chạy cron job hàng ngày lúc 00:00)

---

## 1. Terminate Contract (Hủy hợp đồng)

### Endpoint
```
PUT /users/me/contracts/{contractId}/terminate
```

### Description
Cho phép user hủy hợp đồng hiện tại. Khi hủy:
- Contract status chuyển sang `terminated`
- Phòng được giải phóng (xóa tenant khỏi room)
- Room status chuyển về `available` nếu không còn tenant nào
- **TẤT CẢ** bài đăng liên quan được active lại (nếu có)
- Lưu vào rental history collection

### Request Headers
```
Authorization: Bearer {token}
```

### Request Body
```json
{
  "reason": "string (optional)",
  "terminationDate": "2024-11-10T00:00:00.000Z (optional, default: now)"
}
```

### Response Success (200)
```json
{
  "message": "Hợp đồng đã được hủy thành công",
  "contract": {
    "contractId": 123,
    "status": "terminated",
    "terminatedAt": "2024-11-10T10:30:00.000Z",
    "terminationReason": "Chuyển công tác"
  },
  "affectedPosts": {
    "count": 2,
    "message": "Đã active lại 2 bài đăng"
  }
}
```

### Response Error (400)
```json
{
  "message": "Contract đã hết hạn hoặc đã bị hủy trước đó"
}
```

### Response Error (403)
```json
{
  "message": "Bạn không có quyền hủy hợp đồng này"
}
```

### Response Error (404)
```json
{
  "message": "Không tìm thấy hợp đồng"
}
```

### Frontend Example
```typescript
async function terminateContract(contractId: number, reason?: string) {
  const response = await fetch(`${API_URL}/users/me/contracts/${contractId}/terminate`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      reason: reason,
      terminationDate: new Date().toISOString()
    })
  });
  
  return response.json();
}
```

---

## 2. Get Rental History (Lấy lịch sử thuê)

### Endpoint
```
GET /users/me/rental-history
```

### Description
Lấy danh sách tất cả phòng user đã từng thuê (bao gồm cả đã hủy/hết hạn)

### Request Headers
```
Authorization: Bearer {token}
```

### Query Parameters
```
?page=1
&limit=10
&status=expired,terminated (optional, filter by status)
&sortBy=actualEndDate (optional, default: actualEndDate)
&sortOrder=desc (optional, default: desc)
```

### Response Fields
- `activePostId`: ID của bài đăng đang active cho phòng này (null nếu không có). FE dùng để link user xem lại phòng.

### Response Success (200)
```json
{
  "history": [
    {
      "contractId": 123,
      "roomId": 45,
      "roomNumber": "101",
      "buildingName": "Tòa nhà ABC",
      "buildingId": 10,
      "address": "123 Nguyễn Văn Cừ, Q5, TP.HCM",
      "activePostId": 789,
      "contractStatus": "terminated",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T00:00:00.000Z",
      "actualEndDate": "2024-11-10T00:00:00.000Z",
      "monthlyRent": 3500000,
      "deposit": 7000000,
      "area": 25,
      "images": [
        "https://example.com/room1.jpg",
        "https://example.com/room2.jpg"
      ],
      "landlordInfo": {
        "landlordId": 5,
        "name": "Nguyễn Văn A",
        "phone": "0901234567",
        "email": "landlord@example.com"
      },
      "terminationReason": "Chuyển công tác",
      "terminatedAt": "2024-11-10T10:30:00.000Z",
      "totalMonthsRented": 10,
      "totalAmountPaid": 35000000
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

### Frontend Example
```typescript
async function getRentalHistory(page = 1, limit = 10, status?: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(status && { status })
  });
  
  const response = await fetch(`${API_URL}/users/me/rental-history?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  
  // FE có thể dùng activePostId để link đến post:
  // data.history.forEach(item => {
  //   if (item.activePostId) {
  //     const postUrl = `/posts/${item.activePostId}`;
  //   }
  // });
  
  return data;
}
```

---

## 3. Get Rental History Detail (Chi tiết lịch sử thuê)

### Endpoint
```
GET /users/me/rental-history/{contractId}
```

### Description
Lấy chi tiết một lịch sử thuê cụ thể, bao gồm cả danh sách hóa đơn

### Request Headers
```
Authorization: Bearer {token}
```

### Response Success (200)
```json
{
  "contractId": 123,
  "roomId": 45,
  "roomNumber": "101",
  "buildingName": "Tòa nhà ABC",
  "contractStatus": "terminated",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T00:00:00.000Z",
  "actualEndDate": "2024-11-10T00:00:00.000Z",
  "monthlyRent": 3500000,
  "deposit": 7000000,
  "landlordInfo": {
    "landlordId": 5,
    "name": "Nguyễn Văn A",
    "phone": "0901234567",
    "email": "landlord@example.com"
  },
  "terminationReason": "Chuyển công tác",
  "invoices": [
    {
      "invoiceId": 1001,
      "month": "2024-01",
      "amount": 3500000,
      "status": "paid",
      "paidAt": "2024-01-05T00:00:00.000Z"
    },
    {
      "invoiceId": 1002,
      "month": "2024-02",
      "amount": 3500000,
      "status": "paid",
      "paidAt": "2024-02-05T00:00:00.000Z"
    }
  ],
  "totalMonthsRented": 10,
  "totalAmountPaid": 35000000
}
```

### Response Error (404)
```json
{
  "message": "Không tìm thấy lịch sử thuê"
}
```

### Frontend Example
```typescript
async function getRentalHistoryDetail(contractId: number) {
  const response = await fetch(`${API_URL}/users/me/rental-history/${contractId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
}
```

---

## 4. Cron Job - Auto Expire Contracts

### Description
- Chạy tự động hàng ngày lúc **00:00** (midnight)
- Tìm và expire tất cả contracts có `endDate < now` và `status = 'active'`
- Thực hiện các bước tương tự terminate contract:
  - Chuyển status sang `expired`
  - Giải phóng phòng
  - Active lại bài đăng
  - Tạo rental history cho tất cả tenants

### Manual Trigger (Test Only)
```
POST /landlord/test/expire-contracts
Authorization: Bearer {landlord_token}
```

Response:
```json
{
  "expired": 5,
  "errors": 0
}
```

---

## 5. Database Schema

### RentalHistory Collection
```javascript
{
  userId: Number,           // Tenant ID
  contractId: Number,       // Contract ID tham chiếu
  roomId: Number,
  buildingId: Number,
  landlordId: Number,
  startDate: Date,
  endDate: Date,
  actualEndDate: Date,      // Ngày kết thúc thực tế
  monthlyRent: Number,
  deposit: Number,
  contractStatus: String,   // 'expired' | 'terminated'
  terminationReason: String,
  terminatedAt: Date,
  totalMonthsRented: Number,
  totalAmountPaid: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### RentalContract Schema Updates
Đã thêm các field mới:
```javascript
{
  // ... existing fields
  terminatedAt: Date,       // Thời điểm hủy hợp đồng
  terminationReason: String, // Lý do hủy
  actualEndDate: Date       // Ngày kết thúc thực tế
}
```

---

## 6. UI Flow Suggestions

### Terminate Contract Flow
1. User vào "Phòng của tôi" / "My Room"
2. Click button "Hủy hợp đồng" / "Terminate Contract"
3. Modal xác nhận:
   - Input lý do (optional)
   - Input ngày kết thúc (optional, default: hôm nay)
   - Button "Xác nhận" / "Confirm"
4. Gọi API `PUT /users/contracts/:id/terminate`
5. Hiển thị thông báo thành công
6. Redirect sang tab "Lịch sử thuê" / "Rental History"

### Rental History Page
1. Tabs hoặc filters:
   - "Tất cả" (All)
   - "Đã hết hạn" (Expired)
   - "Đã hủy" (Terminated)
2. List view với các thông tin:
   - Ảnh phòng
   - Tên tòa nhà + số phòng
   - Địa chỉ
   - Thời gian thuê
   - Tiền thuê/tháng
   - Status badge
   - **Button "Xem lại phòng"** (nếu có `activePostId`) → Link đến `/posts/{activePostId}`
3. Click vào item → Chi tiết lịch sử thuê
   - Thông tin phòng
   - Thông tin chủ nhà
   - Danh sách hóa đơn đã thanh toán
   - Tổng số tháng đã thuê
   - Tổng số tiền đã trả

---

## 7. Testing

### Test Scenarios

1. **Terminate Active Contract**
   ```bash
   curl -X PUT http://localhost:3001/api/users/me/contracts/123/terminate \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"reason": "Test termination"}'
   ```

2. **Get Rental History with Filters**
   ```bash
   curl -X GET "http://localhost:3001/api/users/me/rental-history?status=terminated&page=1&limit=10" \
     -H "Authorization: Bearer {token}"
   ```

3. **Get Rental History Detail**
   ```bash
   curl -X GET http://localhost:3001/api/users/me/rental-history/123 \
     -H "Authorization: Bearer {token}"
   ```

4. **Manual Expire Contracts (Landlord Only)**
   ```bash
   curl -X POST http://localhost:3000/landlord/test/expire-contracts \
     -H "Authorization: Bearer {landlord_token}"
   ```

---

## 8. Notes

### Logic khi terminate/expire contract:
1. ✅ Update contract status
2. ✅ Remove tenants khỏi room.currentTenants
3. ✅ Update room.status = 'available' nếu không còn tenant
4. ✅ Tìm và active lại **TẤT CẢ** posts của phòng (status: inactive/pending → active)
5. ✅ Return count số bài đăng đã active
6. ✅ Tạo rental history record
7. ✅ Calculate totalMonthsRented và totalAmountPaid

### Cron Job:
- Chạy tự động vào 00:00 mỗi ngày
- Có thể trigger manually qua endpoint test
- Log kết quả: số contracts expired thành công và số lỗi

### Performance:
- Rental history có indexes:
  - `{ userId: 1, actualEndDate: -1 }`
  - `{ contractStatus: 1 }`
- Pagination để tránh load quá nhiều data
- `activePostId` được query riêng cho mỗi item (có thể optimize bằng aggregation nếu cần)
- Post model cần index: `{ roomId: 1, status: 1, createdAt: -1 }` cho performance tốt

---

## 9. API Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PUT | `/users/me/contracts/:contractId/terminate` | User | Hủy hợp đồng |
| GET | `/users/me/rental-history` | User | Lấy lịch sử thuê (có pagination) |
| GET | `/users/me/rental-history/:contractId` | User | Chi tiết lịch sử thuê |
| POST | `/landlord/test/expire-contracts` | Landlord | Manual expire contracts (test only) |

**Note:** Base URL có prefix `/api/`, ví dụ: `http://localhost:3001/api/users/me/rental-history`

---

## 10. Error Handling

| Status Code | Error Message | Description |
|-------------|---------------|-------------|
| 400 | Contract đã hết hạn hoặc đã bị hủy trước đó | Contract không ở trạng thái active |
| 403 | Bạn không có quyền hủy hợp đồng này | User không phải tenant của contract |
| 404 | Không tìm thấy hợp đồng | Contract không tồn tại |
| 404 | Không tìm thấy lịch sử thuê | Rental history không tồn tại |

---

**Implemented by:** Backend Team  
**Date:** November 10, 2024  
**Version:** 1.0

