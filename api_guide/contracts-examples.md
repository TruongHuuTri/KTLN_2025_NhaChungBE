# 📋 Contracts API - JSON Examples

## 🏠 Landlord Contract APIs

### **POST /api/landlord/contracts** - Tạo hợp đồng thuê
```json
{
  "roomId": 1,
  "contractType": "single",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "monthlyRent": 3000000,
  "deposit": 3000000,
  "contractFile": "contract_file_url.pdf",
  "tenants": [
    {
      "tenantId": 123,
      "moveInDate": "2024-01-01",
      "monthlyRent": 3000000,
      "deposit": 3000000,
      "status": "active"
    }
  ],
  "roomInfo": {
    "roomNumber": "A101",
    "area": 25,
    "maxOccupancy": 2,
    "currentOccupancy": 1
  }
}
```

### **GET /api/landlord/contracts** - Lấy danh sách hợp đồng
**Response:**
```json
[
  {
    "contractId": 1,
    "landlordId": 456,
    "roomId": 1,
    "contractType": "single",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "monthlyRent": 3000000,
    "deposit": 3000000,
    "contractFile": "contract_file_url.pdf",
    "tenants": [
      {
        "tenantId": 123,
        "moveInDate": "2024-01-01",
        "monthlyRent": 3000000,
        "deposit": 3000000,
        "status": "active"
      }
    ],
    "roomInfo": {
      "roomNumber": "A101",
      "area": 25,
      "maxOccupancy": 2,
      "currentOccupancy": 1
    },
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### **GET /api/landlord/contracts/:id** - Lấy chi tiết hợp đồng
**Response:**
```json
{
  "contractId": 1,
  "landlordId": 456,
  "roomId": 1,
  "contractType": "single",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "monthlyRent": 3000000,
  "deposit": 3000000,
  "contractFile": "contract_file_url.pdf",
  "tenants": [
    {
      "tenantId": 123,
      "moveInDate": "2024-01-01",
      "monthlyRent": 3000000,
      "deposit": 3000000,
      "status": "active"
    }
  ],
  "roomInfo": {
    "roomNumber": "A101",
    "area": 25,
    "maxOccupancy": 2,
    "currentOccupancy": 1
  },
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### **PUT /api/landlord/contracts/:id** - Cập nhật hợp đồng
```json
{
  "monthlyRent": 3500000,
  "endDate": "2025-01-01"
}
```

### **POST /api/landlord/contracts/:id/tenants** - Thêm người thuê vào hợp đồng
```json
{
  "tenantId": 124,
  "moveInDate": "2024-02-01",
  "monthlyRent": 1500000,
  "deposit": 1500000
}
```

### **DELETE /api/landlord/contracts/:id/tenants/:userId** - Xóa người thuê khỏi hợp đồng
**Response:**
```json
{
  "message": "Tenant removed from contract successfully",
  "contractId": 1,
  "tenantId": 124
}
```

## 💰 Landlord Invoice APIs

### **POST /api/landlord/invoices** - Tạo hóa đơn
```json
{
  "tenantId": 123,
  "roomId": 1,
  "contractId": 1,
  "invoiceType": "rent",
  "amount": 3000000,
  "dueDate": "2024-02-01",
  "description": "Tiền thuê tháng 2/2024",
  "attachments": ["receipt1.pdf", "receipt2.pdf"]
}
```

### **GET /api/landlord/invoices** - Lấy danh sách hóa đơn
**Response:**
```json
[
  {
    "invoiceId": 1,
    "landlordId": 456,
    "tenantId": 123,
    "roomId": 1,
    "contractId": 1,
    "invoiceType": "rent",
    "amount": 3000000,
    "dueDate": "2024-02-01",
    "description": "Tiền thuê tháng 2/2024",
    "attachments": ["receipt1.pdf", "receipt2.pdf"],
    "status": "pending",
    "paymentMethod": null,
    "paidAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### **GET /api/landlord/invoices/:id** - Lấy chi tiết hóa đơn
**Response:**
```json
{
  "invoiceId": 1,
  "landlordId": 456,
  "tenantId": 123,
  "roomId": 1,
  "contractId": 1,
  "invoiceType": "rent",
  "amount": 3000000,
  "dueDate": "2024-02-01",
  "description": "Tiền thuê tháng 2/2024",
  "attachments": ["receipt1.pdf", "receipt2.pdf"],
  "status": "pending",
  "paymentMethod": null,
  "paidAt": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### **PUT /api/landlord/invoices/:id** - Cập nhật hóa đơn
```json
{
  "amount": 3500000,
  "description": "Tiền thuê tháng 2/2024 (đã điều chỉnh)"
}
```

### **PUT /api/landlord/invoices/:id/mark-paid** - Đánh dấu đã thanh toán
```json
{
  "paymentMethod": "bank_transfer",
  "paidAt": "2024-01-15T10:30:00.000Z"
}
```

## 📋 Landlord Request APIs

### **GET /api/landlord/rental-requests** - Lấy yêu cầu thuê
**Response:**
```json
[
  {
    "requestId": 1,
    "tenantId": 123,
    "landlordId": 456,
    "roomId": 1,
    "rentPostId": 1,
    "message": "Tôi muốn thuê phòng này",
    "requestedMoveInDate": "2024-02-01",
    "requestedDuration": 12,
    "status": "pending",
    "landlordResponse": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### **GET /api/landlord/rental-requests/:id** - Lấy chi tiết yêu cầu
**Response:**
```json
{
  "requestId": 1,
  "tenantId": 123,
  "landlordId": 456,
  "roomId": 1,
  "rentPostId": 1,
  "message": "Tôi muốn thuê phòng này",
  "requestedMoveInDate": "2024-02-01",
  "requestedDuration": 12,
  "status": "pending",
  "landlordResponse": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### **PUT /api/landlord/rental-requests/:id/approve** - Duyệt yêu cầu thuê
```json
{
  "landlordResponse": "Chào mừng bạn đến với phòng trọ của tôi!"
}
```

### **PUT /api/landlord/rental-requests/:id/reject** - Từ chối yêu cầu thuê
```json
{
  "landlordResponse": "Xin lỗi, phòng đã được thuê rồi"
}
```

## 👥 Landlord Roommate APIs

### **GET /api/landlord/roommate-applications** - Lấy đơn ứng tuyển ở ghép
**Response:**
```json
[
  {
    "applicationId": 1,
    "applicantId": 123,
    "postId": 1,
    "posterId": 124,
    "roomId": 1,
    "message": "Tôi muốn ở ghép phòng này",
    "status": "pending",
    "landlordResponse": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### **GET /api/landlord/roommate-applications/:id** - Lấy chi tiết đơn ứng tuyển
**Response:**
```json
{
  "applicationId": 1,
  "applicantId": 123,
  "postId": 1,
  "posterId": 124,
  "roomId": 1,
  "message": "Tôi muốn ở ghép phòng này",
  "status": "pending",
  "landlordResponse": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### **PUT /api/landlord/roommate-applications/:id/approve** - Duyệt đơn ứng tuyển
```json
{
  "landlordResponse": "Chào mừng bạn đến với phòng trọ!"
}
```

### **PUT /api/landlord/roommate-applications/:id/reject** - Từ chối đơn ứng tuyển
```json
{
  "landlordResponse": "Xin lỗi, phòng đã đủ người rồi"
}
```

## 👤 User Contract APIs

### **GET /api/user/me/contracts** - Lấy hợp đồng của tôi
**Response:**
```json
[
  {
    "contractId": 1,
    "roomId": 1,
    "contractType": "single",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "monthlyRent": 3000000,
    "deposit": 3000000,
    "status": "active",
    "roomInfo": {
      "roomNumber": "A101",
      "area": 25,
      "maxOccupancy": 2,
      "currentOccupancy": 1
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### **GET /api/user/me/contracts/:id** - Lấy chi tiết hợp đồng
**Response:**
```json
{
  "contractId": 1,
  "roomId": 1,
  "contractType": "single",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "monthlyRent": 3000000,
  "deposit": 3000000,
  "contractFile": "contract_file_url.pdf",
  "tenants": [
    {
      "tenantId": 123,
      "moveInDate": "2024-01-01",
      "monthlyRent": 3000000,
      "deposit": 3000000,
      "status": "active"
    }
  ],
  "roomInfo": {
    "roomNumber": "A101",
    "area": 25,
    "maxOccupancy": 2,
    "currentOccupancy": 1
  },
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### **POST /api/user/me/rental-requests** - Tạo yêu cầu thuê
```json
{
  "landlordId": 456,
  "roomId": 1,
  "rentPostId": 1,
  "message": "Tôi muốn thuê phòng này",
  "requestedMoveInDate": "2024-02-01",
  "requestedDuration": 12
}
```

### **GET /api/user/me/rental-requests** - Lấy yêu cầu thuê của tôi
**Response:**
```json
[
  {
    "requestId": 1,
    "tenantId": 123,
    "landlordId": 456,
    "roomId": 1,
    "rentPostId": 1,
    "message": "Tôi muốn thuê phòng này",
    "requestedMoveInDate": "2024-02-01",
    "requestedDuration": 12,
    "status": "pending",
    "landlordResponse": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### **PUT /api/user/me/rental-requests/:id/cancel** - Hủy yêu cầu thuê
**Response:**
```json
{
  "message": "Rental request cancelled successfully",
  "requestId": 1
}
```

## 🏠 User Current Room APIs

### **GET /api/user/me/current-room** - Lấy phòng hiện tại
**Response:**
```json
{
  "userId": 123,
  "roomId": 1,
  "landlordId": 456,
  "contractId": 1,
  "moveInDate": "2024-01-01",
  "monthlyRent": 3000000,
  "status": "active",
  "roomInfo": {
    "roomNumber": "A101",
    "area": 25,
    "maxOccupancy": 2,
    "currentOccupancy": 1
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### **POST /api/user/me/current-room** - Đặt phòng hiện tại
```json
{
  "roomId": 1,
  "landlordId": 456,
  "contractId": 1,
  "moveInDate": "2024-01-01",
  "monthlyRent": 3000000
}
```

### **PUT /api/user/me/current-room** - Cập nhật phòng hiện tại
```json
{
  "monthlyRent": 3500000
}
```

### **DELETE /api/user/me/current-room** - Xóa phòng hiện tại
**Response:**
```json
{
  "message": "Current room removed successfully",
  "userId": 123
}
```

## 💰 User Invoice APIs

### **GET /api/user/me/invoices** - Lấy hóa đơn của tôi
**Response:**
```json
[
  {
    "invoiceId": 1,
    "tenantId": 123,
    "roomId": 1,
    "contractId": 1,
    "invoiceType": "rent",
    "amount": 3000000,
    "dueDate": "2024-02-01",
    "description": "Tiền thuê tháng 2/2024",
    "attachments": ["receipt1.pdf"],
    "status": "pending",
    "paymentMethod": null,
    "paidAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### **GET /api/user/me/invoices/:id** - Lấy chi tiết hóa đơn
**Response:**
```json
{
  "invoiceId": 1,
  "tenantId": 123,
  "roomId": 1,
  "contractId": 1,
  "invoiceType": "rent",
  "amount": 3000000,
  "dueDate": "2024-02-01",
  "description": "Tiền thuê tháng 2/2024",
  "attachments": ["receipt1.pdf"],
  "status": "pending",
  "paymentMethod": null,
  "paidAt": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### **PUT /api/user/me/invoices/:id/pay** - Thanh toán hóa đơn
```json
{
  "paymentMethod": "bank_transfer"
}
```

## 👥 User Roommate APIs

### **POST /api/user/me/roommate-applications** - Tạo đơn ứng tuyển ở ghép
```json
{
  "postId": 1,
  "posterId": 124,
  "roomId": 1,
  "message": "Tôi muốn ở ghép phòng này"
}
```

### **GET /api/user/me/roommate-applications** - Lấy đơn ứng tuyển của tôi
**Response:**
```json
[
  {
    "applicationId": 1,
    "applicantId": 123,
    "postId": 1,
    "posterId": 124,
    "roomId": 1,
    "message": "Tôi muốn ở ghép phòng này",
    "status": "pending",
    "landlordResponse": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### **PUT /api/user/me/roommate-applications/:id/cancel** - Hủy đơn ứng tuyển
**Response:**
```json
{
  "message": "Roommate application cancelled successfully",
  "applicationId": 1
}
```
