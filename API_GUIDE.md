# 📚 API Documentation - Nhà Chung Backend

> **Base URL**: `http://localhost:3001/api`  
> **Content-Type**: `application/json`  
> **Authentication**: Bearer Token (JWT)

## 🚀 Quick Start

### 1. Cài đặt và chạy Backend
```bash
# Clone repository
git clone <repository-url>
cd nha_chung_be

# Cài đặt dependencies
npm install

# Chạy server
npm run start:dev
```

### 2. Test API
```bash
# Test server
curl http://localhost:3001/api

# Test users endpoint
curl http://localhost:3001/api/users
```

---

## 🔐 Authentication

### Login Flow
```javascript
// 1. Đăng nhập
const loginResponse = await fetch('http://localhost:3001/api/users/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: '123456'
  })
});

const { access_token, user } = await loginResponse.json();

// 2. Lưu token
localStorage.setItem('token', access_token);

// 3. Sử dụng token cho các request tiếp theo
const headers = {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
};
```

### Token Usage
```javascript
// Axios interceptor example
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 👥 Users API

### 📋 Get All Users
```http
GET /api/users
```

**Response:**
```json
[
  {
    "userId": 1,
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "phone": "0123456789",
    "role": "user",
    "avatar": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### ➕ Create User
```http
POST /api/users
```

**Request Body:**
```json
{
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "password": "password123",
  "phone": "0123456789",
  "role": "user"
}
```

**Response:**
```json
{
  "userId": 1,
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "phone": "0123456789",
  "role": "user",
  "avatar": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 🔑 Login
```http
POST /api/users/login
```

**Request Body:**
```json
{
  "email": "nguyenvana@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": 1,
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "role": "user",
    "avatar": null,
    "phone": "0123456789"
  }
}
```

### 👤 Get User by ID
```http
GET /api/users/:id
```

**Response:**
```json
{
  "userId": 1,
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "phone": "0123456789",
  "role": "user",
  "avatar": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### ✏️ Update User
```http
PUT /api/users/:id
```

**Request Body:**
```json
{
  "name": "Nguyễn Văn A Updated",
  "phone": "0987654321"
}
```

### 🔐 Change Password
```http
POST /api/users/:id/change-password
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456",
  "confirmPassword": "newpassword456"
}
```

**Response:**
```json
{
  "message": "Đổi mật khẩu thành công"
}
```

**Validation Rules:**
- `currentPassword`: Required, must match current password
- `newPassword`: Required, minimum 6 characters
- `confirmPassword`: Required, must match newPassword
- New password must be different from current password

**Error Responses:**
```json
// Current password incorrect (401)
{
  "statusCode": 401,
  "message": "Mật khẩu hiện tại không đúng",
  "error": "Unauthorized"
}

// Passwords don't match (400)
{
  "statusCode": 400,
  "message": "Mật khẩu mới và xác nhận mật khẩu không khớp",
  "error": "Bad Request"
}

// Same password (400)
{
  "statusCode": 400,
  "message": "Mật khẩu mới phải khác mật khẩu hiện tại",
  "error": "Bad Request"
}
```


### 🗑️ Delete User
```http
DELETE /api/users/:id
```

---

## 👨‍💼 Admin API

> **Hệ thống Admin riêng biệt hoàn toàn với User thường**

### 🏗️ Admin System Overview

**Collections:**
- `admins` - Admin users (riêng biệt với `users`)
- `users` - Regular users

**Key Features:**
- ✅ Admin tokens khác User tokens
- ✅ Collections riêng biệt
- ✅ Authentication riêng
- ✅ Quản lý verification độc lập

### ➕ Create Admin (One-time only)
```http
POST /api/admin/create
```

**Request Body:**
```json
{
  "name": "Admin System",
  "email": "admin@nhachung.com",
  "password": "admin123456",
  "phone": "0999999999"
}
```

**Response (201):**
```json
{
  "adminId": 1,
  "name": "Admin System",
  "email": "admin@nhachung.com",
  "phone": "0999999999",
  "role": "admin",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Notes:**
- ⚠️ **CHỈ TẠO ĐƯỢC MỘT LẦN DUY NHẤT**
- ❌ **KHÔNG CẦN** Authorization header
- ✅ Role tự động được set thành `admin`
- ❌ Nếu admin đã tồn tại: `400 Bad Request`

### 🔑 Admin Login
```http
POST /api/admin/login
```

**Request Body:**
```json
{
  "email": "admin@nhachung.com",
  "password": "admin123456"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "adminId": 1,
    "name": "Admin System",
    "email": "admin@nhachung.com",
    "role": "admin",
    "avatar": null,
    "phone": "0999999999",
    "lastLogin": "2024-01-01T12:00:00.000Z"
  }
}
```

**Admin JWT Token khác User JWT Token:**

### **User Token payload:**
```json
{
  "email": "user@example.com",
  "sub": "11",           // userId number  
  "name": "User Name",
  "role": "user",
  "type": undefined      // Không có type
}
```

### **Admin Token payload:**
```json
{
  "email": "admin@nhachung.com", 
  "sub": "1",            // adminId number
  "name": "Admin System",
  "role": "admin",
  "type": "admin"        // Có type để phân biệt
}
```

### 📋 Get All Admins
```http
GET /api/admin
```

**Response:**
```json
[
  {
    "adminId": 1,
    "name": "Admin System",
    "email": "admin@nhachung.com",
    "role": "admin",
    "isActive": true,
    "lastLogin": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 🔒 AdminJwtGuard Security

**AdminJwtGuard kiểm tra:**
1. ✅ Token hợp lệ và chưa hết hạn
2. ✅ `payload.role === 'admin'`
3. ✅ `payload.type === 'admin'`

**User không thể truy cập Admin APIs:**
- User token không có `type: "admin"`
- AdminJwtGuard sẽ từ chối request

---

## ✅ Verification API

### 📋 Submit Verification
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

### 👤 Get My Verification Status
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

### 🔧 Admin: Get All Verifications
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

### ⚖️ Admin: Approve/Reject Verification
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

### 👤 Admin: Get Verification by UserId
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

**Error Responses:**
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

---

## 🏠 Rent Posts API

> **Lưu ý**: API đã được cập nhật để hỗ trợ 3 loại hình bất động sản: Phòng trọ, Chung cư, Nhà nguyên căn với cấu trúc dữ liệu linh hoạt.

### 📋 Get All Rent Posts
```http
GET /api/rent-posts
```

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `category` (optional): Filter by category (`phong-tro`, `chung-cu`, `nha-nguyen-can`)
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

**Examples:**
```http
# Lấy tất cả bài đăng
GET /api/rent-posts

# Lấy bài đăng theo user
GET /api/rent-posts?userId=1

# Lấy bài đăng theo loại
GET /api/rent-posts?category=phong-tro

# Lấy bài đăng phòng trọ của user
GET /api/rent-posts?userId=1&category=phong-tro
```

**Response:**
```json
[
  {
    "rentPostId": 1,
    "userId": 1,
    "title": "Phòng trọ đẹp gần trường đại học",
    "description": "Phòng trọ rộng rãi, thoáng mát, có đầy đủ tiện nghi cơ bản",
    "images": ["phong-tro-1.jpg", "phong-tro-2.jpg"],
    "videos": ["phong-tro-video.mp4"],
    "address": {
      "street": "Đường Nguyễn Văn Cừ",
      "ward": "Phường 4",
      "city": "Thành phố Hồ Chí Minh",
      "specificAddress": "123/45A",
      "showSpecificAddress": true,
      "provinceCode": "79",
      "provinceName": "Thành phố Hồ Chí Minh",
      "wardCode": "26734",
      "wardName": "Phường 4",
      "additionalInfo": "Gần chợ Bình Tây, tiện đi lại"
    },
    "category": "phong-tro",
    "basicInfo": {
      "area": 25,
      "price": 3000000,
      "deposit": 3000000,
      "furniture": "co-ban",
      "bedrooms": 0,
      "bathrooms": 0,
      "direction": "",
      "legalStatus": ""
    },
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### ➕ Create Rent Posts

#### Create Phòng Trọ Post
```http
POST /api/rent-posts/phong-tro
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": "1",
  "title": "Phòng trọ đẹp gần trường đại học",
  "description": "Phòng trọ rộng rãi, thoáng mát, có đầy đủ tiện nghi cơ bản",
  "images": ["phong-tro-1.jpg", "phong-tro-2.jpg"],
  "videos": ["phong-tro-video.mp4"],
  "address": {
    "street": "Đường Nguyễn Văn Cừ",
    "ward": "Phường 4",
    "city": "Thành phố Hồ Chí Minh",
    "specificAddress": "123/45A",
    "showSpecificAddress": true,
    "provinceCode": "79",
    "provinceName": "Thành phố Hồ Chí Minh",
    "wardCode": "26734",
    "wardName": "Phường 4",
    "additionalInfo": "Gần chợ Bình Tây, tiện đi lại"
  },
  "utilities": {
    "electricityPricePerKwh": 3500,
    "waterPrice": 20000,
    "waterBillingType": "per_m3",
    "internetFee": 150000,
    "garbageFee": 20000,
    "cleaningFee": 0,
    "parkingMotorbikeFee": 100000,
    "cookingGasFee": 0,
    "includedInRent": {
      "electricity": false,
      "water": false,
      "internet": true,
      "garbage": true,
      "cleaning": false,
      "parkingMotorbike": false
    }
  },
  "area": 25,
  "price": 3000000,
  "deposit": 3000000,
  "furniture": "co-ban",
  "status": "active"
}
```

#### Create Chung Cư Post
```http
POST /api/rent-posts/chung-cu
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": 1,
  "title": "Căn hộ chung cư cao cấp view sông",
  "description": "Căn hộ 2PN/2WC, view sông đẹp, nội thất đầy đủ, an ninh 24/7",
  "images": ["chung-cu-1.jpg", "chung-cu-2.jpg"],
  "videos": ["chung-cu-video.mp4"],
  "address": {
    "street": "Đường Võ Văn Kiệt",
    "ward": "Phường 1",
    "city": "Thành phố Hồ Chí Minh",
    "specificAddress": "456/12B",
    "showSpecificAddress": true,
    "provinceCode": "79",
    "provinceName": "Thành phố Hồ Chí Minh",
    "wardCode": "26701",
    "wardName": "Phường 1",
    "additionalInfo": "Gần trung tâm thành phố, tiện đi lại"
  },
  "utilities": {
    "electricityPricePerKwh": 3500,
    "waterPrice": 20000,
    "waterBillingType": "per_m3",
    "internetFee": 200000,
    "garbageFee": 30000,
    "cleaningFee": 0,
    "parkingMotorbikeFee": 100000,
    "parkingCarFee": 1200000,
    "managementFee": 15000,
    "managementFeeUnit": "per_m2_per_month",
    "includedInRent": {
      "electricity": false,
      "water": false,
      "internet": false,
      "garbage": false,
      "cleaning": false,
      "parkingMotorbike": false,
      "parkingCar": false,
      "managementFee": false
    }
  },
  "buildingInfo": {
    "buildingName": "Chung cư Diamond Plaza",
    "blockOrTower": "Tower A",
    "floorNumber": 15,
    "unitCode": "A15-03"
  },
  "area": 60,
  "price": 8000000,
  "deposit": 8000000,
  "furniture": "full",
  "bedrooms": 2,
  "bathrooms": 2,
  "direction": "nam",
  "propertyType": "chung-cu",
  "legalStatus": "co-so-hong",
  "status": "active"
}
```

#### Create Nhà Nguyên Căn Post
```http
POST /api/rent-posts/nha-nguyen-can
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": "1",
  "title": "Nhà phố 3 tầng đẹp, hẻm xe hơi",
  "description": "Nhà phố mới xây, thiết kế hiện đại, 4PN/3WC, có sân thượng",
  "images": ["nha-pho-1.jpg", "nha-pho-2.jpg"],
  "videos": ["nha-pho-video.mp4"],
  "address": {
    "street": "Đường Lê Văn Việt",
    "ward": "Phường Hiệp Phú",
    "city": "Thành phố Hồ Chí Minh",
    "specificAddress": "789/34C",
    "showSpecificAddress": true,
    "provinceCode": "79",
    "provinceName": "Thành phố Hồ Chí Minh",
    "wardCode": "26914",
    "wardName": "Phường Hiệp Phú",
    "additionalInfo": "Hẻm xe hơi, gần trường học"
  },
  "utilities": {
    "electricityPricePerKwh": 3500,
    "waterPrice": 20000,
    "waterBillingType": "per_person",
    "internetFee": 200000,
    "garbageFee": 30000,
    "cleaningFee": 0,
    "parkingMotorbikeFee": 100000,
    "parkingCarFee": 800000,
    "managementFee": 0,
    "managementFeeUnit": "per_month",
    "gardeningFee": 100000,
    "includedInRent": {
      "electricity": false,
      "water": false,
      "internet": false,
      "garbage": false,
      "cleaning": false,
      "parkingMotorbike": false,
      "parkingCar": false,
      "managementFee": false
    }
  },
  "propertyInfo": {
    "khuLo": "Khu A",
    "unitCode": "A-001",
    "propertyType": "nha-pho",
    "totalFloors": 3,
    "features": ["Hẻm xe hơi", "Nhà nở hậu"]
  },
  "landArea": 100,
  "usableArea": 200,
  "width": 5,
  "length": 20,
  "price": 15000000,
  "deposit": 15000000,
  "furniture": "full",
  "bedrooms": 4,
  "bathrooms": 3,
  "direction": "dong",
  "legalStatus": "co-so-hong",
  "status": "active"
}
```

### 👁️ Get Rent Post by ID
```http
GET /api/rent-posts/:id
```

**Response:**
```json
{
  "rentPostId": 1,
  "userId": 1,
  "title": "Phòng trọ đẹp gần trường đại học",
  "description": "Phòng trọ rộng rãi, thoáng mát, có đầy đủ tiện nghi cơ bản",
  "images": ["phong-tro-1.jpg", "phong-tro-2.jpg"],
  "videos": ["phong-tro-video.mp4"],
  "address": {
    "street": "Đường Nguyễn Văn Cừ",
    "ward": "Phường 4",
    "city": "Thành phố Hồ Chí Minh",
    "specificAddress": "123/45A",
    "showSpecificAddress": true
  },
  "category": "phong-tro",
  "basicInfo": {
    "area": 25,
    "price": 3000000,
    "deposit": 3000000,
    "furniture": "co-ban",
    "bedrooms": 0,
    "bathrooms": 0,
    "direction": "",
    "legalStatus": ""
  },
  "status": "active",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### ✏️ Update Rent Post
```http
PUT /api/rent-posts/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Tiêu đề đã cập nhật",
  "basicInfo": {
    "area": 30,
    "price": 4000000,
    "furniture": "full"
  }
}
```

### 🗑️ Delete Rent Post
```http
DELETE /api/rent-posts/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Xóa bài đăng thuê phòng thành công"
}
```

### 📊 Data Structure

> **⚠️ Lưu ý quan trọng**: Tất cả thông tin về giá thuê, diện tích, nội thất, v.v. đều nằm trong object `basicInfo`, không phải ở root level. Khi update, phải update trong `basicInfo`.

#### RentPost (Cấu trúc chính)
```typescript
{
  rentPostId: number;           // ID bài đăng
  userId: number;               // ID người dùng
  title: string;                // Tiêu đề
  description: string;          // Mô tả
  images: string[];             // Danh sách hình ảnh
  videos: string[];             // Danh sách video
  address: Address;             // Địa chỉ
  category: string;             // Loại: 'phong-tro', 'chung-cu', 'nha-nguyen-can'
  basicInfo: BasicInfo;         // Thông tin cơ bản (BẮT BUỘC)
  chungCuInfo?: ChungCuInfo;    // Thông tin chung cư (tùy chọn)
  nhaNguyenCanInfo?: NhaNguyenCanInfo; // Thông tin nhà nguyên căn (tùy chọn)
  status: string;               // Trạng thái: 'active', 'inactive'
  createdAt: Date;              // Ngày tạo
  updatedAt: Date;              // Ngày cập nhật
}
```

### 🖼️ Upload file S3 (Presigned URL)

> Quy trình: BE cấp presigned URL → FE/Postman PUT file lên S3 → dùng `publicUrl` lưu vào bài đăng.

1) Xin URL upload (POST)
```http
POST /api/files/presign
```

Body (JSON):
```json
{
  "userId": "1",
  "fileName": "hinh-anh.jpg",
  "contentType": "image/jpeg",
  "folder": "images" // hoặc "videos"
}
```

Response (200):
```json
{
  "key": "uploads/1/images/1717920000000-uuid.jpg",
  "uploadUrl": "https://s3.amazonaws.com/...signed-url...",
  "publicUrl": "https://<your-cdn-or-s3-domain>/uploads/1/images/1717920000000-uuid.jpg"
}
```

2) Tải file lên S3 (PUT)
```bash
curl -X PUT "<uploadUrl>" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/path/to/hinh-anh.jpg
```

Kết quả mong đợi: HTTP 200 OK.

3) Dùng `publicUrl` trong bài đăng
- Với ảnh: thêm vào mảng `images`
- Với video: thêm vào mảng `videos`

Ví dụ tạo bài đăng phòng trọ sau khi upload xong ảnh:
```json
{
  "userId": "1",
  "title": "Phòng trọ gần trường",
  "description": "Phòng thoáng mát",
  "images": [
    "https://<domain>/uploads/1/images/1717920000000-uuid.jpg"
  ],
  "videos": [],
  "address": {
    "street": "Đường ABC",
    "ward": "Phường XYZ",
    "city": "Thành phố Hồ Chí Minh"
  },
  "area": 25,
  "price": 3000000,
  "furniture": "co-ban"
}
```

Lưu ý:
- `folder` nhận `images` hoặc `videos` để phân loại.
- Phải truyền đúng `Content-Type` khi PUT.
- Mở `publicUrl` trên trình duyệt thấy ảnh/vid hiển thị là ✅ thành công.

#### BasicInfo (Thông tin cơ bản - BẮT BUỘC)
```typescript
{
  area: number;                 // Diện tích (m²) - BẮT BUỘC
  price: number;                // Giá thuê (đ/tháng) - BẮT BUỘC
  deposit?: number;             // Số tiền cọc (đ)
  furniture?: string;           // Tình trạng nội thất: 'full', 'co-ban', 'trong'
  bedrooms?: number;            // Số phòng ngủ
  bathrooms?: number;           // Số phòng vệ sinh
  direction?: string;           // Hướng: 'dong', 'tay', 'nam', 'bac', etc.
  legalStatus?: string;         // Tình trạng sổ: 'co-so-hong', 'cho-so'
}
```

#### Address (Địa chỉ)
```typescript
{
  street?: string;              // Đường - TÙY CHỌN
  ward: string;                 // Phường - BẮT BUỘC
  district: string;             // Quận/Huyện - BẮT BUỘC
  city: string;                 // Thành phố - BẮT BUỘC
  specificAddress?: string;     // Địa chỉ cụ thể
  showSpecificAddress?: boolean; // Hiển thị địa chỉ cụ thể
}
```

#### ChungCuInfo (Thông tin chung cư)
```typescript
{
  buildingName?: string;        // Tên tòa nhà/dự án
  blockOrTower?: string;        // Block/Tháp
  floorNumber?: number;         // Tầng số
  unitCode?: string;            // Mã căn
  propertyType?: string;        // Loại hình: 'chung-cu', 'can-ho-dv', 'officetel', 'studio'
}
```

#### NhaNguyenCanInfo (Thông tin nhà nguyên căn)
```typescript
{
  khuLo?: string;               // Tên khu/lô
  unitCode?: string;            // Mã căn
  propertyType?: string;        // Loại hình: 'nha-pho', 'biet-thu', 'nha-hem', 'nha-cap4'
  totalFloors?: number;         // Tổng số tầng
  landArea?: number;            // Diện tích đất (m²)
  usableArea?: number;          // Diện tích sử dụng (m²)
  width?: number;               // Chiều ngang (m)
  length?: number;              // Chiều dài (m)
  features?: string[];          // Đặc điểm nhà/đất
}
```

## 🤝 Roommate Posts API

> **Lưu ý**: API đã được cập nhật để hỗ trợ đầy đủ các field từ form frontend, bao gồm thông tin liên hệ, video, thói quen sinh hoạt và các thông tin chi tiết khác.

### 📋 Get All Roommate Posts
```http
GET /api/roommate-posts
```

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
[
  {
    "userId": 1,
    "title": "Tìm bạn ở ghép phòng 2 người tại Quận 1",
    "description": "Mình là sinh viên năm 3, sạch sẽ, yên tĩnh, muốn tìm bạn ở ghép cùng phòng. Phòng rộng rãi, có đầy đủ tiện nghi.",
    "images": ["https://example.com/roommate1.jpg", "https://example.com/roommate2.jpg"],
    "video": "https://example.com/intro_video.mp4",
    "currentRoom": {
      "address": {
        "street": "Đường Nguyễn Huệ",
        "ward": "Phường Bến Nghé",
        "city": "Thành phố Hồ Chí Minh",
        "specificAddress": "123/45A",
        "showSpecificAddress": true,
        "provinceCode": "79",
        "provinceName": "Thành phố Hồ Chí Minh",
        "wardCode": "26701",
        "wardName": "Phường Bến Nghé",
        "additionalInfo": "Gần trung tâm thành phố, tiện đi lại"
      },
      "price": 3000000,
      "area": 25,
      "description": "Phòng 2 người, có điều hòa, wifi, nước nóng",
      "roomType": "double",
      "currentOccupants": 1,
      "remainingDuration": "6-12 months"
    },
    "personalInfo": {
      "fullName": "Nguyễn Văn A",
      "age": 22,
      "gender": "male",
      "occupation": "Sinh viên",
      "hobbies": ["Đọc sách", "Xem phim", "Thể thao"],
      "habits": ["Dậy sớm", "Tập thể dục"],
      "lifestyle": "early",
      "cleanliness": "very_clean"
    },
    "requirements": {
      "ageRange": [20, 25],
      "gender": "any",
      "traits": ["Hòa đồng", "Sạch sẽ", "Yên tĩnh"],
      "maxPrice": 4000000
    },
    "phone": "0123456789",
    "email": "test@example.com",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### ➕ Create Roommate Post
```http
POST /api/roommate-posts
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": "1",
  "title": "Tìm bạn ở ghép phòng 2 người tại Quận 1",
  "description": "Mình là sinh viên năm 3, sạch sẽ, yên tĩnh, muốn tìm bạn ở ghép cùng phòng. Phòng rộng rãi, có đầy đủ tiện nghi.",
  "images": ["https://example.com/roommate1.jpg", "https://example.com/roommate2.jpg"],
  "video": "https://example.com/intro_video.mp4",
  "currentRoom": {
    "address": {
      "street": "Đường Nguyễn Huệ",
      "ward": "Phường Bến Nghé",
      "city": "Thành phố Hồ Chí Minh",
      "specificAddress": "123/45A",
      "showSpecificAddress": true,
      "provinceCode": "79",
      "provinceName": "Thành phố Hồ Chí Minh",
      "wardCode": "26701",
      "wardName": "Phường Bến Nghé",
      "additionalInfo": "Gần trung tâm thành phố, tiện đi lại"
    },
    "price": 3000000,
    "area": 25,
    "description": "Phòng 2 người, có điều hòa, wifi, nước nóng",
    "roomType": "double",
    "currentOccupants": 1,
    "remainingDuration": "6-12 months"
  },
  "currentRoom": {
    "shareMethod": "split_evenly",
    "estimatedMonthlyUtilities": 500000,
    "capIncludedAmount": 0,
    "electricityPricePerKwh": 3500,
    "waterPrice": 20000,
    "waterBillingType": "per_m3",
    "internetFee": 150000,
    "garbageFee": 20000,
    "cleaningFee": 0
  },
  "personalInfo": {
    "fullName": "Nguyễn Văn A",
    "age": 22,
    "gender": "male",
    "occupation": "Sinh viên",
    "hobbies": ["Đọc sách", "Xem phim", "Thể thao"],
    "habits": ["Dậy sớm", "Tập thể dục"],
    "lifestyle": "early",
    "cleanliness": "very_clean"
  },
  "requirements": {
    "ageRange": [20, 25],
    "gender": "any",
    "traits": ["Hòa đồng", "Sạch sẽ", "Yên tĩnh"],
    "maxPrice": 4000000
  },
  "phone": "0123456789",
  "email": "test@example.com",
  "status": "active"
}
```

**Validation Rules:**
- `userId`: Required, string (number as string)
- `title`: Required, string
- `description`: Required, string
- `images`: Optional, array of strings (URLs)
- `video`: Optional, string (URL)
- `phone`: Optional, string
- `email`: Optional, valid email format
- `currentRoom.address.street`: Optional, string
- `currentRoom.address.ward`: Required, string
- `currentRoom.address.district`: Required, string
- `currentRoom.address.city`: Required, string
- `currentRoom.address.specificAddress`: Optional, string
- `currentRoom.address.showSpecificAddress`: Optional, boolean
- `currentRoom.price`: Required, number
- `currentRoom.area`: Required, number
- `currentRoom.description`: Required, string
- `currentRoom.roomType`: Optional, enum: ["single", "double", "shared"]
- `currentRoom.currentOccupants`: Optional, number, min 1
- `currentRoom.remainingDuration`: Optional, enum: ["1-3 months", "3-6 months", "6-12 months", "over_1_year"]
- `personalInfo.fullName`: Required, string
- `personalInfo.age`: Required, number, min 18, max 100
- `personalInfo.gender`: Required, enum: ["male", "female", "other"]
- `personalInfo.occupation`: Required, string
- `personalInfo.hobbies`: Optional, array of strings
- `personalInfo.habits`: Optional, array of strings
- `personalInfo.lifestyle`: Optional, enum: ["early", "normal", "late"]
- `personalInfo.cleanliness`: Optional, enum: ["very_clean", "clean", "normal", "flexible"]
- `requirements.ageRange`: Required, array of 2 numbers
- `requirements.gender`: Required, enum: ["male", "female", "any"]
- `requirements.traits`: Optional, array of strings
- `requirements.maxPrice`: Required, number, min 0

### ✏️ Update Roommate Post
```http
PUT /api/roommate-posts/:id
Authorization: Bearer <token>
```

**Request Body (partial update) — cập nhật đầy đủ:**
```json
{
  "title": "Cập nhật tiêu đề bài tìm bạn ở ghép",
  "description": "Mô tả mới về bản thân và yêu cầu",
  "images": ["https://cdn.domain.com/uploads/1/images/new-image-1.jpg"],
  "video": "https://cdn.domain.com/uploads/1/videos/new-video.mp4",
  "currentRoom": {
    "address": {
      "street": "Đường Lê Lợi",
      "ward": "Phường Bến Thành",
      "city": "Thành phố Hồ Chí Minh",
      "specificAddress": "456/12B",
      "showSpecificAddress": false
    },
    "price": 3500000,
    "area": 30,
    "description": "Mô tả phòng mới",
    "roomType": "shared",
    "currentOccupants": 2,
    "remainingDuration": "3-6 months"
  },
  "currentRoom": {
    "shareMethod": "by_usage",
    "estimatedMonthlyUtilities": 600000,
    "capIncludedAmount": 300000,
    "electricityPricePerKwh": 3500,
    "waterPrice": 20000,
    "waterBillingType": "per_person",
    "internetFee": 200000,
    "garbageFee": 30000,
    "cleaningFee": 50000
  },
  "personalInfo": {
    "fullName": "Tên mới",
    "age": 26,
    "gender": "male",
    "occupation": "Designer",
    "hobbies": ["đọc sách", "chạy bộ"],
    "habits": ["ngủ sớm"],
    "lifestyle": "normal",
    "cleanliness": "clean"
  },
  "requirements": {
    "ageRange": [22, 30],
    "gender": "any",
    "traits": ["gọn gàng", "hoà đồng"],
    "maxPrice": 2500000
  },
  "phone": "0987654321",
  "email": "newemail@example.com"
}
```

**Request Body (partial update) — chỉ cập nhật một số field:**
```json
{
  "title": "Cập nhật tiêu đề bài tìm bạn ở ghép",
  "images": ["https://cdn.domain.com/uploads/1/images/new-image-1.jpg"],
  "phone": "0987654321",
  "email": "newemail@example.com"
}
```

**Lưu ý:**
- Chỉ cần gửi các field muốn thay đổi (partial update)
- Nếu gửi `personalInfo` thì bắt buộc có đủ `fullName`, `age` (18-100) và `gender` (male/female/other)
- Nếu gửi `currentRoom` thì bắt buộc có đủ `address`, `price`, `area`, `description`
- Nếu gửi `requirements` thì bắt buộc có đủ `ageRange`, `gender`, `maxPrice`
- Ảnh và video nên là URL public (có thể lấy từ quy trình Presigned URL ở mục Upload file S3)
- Email phải đúng định dạng email hợp lệ
- Các field được gửi sẽ được validate theo rule tương ứng như khi tạo mới

### 📝 Field Descriptions

#### CurrentRoom Object
- `address`: Địa chỉ phòng hiện tại (object, bắt buộc)
  - `street`: Đường (tùy chọn)
  - `ward`: Phường (bắt buộc)
  - `district`: Quận (bắt buộc)
  - `city`: Thành phố (bắt buộc)
  - `specificAddress`: Địa chỉ cụ thể (tùy chọn)
  - `showSpecificAddress`: Hiển thị địa chỉ cụ thể (tùy chọn, boolean)
- `price`: Giá thuê phòng (VNĐ/tháng) (bắt buộc)
- `area`: Diện tích phòng (m²) (bắt buộc)
- `description`: Mô tả chi tiết về phòng (bắt buộc)
- `roomType`: Loại phòng - "single" (đơn), "double" (đôi), "shared" (3-4 người) (tùy chọn)
- `currentOccupants`: Số người hiện tại đang ở (tùy chọn, tối thiểu 1)
- `remainingDuration`: Thời gian ở còn lại - "1-3 months", "3-6 months", "6-12 months", "over_1_year" (tùy chọn)

#### PersonalInfo Object
- `fullName`: Họ và tên đầy đủ (bắt buộc)
- `age`: Tuổi (bắt buộc, 18-100)
- `gender`: Giới tính - "male", "female", "other" (bắt buộc)
- `occupation`: Nghề nghiệp (bắt buộc)
- `hobbies`: Danh sách sở thích (tùy chọn)
- `habits`: Danh sách thói quen (tùy chọn)
- `lifestyle`: Thói quen sinh hoạt - "early" (dậy sớm), "normal" (bình thường), "late" (dậy muộn) (tùy chọn)
- `cleanliness`: Mức độ sạch sẽ - "very_clean", "clean", "normal", "flexible" (tùy chọn)

#### Requirements Object
- `ageRange`: Khoảng tuổi mong muốn [min, max] (bắt buộc)
- `gender`: Giới tính mong muốn - "male", "female", "any" (bắt buộc)
- `traits`: Danh sách tính cách mong muốn (tùy chọn)
- `maxPrice`: Giá tối đa sẵn sàng chi trả (VNĐ/tháng) (bắt buộc)

#### Root Level Fields
- `roommatePostId`: ID duy nhất của bài đăng (tự động tạo)
- `userId`: ID của người đăng (bắt buộc)
- `title`: Tiêu đề bài đăng (bắt buộc)
- `description`: Mô tả chi tiết (bắt buộc)
- `images`: Danh sách URL hình ảnh (tùy chọn)
- `video`: URL video giới thiệu (tùy chọn)
- `phone`: Số điện thoại liên hệ (tùy chọn)
- `email`: Email liên hệ (tùy chọn, phải đúng định dạng)
- `status`: Trạng thái bài đăng - "active", "inactive" (mặc định: "active")

---

## 🏘️ Addresses API

> **Lưu ý**: API quản lý địa chỉ Việt Nam, bao gồm tỉnh/thành phố và phường/xã. Hỗ trợ import dữ liệu từ CSV và tìm kiếm phường/xã theo tỉnh.

### 📋 Get All Addresses
```http
GET /api/addresses
```

**Response:**
```json
[
  {
    "provinceCode": "01",
    "provinceName": "Thành phố Hà Nội",
    "wardCode": "10105001",
    "wardName": "Phường Hoàn Kiếm",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### 🏙️ Get All Provinces
```http
GET /api/addresses/provinces
```

**Response:**
```json
[
  {
    "provinceCode": "01",
    "provinceName": "Thành phố Hà Nội"
  },
  {
    "provinceCode": "79",
    "provinceName": "Thành phố Hồ Chí Minh"
  }
]
```

### 🏘️ Get Wards by Province
```http
GET /api/addresses/wards?provinceCode=01
```

**Query Parameters:**
- `provinceCode`: Mã tỉnh/thành phố (bắt buộc)

**Response:**
```json
[
  {
    "wardCode": "10105001",
    "wardName": "Phường Hoàn Kiếm"
  },
  {
    "wardCode": "10105002",
    "wardName": "Phường Cửa Nam"
  }
]
```

### ➕ Create Address
```http
POST /api/addresses
```

**Request Body:**
```json
{
  "provinceCode": "01",
  "provinceName": "Thành phố Hà Nội",
  "wardCode": "10105001",
  "wardName": "Phường Hoàn Kiếm"
}
```

### 📥 Import from CSV
```http
POST /api/addresses/import
```

**Description:** Import dữ liệu địa chỉ từ file CSV đã được xử lý.

**Response:**
```json
{
  "message": "Import thành công 3322 địa chỉ",
  "imported": 3322
}
```

### 🗑️ Clear All Addresses
```http
POST /api/addresses/clear
```

**Description:** Xóa tất cả dữ liệu địa chỉ (chỉ dùng khi cần reset).

**Response:**
```json
{
  "message": "Đã xóa tất cả dữ liệu địa chỉ"
}
```

### 📝 Field Descriptions

#### Address Object
- `provinceCode`: Mã tỉnh/thành phố (bắt buộc)
- `provinceName`: Tên tỉnh/thành phố (bắt buộc)
- `wardCode`: Mã phường/xã (bắt buộc)
- `wardName`: Tên phường/xã (bắt buộc)
- `createdAt`: Thời gian tạo
- `updatedAt`: Thời gian cập nhật

### 🔄 Usage Flow

1. **Import dữ liệu:** `POST /api/addresses/import`
2. **Lấy danh sách tỉnh:** `GET /api/addresses/provinces`
3. **Chọn tỉnh và lấy phường/xã:** `GET /api/addresses/wards?provinceCode=01`

---

## ❤️ Favourites API

### 📋 Get All Favourites
```http
GET /api/favourites
```

**Query Parameters:**
- `userId` (optional): Filter by user ID

**Response:**
```json
[
  {
    "favouriteId": 1,
    "userId": 1,
    "postType": "rent",
    "postId": 1,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### ➕ Add to Favourites
```http
POST /api/favourites
```

**Request Body:**
```json
{
  "userId": 1,
  "postType": "rent",
  "postId": 1
}
```

**Validation:**
- `postType`: Required, enum: ["rent", "roommate"]

### 🗑️ Remove from Favourites
```http
DELETE /api/favourites/user/:userId/post/:postType/:postId
```

**Example:**
```http
DELETE /api/favourites/user/1/post/rent/1
```

---

## 🛠️ Frontend Integration Examples

### React/Next.js Example
```javascript
// API service
class ApiService {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
    this.token = localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  // Users
  async login(email, password) {
    const result = await this.request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = result.access_token;
    localStorage.setItem('token', this.token);
    return result;
  }

  // Admin
  async adminLogin(email, password) {
    const result = await this.request('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = result.access_token;
    localStorage.setItem('adminToken', this.token);
    return result;
  }

  async createAdmin(adminData) {
    return this.request('/admin/create', {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
  }

  async getAdmins() {
    return this.request('/admin');
  }

  async getUsers() {
    return this.request('/users');
  }

  async changePassword(userId, currentPassword, newPassword, confirmPassword) {
    return this.request(`/users/${userId}/change-password`, {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword
      }),
    });
  }

  // Rent Posts
  async getRentPosts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/rent-posts${queryString ? `?${queryString}` : ''}`);
  }

  async getRentPostsByCategory(category, userId = null) {
    const queryString = userId ? `?userId=${userId}` : '';
    return this.request(`/rent-posts/${category}${queryString}`);
  }

  async createRentPost(data) {
    return this.request('/rent-posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createPhongTro(data) {
    return this.request('/rent-posts/phong-tro', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createChungCu(data) {
    return this.request('/rent-posts/chung-cu', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createNhaNguyenCan(data) {
    return this.request('/rent-posts/nha-nguyen-can', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRentPostById(id) {
    return this.request(`/rent-posts/${id}`);
  }

  async updateRentPost(id, data) {
    return this.request(`/rent-posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRentPost(id) {
    return this.request(`/rent-posts/${id}`, {
      method: 'DELETE',
    });
  }

  // Verifications
  async submitVerification(verificationData) {
    return this.request('/verifications', {
      method: 'POST',
      body: JSON.stringify(verificationData),
    });
  }

  async getMyVerificationStatus() {
    return this.request('/users/me/verification');
  }

  // Admin Verifications (require admin token)
  async getVerificationsAdmin(status = null, page = 1, limit = 10) {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    return this.request(`/verifications/admin?${params.toString()}`);
  }

  async updateVerificationStatus(verificationId, status, adminNote = '') {
    return this.request(`/verifications/admin/${verificationId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNote }),
    });
  }

  async getVerificationByUserId(userId) {
    return this.request(`/verifications/user/${userId}`);
  }

  // Favourites
  async getFavourites(userId) {
    return this.request(`/favourites?userId=${userId}`);
  }

  async addFavourite(userId, postType, postId) {
    return this.request('/favourites', {
      method: 'POST',
      body: JSON.stringify({ userId, postType, postId }),
    });
  }
}

// Usage
const api = new ApiService();

// User Login
const { user } = await api.login('user@example.com', 'password123');

// Admin Login  
const { admin } = await api.adminLogin('admin@nhachung.com', 'admin123456');

// Change password
await api.changePassword(
  user.userId, 
  'oldpassword123', 
  'newpassword456', 
  'newpassword456'
);

// Get all rent posts
const allRentPosts = await api.getRentPosts({ page: 1, limit: 10 });

// Get posts by category
const phongTroPosts = await api.getRentPostsByCategory('phong-tro');
const chungCuPosts = await api.getRentPostsByCategory('chung-cu');
const nhaNguyenCanPosts = await api.getRentPostsByCategory('nha-nguyen-can');

// Get user's posts by category
const userPhongTroPosts = await api.getRentPostsByCategory('phong-tro', user.userId);

// Create different types of posts
const phongTroData = {
  userId: user.userId.toString(),
  title: "Phòng trọ đẹp gần trường đại học",
  description: "Phòng trọ rộng rãi, thoáng mát",
  address: {
    street: "Đường ABC",
    ward: "Phường XYZ",
    district: "Quận 1",
    city: "TP.HCM"
  },
  area: 25,
  price: 3000000,
  furniture: "co-ban"
};

const chungCuData = {
  userId: user.userId.toString(),
  title: "Căn hộ chung cư cao cấp",
  description: "Căn hộ 2PN/2WC, view đẹp",
  address: {
    street: "Đường DEF",
    ward: "Phường GHI",
    district: "Quận 2",
    city: "TP.HCM"
  },
  buildingInfo: {
    buildingName: "Chung cư ABC",
    blockOrTower: "Block A",
    floorNumber: 15,
    unitCode: "A15-03"
  },
  area: 60,
  price: 8000000,
  bedrooms: 2,
  bathrooms: 2,
  furniture: "full",
  propertyType: "chung-cu"
};

// Create posts
const phongTroPost = await api.createPhongTro(phongTroData);
const chungCuPost = await api.createChungCu(chungCuData);

// Get specific post
const post = await api.getRentPostById(phongTroPost.rentPostId);

// Update post
await api.updateRentPost(phongTroPost.rentPostId, {
  title: "Phòng trọ đã cập nhật",
  basicInfo: {
    price: 3500000,
    area: 30
  }
});

// Delete post
await api.deleteRentPost(phongTroPost.rentPostId);

// Add to favourites
await api.addFavourite(user.userId, 'rent', phongTroPost.rentPostId);

// === ADMIN WORKFLOWS ===

// Create first admin (one-time)
const firstAdmin = await api.createAdmin({
  name: "Admin System",
  email: "admin@nhachung.com", 
  password: "admin123456",
  phone: "0999999999"
});

// Admin login and get token
const { admin } = await api.adminLogin('admin@nhachung.com', 'admin123456');

// Get all verifications (admin only)
const verifications = await api.getVerificationsAdmin('pending', 1, 10);

// Get verification by userId (admin only)
const userVerification = await api.getVerificationByUserId(11);

// Approve a verification (admin only) - dùng verificationId từ userVerification
await api.updateVerificationStatus(
  userVerification.verificationId,  // Numeric ID: 1, 2, 3...
  'approved', 
  'Hồ sơ hợp lệ'
);

// Reject a verification (admin only)
await api.updateVerificationStatus(
  2,  // verificationId 
  'rejected', 
  'Ảnh không rõ, vui lòng chụp lại'
);

// === USER VERIFICATION WORKFLOW ===

// User submit verification
const verificationData = {
  idNumber: "123456789012",
  fullName: "Nguyễn Văn A",
  dateOfBirth: "1990-01-01",
  gender: "male", 
  issueDate: "2015-01-01",
  issuePlace: "Cục Cảnh sát quản lý hành chính về trật tự xã hội"
};

await api.submitVerification(verificationData);

// Check my verification status
const myStatus = await api.getMyVerificationStatus();
console.log('Verified:', myStatus.isVerified);
console.log('Status:', myStatus.verification?.status);
```

### Vue.js Example
```javascript
// composables/useApi.js
import { ref } from 'vue';

export function useApi() {
  const baseURL = 'http://localhost:3001/api';
  const token = ref(localStorage.getItem('token'));

  const request = async (endpoint, options = {}) => {
    const url = `${baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token.value && { Authorization: `Bearer ${token.value}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    return response.json();
  };

  const login = async (email, password) => {
    const result = await request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    token.value = result.access_token;
    localStorage.setItem('token', token.value);
    return result;
  };

  return {
    request,
    login,
    // ... other methods
  };
}
```

---

## 📝 Error Handling

### Common Error Responses
```json
// Validation Error (400)
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "email must be an email"
  ],
  "error": "Bad Request"
}

// Unauthorized (401)
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}

// Not Found (404)
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}

// Internal Server Error (500)
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

### Frontend Error Handling
```javascript
try {
  const data = await api.getUsers();
  // Handle success
} catch (error) {
  if (error.status === 401) {
    // Redirect to login
    router.push('/login');
  } else if (error.status === 400) {
    // Show validation errors
    setErrors(error.message);
  } else {
    // Show generic error
    showNotification('Có lỗi xảy ra, vui lòng thử lại');
  }
}
```

---

## 🔧 Development Tips

### 1. Environment Variables
```javascript
// .env.local (Frontend)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Nhà Chung
```

### 2. TypeScript Types
```typescript
// types/api.ts
export interface User {
  userId: number;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'landlord';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentPost {
  rentPostId: number;
  userId: number;
  title: string;
  description: string;
  images: string[];
  videos: string[];
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    specificAddress?: string;
    showSpecificAddress?: boolean;
  };
  category: 'phong-tro' | 'chung-cu' | 'nha-nguyen-can';
  basicInfo: {
    area: number;
    price: number;
    deposit?: number;
    furniture?: string;
    bedrooms?: number;
    bathrooms?: number;
    direction?: string;
    legalStatus?: string;
  };
  chungCuInfo?: {
    buildingName?: string;
    blockOrTower?: string;
    floorNumber?: number;
    unitCode?: string;
    propertyType?: string;
  };
  nhaNguyenCanInfo?: {
    khuLo?: string;
    unitCode?: string;
    propertyType?: string;
    totalFloors?: number;
    landArea?: number;
    usableArea?: number;
    width?: number;
    length?: number;
    features?: string[];
  };
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreatePhongTroDto {
  userId: string;
  title: string;
  description: string;
  images?: string[];
  videos?: string[];
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    specificAddress?: string;
    showSpecificAddress?: boolean;
  };
  area: number;
  price: number;
  deposit?: number;
  furniture?: string;
  status?: string;
}

export interface CreateChungCuDto {
  userId: string;
  title: string;
  description: string;
  images?: string[];
  videos?: string[];
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    specificAddress?: string;
    showSpecificAddress?: boolean;
  };
  buildingInfo?: {
    buildingName?: string;
    blockOrTower?: string;
    floorNumber?: number;
    unitCode?: string;
  };
  area: number;
  price: number;
  deposit?: number;
  furniture?: string;
  bedrooms?: number;
  bathrooms?: number;
  direction?: string;
  propertyType?: string;
  legalStatus?: string;
  status?: string;
}

export interface CreateNhaNguyenCanDto {
  userId: string;
  title: string;
  description: string;
  images?: string[];
  videos?: string[];
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    specificAddress?: string;
    showSpecificAddress?: boolean;
  };
  propertyInfo?: {
    khuLo?: string;
    unitCode?: string;
    propertyType?: string;
    totalFloors?: number;
    features?: string[];
  };
  landArea: number;
  usableArea?: number;
  width?: number;
  length?: number;
  price: number;
  deposit?: number;
  furniture?: string;
  bedrooms?: number;
  bathrooms?: number;
  direction?: string;
  legalStatus?: string;
  status?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}
```

### 3. Change Password Component (React)
```jsx
import React, { useState } from 'react';
import { useApi } from './hooks/useApi';

const ChangePasswordForm = ({ userId, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const api = useApi();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Mật khẩu hiện tại không được để trống';
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'Mật khẩu mới không được để trống';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu không được để trống';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu mới và xác nhận mật khẩu không khớp';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await api.changePassword(
        userId,
        formData.currentPassword,
        formData.newPassword,
        formData.confirmPassword
      );
      
      // Success
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      onSuccess?.('Đổi mật khẩu thành công!');
      
    } catch (error) {
      if (error.status === 401) {
        setErrors({ currentPassword: 'Mật khẩu hiện tại không đúng' });
      } else if (error.status === 400) {
        if (error.message.includes('không khớp')) {
          setErrors({ confirmPassword: error.message });
        } else if (error.message.includes('khác mật khẩu hiện tại')) {
          setErrors({ newPassword: error.message });
        } else {
          setErrors({ general: error.message });
        }
      } else {
        setErrors({ general: 'Có lỗi xảy ra, vui lòng thử lại' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="change-password-form">
      <h3>Đổi mật khẩu</h3>
      
      {errors.general && (
        <div className="error-message">{errors.general}</div>
      )}
      
      <div className="form-group">
        <label>Mật khẩu hiện tại:</label>
        <input
          type="password"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          className={errors.currentPassword ? 'error' : ''}
        />
        {errors.currentPassword && (
          <span className="error-text">{errors.currentPassword}</span>
        )}
      </div>
      
      <div className="form-group">
        <label>Mật khẩu mới:</label>
        <input
          type="password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          className={errors.newPassword ? 'error' : ''}
        />
        {errors.newPassword && (
          <span className="error-text">{errors.newPassword}</span>
        )}
      </div>
      
      <div className="form-group">
        <label>Xác nhận mật khẩu mới:</label>
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className={errors.confirmPassword ? 'error' : ''}
        />
        {errors.confirmPassword && (
          <span className="error-text">{errors.confirmPassword}</span>
        )}
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
      </button>
    </form>
  );
};

export default ChangePasswordForm;
```

### 4. Pagination
```javascript
// Backend pagination
const getRentPosts = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return api.request(`/rent-posts?page=${page}&limit=${limit}`);
};

// Frontend pagination state
const [posts, setPosts] = useState([]);
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);

const loadPosts = async (page) => {
  const data = await getRentPosts(page, 10);
  setPosts(data);
  setCurrentPage(page);
  setTotalPages(Math.ceil(data.total / 10));
};
```

---

## 📍 Address Fields Description

### Cấu trúc địa chỉ mới
Tất cả các API liên quan đến địa chỉ đã được cập nhật để hỗ trợ cấu trúc địa chỉ chi tiết hơn với các trường mới:

#### Các trường cơ bản:
- `street`: Tên đường (optional) - có thể để trống
- `ward`: Tên phường/xã (required)
- `city`: Tên thành phố/tỉnh (required)
- `specificAddress`: Địa chỉ cụ thể (optional) - có thể nhập cả số lẫn chữ
- `showSpecificAddress`: Hiển thị địa chỉ cụ thể (optional)

#### Các trường mới từ API địa chỉ:
- `provinceCode`: Mã tỉnh/thành phố (required)
- `provinceName`: Tên tỉnh/thành phố (required)
- `wardCode`: Mã phường/xã (required)
- `wardName`: Tên phường/xã (required)
- `additionalInfo`: Thông tin bổ sung về địa chỉ (optional)

**Lưu ý**: 
- Cấu trúc địa chỉ mới không bao gồm `district` (quận/huyện) vì dữ liệu địa chỉ mới chỉ có tỉnh/thành phố và phường/xã.
- `street` là optional để linh hoạt hơn trong việc nhập địa chỉ.
- `specificAddress` thay thế cho `houseNumber` để có thể nhập địa chỉ cụ thể bao gồm cả số và chữ.

---

## ⚡ Utilities (Phí điện, nước và dịch vụ)

### Cấu trúc chung
```json
{
  "utilities": {
    "electricityPricePerKwh": 3500,
    "waterPrice": 20000,
    "waterBillingType": "per_m3",
    "internetFee": 150000,
    "garbageFee": 20000,
    "cleaningFee": 0,
    "parkingMotorbikeFee": 100000,
    "parkingCarFee": 1200000,
    "managementFee": 15000,
    "managementFeeUnit": "per_m2_per_month",
    "gardeningFee": 0,
    "cookingGasFee": 0,
    "includedInRent": {
      "electricity": false,
      "water": false,
      "internet": true,
      "garbage": true,
      "cleaning": false,
      "parkingMotorbike": false,
      "parkingCar": false,
      "managementFee": false
    }
  }
}
```

### Áp dụng theo loại bài đăng
- Phòng trọ (`phong-tro`): dùng các trường chung; có thêm `cookingGasFee`; không dùng `parkingCarFee`, `managementFee`, `managementFeeUnit` (sẽ bị bỏ qua nếu gửi).
- Chung cư (`chung-cu`): dùng các trường chung; bổ sung `parkingCarFee`, `managementFee`, `managementFeeUnit` và `includedInRent.parkingCar`, `includedInRent.managementFee`.
- Nhà nguyên căn (`nha-nguyen-can`): dùng các trường chung; bổ sung `parkingCarFee`, `managementFee`, `managementFeeUnit`, `gardeningFee`.
- Ở ghép (`roommate-posts`): không có object `utilities` riêng; nằm trong `currentRoom` với các trường: `shareMethod`, `estimatedMonthlyUtilities`, `capIncludedAmount`, `electricityPricePerKwh`, `waterPrice`, `waterBillingType`, `internetFee`, `garbageFee`, `cleaningFee`.

### Ghi chú
- `waterBillingType`: `per_m3` (tính theo m3) hoặc `per_person` (tính theo đầu người).
- `managementFeeUnit` (chung cư/nhà nguyên căn): `per_month` hoặc `per_m2_per_month`.
- `includedInRent.*`: đánh dấu chi phí đã bao gồm trong giá thuê.

### Ví dụ sử dụng:
```json
{
  "address": {
    "street": "Đường Nguyễn Huệ",
    "ward": "Phường Bến Nghé",
    "city": "Thành phố Hồ Chí Minh",
    "specificAddress": "123/45A",
    "showSpecificAddress": true,
    "provinceCode": "79",
    "provinceName": "Thành phố Hồ Chí Minh",
    "wardCode": "26701",
    "wardName": "Phường Bến Nghé",
    "additionalInfo": "Gần trung tâm thành phố, tiện đi lại"
  }
}
```

### Lợi ích:
- **Chuẩn hóa dữ liệu**: Sử dụng mã địa chỉ chính thức từ Bộ Nội vụ
- **Tìm kiếm chính xác**: Có thể tìm kiếm theo mã tỉnh/phường
- **Tích hợp API địa chỉ**: Dễ dàng tích hợp với API địa chỉ Việt Nam
- **Thông tin bổ sung**: Có thể thêm mô tả chi tiết về vị trí

---

## 🚀 Production Deployment

### Environment Variables
```bash
# Production .env
MONGO_URI=mongodb://your-production-db
PORT=3001
JWT_SECRET=your-super-secure-secret
NODE_ENV=production
```

### CORS Configuration
```javascript
// For production, update CORS in main.ts
app.enableCors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true,
});
```

---

## 📞 Support

- **Backend Issues**: Check server logs and database connection
- **API Questions**: Refer to this documentation
- **Frontend Integration**: Use the provided examples as starting points

**Happy Coding! 🎉**