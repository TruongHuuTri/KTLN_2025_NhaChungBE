# 👥 Users API

## 📋 Get All Users
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

## ➕ Create User
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

## 🔑 Login
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

## 👤 Get User by ID
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

## ✏️ Update User
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

## 🔐 Change Password
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

## 🗑️ Delete User
```http
DELETE /api/users/:id
```
