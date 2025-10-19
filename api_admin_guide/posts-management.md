# 📝 Admin Posts Management

> **Hướng dẫn API quản lý bài đăng cho Admin**

## 📋 Overview

Admin có thể quản lý toàn bộ bài đăng trong hệ thống với các chức năng:
- ✅ **Xem danh sách** tất cả bài đăng
- ✅ **Xem bài đăng chờ duyệt**
- ✅ **Duyệt bài đăng** (approve)
- ✅ **Từ chối bài đăng** (reject với lý do)

---

## 🚀 API Endpoints

### 1. 📋 Get All Posts

```http
GET /api/admin/posts
Authorization: Bearer <admin-token>
```

**Query Parameters:**
```javascript
{
  status?: string,        // 'pending', 'active', 'inactive', 'rejected'
  postType?: string,      // 'cho-thue', 'tim-o-ghep'
  userId?: number         // Lọc theo user đăng bài
}
```

**Response (200):**
```json
[
  {
    "postId": 1,
    "userId": 123,
    "postType": "cho-thue",
    "title": "Phòng trọ đẹp gần trường",
    "description": "Phòng trọ 25m², đầy đủ tiện nghi...",
    "images": ["image1.jpg", "image2.jpg"],
    "roomId": 456,
    "buildingId": 789,
    "landlordId": 101,
    "isManaged": true,
    "source": "room_management",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### 2. ⏳ Get Pending Posts

```http
GET /api/admin/posts/pending
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
[
  {
    "postId": 2,
    "userId": 124,
    "postType": "tim-o-ghep",
    "title": "Tìm bạn ở ghép phòng 2 người",
    "description": "Phòng 30m², tìm bạn ở ghép...",
    "status": "pending",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
]
```

---

### 3. ✅ Approve Post

```http
PUT /api/admin/posts/:id/approve
Authorization: Bearer <admin-token>
```

**Request Example:**
```http
PUT /api/admin/posts/2/approve
```

**Response (200):**
```json
{
  "postId": 2,
  "status": "approved",
  "updatedAt": "2024-01-01T15:30:00.000Z"
}
```

---

### 4. ❌ Reject Post

```http
PUT /api/admin/posts/:id/reject
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "reason": "Nội dung không phù hợp với quy định"
}
```

**Response (200):**
```json
{
  "postId": 2,
  "status": "rejected",
  "rejectionReason": "Nội dung không phù hợp với quy định",
  "updatedAt": "2024-01-01T15:30:00.000Z"
}
```

---

## 🎯 Frontend Integration

### 1. Admin Posts Service

```javascript
class AdminPostsService {
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

  async getAllPosts(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await fetch(`${this.baseURL}/admin/posts?${queryParams}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }

    return response.json();
  }

  async getPendingPosts() {
    const response = await fetch(`${this.baseURL}/admin/posts/pending`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pending posts');
    }

    return response.json();
  }

  async approvePost(postId) {
    const response = await fetch(`${this.baseURL}/admin/posts/${postId}/approve`, {
      method: 'PUT',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to approve post');
    }

    return response.json();
  }

  async rejectPost(postId, reason) {
    const response = await fetch(`${this.baseURL}/admin/posts/${postId}/reject`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      throw new Error('Failed to reject post');
    }

    return response.json();
  }

}
```

### 2. React Hook Example

```javascript
import { useState, useEffect } from 'react';

function useAdminPosts() {
  const [posts, setPosts] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAllPosts = async (filters = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/posts?${new URLSearchParams(filters)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingPosts = async () => {
    try {
      const response = await fetch('/api/admin/posts/pending', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending posts');
      }

      const data = await response.json();
      setPendingPosts(data);
    } catch (error) {
      console.error('Error fetching pending posts:', error);
      throw error;
    }
  };

  const approvePost = async (postId) => {
    try {
      const response = await fetch(`/api/admin/posts/${postId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to approve post');
      }

      // Refresh pending posts
      await fetchPendingPosts();
      return await response.json();
    } catch (error) {
      console.error('Error approving post:', error);
      throw error;
    }
  };

  const rejectPost = async (postId, reason) => {
    try {
      const response = await fetch(`/api/admin/posts/${postId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error('Failed to reject post');
      }

      // Refresh pending posts
      await fetchPendingPosts();
      return await response.json();
    } catch (error) {
      console.error('Error rejecting post:', error);
      throw error;
    }
  };


  return {
    posts,
    pendingPosts,
    loading,
    fetchAllPosts,
    fetchPendingPosts,
    approvePost,
    rejectPost
  };
}
```

---

## 🎨 UI Component Example

### Admin Posts Management Component

```jsx
import React, { useState, useEffect } from 'react';

function AdminPostsManagement() {
  const { 
    posts, 
    pendingPosts, 
    loading, 
    fetchAllPosts, 
    fetchPendingPosts,
    approvePost,
    rejectPost
  } = useAdminPosts();

  const [selectedTab, setSelectedTab] = useState('all');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);

  useEffect(() => {
    if (selectedTab === 'all') {
      fetchAllPosts();
    } else if (selectedTab === 'pending') {
      fetchPendingPosts();
    }
  }, [selectedTab]);

  const handleApprove = async (postId) => {
    if (window.confirm('Bạn có chắc muốn duyệt bài đăng này?')) {
      try {
        await approvePost(postId);
        alert('Duyệt bài đăng thành công');
      } catch (error) {
        alert('Lỗi khi duyệt bài đăng');
      }
    }
  };

  const handleReject = async (postId, reason) => {
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      await rejectPost(postId, reason);
      alert('Từ chối bài đăng thành công');
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      alert('Lỗi khi từ chối bài đăng');
    }
  };


  const openRejectModal = (postId) => {
    setSelectedPostId(postId);
    setShowRejectModal(true);
  };

  const currentPosts = selectedTab === 'all' ? posts : pendingPosts;

  if (loading) {
    return <div>Loading posts...</div>;
  }

  return (
    <div className="admin-posts-management">
      <h2>Quản lý Bài đăng</h2>
      
      {/* Tabs */}
      <div className="tabs">
        <button 
          className={selectedTab === 'all' ? 'active' : ''}
          onClick={() => setSelectedTab('all')}
        >
          Tất cả bài đăng
        </button>
        <button 
          className={selectedTab === 'pending' ? 'active' : ''}
          onClick={() => setSelectedTab('pending')}
        >
          Chờ duyệt ({pendingPosts.length})
        </button>
      </div>

      {/* Posts Table */}
      <div className="posts-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tiêu đề</th>
              <th>Loại</th>
              <th>User</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentPosts.map(post => (
              <tr key={post.postId}>
                <td>{post.postId}</td>
                <td>{post.title}</td>
                <td>
                  <span className={`post-type ${post.postType}`}>
                    {post.postType === 'cho-thue' ? 'Cho thuê' : 'Tìm ở ghép'}
                  </span>
                </td>
                <td>{post.userId}</td>
                <td>
                  <span className={`status ${post.status}`}>
                    {post.status}
                  </span>
                </td>
                <td>{new Date(post.createdAt).toLocaleDateString()}</td>
                <td>
                  {post.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleApprove(post.postId)}
                        className="approve-btn"
                      >
                        Duyệt
                      </button>
                      <button 
                        onClick={() => openRejectModal(post.postId)}
                        className="reject-btn"
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

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Từ chối bài đăng</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
              rows={4}
            />
            <div className="modal-actions">
              <button 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
              >
                Hủy
              </button>
              <button 
                onClick={() => handleReject(selectedPostId, rejectReason)}
                className="reject-btn"
              >
                Từ chối
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
// 1. Post không tồn tại (404)
{
  "statusCode": 404,
  "message": "Post not found",
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

### Admin Posts Management Process
1. **Xem danh sách** tất cả bài đăng hoặc chờ duyệt
2. **Kiểm tra nội dung** bài đăng
3. **Quyết định duyệt/từ chối**
4. **Thực hiện hành động** tương ứng
5. **Refresh danh sách** sau khi thay đổi

### Business Rules
- ✅ **Chỉ admin** mới có thể quản lý bài đăng
- ✅ **Duyệt bài đăng** chuyển status thành 'approved'
- ✅ **Từ chối bài đăng** chuyển status thành 'rejected' và lưu lý do
- ✅ **Audit trail** cho việc quản lý bài đăng
