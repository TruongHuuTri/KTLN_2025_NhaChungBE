# 🔐 Admin Verification Management

> **Hướng dẫn API quản lý xác thực danh tính cho Admin**

## 📋 Overview

Admin có thể quản lý toàn bộ quá trình xác thực danh tính của users với các chức năng:
- ✅ **Xem danh sách** tất cả verification requests
- ✅ **Lọc theo trạng thái** (pending, approved, rejected)
- ✅ **Duyệt verification** (approve)
- ✅ **Từ chối verification** (reject với lý do)
- ✅ **Xem chi tiết** verification của user cụ thể

---

## 🚀 API Endpoints

### 1. 📋 Get All Verifications

```http
GET /api/verifications/admin
Authorization: Bearer <admin-token>
```

**Query Parameters:**
```javascript
{
  status?: string,        // 'pending', 'approved', 'rejected'
  page?: number,          // Số trang (default: 1)
  limit?: number          // Số record/trang (default: 10)
}
```

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
      "adminNote": null,
      "faceMatchResult": {
        "match": false,
        "similarity": 45.2,
        "confidence": "low"
      }
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

---

### 2. 🖼️ Get Verification Images

```http
GET /api/verifications/admin/:verificationId/images
Authorization: Bearer <admin-token>
```

**Request Example:**
```http
GET /api/verifications/admin/1/images
```

**Response (200):**
```json
{
  "verificationId": 1,
  "userId": 11,
  "fullName": "Nguyễn Văn A",
  "idNumber": "123456789012",
  "status": "pending",
  "images": {
    "frontImage": "https://dxxxx.cloudfront.net/uploads/11/verifications/1705123456789-abc123.jpg",
    "backImage": "https://dxxxx.cloudfront.net/uploads/11/verifications/1705123456790-def456.jpg",
    "faceImage": "https://dxxxx.cloudfront.net/uploads/11/verifications/1705123456791-ghi789.jpg"
  },
  "faceMatchResult": {
    "match": false,
    "similarity": 45.2,
    "confidence": "low"
  },
  "submittedAt": "2024-01-15T10:30:00Z",
  "reviewedAt": null,
  "adminNote": null
}
```

---

### 3. 🔍 Get Verification Details

```http
GET /api/verifications/admin/:verificationId
Authorization: Bearer <admin-token>
```

> **📋 Lấy chi tiết thông tin verification** (không bao gồm ảnh)

**Request Example:**
```http
GET /api/verifications/admin/1
```

**Response (200):**
```json
{
  "verificationId": 1,
  "userId": 11,
  "idNumber": "123456789012",
  "fullName": "Nguyễn Văn A",
  "dateOfBirth": "1990-01-01T00:00:00Z",
  "gender": "male",
  "issueDate": "2015-01-01T00:00:00Z",
  "issuePlace": "Cục Cảnh sát QLHC về TTXH",
  "status": "pending",
  "submittedAt": "2024-01-15T10:30:00Z",
  "reviewedAt": null,
  "reviewedBy": null,
  "adminNote": null,
  "faceMatchResult": {
    "match": false,
    "similarity": 45.2,
    "confidence": "low"
  }
}
```

**Frontend Integration:**

**JavaScript Service:**
```javascript
// get-verification-details.service.js
export class GetVerificationDetailsService {
  static async getVerificationDetails(verificationId, adminToken) {
    const response = await fetch(`/api/verifications/admin/${verificationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get verification details');
    }

    return await response.json();
  }
}
```

**React Hook:**
```javascript
// useGetVerificationDetails.js
import { useState, useEffect } from 'react';
import { GetVerificationDetailsService } from './get-verification-details.service';

export const useGetVerificationDetails = (verificationId, adminToken) => {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!verificationId || !adminToken) return;

    const fetchVerification = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await GetVerificationDetailsService.getVerificationDetails(verificationId, adminToken);
        setVerification(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVerification();
  }, [verificationId, adminToken]);

  return { verification, loading, error };
};
```

**Vue.js Composition API:**
```javascript
// useGetVerificationDetails.js
import { ref, onMounted, watch } from 'vue';
import { GetVerificationDetailsService } from './get-verification-details.service';

export const useGetVerificationDetails = (verificationId, adminToken) => {
  const verification = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchVerification = async () => {
    if (!verificationId.value || !adminToken.value) return;

    loading.value = true;
    error.value = null;

    try {
      const data = await GetVerificationDetailsService.getVerificationDetails(verificationId.value, adminToken.value);
      verification.value = data;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    fetchVerification();
  });

  watch([verificationId, adminToken], () => {
    fetchVerification();
  });

  return { verification, loading, error };
};
```

---

### 4. 👤 Get Verification by User ID

```http
GET /api/verifications/user/:userId
Authorization: Bearer <admin-token>
```

**Request Example:**
```http
GET /api/verifications/user/11
```

**Response (200):**
```json
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
  "adminNote": null,
  "faceMatchResult": {
    "match": false,
    "similarity": 45.2,
    "confidence": "low"
  }
}
```

> **📝 Lưu ý:** API này không trả về `images` field. Để xem ảnh, sử dụng API `GET /api/verifications/admin/:verificationId/images`

---

### 5. ✅ Approve Verification

```http
PUT /api/verifications/admin/:verificationId
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "status": "approved",
  "adminNote": "Hồ sơ hợp lệ, thông tin chính xác"
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
    "adminNote": "Hồ sơ hợp lệ, thông tin chính xác",
    "faceMatchResult": {
      "match": false,
      "similarity": 45.2,
      "confidence": "low"
    }
  }
}
```

---

### 4. ❌ Reject Verification

```http
PUT /api/verifications/admin/:verificationId
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "status": "rejected",
  "adminNote": "Thông tin xác thực không đúng, vui lòng nộp lại hồ sơ"
}
```

**Response (200):**
```json
{
  "message": "Cập nhật trạng thái xác thực thành công",
  "verification": {
    "verificationId": 1,
    "status": "rejected",
    "reviewedAt": "2024-01-15T15:30:00Z",
    "reviewedBy": 1,
    "adminNote": "Thông tin xác thực không đúng, vui lòng nộp lại hồ sơ",
    "faceMatchResult": {
      "match": false,
      "similarity": 45.2,
      "confidence": "low"
    }
  }
}
```

---

## 🎯 Frontend Integration

### 1. Admin Verification Service

```javascript
class AdminVerificationService {
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

  async getAllVerifications(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await fetch(`${this.baseURL}/verifications/admin?${queryParams}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch verifications');
    }

    return response.json();
  }

  async getVerificationImages(verificationId) {
    const response = await fetch(`${this.baseURL}/verifications/admin/${verificationId}/images`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch verification images');
    }

    return response.json();
  }

  async getVerificationByUserId(userId) {
    const response = await fetch(`${this.baseURL}/verifications/user/${userId}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch verification');
    }

    return response.json();
  }

  async approveVerification(verificationId, adminNote) {
    const response = await fetch(`${this.baseURL}/verifications/admin/${verificationId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        status: 'approved',
        adminNote
      })
    });

    if (!response.ok) {
      throw new Error('Failed to approve verification');
    }

    return response.json();
  }

  async rejectVerification(verificationId, adminNote) {
    const response = await fetch(`${this.baseURL}/verifications/admin/${verificationId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        status: 'rejected',
        adminNote
      })
    });

    if (!response.ok) {
      throw new Error('Failed to reject verification');
    }

    return response.json();
  }
}
```

### 2. React Hook Example

```javascript
import { useState, useEffect } from 'react';

function useAdminVerifications() {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({});

  const fetchVerifications = async (filters = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/verifications/admin?${new URLSearchParams(filters)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch verifications');
      }

      const data = await response.json();
      setVerifications(data.verifications);
      setPagination({
        total: data.total,
        page: data.page,
        totalPages: data.totalPages
      });
    } catch (error) {
      console.error('Error fetching verifications:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const approveVerification = async (verificationId, adminNote) => {
    try {
      const response = await fetch(`/api/verifications/admin/${verificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'approved',
          adminNote
        })
      });

      if (!response.ok) {
        throw new Error('Failed to approve verification');
      }

      // Refresh verifications list
      await fetchVerifications();
      return await response.json();
    } catch (error) {
      console.error('Error approving verification:', error);
      throw error;
    }
  };

  const rejectVerification = async (verificationId, adminNote) => {
    try {
      const response = await fetch(`/api/verifications/admin/${verificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'rejected',
          adminNote
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reject verification');
      }

      // Refresh verifications list
      await fetchVerifications();
      return await response.json();
    } catch (error) {
      console.error('Error rejecting verification:', error);
      throw error;
    }
  };

  return {
    verifications,
    pagination,
    loading,
    fetchVerifications,
    approveVerification,
    rejectVerification
  };
}
```

---

## 🎨 UI Component Example

### Admin Verification Management Component

```jsx
import React, { useState, useEffect } from 'react';

function AdminVerificationManagement() {
  const { 
    verifications, 
    pagination, 
    loading, 
    fetchVerifications,
    approveVerification,
    rejectVerification 
  } = useAdminVerifications();

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [adminNote, setAdminNote] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [actionType, setActionType] = useState('');

  useEffect(() => {
    const filters = selectedStatus === 'all' ? {} : { status: selectedStatus };
    fetchVerifications(filters);
  }, [selectedStatus]);

  const handleApprove = async (verification) => {
    if (window.confirm('Bạn có chắc muốn duyệt hồ sơ xác thực này?')) {
      try {
        await approveVerification(verification.verificationId, adminNote);
        alert('Duyệt hồ sơ thành công');
        setShowActionModal(false);
        setAdminNote('');
      } catch (error) {
        alert('Lỗi khi duyệt hồ sơ');
      }
    }
  };

  const handleReject = async (verification) => {
    if (!adminNote.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      await rejectVerification(verification.verificationId, adminNote);
      alert('Từ chối hồ sơ thành công');
      setShowActionModal(false);
      setAdminNote('');
    } catch (error) {
      alert('Lỗi khi từ chối hồ sơ');
    }
  };

  const openActionModal = (verification, type) => {
    setSelectedVerification(verification);
    setActionType(type);
    setShowActionModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Đã từ chối';
      case 'pending': return 'Chờ duyệt';
      default: return 'Không xác định';
    }
  };

  if (loading) {
    return <div>Loading verifications...</div>;
  }

  return (
    <div className="admin-verification-management">
      <h2>Quản lý Xác thực Danh tính</h2>
      
      {/* Filters */}
      <div className="filters mb-4">
        <select 
          value={selectedStatus} 
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="all">Tất cả</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Đã từ chối</option>
        </select>
      </div>

      {/* Verifications Table */}
      <div className="verifications-table">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2">ID</th>
              <th className="border p-2">User ID</th>
              <th className="border p-2">Họ tên</th>
              <th className="border p-2">Số CCCD</th>
              <th className="border p-2">Trạng thái</th>
              <th className="border p-2">Face Match</th>
              <th className="border p-2">Ngày nộp</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {verifications.map(verification => (
              <tr key={verification.verificationId}>
                <td className="border p-2">{verification.verificationId}</td>
                <td className="border p-2">{verification.userId}</td>
                <td className="border p-2">{verification.fullName}</td>
                <td className="border p-2">{verification.idNumber}</td>
                <td className="border p-2">
                  <span className={`px-2 py-1 rounded text-sm ${getStatusColor(verification.status)}`}>
                    {getStatusText(verification.status)}
                  </span>
                </td>
                <td className="border p-2">
                  <div className="text-sm">
                    <div>Similarity: {verification.faceMatchResult?.similarity}%</div>
                    <div className={`text-xs ${verification.faceMatchResult?.confidence === 'high' ? 'text-green-600' : 'text-red-600'}`}>
                      {verification.faceMatchResult?.confidence === 'high' ? 'Cao' : 'Thấp'}
                    </div>
                  </div>
                </td>
                <td className="border p-2">
                  {new Date(verification.submittedAt).toLocaleDateString()}
                </td>
                <td className="border p-2">
                  {verification.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => openActionModal(verification, 'approve')}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm mr-2"
                      >
                        Duyệt
                      </button>
                      <button 
                        onClick={() => openActionModal(verification, 'reject')}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination mt-4">
        <span>Trang {pagination.page} / {pagination.totalPages}</span>
        <span className="ml-4">Tổng: {pagination.total} hồ sơ</span>
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <div className="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="modal-content bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              {actionType === 'approve' ? 'Duyệt hồ sơ' : 'Từ chối hồ sơ'}
            </h3>
            <div className="mb-4">
              <p><strong>User:</strong> {selectedVerification?.fullName}</p>
              <p><strong>Số CCCD:</strong> {selectedVerification?.idNumber}</p>
              <p><strong>Face Match:</strong> {selectedVerification?.faceMatchResult?.similarity}%</p>
            </div>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder={actionType === 'approve' ? 'Ghi chú (tùy chọn)...' : 'Lý do từ chối (bắt buộc)...'}
              rows={4}
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => {
                  setShowActionModal(false);
                  setAdminNote('');
                }}
                className="px-4 py-2 border rounded"
              >
                Hủy
              </button>
              <button 
                onClick={() => actionType === 'approve' ? handleApprove(selectedVerification) : handleReject(selectedVerification)}
                className={`px-4 py-2 rounded text-white ${
                  actionType === 'approve' ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                {actionType === 'approve' ? 'Duyệt' : 'Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## ⚠️ Error Handling

### Common Error Scenarios

```javascript
// 1. Verification không tồn tại (404)
{
  "statusCode": 404,
  "message": "Verification not found",
  "error": "Not Found"
}

// 2. Token không hợp lệ (401)
{
  "statusCode": 401,
  "message": "Admin token không hợp lệ hoặc đã hết hạn",
  "error": "Unauthorized"
}

// 3. Lỗi server (500)
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## 🔄 Workflow

### Admin Verification Management Process
1. **Xem danh sách** verification requests
2. **Lọc theo trạng thái** (pending, approved, rejected)
3. **Kiểm tra thông tin** và face match result
4. **Quyết định duyệt/từ chối** với ghi chú
5. **Refresh danh sách** sau khi thay đổi

### Business Rules
- ✅ **Chỉ admin** mới có thể quản lý verification
- ✅ **Duyệt verification** chuyển status thành 'approved'
- ✅ **Từ chối verification** chuyển status thành 'rejected' và lưu lý do
- ✅ **Face match result** được hiển thị để admin tham khảo
- ✅ **Audit trail** cho việc quản lý verification

---

## 📸 Image Storage (S3)

### Overview
Ảnh verification được lưu trữ trên **AWS S3** với CloudFront CDN để tối ưu tốc độ truy cập.

### Image URLs
Tất cả ảnh verification (CCCD mặt trước, mặt sau, và selfie) được trả về dưới dạng CloudFront URLs:

```json
{
  "images": {
    "frontImage": "https://dxxxx.cloudfront.net/uploads/11/verifications/1705123456789-abc123.jpg",
    "backImage": "https://dxxxx.cloudfront.net/uploads/11/verifications/1705123456790-def456.jpg",
    "faceImage": "https://dxxxx.cloudfront.net/uploads/11/verifications/1705123456791-ghi789.jpg"
  }
}
```

### S3 Structure
```
📦 my-bucket/
└── 📁 uploads/
    └── 📁 {userId}/
        └── 📁 verifications/
            ├── 🖼️ 1705123456789-{uuid}.jpg  (Front ID)
            ├── 🖼️ 1705123456790-{uuid}.jpg  (Back ID)
            └── 🖼️ 1705123456791-{uuid}.jpg  (Face Image)
```

### Frontend Integration
```javascript
// Admin có thể hiển thị ảnh trực tiếp từ S3 URLs
const displayImages = (images) => {
  return (
    <div className="verification-images">
      <h3>Ảnh CCCD mặt trước</h3>
      <img 
        src={images.frontImage} 
        alt="Front ID" 
        className="max-w-md"
      />
      
      <h3>Ảnh CCCD mặt sau</h3>
      <img 
        src={images.backImage} 
        alt="Back ID" 
        className="max-w-md"
      />
      
      <h3>Ảnh selfie</h3>
      <img 
        src={images.faceImage} 
        alt="Face" 
        className="max-w-md"
      />
    </div>
  );
};
```

### Benefits
- ✅ **CloudFront CDN**: Tải ảnh nhanh từ edge locations
- ✅ **Unlimited storage**: Không giới hạn dung lượng
- ✅ **High availability**: 99.99% uptime SLA
- ✅ **Auto backup**: S3 versioning tự động
- ✅ **Scalable**: Tự động scale theo nhu cầu

### Notes
- ⚠️ Ảnh được lưu trực tiếp lên S3 khi user submit verification
- ⚠️ URL có thể truy cập public (không cần authen)
- ⚠️ Không cần cleanup thủ công như File System storage
