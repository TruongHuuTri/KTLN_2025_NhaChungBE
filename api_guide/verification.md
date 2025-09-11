# ✅ Verification API

## 📋 Submit Verification
```http
POST /api/verifications
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "idNumber": "123456789012",
  "fullName": "Nguyễn Văn A",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "issueDate": "2015-01-01",
  "issuePlace": "Cục Cảnh sát quản lý hành chính về trật tự xã hội"
}
```

> **Lưu ý bảo mật:** Ảnh CCCD không được upload lên server. Frontend sẽ xử lý OCR local để extract thông tin rồi chỉ gửi dữ liệu đã extract.

**Response (201):**
```json
{
  "message": "Nộp hồ sơ xác thực thành công",
  "verification": {
    "verificationId": 1,
    "userId": 11,
    "status": "pending",
    "submittedAt": "2024-01-15T10:30:00Z",
    "idNumber": "123456789012",
    "fullName": "Nguyễn Văn A"
  }
}
```

**Validation Rules:**
- `idNumber`: 9 hoặc 12 chữ số, unique per user
- `fullName`: Ít nhất 2 từ
- `dateOfBirth`: Phải từ 16 tuổi trở lên
- `gender`: "male" hoặc "female"
- `issueDate`: Không được ở tương lai
- `issuePlace`: Bắt buộc, nơi cấp CCCD

**Security Note:**
- ✅ Không lưu ảnh CCCD vào database
- ✅ OCR processing trên client-side
- ✅ Chỉ gửi thông tin đã extract lên server

## 👤 Get My Verification Status
```http
GET /api/users/me/verification
Authorization: Bearer <token>
```

**Response (200) - Có verification:**
```json
{
  "isVerified": false,
  "verification": {
    "verificationId": 1,
    "status": "pending",
    "submittedAt": "2024-01-15T10:30:00Z",
    "reviewedAt": null,
    "adminNote": null
  }
}
```

**Response (200) - Chưa nộp:**
```json
{
  "isVerified": false,
  "verification": null
}
```

## 🔧 Admin: Get All Verifications
```http
GET /api/verifications/admin?status=pending&page=1&limit=10
Authorization: Bearer <admin-token>
```

> **⚠️ Lưu ý:** Chỉ accept Admin token (có `type: "admin"`), User token sẽ bị từ chối.

**Query Parameters:**
- `status`: pending | approved | rejected (optional)
- `page`: số trang (default: 1)
- `limit`: số record/trang (default: 10)

**Response (200):**
```json
{
  "verifications": [
    {
      "verificationId": 1,
      "userId": 11,
      "status": "pending",
      "idNumber": "123456789012",
      "fullName": "Nguyễn Văn A",
      "dateOfBirth": "1990-01-01T00:00:00Z",
      "gender": "male",
      "issueDate": "2015-01-01T00:00:00Z",
      "issuePlace": "Cục Cảnh sát QLHC về TTXH",
      "submittedAt": "2024-01-15T10:30:00Z",
      "reviewedAt": null,
      "reviewedBy": null,
      "adminNote": null
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

> **Lưu ý:** `userId` là number (11), không phải ObjectId populate.

## ⚖️ Admin: Approve/Reject Verification
```http
PUT /api/verifications/admin/:verificationId
Authorization: Bearer <admin-token>
```

> **⚠️ Lưu ý:** 
> - Chỉ accept Admin token (có `type: "admin"`), User token sẽ bị từ chối.
> - `:verificationId` là numeric ID (1, 2, 3...), không phải MongoDB `_id`

**Request Body (Approve):**
```json
{
  "status": "approved",
  "adminNote": "Hồ sơ hợp lệ"
}
```

**Request Body (Reject):**
```json
{
  "status": "rejected",
  "adminNote": "Thông tin xác thực không đúng"
}
```

**Response (200):**
```json
{
  "message": "Cập nhật trạng thái xác thực thành công",
  "verification": {
    "verificationId": 1,
    "status": "approved",
    "reviewedAt": "2024-01-15T15:30:00Z",
    "reviewedBy": 1,
    "adminNote": "Hồ sơ hợp lệ"
  }
}
```

## 👤 Admin: Get Verification by UserId
```http
GET /api/verifications/user/:userId
Authorization: Bearer <admin-token>
```

**Example:**
```http
GET /api/verifications/user/11
Authorization: Bearer <admin-token>
```

**Response (200) - Có verification:**
```json
{
  "isVerified": false,
  "verification": {
  "verificationId": 1,
  "status": "pending",
  "submittedAt": "2024-01-15T10:30:00Z",
  "reviewedAt": null,
  "adminNote": null
  }
}
```

**Response (404) - Không có verification:**
```json
{
  "isVerified": false,
  "verification": null
}
```

> **⚠️ Lưu ý:** Chỉ admin mới có thể truy cập endpoint này.

## Error Responses
```json
// Already has pending verification (409)
{
  "statusCode": 409,
  "message": "Đã có hồ sơ xác thực đang chờ duyệt",
  "error": "Conflict"
}

// Already verified (409)
{
  "statusCode": 409,
  "message": "Tài khoản đã được xác thực",
  "error": "Conflict"
}

// Under 16 years old (400)
{
  "statusCode": 400,
  "message": "Phải từ 16 tuổi trở lên",
  "error": "Bad Request"
}
```
