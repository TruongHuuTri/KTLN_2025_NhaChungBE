# 👨‍💼 Admin API

> **Hệ thống Admin riêng biệt hoàn toàn với User thường**

## 🏗️ Admin System Overview

**Collections:**
- `admins` - Admin users (riêng biệt với `users`)
- `users` - Regular users

**Key Features:**
- ✅ Admin tokens khác User tokens
- ✅ Collections riêng biệt
- ✅ Authentication riêng
- ✅ Quản lý verification độc lập

## ➕ Create Admin (One-time only)
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

## 🔑 Admin Login
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

## 📋 Get All Admins
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

## 🔒 AdminJwtGuard Security

**AdminJwtGuard kiểm tra:**
1. ✅ Token hợp lệ và chưa hết hạn
2. ✅ `payload.role === 'admin'`
3. ✅ `payload.type === 'admin'`

**User không thể truy cập Admin APIs:**
- User token không có `type: "admin"`
- AdminJwtGuard sẽ từ chối request
