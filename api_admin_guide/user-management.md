# 👥 Admin User Management

> **Hướng dẫn API quản lý users cho Admin**

## 📋 Overview

Admin có thể quản lý users với 2 chức năng chính:
- ✅ **Xem danh sách** tất cả users
- ✅ **Xóa user** (soft delete)

---

## 🚀 API Endpoints

### 1. 📋 Get All Users

```http
GET /api/users/admin
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
[
  {
    "userId": 1,
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "phone": "0123456789",
    "role": "user",
    "avatar": null,
    "isVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "userId": 2,
    "name": "Trần Thị B",
    "email": "tranthib@example.com",
    "phone": "0987654321",
    "role": "landlord",
    "avatar": null,
    "isVerified": false,
    "createdAt": "2024-01-01T01:00:00.000Z",
    "updatedAt": "2024-01-01T01:00:00.000Z"
  }
]
```

---

### 2. 🔄 Update User Status

```http
PUT /api/users/admin/:id/status
Authorization: Bearer <admin-token>
```

**Request Body:**

**Vô hiệu hóa user:**
```json
{
  "isActive": false
}
```

**Kích hoạt user:**
```json
{
  "isActive": true
}
```

**Response (200):**
```json
{
  "message": "vô hiệu hóa user thành công",
  "user": {
    "userId": 123,
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "phone": "0123456789",
    "role": "user",
    "isActive": false,
    "isVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T15:30:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy user",
  "error": "Not Found"
}
```

---

### 3. 🔐 Reset User Password

```http
POST /api/users/admin/:id/reset-password
Authorization: Bearer <admin-token>
```

**Request Example:**
```http
POST /api/users/admin/123/reset-password
```

**Response (200):**
```json
{
  "message": "Đặt lại mật khẩu thành công. Mật khẩu mới đã được gửi qua email.",
  "newPassword": "Kx9#mP2$vL8q"
}
```

**Error Response (404):**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy user",
  "error": "Not Found"
}
```

**⚠️ Lưu ý:**
- Mật khẩu mới được tạo tự động (12 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt)
- Mật khẩu mới được gửi qua email của user
- User nên đổi mật khẩu này ngay sau khi nhận được

---

## 🎯 Frontend Integration

### 1. User Management Service

```javascript
class AdminUserService {
  constructor(baseURL = 'http://localhost:3001/api') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('adminToken');
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async getAllUsers() {
    const response = await fetch(`${this.baseURL}/users/admin`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    return response.json();
  }

  async updateUserStatus(userId, isActive) {
    const response = await fetch(`${this.baseURL}/users/admin/${userId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ isActive })
    });

    if (!response.ok) {
      throw new Error('Failed to update user status');
    }

    return response.json();
  }

  async resetUserPassword(userId) {
    const response = await fetch(`${this.baseURL}/users/admin/${userId}/reset-password`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to reset user password');
    }

    return response.json();
  }
}
```

### 2. React Hook Example

```javascript
import { useState, useEffect } from 'react';

function useUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/admin', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    try {
      const response = await fetch(`/api/users/admin/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      // Refresh the list
      await fetchUsers();
      return await response.json();
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    fetchUsers,
    deleteUser
  };
}
```

---

## 🎨 UI Component Example

### User List Component

```jsx
import React from 'react';

function UserManagement() {
  const { users, loading, deleteUser } = useUserManagement();
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Bạn có chắc muốn xóa user "${userName}"?`)) {
      try {
        await deleteUser(userId);
        alert('Xóa user thành công');
      } catch (error) {
        alert('Lỗi khi xóa user');
      }
    }
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <div className="user-management">
      <h2>Quản lý Users</h2>
      
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.userId}>
                <td>{user.userId}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>
                  <span className={`role ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`verified ${user.isVerified ? 'yes' : 'no'}`}>
                    {user.isVerified ? '✓' : '✗'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button 
                    onClick={() => handleDeleteUser(user.userId, user.name)}
                    className="delete-btn"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## ⚠️ Error Handling

### Common Error Scenarios

```javascript
// 1. Token không hợp lệ (401)
{
  "statusCode": 401,
  "message": "Admin token không hợp lệ hoặc đã hết hạn",
  "error": "Unauthorized"
}

// 2. User không tồn tại (404)
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}

// 3. User đã bị xóa (400)
{
  "statusCode": 400,
  "message": "User đã bị xóa",
  "error": "Bad Request"
}
```

---

## 🔄 Workflow

### Admin User Management Process
1. **Xem danh sách** tất cả users
2. **Kiểm tra thông tin** user (role, verification status)
3. **Quyết định xóa** user nếu cần thiết
4. **Xác nhận xóa** và gửi request
5. **Refresh danh sách** sau khi xóa

### Business Rules
- ✅ **Chỉ admin** mới có thể xem và xóa users
- ✅ **Soft delete** - User không bị xóa hoàn toàn khỏi database
- ✅ **Không thể tạo/sửa** users qua admin panel
- ✅ **Audit trail** cho việc xóa users
