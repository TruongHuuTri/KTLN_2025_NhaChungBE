# 🔐 Admin Authentication & Management

> **Hướng dẫn tích hợp Admin Authentication APIs**

## 📋 Overview

Admin system hoàn toàn tách biệt với User system:
- ✅ **Collections riêng biệt**: `admins` vs `users`
- ✅ **Tokens riêng biệt**: Admin token vs User token
- ✅ **Authentication riêng biệt**: AdminJwtGuard vs JwtAuthGuard

---

## 🚀 API Endpoints

### 1. ➕ Create Admin

```http
POST /api/admin/create
Content-Type: application/json
```

**⚠️ Lưu ý:**
- KHÔNG CẦN Authorization header
- Hệ thống có thể có nhiều admin
- Email phải unique (không trùng với admin khác)

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

**Error Response (400):**
```json
{
  "statusCode": 400,
  "message": "Email admin đã tồn tại",
  "error": "Bad Request"
}
```

---

### 2. 🔑 Admin Login

```http
POST /api/admin/login
Content-Type: application/json
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

**Error Response (401):**
```json
{
  "statusCode": 401,
  "message": "Email hoặc mật khẩu admin không đúng",
  "error": "Unauthorized"
}
```

---

### 3. 👤 Get My Profile

```http
GET /api/admin/me
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
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
```

---

### 4. 📋 Get All Admins

```http
GET /api/admin
Authorization: Bearer <admin-token>
```

**Response (200):**
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

---

### 5. ✏️ Update Admin Information

```http
PUT /api/admin/:id
Authorization: Bearer <admin-token>
```

**⚠️ Lưu ý:**
- **Trạng thái (isActive)**: Admin có thể cập nhật trạng thái của admin khác
- **Thông tin cá nhân**: Admin chỉ có thể cập nhật thông tin của chính mình
- Chỉ cập nhật những trường được truyền lên
- Nếu muốn đổi mật khẩu, phải cung cấp `currentPassword` và `newPassword`

**Request Body Examples:**

**Chỉ cập nhật tên:**
```json
{
  "name": "Admin Updated Name"
}
```

**Cập nhật email và số điện thoại:**
```json
{
  "email": "newemail@nhachung.com",
  "phone": "0987654321"
}
```

**Đổi mật khẩu:**
```json
{
  "currentPassword": "admin123456",
  "newPassword": "newpassword789"
}
```

**Cập nhật trạng thái admin khác:**
```json
{
  "isActive": false
}
```

**Cập nhật tất cả thông tin:**
```json
{
  "name": "Admin Updated Name",
  "email": "newemail@nhachung.com",
  "phone": "0987654321",
  "currentPassword": "admin123456",
  "newPassword": "newpassword789",
  "isActive": true
}
```

**Response (200):**
```json
{
  "message": "Cập nhật thông tin admin thành công",
  "admin": {
    "adminId": 1,
    "name": "Admin Updated Name",
    "email": "newemail@nhachung.com",
    "phone": "0987654321",
    "role": "admin",
    "isActive": true,
    "lastLogin": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T15:30:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "statusCode": 400,
  "message": "Bạn chỉ có thể cập nhật thông tin của chính mình",
  "error": "Bad Request"
}
```

**Error Response (401):**
```json
{
  "statusCode": 401,
  "message": "Mật khẩu hiện tại không đúng",
  "error": "Unauthorized"
}
```

---

### 6. 🔐 Change Admin Password (Legacy)

```http
PUT /api/admin/:id/change-password
Authorization: Bearer <admin-token>
```

**⚠️ Lưu ý:** API này vẫn hoạt động nhưng khuyến nghị sử dụng `PUT /api/admin/:id` thay thế.

**Request Body:**
```json
{
  "currentPassword": "admin123456",
  "newPassword": "newpassword789"
}
```

**Response (200):**
```json
{
  "message": "Đổi mật khẩu thành công"
}
```

---

## 🔒 Token Security

### Admin Token Structure
```javascript
// JWT Payload
{
  email: "admin@nhachung.com",
  sub: "1", // adminId as string
  name: "Admin System",
  role: "admin",
  type: "admin", // ← Key difference from user token
  iat: 1640995200,
  exp: 1641081600
}
```

### AdminJwtGuard Validation
```javascript
// Guard kiểm tra:
1. Token hợp lệ và chưa hết hạn
2. payload.role === 'admin'
3. payload.type === 'admin'
```

### Token Usage
```javascript
// ✅ Correct usage
const headers = {
  'Authorization': `Bearer ${adminToken}`,
  'Content-Type': 'application/json'
};

// ❌ User token không thể truy cập Admin APIs
const userToken = 'user-jwt-token'; // Sẽ bị từ chối
```

---

## 🎯 Frontend Integration

### 1. Admin Service Class
```javascript
class AdminService {
  constructor(baseURL = 'http://localhost:3001/api') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('adminToken');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('adminToken', token);
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  async getMyProfile() {
    const response = await fetch(`${this.baseURL}/admin/me`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    return response.json();
  }

  async getAllAdmins() {
    const response = await fetch(`${this.baseURL}/admin`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch admins');
    }

    return response.json();
  }

  async changePassword(adminId, currentPassword, newPassword) {
    const response = await fetch(`${this.baseURL}/admin/${adminId}/change-password`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to change password');
    }

    return response.json();
  }
}
```

### 2. React Hook Example
```javascript
import { useState, useEffect } from 'react';

function useAdminAuth() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      localStorage.setItem('adminToken', data.access_token);
      setAdmin(data.admin);
      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setAdmin(null);
  };

  const changePassword = async (adminId, currentPassword, newPassword) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/${adminId}/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }

      return await response.json();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      // Verify token and get admin info
      // Implementation depends on your app structure
    }
  }, []);

  return { admin, login, logout, changePassword, loading };
}
```

### 3. Vue.js Composition API
```javascript
import { ref, onMounted } from 'vue';

export function useAdminAuth() {
  const admin = ref(null);
  const loading = ref(false);

  const login = async (email, password) => {
    loading.value = true;
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      localStorage.setItem('adminToken', data.access_token);
      admin.value = data.admin;
      return data;
    } catch (error) {
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    admin.value = null;
  };

  const changePassword = async (adminId, currentPassword, newPassword) => {
    loading.value = true;
    try {
      const response = await fetch(`/api/admin/${adminId}/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }

      return await response.json();
    } catch (error) {
      throw error;
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      // Verify token and get admin info
    }
  });

  return { admin, login, logout, changePassword, loading };
}
```

---

## ⚠️ Error Handling

### Common Error Scenarios
```javascript
// 1. Admin đã tồn tại (400)
{
  "statusCode": 400,
  "message": "Admin đã tồn tại trong hệ thống",
  "error": "Bad Request"
}

// 2. Login failed (401)
{
  "statusCode": 401,
  "message": "Email hoặc mật khẩu admin không đúng",
  "error": "Unauthorized"
}

// 3. Admin bị vô hiệu hóa (401)
{
  "statusCode": 401,
  "message": "Tài khoản admin đã bị vô hiệu hóa",
  "error": "Unauthorized"
}

// 4. Token không hợp lệ (401)
{
  "statusCode": 401,
  "message": "Admin token không hợp lệ hoặc đã hết hạn",
  "error": "Unauthorized"
}

// 5. Mật khẩu hiện tại không đúng (401)
{
  "statusCode": 401,
  "message": "Mật khẩu hiện tại không đúng",
  "error": "Unauthorized"
}

// 6. Không thể đổi mật khẩu admin khác (400)
{
  "statusCode": 400,
  "message": "Bạn chỉ có thể đổi mật khẩu của chính mình",
  "error": "Bad Request"
}
```

### Error Handling Best Practices
```javascript
async function handleApiCall(apiCall) {
  try {
    const response = await apiCall();
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API call failed');
    }
    
    return await response.json();
  } catch (error) {
    // Handle different error types
    if (error.message.includes('token')) {
      // Redirect to login
      window.location.href = '/admin/login';
    }
    
    console.error('API Error:', error);
    throw error;
  }
}
```

---

### 6. 🗑️ Cleanup Images (NEW)

```http
POST /api/admin/cleanup-images
Authorization: Bearer <admin-token>
```

**⚠️ Lưu ý:**
- Xóa ảnh verification cũ hơn 30 ngày
- Chạy manual khi cần thiết
- Tự động cleanup đã chạy hàng ngày lúc 2:00 AM

**Request Body:**
```json
{}
```

**Response (200):**
```json
{
  "message": "Cleanup hoàn thành thành công"
}
```

**Frontend Integration:**

**JavaScript Service:**
```javascript
// cleanup-images.service.js
export class CleanupImagesService {
  static async cleanupImages(adminToken) {
    const response = await fetch('/api/admin/cleanup-images', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Cleanup failed');
    }

    return await response.json();
  }
}
```

**React Hook:**
```javascript
// useCleanupImages.js
import { useState } from 'react';
import { CleanupImagesService } from './cleanup-images.service';

export const useCleanupImages = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cleanupImages = async (adminToken) => {
    setLoading(true);
    setError(null);

    try {
      const result = await CleanupImagesService.cleanupImages(adminToken);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { cleanupImages, loading, error };
};
```

**Vue.js Composition API:**
```javascript
// useCleanupImages.js
import { ref } from 'vue';
import { CleanupImagesService } from './cleanup-images.service';

export const useCleanupImages = () => {
  const loading = ref(false);
  const error = ref(null);

  const cleanupImages = async (adminToken) => {
    loading.value = true;
    error.value = null;

    try {
      const result = await CleanupImagesService.cleanupImages(adminToken);
      return result;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return { cleanupImages, loading, error };
};
```

---

## 🔄 Workflow

### Initial Setup
1. **Tạo admin đầu tiên** → `POST /api/admin/create`
2. **Tạo thêm admin** (nếu cần) → `POST /api/admin/create`
3. **Lưu thông tin admin** cho team

### Daily Usage
1. **Login admin** → `POST /api/admin/login`
2. **Lưu token** vào localStorage/sessionStorage
3. **Sử dụng token** cho các API calls khác
4. **Auto logout** khi token hết hạn (24h)

### System Maintenance
1. **Cleanup images** → `POST /api/admin/cleanup-images` (khi cần)
2. **Auto cleanup** chạy hàng ngày lúc 2:00 AM
3. **Monitor disk space** sau cleanup

### Security Checklist
- ✅ Token được lưu an toàn (localStorage/sessionStorage)
- ✅ Auto logout khi token hết hạn
- ✅ Clear token khi logout
- ✅ Handle 401 errors properly
- ✅ Không mix admin token với user token
