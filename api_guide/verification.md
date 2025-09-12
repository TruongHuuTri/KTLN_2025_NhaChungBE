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
  "issuePlace": "Cục Cảnh sát quản lý hành chính về trật tự xã hội",
  "faceMatchResult": {
    "match": true,
    "similarity": 85.5
  }
}
```

> **🤖 FaceMatch Integration:** 
> - `faceMatchResult` là optional field từ Frontend
> - **Backend tự động xử lý:**
>   - `similarity >= 50%` → Status: **APPROVED** + Confidence: **"high"**
>   - `similarity < 50%` → Status: **PENDING** + Confidence: **"low"**
> - **Admin có thể override** bất kỳ quyết định nào
> - Nếu không có `faceMatchResult`: Status PENDING

> **Lưu ý bảo mật:** Ảnh CCCD không được upload lên server. Frontend sẽ xử lý OCR local để extract thông tin rồi chỉ gửi dữ liệu đã extract.

**Response (201) - Auto Approved (similarity >= 50%):**
```json
{
  "message": "Nộp hồ sơ xác thực thành công",
  "verification": {
    "verificationId": 1,
    "userId": 11,
    "status": "approved",
    "submittedAt": "2024-01-15T10:30:00Z",
    "idNumber": "123456789012",
    "fullName": "Nguyễn Văn A",
    "faceMatchResult": {
      "match": true,
      "similarity": 85.5,
      "confidence": "high"  // Backend tự động tính
    }
  }
}
```

**Response (201) - Pending (similarity < 50%):**
```json
{
  "message": "Nộp hồ sơ xác thực thành công",
  "verification": {
    "verificationId": 1,
    "userId": 11,
    "status": "pending",
    "submittedAt": "2024-01-15T10:30:00Z",
    "idNumber": "123456789012",
    "fullName": "Nguyễn Văn A",
    "faceMatchResult": {
      "match": false,
      "similarity": 45.2,
      "confidence": "low"  // Backend tự động tính
    }
  }
}
```

**Response (201) - Không có FaceMatch:**
```json
{
  "message": "Nộp hồ sơ xác thực thành công",
  "verification": {
    "verificationId": 1,
    "userId": 11,
    "status": "pending",
    "submittedAt": "2024-01-15T10:30:00Z",
    "idNumber": "123456789012",
    "fullName": "Nguyễn Văn A",
    "faceMatchResult": null
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
- `faceMatchResult` (optional):
  - `match`: boolean
  - `similarity`: number (0-100) - **Quyết định auto-approval**
  - `confidence`: **Backend tự động tính** - "high" nếu similarity >= 50%, "low" nếu < 50%

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

## 🤖 FaceMatch Integration

### Tổng quan
FaceMatch integration cho phép tự động xét duyệt verification dựa trên độ tương đồng khuôn mặt. AI sẽ so sánh ảnh khuôn mặt người dùng với ảnh trên CCCD để đưa ra quyết định tự động.

### Auto-Approval Logic
- **Similarity >= 50%**: Tự động APPROVED, user được `isVerified: true`
- **Similarity < 50%**: Status PENDING, chờ admin xử lý
- **Không có faceMatchResult**: Status PENDING, chờ admin xử lý

### Backend Processing
```typescript
// Backend tự động xử lý khi nhận faceMatchResult
if (faceMatchResult) {
  // Tự động tính confidence
  faceMatchResult.confidence = faceMatchResult.similarity >= 50 ? 'high' : 'low';
  
  // Xác định status
  if (faceMatchResult.similarity >= 50) {
    status = 'approved';  // Auto-approve
    user.isVerified = true;
  } else {
    status = 'pending';   // Chờ admin
  }
}
```

### Admin Override
- **AUTO APPROVED**: Admin có thể reject nếu cần
- **PENDING**: Admin có thể approve hoặc reject
- **REJECTED**: Admin có thể approve lại

### FaceMatchResult Structure
```json
{
  "match": true,           // boolean - kết quả match từ AI
  "similarity": 85.5,      // number (0-100) - độ tương đồng (quyết định approval)
  "confidence": "high"      // string - mức độ tin cậy (Backend tự động tính)
}
```

### Confidence Logic
- `similarity >= 50%` → `confidence: "high"` (vì được auto-approve)
- `similarity < 50%` → `confidence: "low"` (vì cần admin xử lý)

### Frontend Integration Flow
1. **User upload ảnh CCCD** → OCR extract thông tin (client-side)
2. **User upload ảnh khuôn mặt** → FaceMatch API (FPT AI)
3. **Frontend gửi verification** với `faceMatchResult` (chỉ cần match + similarity)
4. **Backend tự động xử lý:**
   - Tính confidence dựa trên similarity
   - Xác định status (approved/pending)
   - Cập nhật user.isVerified nếu approved
5. **Admin xem và xử lý** các case pending

### Frontend Code Example
```typescript
// 1. Gọi FaceMatch API
const faceMatchResponse = await fetch('https://api.fpt.ai/dmp/checkface/v1', {
  method: 'POST',
  headers: { 'api-key': process.env.NEXT_PUBLIC_FPT_AI_API_KEY },
  body: formData
});

const faceMatchData = await faceMatchResponse.json();

// 2. Tạo faceMatchResult (chỉ cần match + similarity)
const faceMatchResult = {
  match: faceMatchData.match || false,
  similarity: faceMatchData.similarity || 0
  // confidence sẽ được Backend tự động tính
};

// 3. Gửi verification
const verificationData = {
  idNumber: "123456789012",
  fullName: "Nguyễn Văn A",
  // ... other fields
  faceMatchResult: faceMatchResult
};
```

### Admin Panel Display
- ✅ **Face Match: 85.5% (High) - AUTO APPROVED** - Similarity >= 50%
- ❌ **Face Match: 45.2% (Low) - PENDING** - Similarity < 50%
- ⚠️ **No Face Data - PENDING** - Không có faceMatchResult

### Database Schema
```javascript
{
  // ... existing fields
  faceMatchResult: {
    match: Boolean,        // Kết quả match từ AI
    similarity: Number,    // Độ tương đồng (0-100)
    confidence: String     // "high" hoặc "low" (Backend tính)
  }
}
```

### Error Handling
- **Invalid similarity**: Phải là số từ 0-100
- **Missing faceMatchResult**: Vẫn tạo verification với status PENDING
- **FaceMatch API error**: Frontend xử lý, có thể gửi verification không có faceMatchResult

### Security Notes
- ✅ **Không lưu ảnh**: Chỉ lưu kết quả đã xử lý
- ✅ **Client-side OCR**: Ảnh CCCD không upload lên server
- ✅ **Backward compatible**: API cũ vẫn hoạt động bình thường
- ✅ **Admin control**: Admin có thể override mọi quyết định
