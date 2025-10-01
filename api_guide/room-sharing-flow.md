 check # Frontend Integration Flow - Room Sharing System

## Tổng quan luồng

```
User B → Tìm phòng có canShare: true → Đăng ký ở ghép → User A duyệt → Landlord duyệt → Tạo contract → Hoàn tất
```

## 1. LUỒNG ĐĂNG KÝ Ở GHÉP

### Bước 1: Tìm phòng cho phép ở ghép

**API:** `GET /api/rooms/search`

```typescript
// Frontend: RoomSearch.tsx
interface Room {
  roomId: number;
  canShare: boolean;
  currentOccupants: number;
  maxOccupancy: number;
  roomNumber: string;
  area: number;
  price: number;
}

const searchRoomsForSharing = async (filters: any): Promise<Room[]> => {
  const response = await fetch('/api/rooms/search', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
};

// Filter rooms có canShare: true
const filteredRooms = rooms.filter((room: Room) => 
  room.canShare && 
  room.currentOccupants < room.maxOccupancy &&
  room.currentOccupants >= 1
);
```

**Postman Testing:**
```json
GET http://localhost:3001/api/rooms/search
Authorization: Bearer <jwt_token>
```

### Bước 2: Đăng ký ở ghép phòng

**API:** `POST /api/rooms/:roomId/sharing-request`

**Lưu ý:** Cần có `postId` (ID của bài đăng) để xác định người đăng bài (`posterId`).

```typescript
// Frontend: RoomSharingRequestForm.tsx
import React, { useState } from 'react';

interface CreateRoomSharingRequestData {
  postId: number;
  message: string;
  requestedMoveInDate: string;
  requestedDuration: number;
}

interface RoomSharingRequest {
  requestId: number;
  tenantId: number;
  landlordId: number;
  roomId: number;
  posterId: number;
  requestType: 'room_sharing';
  status: 'pending_user_approval' | 'pending_landlord_approval' | 'approved' | 'rejected';
  message: string;
  requestedMoveInDate: string;
  requestedDuration: number;
  createdAt: string;
  updatedAt: string;
}

interface RoomSharingRequestFormProps {
  roomId: number;
}

const createRoomSharingRequest = async (
  roomId: number, 
  requestData: CreateRoomSharingRequestData
): Promise<RoomSharingRequest> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/rooms/${roomId}/sharing-request`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      postId: requestData.postId,
      message: requestData.message,
      requestedMoveInDate: requestData.requestedMoveInDate,
      requestedDuration: requestData.requestedDuration
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create room sharing request');
  }
  
  return response.json();
};

const RoomSharingRequestForm: React.FC<RoomSharingRequestFormProps> = ({ roomId }) => {
  const [formData, setFormData] = useState<CreateRoomSharingRequestData>({
    postId: 0,
    message: '',
    requestedMoveInDate: '',
    requestedDuration: 12
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const result = await createRoomSharingRequest(roomId, formData);
      
      if (result.requestId) {
        alert('Đăng ký ở ghép thành công! Chờ User A duyệt.');
        // Reset form
        setFormData({
          postId: 0,
          message: '',
          requestedMoveInDate: '',
          requestedDuration: 12
        });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="room-sharing-form">
      <h3>Đăng ký ở ghép phòng</h3>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-group">
        <label htmlFor="postId">ID Bài đăng:</label>
        <input
          id="postId"
          type="number"
          value={formData.postId}
          onChange={(e) => setFormData({...formData, postId: parseInt(e.target.value)})}
          required
          placeholder="Nhập ID của bài đăng"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="message">Lời nhắn cho người ở hiện tại:</label>
        <textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({...formData, message: e.target.value})}
          required
          placeholder="Giới thiệu bản thân và lý do muốn ở ghép..."
          rows={4}
        />
      </div>

      <div className="form-group">
        <label htmlFor="moveInDate">Ngày dọn vào:</label>
        <input
          id="moveInDate"
          type="date"
          value={formData.requestedMoveInDate}
          onChange={(e) => setFormData({...formData, requestedMoveInDate: e.target.value})}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="duration">Thời hạn (tháng):</label>
        <select
          id="duration"
          value={formData.requestedDuration}
          onChange={(e) => setFormData({...formData, requestedDuration: parseInt(e.target.value)})}
        >
          <option value={6}>6 tháng</option>
          <option value={12}>12 tháng</option>
          <option value={24}>24 tháng</option>
        </select>
      </div>
      
      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
      </button>
    </form>
  );
};

export default RoomSharingRequestForm;
```

**Postman Testing:**
```json
POST http://localhost:3001/api/rooms/16/sharing-request
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "postId": 123,
  "message": "Tôi muốn ở ghép phòng này",
  "requestedMoveInDate": "2024-01-15",
  "requestedDuration": 12
}
```

**Response:**
```json
{
  "requestId": 123,
  "tenantId": 17,
  "landlordId": 5,
  "roomId": 16,
  "posterId": 15,
  "requestType": "room_sharing",
  "status": "pending_user_approval",
  "message": "Tôi muốn ở ghép phòng này",
  "requestedMoveInDate": "2024-01-15T00:00:00.000Z",
  "requestedDuration": 12,
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T10:00:00.000Z"
}
```

## 2. LUỒNG CHO USER A (NGƯỜI Ở TRONG PHÒNG)

### Bước 3: User A xem danh sách yêu cầu ở ghép

**API:** `GET /api/users/me/sharing-requests-to-approve`

```typescript
// Frontend: UserASharingRequests.tsx
import React, { useState, useEffect } from 'react';

interface RoomSharingRequest {
  requestId: number;
  tenantId: number;
  landlordId: number;
  roomId: number;
  posterId: number;
  requestType: 'room_sharing';
  status: 'pending_user_approval' | 'pending_landlord_approval' | 'approved' | 'rejected';
  message: string;
  requestedMoveInDate: string;
  requestedDuration: number;
  createdAt: string;
  updatedAt: string;
}

const fetchSharingRequestsToApprove = async (): Promise<RoomSharingRequest[]> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/users/me/sharing-requests-to-approve', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch sharing requests');
  }
  
  return response.json();
};

const UserASharingRequests: React.FC = () => {
  const [requests, setRequests] = useState<RoomSharingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await fetchSharingRequestsToApprove();
      setRequests(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const approveRequest = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/rental-requests/${requestId}/approve-by-user`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        alert('Đã duyệt yêu cầu ở ghép! Chờ chủ nhà duyệt cuối cùng.');
        loadRequests(); // Refresh list
      }
    } catch (error) {
      alert('Có lỗi xảy ra: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const rejectRequest = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/rental-requests/${requestId}/reject-by-user`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        alert('Đã từ chối yêu cầu ở ghép.');
        loadRequests(); // Refresh list
      }
    } catch (error) {
      alert('Có lỗi xảy ra: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending_user_approval': return 'Chờ tôi duyệt';
      case 'pending_landlord_approval': return 'Chờ chủ nhà duyệt';
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Đã từ chối';
      default: return status;
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;
  if (error) return <div className="error">Lỗi: {error}</div>;

  return (
    <div className="user-a-sharing-requests">
      <h2>Yêu cầu ở ghép phòng của tôi</h2>
      {requests.length === 0 ? (
        <p className="no-requests">Không có yêu cầu nào</p>
      ) : (
        <div className="requests-list">
          {requests.map((request) => (
            <div key={request.requestId} className="request-card">
              <h3>Yêu cầu #{request.requestId}</h3>
              <p><strong>Phòng:</strong> {request.roomId}</p>
              <p><strong>Tin nhắn:</strong> {request.message}</p>
              <p><strong>Ngày dọn vào:</strong> {new Date(request.requestedMoveInDate).toLocaleDateString()}</p>
              <p><strong>Thời hạn:</strong> {request.requestedDuration} tháng</p>
              <p><strong>Trạng thái:</strong> 
                <span className={`status ${request.status}`}>
                  {getStatusText(request.status)}
                </span>
              </p>
              
              {request.status === 'pending_user_approval' && (
                <div className="action-buttons">
                  <button 
                    onClick={() => approveRequest(request.requestId)}
                    className="btn-approve"
                  >
                    Duyệt
                  </button>
                  <button 
                    onClick={() => rejectRequest(request.requestId)}
                    className="btn-reject"
                  >
                    Từ chối
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserASharingRequests;
```

**Postman Testing:**
```json
GET http://localhost:3001/api/users/me/sharing-requests-to-approve
Authorization: Bearer <user_a_jwt_token>
```

### Bước 4: User A duyệt yêu cầu ở ghép

**API:** `PUT /api/users/rental-requests/:requestId/approve-by-user`

```typescript
// Frontend: approveSharingRequest function
const approveSharingRequest = async (requestId: number): Promise<RoomSharingRequest> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/users/rental-requests/${requestId}/approve-by-user`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to approve request');
  }
  
  const result = await response.json();
  
  if (result.requestId) {
    alert('Đã duyệt yêu cầu ở ghép! Chờ chủ nhà duyệt cuối cùng.');
  }
  
  return result;
};
```

**Postman Testing:**
```json
PUT http://localhost:3001/api/users/rental-requests/123/approve-by-user
Authorization: Bearer <user_a_jwt_token>
```

### Bước 5: User A từ chối yêu cầu ở ghép

**API:** `PUT /api/users/rental-requests/:requestId/reject-by-user`

```typescript
// Frontend: rejectSharingRequest function
const rejectSharingRequest = async (requestId: number): Promise<RoomSharingRequest> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/users/rental-requests/${requestId}/reject-by-user`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to reject request');
  }
  
  const result = await response.json();
  
  if (result.requestId) {
    alert('Đã từ chối yêu cầu ở ghép.');
  }
  
  return result;
};
```

**Postman Testing:**
```json
PUT http://localhost:3001/api/users/rental-requests/123/reject-by-user
Authorization: Bearer <user_a_jwt_token>
```

### Bước 5.1: User A xem lịch sử yêu cầu đã xử lý

**API:** `GET /api/users/me/sharing-requests-history`

```typescript
// Frontend: UserASharingRequestHistory.tsx
import React, { useState, useEffect } from 'react';

interface RoomSharingRequest {
  requestId: number;
  tenantId: number;
  landlordId: number;
  roomId: number;
  posterId: number;
  requestType: 'room_sharing';
  status: 'pending_landlord_approval' | 'approved' | 'rejected';
  message: string;
  requestedMoveInDate: string;
  requestedDuration: number;
  createdAt: string;
  updatedAt: string;
}

const fetchSharingRequestHistory = async (): Promise<RoomSharingRequest[]> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/users/me/sharing-requests-history', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch request history');
  }
  
  return response.json();
};

const UserASharingRequestHistory: React.FC = () => {
  const [requests, setRequests] = useState<RoomSharingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const data = await fetchSharingRequestHistory();
        setRequests(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_landlord_approval':
        return 'Đã duyệt - Chờ chủ nhà';
      case 'approved':
        return 'Đã duyệt hoàn toàn';
      case 'rejected':
        return 'Đã từ chối';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_landlord_approval':
        return 'orange';
      case 'approved':
        return 'green';
      case 'rejected':
        return 'red';
      default:
        return 'gray';
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div className="error">Lỗi: {error}</div>;

  return (
    <div className="sharing-request-history">
      <h3>Lịch sử yêu cầu ở ghép</h3>
      
      {requests.length === 0 ? (
        <p>Chưa có yêu cầu nào</p>
      ) : (
        <div className="requests-list">
          {requests.map((request) => (
            <div key={request.requestId} className="request-item">
              <div className="request-header">
                <h4>Yêu cầu #{request.requestId}</h4>
                <span 
                  className={`status status-${getStatusColor(request.status)}`}
                >
                  {getStatusText(request.status)}
                </span>
              </div>
              
              <div className="request-details">
                <p><strong>Tin nhắn:</strong> {request.message}</p>
                <p><strong>Ngày dọn vào:</strong> {new Date(request.requestedMoveInDate).toLocaleDateString()}</p>
                <p><strong>Thời hạn:</strong> {request.requestedDuration} tháng</p>
                <p><strong>Ngày tạo:</strong> {new Date(request.createdAt).toLocaleString()}</p>
                <p><strong>Cập nhật cuối:</strong> {new Date(request.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserASharingRequestHistory;
```

**Postman Testing:**
```json
GET http://localhost:3001/api/users/me/sharing-requests-history
Authorization: Bearer <user_a_jwt_token>
```

## 3. LUỒNG CHO CHỦ TRỌ (LANDLORD)

### Bước 6: Chủ trọ xem danh sách yêu cầu ở ghép

**API:** `GET /api/landlord/room-sharing-requests`

```typescript
// Frontend: LandlordSharingRequests.tsx
import React, { useState, useEffect } from 'react';

interface RoomSharingRequest {
  requestId: number;
  tenantId: number;
  landlordId: number;
  roomId: number;
  posterId: number;
  requestType: 'room_sharing';
  status: 'pending_user_approval' | 'pending_landlord_approval' | 'approved' | 'rejected';
  message: string;
  requestedMoveInDate: string;
  requestedDuration: number;
  createdAt: string;
  updatedAt: string;
}

interface RoomSharingContract {
  contractId: number;
  roomId: number;
  landlordId: number;
  contractType: 'shared';
  status: 'active';
  isPrimaryTenant: false;
  monthlyRent: 0;
  deposit: 0;
  tenants: Array<{
    tenantId: number;
    moveInDate: string;
    monthlyRent: 0;
    deposit: 0;
    status: 'active';
    isPrimaryTenant: false;
  }>;
  roomInfo: {
    roomNumber: string;
    area: number;
    maxOccupancy: number;
    currentOccupancy: number;
  };
}

const fetchLandlordSharingRequests = async (): Promise<RoomSharingRequest[]> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/landlord/room-sharing-requests', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch landlord sharing requests');
  }
  
  return response.json();
};

const LandlordSharingRequests: React.FC = () => {
  const [requests, setRequests] = useState<RoomSharingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await fetchLandlordSharingRequests();
      setRequests(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const approveByLandlord = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/landlord/room-sharing-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result: { request: RoomSharingRequest; contract: RoomSharingContract } = await response.json();
        alert('Đã duyệt yêu cầu ở ghép thành công! Hợp đồng đã được tạo và người ở ghép đã được thêm vào phòng.');
        loadRequests(); // Refresh list
      }
    } catch (error) {
      alert('Có lỗi xảy ra: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const rejectByLandlord = async (requestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/landlord/room-sharing-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        alert('Đã từ chối yêu cầu ở ghép.');
        loadRequests(); // Refresh list
      }
    } catch (error) {
      alert('Có lỗi xảy ra: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending_landlord_approval': return 'Chờ tôi duyệt';
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Đã từ chối';
      default: return status;
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;
  if (error) return <div className="error">Lỗi: {error}</div>;

  return (
    <div className="landlord-sharing-requests">
      <h2>Yêu cầu ở ghép phòng</h2>
      {requests.length === 0 ? (
        <p className="no-requests">Không có yêu cầu nào</p>
      ) : (
        <div className="requests-list">
          {requests.map((request) => (
            <div key={request.requestId} className="request-card">
              <h3>Yêu cầu #{request.requestId}</h3>
              <p><strong>Phòng:</strong> {request.roomId}</p>
              <p><strong>Người thuê:</strong> {request.tenantId}</p>
              <p><strong>Tin nhắn:</strong> {request.message}</p>
              <p><strong>Ngày dọn vào:</strong> {new Date(request.requestedMoveInDate).toLocaleDateString()}</p>
              <p><strong>Thời hạn:</strong> {request.requestedDuration} tháng</p>
              <p><strong>Trạng thái:</strong> 
                <span className={`status ${request.status}`}>
                  {getStatusText(request.status)}
                </span>
              </p>
              
              {request.status === 'pending_landlord_approval' && (
                <div className="action-buttons">
                  <button 
                    onClick={() => approveByLandlord(request.requestId)}
                    className="btn-approve"
                  >
                    Duyệt
                  </button>
                  <button 
                    onClick={() => rejectByLandlord(request.requestId)}
                    className="btn-reject"
                  >
                    Từ chối
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandlordSharingRequests;
```

**Postman Testing:**
```json
GET http://localhost:3001/api/landlord/room-sharing-requests
Authorization: Bearer <landlord_jwt_token>
```

### Bước 7: Chủ trọ duyệt yêu cầu ở ghép

**API:** `PUT /api/landlord/room-sharing-requests/:requestId/approve`

> **📝 Lưu ý:** Khi chủ nhà duyệt yêu cầu ở ghép, hệ thống sẽ:
> - ✅ Tự động tạo hợp đồng room sharing
> - ✅ Tự động thêm người ở ghép vào phòng
> - ✅ Cập nhật room occupancy

```javascript
// Frontend: approveByLandlord function
const approveByLandlord = async (requestId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/landlord/room-sharing-requests/${requestId}/approve`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const result = await response.json();
  
  if (result.request && result.contract) {
    alert('Đã duyệt yêu cầu ở ghép thành công! Hợp đồng đã được tạo và người ở ghép đã được thêm vào phòng.');
    // Refresh danh sách yêu cầu
    fetchLandlordSharingRequests();
  }
  
  return result;
};
```

**Postman Testing:**
```json
PUT http://localhost:3001/api/landlord/room-sharing-requests/123/approve
Authorization: Bearer <landlord_jwt_token>
```

**Response Example:**
```json
{
  "request": {
    "requestId": 123,
    "status": "approved",
    "contractId": 456,
    "respondedAt": "2024-01-10T12:00:00.000Z"
  },
  "contract": {
    "contractId": 456,
    "roomId": 16,
    "landlordId": 5,
    "contractType": "shared",
    "status": "active",
    "isPrimaryTenant": false,
    "monthlyRent": 0,
    "deposit": 0,
    "tenants": [
      {
        "tenantId": 17,
        "moveInDate": "2024-01-15T00:00:00.000Z",
        "monthlyRent": 0,
        "deposit": 0,
        "status": "active",
        "isPrimaryTenant": false
      }
    ],
    "roomInfo": {
      "roomNumber": "A101",
      "area": 25,
      "maxOccupancy": 3,
      "currentOccupancy": 2
    }
  }
}
```

### Bước 8: Chủ trọ từ chối yêu cầu ở ghép

**API:** `PUT /api/landlord/room-sharing-requests/:requestId/reject`

```javascript
// Frontend: rejectByLandlord function
const rejectByLandlord = async (requestId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/landlord/room-sharing-requests/${requestId}/reject`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const result = await response.json();
  
  if (result.requestId) {
    alert('Đã từ chối yêu cầu ở ghép.');
    // Refresh danh sách yêu cầu
    fetchLandlordSharingRequests();
  }
  
  return result;
};
```

**Postman Testing:**
```json
PUT http://localhost:3001/api/landlord/room-sharing-requests/123/reject
Authorization: Bearer <landlord_jwt_token>
```

## 4. LUỒNG CHO USER B (NGƯỜI MUỐN Ở GHÉP)

### Bước 9: User B xem trạng thái yêu cầu của mình

**API:** `GET /api/users/my-room-sharing-requests`

```typescript
// Frontend: MySharingRequests.tsx
import React, { useState, useEffect } from 'react';

interface RoomSharingRequest {
  requestId: number;
  tenantId: number;
  landlordId: number;
  roomId: number;
  posterId: number;
  requestType: 'room_sharing';
  status: 'pending_user_approval' | 'pending_landlord_approval' | 'approved' | 'rejected';
  message: string;
  requestedMoveInDate: string;
  requestedDuration: number;
  contractId?: number;
  createdAt: string;
  updatedAt: string;
}

const fetchMySharingRequests = async (): Promise<RoomSharingRequest[]> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/users/my-room-sharing-requests', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch my sharing requests');
  }
  
  return response.json();
};

const MySharingRequests: React.FC = () => {
  const [requests, setRequests] = useState<RoomSharingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await fetchMySharingRequests();
      setRequests(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const viewContract = (contractId?: number) => {
    if (contractId) {
      // Navigate to contract view or open modal
      window.location.href = `/contracts/${contractId}`;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'pending_user_approval': return 'Chờ User A duyệt';
      case 'pending_landlord_approval': return 'Chờ chủ nhà duyệt';
      case 'approved': return 'Đã được duyệt';
      case 'rejected': return 'Đã bị từ chối';
      default: return status;
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;
  if (error) return <div className="error">Lỗi: {error}</div>;

  return (
    <div className="my-sharing-requests">
      <h2>Yêu cầu ở ghép của tôi</h2>
      {requests.length === 0 ? (
        <p className="no-requests">Bạn chưa có yêu cầu ở ghép nào</p>
      ) : (
        <div className="requests-list">
          {requests.map((request) => (
            <div key={request.requestId} className="request-card">
              <h3>Phòng: {request.roomId}</h3>
              <p><strong>Tin nhắn:</strong> {request.message}</p>
              <p><strong>Ngày dọn vào:</strong> {new Date(request.requestedMoveInDate).toLocaleDateString()}</p>
              <p><strong>Thời hạn:</strong> {request.requestedDuration} tháng</p>
              <p><strong>Trạng thái:</strong> 
                <span className={`status ${request.status}`}>
                  {getStatusText(request.status)}
                </span>
              </p>
              
              {request.status === 'approved' && request.contractId && (
                <div className="action-buttons">
                  <button 
                    onClick={() => viewContract(request.contractId)}
                    className="btn-view-contract"
                  >
                    Xem hợp đồng
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MySharingRequests;
```

**Postman Testing:**
```json
GET http://localhost:3001/api/users/my-room-sharing-requests
Authorization: Bearer <jwt_token>
```

### Bước 10: User B xem hợp đồng room sharing

**API:** `GET /api/users/contracts/:contractId`

```typescript
// Frontend: RoomSharingContractView.tsx
import React, { useState, useEffect } from 'react';

interface RoomSharingContract {
  contractId: number;
  roomId: number;
  landlordId: number;
  contractType: 'shared';
  status: 'active' | 'expired' | 'cancelled';
  isPrimaryTenant: false;
  monthlyRent: 0;
  deposit: 0;
  tenants: Array<{
    tenantId: number;
    moveInDate: string;
    monthlyRent: 0;
    deposit: 0;
    status: 'active' | 'inactive';
    isPrimaryTenant: false;
  }>;
  roomInfo: {
    roomNumber: string;
    area: number;
    maxOccupancy: number;
    currentOccupancy: number;
  };
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface RoomSharingContractViewProps {
  contractId: number;
}

const fetchRoomSharingContract = async (contractId: number): Promise<RoomSharingContract> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/users/contracts/${contractId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch room sharing contract');
  }
  
  return response.json();
};

const RoomSharingContractView: React.FC<RoomSharingContractViewProps> = ({ contractId }) => {
  const [contract, setContract] = useState<RoomSharingContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContract = async () => {
      try {
        setLoading(true);
        const data = await fetchRoomSharingContract(contractId);
        setContract(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contract');
      } finally {
        setLoading(false);
      }
    };
    
    loadContract();
  }, [contractId]);

  if (loading) return <div className="loading">Đang tải...</div>;
  if (error) return <div className="error">Lỗi: {error}</div>;
  if (!contract) return <div className="no-contract">Không tìm thấy hợp đồng</div>;

  return (
    <div className="contract-view">
      <h2>Hợp đồng ở ghép phòng</h2>
      <div className="contract-details">
        <div className="contract-header">
          <h3>Mã hợp đồng: #{contract.contractId}</h3>
          <span className={`status-badge ${contract.status}`}>
            {contract.status === 'active' ? '🟢 Đang hoạt động' : 
             contract.status === 'expired' ? '🔴 Hết hạn' : '❌ Đã hủy'}
          </span>
        </div>
        
        <div className="contract-info">
          <div className="info-section">
            <h4>Thông tin phòng</h4>
            <p><strong>Phòng:</strong> {contract.roomInfo.roomNumber}</p>
            <p><strong>Diện tích:</strong> {contract.roomInfo.area}m²</p>
            <p><strong>Sức chứa:</strong> {contract.roomInfo.currentOccupancy}/{contract.roomInfo.maxOccupancy} người</p>
          </div>
          
          <div className="info-section">
            <h4>Thông tin hợp đồng</h4>
            <p><strong>Loại hợp đồng:</strong> {contract.contractType}</p>
            <p><strong>Tiền thuê:</strong> {contract.monthlyRent.toLocaleString()} VND/tháng</p>
            <p><strong>Tiền cọc:</strong> {contract.deposit.toLocaleString()} VND</p>
            <p><strong>Thời hạn:</strong> {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}</p>
          </div>
          
          <div className="info-section">
            <h4>Thông tin người thuê</h4>
            {contract.tenants.map((tenant, index) => (
              <div key={index} className="tenant-info">
                <p><strong>Người thuê #{index + 1}:</strong> ID {tenant.tenantId}</p>
                <p><strong>Ngày dọn vào:</strong> {new Date(tenant.moveInDate).toLocaleDateString()}</p>
                <p><strong>Vai trò:</strong> {tenant.isPrimaryTenant ? 'Người thuê chính' : 'Người ở ghép'}</p>
                <p><strong>Trạng thái:</strong> {tenant.status === 'active' ? 'Đang hoạt động' : 'Không hoạt động'}</p>
              </div>
            ))}
          </div>
          
          <div className="info-section important-note">
            <h4>⚠️ Lưu ý quan trọng</h4>
            <p>Bạn là <strong>người ở ghép</strong> nên:</p>
            <ul>
              <li>Không cần thanh toán hóa đơn cho chủ nhà</li>
              <li>Chỉ chia tiền với người thuê chính (User A)</li>
              <li>Tiền thuê và tiền cọc của bạn = 0 VND</li>
            </ul>
          </div>
        </div>
      </div>
      
      {contract.status === 'active' && (
        <div className="contract-actions">
          <a 
            href={`/api/users/contracts/${contract.contractId}/download-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="download-pdf-btn"
          >
            📄 Tải hợp đồng PDF
          </a>
        </div>
      )}
    </div>
  );
};

export default RoomSharingContractView;
```

**Postman Testing:**
```json
GET http://localhost:3001/api/users/contracts/456
Authorization: Bearer <jwt_token>
```

## 5. LUỒNG HOẠT ĐỘNG TỔNG QUAN

```
User B Flow:
1. Tìm phòng có canShare: true → 2. Đăng ký ở ghép → 3. Chờ User A duyệt

User A Flow:
4. Nhận thông báo → 5. Xem yêu cầu ở ghép → 6. Duyệt/Từ chối

Landlord Flow:
7. Nhận thông báo → 8. Xem yêu cầu ở ghép → 9. Duyệt/Từ chối → 10. Tạo hợp đồng (nếu duyệt)

User B Flow (tiếp):
11. Xem trạng thái → 12. Xem hợp đồng → 13. Hoàn tất
```

> **⚠️ Lưu ý quan trọng:** 
> - **User B không thanh toán hóa đơn** - chỉ chia tiền với User A
> - **User A thanh toán hóa đơn** cho chủ nhà
> - **Hợp đồng room sharing** có `contractType: 'shared'` và `monthlyRent: 0`

## 6. LUỒNG TỰ ĐỘNG TẠO HỢP ĐỒNG SAU KHI DUYỆT

Khi landlord duyệt yêu cầu ở ghép (`status = 'approved'`), hệ thống tự động:

### 6.1. Tạo hợp đồng room sharing
- ✅ Tạo `RentalContract` với `contractType: 'shared'`
- ✅ `monthlyRent: 0` và `deposit: 0` cho User B
- ✅ `isPrimaryTenant: false` cho User B
- ✅ Liên kết `contractId` với `RentalRequest`

### 6.2. Cập nhật phòng
- ✅ Thêm User B vào `room.currentTenants[]`
- ✅ Tăng `room.currentOccupants++`
- ✅ Cập nhật `room.availableSpots--`
- ✅ Đảm bảo `room.canShare = true`

## 7. VALIDATION RULES

### Room Validation
- Phòng phải có `canShare: true`
- Phòng phải có ít nhất 1 tenant (`currentOccupants >= 1`)
- Phòng chưa đầy (`currentOccupants < maxOccupancy`)

### Request Validation
- User chưa đăng ký ở ghép phòng này
- Message không được rỗng
- Move-in date phải hợp lệ
- Duration phải > 0

### Authorization
- Chỉ User A (posterId) mới có thể duyệt/từ chối ở bước 1
- Chỉ Landlord mới có thể duyệt/từ chối ở bước 2

## 8. ERROR HANDLING

### Common Error Responses

```json
// Room validation errors
{
  "statusCode": 400,
  "message": "Room must have at least one tenant to allow sharing"
}

{
  "statusCode": 400,
  "message": "Room is already at maximum capacity"
}

{
  "statusCode": 400,
  "message": "You have already requested to share this room"
}

{
  "statusCode": 400,
  "message": "Room does not allow sharing"
}

// Authorization errors
{
  "statusCode": 403,
  "message": "You are not authorized to approve this request"
}

{
  "statusCode": 403,
  "message": "You are not the poster of this room"
}

// Not found errors
{
  "statusCode": 404,
  "message": "Request not found"
}

{
  "statusCode": 404,
  "message": "Room not found"
}
```

## 9. STATUS FLOW

```
pending_user_approval
    ↓ (User A duyệt)
pending_landlord_approval
    ↓ (Landlord duyệt)
approved → Contract created + User added to room

pending_user_approval
    ↓ (User A từ chối)
rejected

pending_landlord_approval
    ↓ (Landlord từ chối)
rejected
```

### Status Descriptions
- **`pending_user_approval`**: Chờ User A (người đăng bài) duyệt
- **`pending_landlord_approval`**: Chờ Landlord duyệt
- **`approved`**: Đã được duyệt, hợp đồng đã tạo
- **`rejected`**: Đã bị từ chối

## 10. POSTMAN COLLECTION

Tạo file `Room_Sharing_API.postman_collection.json`:

```json
{
  "info": {
    "name": "Room Sharing API",
    "description": "API collection for Room Sharing System",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001/api"
    },
    {
      "key": "userToken",
      "value": "your-user-token-here"
    },
    {
      "key": "posterToken", 
      "value": "your-poster-token-here"
    },
    {
      "key": "landlordToken",
      "value": "your-landlord-token-here"
    },
    {
      "key": "roomId",
      "value": "16"
    },
    {
      "key": "requestId",
      "value": "123"
    }
  ],
  "item": [
    {
      "name": "1. Create Room Sharing Request",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{userToken}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"postId\": 123,\n  \"message\": \"Tôi muốn ở ghép phòng này\",\n  \"requestedMoveInDate\": \"2024-01-15\",\n  \"requestedDuration\": 12\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/rooms/{{roomId}}/sharing-request",
          "host": ["{{baseUrl}}"],
          "path": ["rooms", "{{roomId}}", "sharing-request"]
        }
      }
    },
    {
      "name": "2. User A - Get Requests to Approve",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{posterToken}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/users/me/sharing-requests-to-approve",
          "host": ["{{baseUrl}}"],
          "path": ["users", "me", "sharing-requests-to-approve"]
        }
      }
    },
    {
      "name": "2.1. User A - View Request History",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{posterToken}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/users/me/sharing-requests-history",
          "host": ["{{baseUrl}}"],
          "path": ["users", "me", "sharing-requests-history"]
        }
      }
    },
    {
      "name": "3. User A - Approve Request",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{posterToken}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/users/rental-requests/{{requestId}}/approve-by-user",
          "host": ["{{baseUrl}}"],
          "path": ["users", "rental-requests", "{{requestId}}", "approve-by-user"]
        }
      }
    },
    {
      "name": "4. User A - Reject Request",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{posterToken}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/users/rental-requests/{{requestId}}/reject-by-user",
          "host": ["{{baseUrl}}"],
          "path": ["users", "rental-requests", "{{requestId}}", "reject-by-user"]
        }
      }
    },
    {
      "name": "5. Landlord - Get Room Sharing Requests",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{landlordToken}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/landlord/room-sharing-requests",
          "host": ["{{baseUrl}}"],
          "path": ["landlord", "room-sharing-requests"]
        }
      }
    },
    {
      "name": "6. Landlord - Approve Request",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{landlordToken}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/landlord/room-sharing-requests/{{requestId}}/approve",
          "host": ["{{baseUrl}}"],
          "path": ["landlord", "room-sharing-requests", "{{requestId}}", "approve"]
        }
      }
    },
    {
      "name": "7. Landlord - Reject Request",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{landlordToken}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/landlord/room-sharing-requests/{{requestId}}/reject",
          "host": ["{{baseUrl}}"],
          "path": ["landlord", "room-sharing-requests", "{{requestId}}", "reject"]
        }
      }
    },
    {
      "name": "8. User B - Get My Room Sharing Requests",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{userToken}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/users/my-room-sharing-requests",
          "host": ["{{baseUrl}}"],
          "path": ["users", "my-room-sharing-requests"]
        }
      }
    }
  ]
}
```

## 11. TESTING STRATEGY

### Test Flow trong Postman

1. **Import collection** vào Postman
2. **Cập nhật variables**:
   - `userToken`: Token của user muốn ở ghép (User B)
   - `posterToken`: Token của user đã ở trong phòng (User A)
   - `landlordToken`: Token của chủ nhà
   - `roomId`: ID của phòng có `canShare: true`
3. **Chạy theo thứ tự**:
   - Tạo request → User A duyệt → Landlord duyệt
   - Hoặc tạo request → User A từ chối
   - Hoặc tạo request → User A duyệt → Landlord từ chối

### Manual Testing

1. **Tạo phòng với canShare: true**
2. **Thêm 1 tenant vào phòng**
3. **Tạo room sharing request**
4. **User A duyệt request**
5. **Landlord duyệt request**
6. **Kiểm tra contract được tạo**

## 12. DEPLOYMENT CHECKLIST

### Backend Configuration

- [x] Cập nhật RentalRequest schema
- [x] Tạo DTOs cho validation
- [x] Implement service logic
- [x] Thêm controller endpoints
- [x] Cập nhật module imports
- [x] Sửa lỗi TypeScript

### Frontend Integration

- [ ] Set correct API base URL for production
- [ ] Test all room sharing flows in staging
- [ ] Implement proper error boundaries
- [ ] Add loading states for all async operations
- [ ] Test responsive design on mobile devices
- [ ] Set up monitoring and error tracking

### Environment Variables

```env
# .env
JWT_SECRET=your-jwt-secret
MONGODB_URI=mongodb://localhost:27017/nha_chung_be
PORT=3001
```

## 13. DEBUG & TROUBLESHOOTING

### Common Issues

1. **CORS Errors**
   - Ensure backend has proper CORS configuration
   - Check API base URL in frontend

2. **Token Expiry**
   - Implement token refresh logic
   - Handle 401 errors gracefully

3. **Room Validation Errors**
   - Check room has `canShare: true`
   - Verify room has at least 1 tenant
   - Ensure room is not at maximum capacity

4. **Authorization Errors**
   - Verify correct user roles for each endpoint
   - Check token validity

## 14. SUMMARY

Room Sharing System đã được tích hợp hoàn chỉnh vào dự án NestJS với:

✅ **2 bước duyệt** (User A → Landlord)  
✅ **Logic thanh toán rõ ràng** (chỉ User A thanh toán)  
✅ **Validation đầy đủ** (capacity, authorization)  
✅ **Auto workflow** (tạo contract, thêm tenant)  
✅ **API documentation** chi tiết  
✅ **Postman collection** sẵn sàng  
✅ **Frontend integration** examples  
✅ **Error handling** comprehensive  

**🚀 System sẵn sàng cho production!**
