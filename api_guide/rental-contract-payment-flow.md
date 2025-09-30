# Frontend Integration Flow - Đăng ký thuê - Hợp đồng - Thanh toán

## Tổng quan luồng

```
User → Đăng ký tài khoản → Tìm phòng → Đăng ký thuê → Tạo hợp đồng → Thanh toán → Hoàn tất
```

## 1. LUỒNG ĐĂNG KÝ THUÊ

### Bước 1: Đăng ký tài khoản User

**API:** `POST /api/auth/register`

```javascript
// Frontend: RegisterForm.jsx
const registerUser = async (userData) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: userData.email,
      password: userData.password,
      fullName: userData.fullName,
      phone: userData.phone,
      role: 'user' // Mặc định là user
    })
  });
  
  return response.json();
};
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng ký thành công. Vui lòng kiểm tra email để xác thực.",
  "userId": 123
}
```

**Postman Testing:**
```json
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "Nguyễn Văn A",
  "phone": "0123456789",
  "role": "user"
}
```

### Bước 2: Xác thực email

**API:** `POST /api/auth/verify-registration`

```javascript
// Frontend: VerifyEmail.jsx
const verifyEmail = async (email, otp) => {
  const response = await fetch('/api/auth/verify-registration', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email,
      otp: otp
    })
  });
  
  return response.json();
};
```

**Postman Testing:**
```json
POST http://localhost:3001/api/auth/verify-registration
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

### Bước 3: Đăng nhập

**API:** `POST /api/auth/login`

```javascript
// Frontend: LoginForm.jsx
const loginUser = async (credentials) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Lưu token vào localStorage
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  
  return data;
};
```

**Postman Testing:**
```json
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

## 2. LUỒNG TÌM PHÒNG VÀ ĐĂNG KÝ THUÊ

### Bước 4: Xem danh sách phòng trống

**API:** `GET /api/posts/available`

```javascript
// Frontend: RoomList.jsx
const fetchAvailableRooms = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/posts/available', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
};

// Sử dụng
const [rooms, setRooms] = useState([]);

useEffect(() => {
  const loadRooms = async () => {
    const data = await fetchAvailableRooms();
    setRooms(data.rooms || []);
  };
  
  loadRooms();
}, []);
```

**Postman Testing:**
```json
GET http://localhost:3001/api/posts/available
Authorization: Bearer <jwt_token>
```

### Bước 5: Đăng ký thuê phòng

**API:** `POST /api/users/rental-requests`

> **Lưu ý:** Backend sẽ tự động lấy `landlordId` và `roomId` từ `postId`, user chỉ cần cung cấp `postId`.

```javascript
// Frontend: RentalRequestForm.jsx
const submitRentalRequest = async (requestData) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/users/rental-requests', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      postId: requestData.postId,
      requestedMoveInDate: requestData.requestedMoveInDate,
      requestedDuration: requestData.requestedDuration,
      message: requestData.message
    })
  });
  
  return response.json();
};

// Component
const RentalRequestForm = ({ postId }) => {
  const [formData, setFormData] = useState({
    requestedMoveInDate: '',
    requestedDuration: 12,
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const result = await submitRentalRequest({
        ...formData,
        postId
      });
      
      if (result.success) {
        alert('Đăng ký thuê thành công! Chủ nhà sẽ xem xét.');
        // Redirect hoặc cập nhật UI
      }
    } catch (error) {
      alert('Có lỗi xảy ra: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="date"
        value={formData.requestedMoveInDate}
        onChange={(e) => setFormData({...formData, requestedMoveInDate: e.target.value})}
        required
      />
      <select
        value={formData.requestedDuration}
        onChange={(e) => setFormData({...formData, requestedDuration: parseInt(e.target.value)})}
      >
        <option value={6}>6 tháng</option>
        <option value={12}>12 tháng</option>
        <option value={24}>24 tháng</option>
      </select>
      <textarea
        placeholder="Lời nhắn cho chủ nhà..."
        value={formData.message}
        onChange={(e) => setFormData({...formData, message: e.target.value})}
      />
      <button type="submit">Đăng ký thuê</button>
    </form>
  );
};
```

**Postman Testing:**
```json
POST http://localhost:3001/api/users/rental-requests
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "postId": 123,
  "requestedMoveInDate": "2024-02-01T00:00:00.000Z",
  "requestedDuration": 12,
  "message": "Tôi muốn thuê phòng này"
}
```

> **⚠️ Lưu ý quan trọng:**
> - Field name phải chính xác: `requestedMoveInDate` (không phải `moveInDate`)
> - Field name phải chính xác: `requestedDuration` (không phải `duration`)
> - `requestedMoveInDate` phải là ISO 8601 format: `"YYYY-MM-DDTHH:mm:ss.sssZ"`

## 3. LUỒNG CHO CHỦ TRỌ (LANDLORD)

### Bước 6: Chủ trọ xem danh sách yêu cầu thuê

**API:** `GET /api/landlord/rental-requests`

```javascript
// Frontend: LandlordDashboard.jsx
const fetchRentalRequests = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/landlord/rental-requests', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

const LandlordDashboard = () => {
  const [rentalRequests, setRentalRequests] = useState([]);

  useEffect(() => {
    const loadRequests = async () => {
      const data = await fetchRentalRequests();
      setRentalRequests(data || []);
    };
    
    loadRequests();
  }, []);

  return (
    <div>
      <h2>Danh sách yêu cầu thuê</h2>
      {rentalRequests.map(request => (
        <div key={request.requestId} className="request-card">
          <h3>Yêu cầu #{request.requestId}</h3>
          <p>Phòng: {request.roomId}</p>
          <p>Người thuê: {request.tenantId}</p>
          <p>Tin nhắn: {request.message}</p>
          <p>Ngày dọn vào: {new Date(request.requestedMoveInDate).toLocaleDateString()}</p>
          <p>Thời hạn: {request.requestedDuration} tháng</p>
          <p>Trạng thái: <span className={`status ${request.status}`}>
            {request.status === 'pending' ? 'Chờ duyệt' : 
             request.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
          </span></p>
          
          {request.status === 'pending' && (
            <div className="action-buttons">
              <button onClick={() => approveRequest(request.requestId)}>
                Duyệt
              </button>
              <button onClick={() => rejectRequest(request.requestId)}>
                Từ chối
              </button>
            </div>
          )}
          
          {request.landlordResponse && (
            <p>Phản hồi: {request.landlordResponse}</p>
          )}
        </div>
      ))}
    </div>
  );
};
```

**Postman Testing:**
```json
GET http://localhost:3001/api/landlord/rental-requests
Authorization: Bearer <landlord_jwt_token>
```

**Response Example:**
```json
[
  {
    "requestId": 1,
    "tenantId": 123,
    "landlordId": 456,
    "roomId": 1,
    "postId": 123,
    "status": "pending",
    "message": "Tôi muốn thuê phòng này",
    "requestedMoveInDate": "2024-02-01T00:00:00.000Z",
    "requestedDuration": 12,
    "landlordResponse": null,
    "respondedAt": null,
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
]
```

### Bước 7: Chủ trọ duyệt yêu cầu thuê

**API:** `PUT /api/landlord/rental-requests/:id/approve`

> **📝 Lưu ý:** Khi chủ nhà duyệt yêu cầu thuê, hệ thống sẽ:
> - ✅ Tự động tạo hợp đồng thuê
> - ❌ **KHÔNG** thêm người thuê vào phòng ngay lập tức
> - ⏳ Người thuê chỉ được thêm vào phòng sau khi thanh toán thành công

```javascript
// Frontend: approveRequest function
const approveRequest = async (requestId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/landlord/rental-requests/${requestId}/approve`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      landlordResponse: 'Chào mừng bạn đến với căn hộ của tôi! Hợp đồng đã được tạo. Vui lòng thanh toán để hoàn tất.'
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    alert('Đã duyệt yêu cầu thuê thành công! Hợp đồng đã được tạo. Người thuê sẽ được thêm vào phòng sau khi thanh toán.');
    // Refresh danh sách yêu cầu
    fetchRentalRequests();
  }
  
  return result;
};
```

**Postman Testing:**
```json
PUT http://localhost:3001/api/landlord/rental-requests/1/approve
Authorization: Bearer <landlord_jwt_token>
Content-Type: application/json

{
  "landlordResponse": "Chào mừng bạn đến với căn hộ của tôi!"
}
```

### Bước 8: Chủ trọ từ chối yêu cầu thuê

**API:** `PUT /api/landlord/rental-requests/:id/reject`

```javascript
// Frontend: rejectRequest function
const rejectRequest = async (requestId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/landlord/rental-requests/${requestId}/reject`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      landlordResponse: 'Xin lỗi, phòng đã được thuê rồi.'
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    alert('Đã từ chối yêu cầu thuê.');
    // Refresh danh sách yêu cầu
    fetchRentalRequests();
  }
  
  return result;
};
```

**Postman Testing:**
```json
PUT http://localhost:3001/api/landlord/rental-requests/1/reject
Authorization: Bearer <landlord_jwt_token>
Content-Type: application/json

{
  "landlordResponse": "Xin lỗi, phòng đã được thuê rồi."
}
```

**Response Example (cả approve và reject):**
```json
{
  "requestId": 1,
  "tenantId": 123,
  "landlordId": 456,
  "roomId": 1,
  "postId": 123,
  "status": "approved",
  "message": "Tôi muốn thuê phòng này",
  "requestedMoveInDate": "2024-02-01T00:00:00.000Z",
  "requestedDuration": 12,
  "landlordResponse": "Chào mừng bạn đến với căn hộ của tôi! Hợp đồng đã được tạo. Vui lòng thanh toán để hoàn tất.",
  "respondedAt": "2024-01-15T14:30:00.000Z",
  "contractId": 456,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T14:30:00.000Z"
}
```

> **💡 Sau khi approve:** Hệ thống tự động tạo hợp đồng và hóa đơn thanh toán. Người thuê có thể xem hợp đồng và tiến hành thanh toán hóa đơn.

## 4. LUỒNG HỢP ĐỒNG (CHO USER)

### Bước 9: Xem trạng thái đăng ký thuê

**API:** `GET /api/users/rental-requests`

```javascript
// Frontend: MyRentalRequests.jsx
const fetchMyRequests = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/users/rental-requests', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

const MyRentalRequests = () => {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const loadRequests = async () => {
      const data = await fetchMyRequests();
      setRequests(data.requests || []);
    };
    
    loadRequests();
  }, []);

  return (
    <div>
      <h2>Đăng ký thuê của tôi</h2>
      {requests.map(request => (
        <div key={request.id} className="request-card">
          <h3>Phòng: {request.roomNumber}</h3>
          <p>Trạng thái: {request.status}</p>
          <p>Ngày chuyển vào: {request.moveInDate}</p>
          <p>Thời hạn: {request.duration} tháng</p>
          
          {request.status === 'approved' && (
            <button onClick={() => viewContract(request.contractId)}>
              Xem hợp đồng
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
```

**Postman Testing:**
```json
GET http://localhost:3001/api/users/rental-requests
Authorization: Bearer <jwt_token>
```

**Response Example:**
```json
[
  {
    "requestId": 1,
    "tenantId": 123,
    "landlordId": 456,
    "roomId": 1,
    "postId": 123,
    "status": "pending",
    "message": "Tôi muốn thuê phòng này",
    "requestedMoveInDate": "2024-02-01",
    "requestedDuration": 12,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Bước 10: Xem hợp đồng

**API:** `GET /api/users/contracts/:contractId`

```javascript
// Frontend: ContractView.jsx
const fetchContract = async (contractId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/users/contracts/${contractId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

const ContractView = ({ contractId }) => {
  const [contract, setContract] = useState(null);

  useEffect(() => {
    const loadContract = async () => {
      const data = await fetchContract(contractId);
      setContract(data.contract);
    };
    
    loadContract();
  }, [contractId]);

  if (!contract) return <div>Loading...</div>;

  return (
    <div className="contract-view">
      <h2>Hợp đồng thuê phòng</h2>
      <div className="contract-details">
        <p><strong>Mã hợp đồng:</strong> {contract.contractId}</p>
        <p><strong>Phòng:</strong> {contract.roomNumber}</p>
        <p><strong>Giá thuê:</strong> {contract.monthlyRent.toLocaleString()} VND/tháng</p>
        <p><strong>Thời hạn:</strong> {contract.startDate} - {contract.endDate}</p>
        <p><strong>Trạng thái:</strong> {contract.status}</p>
      </div>
      
      {contract.status === 'active' && (
        <div className="contract-actions">
          <a 
            href={`/api/users/contracts/${contract.contractId}/download-pdf`}
            target="_blank"
            className="download-pdf-btn"
          >
            Tải hợp đồng PDF
          </a>
        </div>
      )}
    </div>
  );
};
```

**Postman Testing:**
```json
GET http://localhost:3001/api/users/contracts/1
Authorization: Bearer <jwt_token>
```

**Response Example:**
```json
{
  "contractId": 1,
  "roomId": 1,
  "landlordId": 456,
  "contractType": "single",
  "status": "active",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.000Z",
  "monthlyRent": 3000000,
  "deposit": 3000000,
  "contractFile": "contract_123.pdf",
  "tenants": [
    {
      "tenantId": 123,
      "moveInDate": "2024-01-01T00:00:00.000Z",
      "monthlyRent": 3000000,
      "deposit": 3000000,
      "status": "active"
    }
  ],
  "roomInfo": {
    "roomNumber": "A101",
    "area": 25,
    "maxOccupancy": 2,
    "currentOccupancy": 1
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Bước 10.5: Tải hợp đồng PDF

**API:** `GET /api/users/contracts/:contractId/download-pdf`

```javascript
// Frontend: DownloadContractPDF.jsx
const downloadContractPDF = async (contractId) => {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`/api/users/contracts/${contractId}/download-pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      // Tạo blob và download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `hop-dong-thue-${contractId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      const error = await response.json();
      alert('Lỗi: ' + error.message);
    }
  } catch (error) {
    alert('Có lỗi xảy ra khi tải PDF: ' + error.message);
  }
};

// Sử dụng trong component
const ContractView = ({ contractId }) => {
  const handleDownloadPDF = () => {
    downloadContractPDF(contractId);
  };

  return (
    <div>
      <button onClick={handleDownloadPDF} className="download-pdf-btn">
        📄 Tải hợp đồng PDF
      </button>
    </div>
  );
};
```

**Postman Testing:**
```json
GET http://localhost:3001/api/users/contracts/1/download-pdf
Authorization: Bearer <jwt_token>
```

**Response:** File PDF được tải về với tên `hop-dong-thue-{contractId}-{timestamp}.pdf`

**Tính năng PDF:**
- ✅ **HTML Template đẹp** với CSS styling chuyên nghiệp
- ✅ **Thông tin đầy đủ** hợp đồng, phòng, tài chính, người thuê
- ✅ **Điều khoản và điều kiện** chuẩn pháp lý
- ✅ **Chữ ký và đóng dấu** cho 2 bên
- ✅ **Tự động xóa file tạm** sau khi tải
- ✅ **Responsive design** A4 format

## 5. LUỒNG THANH TOÁN

### Bước 11: Xem hóa đơn cần thanh toán

**API:** `GET /api/payments/pending-invoices`

### Bước 12: Xem hóa đơn đã thanh toán

**API:** `GET /api/payments/paid-invoices`

```javascript
// Frontend: PaidInvoices.jsx
const fetchPaidInvoices = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/payments/paid-invoices', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

const PaidInvoices = () => {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    const loadInvoices = async () => {
      const data = await fetchPaidInvoices();
      setInvoices(data || []);
    };
    
    loadInvoices();
  }, []);

  return (
    <div>
      <h2>Hóa đơn đã thanh toán</h2>
      {invoices.map(invoice => (
        <div key={invoice.invoiceId} className="invoice-card paid">
          <h3>Hóa đơn #{invoice.invoiceId}</h3>
          <p>Loại: {invoice.invoiceType}</p>
          <p>Số tiền: {invoice.amount.toLocaleString()} VND</p>
          <p>Đã thanh toán: {new Date(invoice.paidDate).toLocaleDateString()}</p>
          <p>Phương thức: {invoice.paymentMethod}</p>
          <p>Phòng: {invoice.roomNumber}</p>
          <div className="status-badge paid">✅ Đã thanh toán</div>
        </div>
      ))}
    </div>
  );
};
```

**Postman Testing:**
```json
GET http://localhost:3001/api/payments/paid-invoices
Authorization: Bearer <jwt_token>
```

**Response Example:**
```json
[
  {
    "invoiceId": 1,
    "amount": 6000000,
    "paidDate": "2025-09-30T06:15:30.000Z",
    "invoiceType": "initial_payment",
    "roomNumber": "Chung cư ABC - Phòng A104",
    "paymentMethod": "zalopay",
    "description": "Tiền cọc và tiền thuê tháng đầu - Phòng A104",
    "items": [
      {
        "description": "Tiền cọc",
        "amount": 3000000,
        "type": "deposit"
      },
      {
        "description": "Tiền thuê tháng đầu",
        "amount": 3000000,
        "type": "rent"
      }
    ]
  }
]
```

### Bước 13: Xem lịch sử thanh toán (tất cả hóa đơn)

**API:** `GET /api/payments/payment-history`

```javascript
// Frontend: PaymentHistory.jsx
const fetchPaymentHistory = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/payments/payment-history', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

const PaymentHistory = () => {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    const loadHistory = async () => {
      const data = await fetchPaymentHistory();
      setInvoices(data || []);
    };
    
    loadHistory();
  }, []);

  return (
    <div>
      <h2>Lịch sử thanh toán</h2>
      {invoices.map(invoice => (
        <div key={invoice.invoiceId} className={`invoice-card ${invoice.status}`}>
          <h3>Hóa đơn #{invoice.invoiceId}</h3>
          <p>Loại: {invoice.invoiceType}</p>
          <p>Số tiền: {invoice.amount.toLocaleString()} VND</p>
          <p>Phòng: {invoice.roomNumber}</p>
          <p>Hạn thanh toán: {new Date(invoice.dueDate).toLocaleDateString()}</p>
          
          {invoice.status === 'paid' ? (
            <>
              <p>Đã thanh toán: {new Date(invoice.paidDate).toLocaleDateString()}</p>
              <p>Phương thức: {invoice.paymentMethod}</p>
              <div className="status-badge paid">✅ Đã thanh toán</div>
            </>
          ) : invoice.canPay ? (
            <div className="status-badge pending">⏳ Chờ thanh toán</div>
          ) : (
            <div className="status-badge overdue">❌ Quá hạn</div>
          )}
        </div>
      ))}
    </div>
  );
};
```

**Postman Testing:**
```json
GET http://localhost:3001/api/payments/payment-history
Authorization: Bearer <jwt_token>
```

**Response Example:**
```json
[
  {
    "invoiceId": 1,
    "amount": 6000000,
    "status": "paid",
    "dueDate": "2025-10-10T00:00:00.000Z",
    "paidDate": "2025-09-30T06:15:30.000Z",
    "invoiceType": "initial_payment",
    "roomNumber": "Chung cư ABC - Phòng A104",
    "paymentMethod": "zalopay",
    "description": "Tiền cọc và tiền thuê tháng đầu - Phòng A104",
    "items": [...],
    "canPay": false
  },
  {
    "invoiceId": 2,
    "amount": 3000000,
    "status": "pending",
    "dueDate": "2025-11-01T00:00:00.000Z",
    "invoiceType": "monthly_rent",
    "roomNumber": "Chung cư ABC - Phòng A104",
    "description": "Tiền thuê tháng 11/2025 - Phòng A104",
    "items": [...],
    "canPay": true
  }
]
```

```javascript
// Frontend: PendingInvoices.jsx
const fetchPendingInvoices = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/payments/pending-invoices', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

const PendingInvoices = () => {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    const loadInvoices = async () => {
      const data = await fetchPendingInvoices();
      setInvoices(data || []);
    };
    
    loadInvoices();
  }, []);

  return (
    <div>
      <h2>Hóa đơn cần thanh toán</h2>
      {invoices.map(invoice => (
        <div key={invoice.invoiceId} className="invoice-card">
          <h3>Hóa đơn #{invoice.invoiceId}</h3>
          <p>Loại: {invoice.invoiceType}</p>
          <p>Số tiền: {invoice.amount.toLocaleString()} VND</p>
          <p>Hạn thanh toán: {new Date(invoice.dueDate).toLocaleDateString()}</p>
          
          {!invoice.isQrGenerated ? (
            <button onClick={() => generatePaymentQR(invoice.invoiceId)}>
              Tạo mã QR thanh toán
            </button>
          ) : (
            <button onClick={() => showPaymentQR(invoice.invoiceId)}>
              Thanh toán
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
```

**Postman Testing:**
```json
GET http://localhost:3001/api/payments/pending-invoices
Authorization: Bearer <jwt_token>
```

**Response Example:**
```json
[
  {
    "invoiceId": 123,
    "amount": 1000000,
    "dueDate": "2025-09-30T00:00:00.000Z",
    "invoiceType": "rent",
    "roomNumber": "A101",
    "isQrGenerated": true,
    "canPay": true
  }
]
```

### Bước 14: Kiểm tra trạng thái hóa đơn của phòng

**API:** `GET /api/payments/room/:roomId/status`

```javascript
// Frontend: RoomPaymentStatus.jsx
const fetchRoomPaymentStatus = async (roomId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/payments/room/${roomId}/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

const RoomPaymentStatus = ({ roomId }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const data = await fetchRoomPaymentStatus(roomId);
        setStatus(data);
      } catch (error) {
        console.error('Error loading room payment status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStatus();
  }, [roomId]);

  if (loading) return <div>Đang tải...</div>;
  if (!status) return <div>Không có dữ liệu</div>;

  const getStatusColor = (paymentStatus) => {
    switch (paymentStatus) {
      case 'fully_paid': return 'green';
      case 'partial_paid': return 'orange';
      case 'not_paid': return 'red';
      case 'overdue': return 'darkred';
      default: return 'gray';
    }
  };

  const getStatusText = (paymentStatus) => {
    switch (paymentStatus) {
      case 'fully_paid': return '✅ Đã thanh toán đầy đủ';
      case 'partial_paid': return '⚠️ Thanh toán một phần';
      case 'not_paid': return '❌ Chưa thanh toán';
      case 'overdue': return '🚨 Quá hạn thanh toán';
      default: return '❓ Không xác định';
    }
  };

  return (
    <div className="room-payment-status">
      <h2>Trạng thái thanh toán phòng {status.roomNumber}</h2>
      <p>Tòa nhà: {status.buildingName}</p>
      
      <div className="status-summary">
        <div className={`status-badge ${status.paymentStatus}`} 
             style={{ color: getStatusColor(status.paymentStatus) }}>
          {getStatusText(status.paymentStatus)}
        </div>
      </div>

      <div className="statistics">
        <div className="stat-item">
          <h3>Tổng hóa đơn</h3>
          <p>{status.totalInvoices} hóa đơn</p>
          <p>{status.totalAmount.toLocaleString()} VND</p>
        </div>
        
        <div className="stat-item paid">
          <h3>Đã thanh toán</h3>
          <p>{status.paidInvoices} hóa đơn</p>
          <p>{status.paidAmount.toLocaleString()} VND</p>
        </div>
        
        <div className="stat-item pending">
          <h3>Chờ thanh toán</h3>
          <p>{status.pendingInvoices} hóa đơn</p>
          <p>{status.pendingAmount.toLocaleString()} VND</p>
        </div>
        
        <div className="stat-item overdue">
          <h3>Quá hạn</h3>
          <p>{status.overdueInvoices} hóa đơn</p>
          <p>{status.overdueAmount.toLocaleString()} VND</p>
        </div>
      </div>

      {status.latestInvoice && (
        <div className="latest-invoice">
          <h3>Hóa đơn mới nhất</h3>
          <div className="invoice-card">
            <p><strong>Hóa đơn #{status.latestInvoice.invoiceId}</strong></p>
            <p>Loại: {status.latestInvoice.invoiceType}</p>
            <p>Số tiền: {status.latestInvoice.amount.toLocaleString()} VND</p>
            <p>Hạn thanh toán: {new Date(status.latestInvoice.dueDate).toLocaleDateString()}</p>
            <p>Trạng thái: {status.latestInvoice.status === 'paid' ? '✅ Đã thanh toán' : '⏳ Chờ thanh toán'}</p>
            {status.latestInvoice.paidDate && (
              <p>Ngày thanh toán: {new Date(status.latestInvoice.paidDate).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

**Postman Testing:**
```json
GET http://localhost:3001/api/payments/room/16/status
Authorization: Bearer <jwt_token>
```

**Response Example:**
```json
{
  "roomId": 16,
  "roomNumber": "A104",
  "buildingName": "Chung cư ABC",
  "totalInvoices": 2,
  "paidInvoices": 1,
  "pendingInvoices": 1,
  "overdueInvoices": 0,
  "totalAmount": 9000000,
  "paidAmount": 6000000,
  "pendingAmount": 3000000,
  "overdueAmount": 0,
  "paymentStatus": "partial_paid",
  "latestInvoice": {
    "invoiceId": 2,
    "amount": 3000000,
    "status": "pending",
    "dueDate": "2025-11-01T00:00:00.000Z",
    "invoiceType": "monthly_rent"
  }
}
```

**Trạng thái thanh toán:**
- `fully_paid`: Đã thanh toán đầy đủ tất cả hóa đơn
- `partial_paid`: Thanh toán một phần (có hóa đơn đã trả, có hóa đơn chưa trả)
- `not_paid`: Chưa thanh toán hóa đơn nào
- `overdue`: Có hóa đơn quá hạn thanh toán

### Bước 15: Lấy danh sách phòng user đã thuê

**API:** `GET /api/users/rooms`

```javascript
// Frontend: MyRooms.jsx
const fetchMyRooms = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/users/rooms', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

const MyRoomsPage = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMyRooms = async () => {
      try {
        const roomsData = await fetchMyRooms();
        setRooms(roomsData);
      } catch (error) {
        console.error('Error loading rooms:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadMyRooms();
  }, []);

  if (loading) return <div>Đang tải...</div>;

  return (
    <div className="my-rooms">
      <h1>Phòng của tôi</h1>
      {rooms.length === 0 ? (
        <div className="no-rooms">
          <p>Bạn chưa thuê phòng nào</p>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map(room => (
            <div key={room.roomId} className="room-card">
              <div className="room-header">
                <h3>Phòng {room.roomNumber}</h3>
                <span className={`status-badge ${room.contractStatus}`}>
                  {room.contractStatus === 'active' ? '🟢 Đang thuê' : '🔴 Hết hạn'}
                </span>
              </div>
              
              <div className="room-info">
                <p><strong>Tòa nhà:</strong> {room.buildingName}</p>
                <p><strong>Diện tích:</strong> {room.area}m²</p>
                <p><strong>Tiền thuê:</strong> {room.monthlyRent.toLocaleString()} VND/tháng</p>
                <p><strong>Tiền cọc:</strong> {room.deposit.toLocaleString()} VND</p>
                <p><strong>Thời hạn:</strong> {new Date(room.startDate).toLocaleDateString()} - {new Date(room.endDate).toLocaleDateString()}</p>
              </div>

              <div className="landlord-info">
                <h4>Thông tin chủ trọ</h4>
                <p><strong>Tên:</strong> {room.landlordInfo.name}</p>
                <p><strong>SĐT:</strong> {room.landlordInfo.phone}</p>
                <p><strong>Email:</strong> {room.landlordInfo.email}</p>
              </div>

              <div className="room-actions">
                <button 
                  onClick={() => window.location.href = `/contracts/${room.contractId}`}
                  className="btn-primary"
                >
                  Xem hợp đồng
                </button>
                <button 
                  onClick={() => window.location.href = `/payments/contract/${room.contractId}/status`}
                  className="btn-secondary"
                >
                  Xem thanh toán
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

**Postman Testing:**
```json
GET http://localhost:3001/api/users/rooms
Authorization: Bearer <jwt_token>
```

**Response Example:**
```json
[
  {
    "roomId": 19,
    "roomNumber": "A106",
    "buildingName": "Chung cư ABC",
    "buildingId": 4,
    "contractId": 1,
    "contractStatus": "active",
    "startDate": "2025-10-01T00:00:00.000Z",
    "endDate": "2026-09-30T00:00:00.000Z",
    "monthlyRent": 5000000,
    "deposit": 5000000,
    "area": 40,
    "maxOccupancy": 2,
    "currentOccupants": 1,
    "landlordInfo": {
      "landlordId": 18,
      "name": "Nguyễn Văn A",
      "phone": "0123456789",
      "email": "landlord@example.com"
    }
  }
]
```

**Tính năng:**
- ✅ **Lấy tất cả phòng**: User đã thuê (từ Room.currentTenants)
- ✅ **Thông tin đầy đủ**: Phòng, tòa nhà, hợp đồng (nếu có), chủ trọ
- ✅ **Trạng thái hợp đồng**: Active/Expired (nếu có hợp đồng)
- ✅ **Thông tin liên hệ**: Chủ trọ để user có thể liên hệ
- ✅ **Dữ liệu từ Room**: Sử dụng price, deposit từ bảng Room

### Bước 16: Kiểm tra trạng thái hóa đơn của hợp đồng

**API:** `GET /api/payments/contract/:contractId/status`

```javascript
// Frontend: ContractPaymentStatus.jsx
const fetchContractPaymentStatus = async (contractId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/payments/contract/${contractId}/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

const ContractPaymentStatus = ({ contractId }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const data = await fetchContractPaymentStatus(contractId);
        setStatus(data);
      } catch (error) {
        console.error('Error loading contract payment status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStatus();
  }, [contractId]);

  if (loading) return <div>Đang tải...</div>;
  if (!status) return <div>Không có dữ liệu</div>;

  const getStatusColor = (paymentStatus) => {
    switch (paymentStatus) {
      case 'fully_paid': return 'green';
      case 'partial_paid': return 'orange';
      case 'not_paid': return 'red';
      case 'overdue': return 'darkred';
      default: return 'gray';
    }
  };

  const getStatusText = (paymentStatus) => {
    switch (paymentStatus) {
      case 'fully_paid': return '✅ Đã thanh toán đầy đủ';
      case 'partial_paid': return '⚠️ Thanh toán một phần';
      case 'not_paid': return '❌ Chưa thanh toán';
      case 'overdue': return '🚨 Quá hạn thanh toán';
      default: return '❓ Không xác định';
    }
  };

  return (
    <div className="contract-payment-status">
      <h2>Trạng thái thanh toán hợp đồng #{status.contractId}</h2>
      
      <div className="status-summary">
        <div className={`status-badge ${status.paymentStatus}`} 
             style={{ color: getStatusColor(status.paymentStatus) }}>
          {getStatusText(status.paymentStatus)}
        </div>
      </div>

      <div className="statistics">
        <div className="stat-item">
          <h3>Tổng hóa đơn</h3>
          <p>{status.totalInvoices} hóa đơn</p>
          <p>{status.totalAmount.toLocaleString()} VND</p>
        </div>
        
        <div className="stat-item paid">
          <h3>Đã thanh toán</h3>
          <p>{status.paidInvoices} hóa đơn</p>
          <p>{status.paidAmount.toLocaleString()} VND</p>
        </div>
        
        <div className="stat-item pending">
          <h3>Chờ thanh toán</h3>
          <p>{status.pendingInvoices} hóa đơn</p>
          <p>{status.pendingAmount.toLocaleString()} VND</p>
        </div>
        
        <div className="stat-item overdue">
          <h3>Quá hạn</h3>
          <p>{status.overdueInvoices} hóa đơn</p>
          <p>{status.overdueAmount.toLocaleString()} VND</p>
        </div>
      </div>

      {status.latestInvoice && (
        <div className="latest-invoice">
          <h3>Hóa đơn mới nhất</h3>
          <div className="invoice-card">
            <p><strong>Hóa đơn #{status.latestInvoice.invoiceId}</strong></p>
            <p>Loại: {status.latestInvoice.invoiceType}</p>
            <p>Số tiền: {status.latestInvoice.amount.toLocaleString()} VND</p>
            <p>Hạn thanh toán: {new Date(status.latestInvoice.dueDate).toLocaleDateString()}</p>
            <p>Trạng thái: {status.latestInvoice.status === 'paid' ? '✅ Đã thanh toán' : '⏳ Chờ thanh toán'}</p>
            {status.latestInvoice.paidDate && (
              <p>Ngày thanh toán: {new Date(status.latestInvoice.paidDate).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      )}

      <div className="all-invoices">
        <h3>Tất cả hóa đơn</h3>
        {status.allInvoices.map(invoice => (
          <div key={invoice.invoiceId} className={`invoice-item ${invoice.status}`}>
            <div className="invoice-header">
              <span>Hóa đơn #{invoice.invoiceId}</span>
              <span className={`status-badge ${invoice.status}`}>
                {invoice.status === 'paid' ? '✅ Đã thanh toán' : '⏳ Chờ thanh toán'}
              </span>
            </div>
            <div className="invoice-details">
              <p>Loại: {invoice.invoiceType}</p>
              <p>Số tiền: {invoice.amount.toLocaleString()} VND</p>
              <p>Hạn thanh toán: {new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p>Mô tả: {invoice.description}</p>
              {invoice.paidDate && (
                <p>Ngày thanh toán: {new Date(invoice.paidDate).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Postman Testing:**
```json
GET http://localhost:3001/api/payments/contract/1/status
Authorization: Bearer <jwt_token>
```

**Response Example:**
```json
{
  "contractId": 1,
  "totalInvoices": 2,
  "paidInvoices": 1,
  "pendingInvoices": 1,
  "overdueInvoices": 0,
  "totalAmount": 9000000,
  "paidAmount": 6000000,
  "pendingAmount": 3000000,
  "overdueAmount": 0,
  "paymentStatus": "partial_paid",
  "latestInvoice": {
    "invoiceId": 2,
    "amount": 3000000,
    "status": "pending",
    "dueDate": "2025-11-01T00:00:00.000Z",
    "invoiceType": "monthly_rent"
  },
  "allInvoices": [
    {
      "invoiceId": 2,
      "amount": 3000000,
      "status": "pending",
      "dueDate": "2025-11-01T00:00:00.000Z",
      "invoiceType": "monthly_rent",
      "description": "Tiền thuê tháng 11/2025 - Phòng A104"
    },
    {
      "invoiceId": 1,
      "amount": 6000000,
      "status": "paid",
      "dueDate": "2025-10-01T00:00:00.000Z",
      "paidDate": "2025-09-30T06:15:30.000Z",
      "invoiceType": "initial_payment",
      "description": "Tiền cọc và tiền thuê tháng đầu - Phòng A104"
    }
  ]
}
```

**Tính năng:**
- ✅ **Đơn giản và hiệu quả**: Chỉ query từ bảng Invoice (có contractId và status)
- ✅ **Thống kê hóa đơn**: Tổng quan thanh toán của hợp đồng
- ✅ **Danh sách đầy đủ**: Tất cả hóa đơn thuộc hợp đồng
- ✅ **Hóa đơn mới nhất**: Thông tin hóa đơn gần nhất

### Bước 17: Tạo QR code thanh toán ZaloPay

**API:** `POST /api/payments/generate-qr`

```javascript
// Frontend: PaymentQR.jsx
const generatePaymentQR = async (invoiceId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/payments/generate-qr', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      invoiceId: invoiceId
    })
  });
  
  return response.json();
};

const PaymentQR = ({ invoiceId }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateQR = async () => {
    setLoading(true);
    
    try {
      const result = await generatePaymentQR(invoiceId);
      
      if (result.success) {
        setQrData(result.data);
      } else {
        alert('Có lỗi xảy ra: ' + result.message);
      }
    } catch (error) {
      alert('Có lỗi xảy ra: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-qr">
      {!qrData ? (
        <button onClick={handleGenerateQR} disabled={loading}>
          {loading ? 'Đang tạo...' : 'Tạo mã QR thanh toán'}
        </button>
      ) : (
        <div className="qr-container">
          <h3>Quét mã QR để thanh toán</h3>
          <img src={qrData.qrCodeUrl} alt="Payment QR Code" />
          <p>Số tiền: {qrData.amount.toLocaleString()} VND</p>
          <p>Mã đơn hàng: {qrData.orderId}</p>
          <p>Hết hạn: {new Date(qrData.expiryAt).toLocaleString()}</p>
          
          <div className="payment-instructions">
            <h4>Hướng dẫn thanh toán:</h4>
            <ol>
              <li>Mở ứng dụng ZaloPay</li>
              <li>Quét mã QR bên trên</li>
              <li>Xác nhận thông tin thanh toán</li>
              <li>Nhập mật khẩu để hoàn tất</li>
            </ol>
            <p><small>💡 Nếu ZaloPay không quét được, vui lòng chuyển khoản thủ công theo thông tin trong QR code.</small></p>
          </div>
          
          <button onClick={() => checkPaymentStatus(qrData.orderId)}>
            Kiểm tra trạng thái thanh toán
          </button>
        </div>
      )}
    </div>
  );
};
```

**Postman Testing:**
```json
POST http://localhost:3001/api/payments/generate-qr
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "invoiceId": 123
}
```

**Response Example:**
```json
{
  "orderId": "ORD_1759208983621_1",
  "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6e...",
  "qrCodeData": "https://qcgateway.zalopay.vn/openinapp?order=eyJ6cHRyYW5zdG9rZW4iOiJBQ1l1R0J3WWRnaVVvRmIzdWN3SnQtT2ciLCJhcHBpZCI6MjU1NH0=",
  "expiryAt": "2025-09-30T05:24:43.710Z",
  "amount": 6000000
}
```

> **📱 QR Code:**
> - **ZaloPay API thành công**: QR từ `order_url` → Quét bằng ZaloPay app
> - **ZaloPay API lỗi**: QR từ JSON data → Chuyển khoản thủ công

### Bước 18: Kiểm tra trạng thái thanh toán

**API:** `GET /api/payments/status/:orderId`

```javascript
// Frontend: PaymentStatus.jsx
const checkPaymentStatus = async (orderId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/payments/status/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

const PaymentStatus = ({ orderId }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheckStatus = async () => {
    setLoading(true);
    
    try {
      const result = await checkPaymentStatus(orderId);
      setStatus(result);
      
      if (result.status === 'paid') {
        alert('Thanh toán thành công! Bạn đã được thêm vào phòng.');
        // Refresh invoices list hoặc redirect
        // Hệ thống tự động thêm user vào room sau khi thanh toán thành công
      }
    } catch (error) {
      alert('Có lỗi xảy ra: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-status">
      <button onClick={handleCheckStatus} disabled={loading}>
        {loading ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái'}
      </button>
      
      {status && (
        <div className="status-info">
          <p>Mã đơn hàng: {status.orderId}</p>
          <p>Trạng thái: 
            <span className={`status ${status.status}`}>
              {status.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
            </span>
          </p>
          {status.paidAt && (
            <p>Thời gian thanh toán: {new Date(status.paidAt).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  );
};
```

**Postman Testing:**
```json
GET http://localhost:3001/api/payments/status/ORD_1759208983621_1
Authorization: Bearer <jwt_token>
```

**Response Example:**
```json
{
  "orderId": "ORD_1759208983621_1",
  "status": "paid",
  "paidAt": "2025-09-30T10:15:02.000Z",
  "paymentMethod": "zalopay"
}
```

## 5. LUỒNG HOẠT ĐỘNG TỔNG QUAN

```
User Flow:
1. Đăng ký tài khoản → 2. Tìm phòng → 3. Đăng ký thuê → 4. Chờ chủ trọ duyệt

Landlord Flow:
5. Nhận thông báo → 6. Xem yêu cầu thuê → 7. Duyệt/Từ chối → 8. Tạo hợp đồng (nếu duyệt)

User Flow (tiếp):
9. Xem trạng thái → 10. Xem hợp đồng → 11. Xem hóa đơn → 12. Thanh toán → 13. Tự động thêm vào phòng → 14. Hoàn tất
```

> **⚠️ Lưu ý quan trọng:** Người dùng chỉ được thêm vào phòng **SAU KHI THANH TOÁN THÀNH CÔNG** (đặt cọc hoặc tiền thuê đầu tiên), không phải ngay khi chủ nhà duyệt yêu cầu.

## 6. LUỒNG TỰ ĐỘNG TẠO HÓA ĐƠN SAU KHI DUYỆT

Khi landlord duyệt yêu cầu thuê (`status = 'approved'`), hệ thống tự động:

### 6.1. Tạo hợp đồng
- ✅ Tạo `RentalContract` với thông tin từ `RentalRequest`
- ✅ Liên kết `contractId` với `RentalRequest`
- ✅ Thiết lập thông tin phòng, giá thuê, tiền cọc

### 6.2. Tạo hóa đơn thanh toán
- ✅ Tạo `Invoice` với `invoiceType = 'initial_payment'`
- ✅ **Số tiền**: `deposit + monthlyRent` (tiền cọc + tiền thuê tháng đầu)
- ✅ **Due date**: Ngày chuyển vào (`requestedMoveInDate`)
- ✅ **Chi tiết hóa đơn**:
  ```json
  {
    "invoiceId": 1,
    "contractId": 1,
    "roomId": 16,
    "tenantId": 17,
    "landlordId": 18,
    "invoiceType": "initial_payment",
    "amount": 6000000,
    "status": "pending",
    "dueDate": "2025-10-10T00:00:00.000Z",
    "description": "Tiền cọc và tiền thuê tháng đầu - Phòng A104",
    "items": [
      {
        "description": "Tiền cọc",
        "amount": 3000000,
        "type": "deposit"
      },
      {
        "description": "Tiền thuê tháng đầu", 
        "amount": 3000000,
        "type": "rent"
      }
    ]
  }
  ```

### 6.3. Tự động tạo hóa đơn hàng tháng

**API tạo hóa đơn hàng tháng cho hợp đồng cụ thể:**
```javascript
// Landlord tạo hóa đơn hàng tháng
const createMonthlyInvoice = async (contractId, month, year) => {
  const response = await fetch('/api/landlord/invoices/monthly-rent', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${landlordToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contractId: contractId,
      month: month,
      year: year
    })
  });
  return response.json();
};
```

**API tạo hóa đơn hàng tháng cho tất cả hợp đồng (Admin):**
```javascript
// Admin chạy batch tạo hóa đơn hàng tháng
const generateAllMonthlyInvoices = async () => {
  const response = await fetch('/api/landlord/invoices/generate-monthly', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const result = await response.json();
  console.log(`Created ${result.created} invoices, ${result.errors} errors`);
};
```

### 6.4. Frontend có thể kiểm tra hóa đơn
```javascript
// Sau khi approve thành công
const checkInvoices = async () => {
  const response = await fetch('/api/users/me/invoices', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const invoices = await response.json();
  
  // Hiển thị hóa đơn cần thanh toán
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
  console.log('Hóa đơn cần thanh toán:', pendingInvoices);
};
```

## 7. LUỒNG HÓA ĐƠN HÀNG THÁNG

### 7.1. Tự động tạo hóa đơn hàng tháng

**Khi nào tạo:**
- ✅ **Thủ công**: Landlord tạo hóa đơn cho hợp đồng cụ thể
- ✅ **Tự động**: Admin chạy batch tạo cho tất cả hợp đồng active

**Logic tính toán:**
```typescript
// Hóa đơn hàng tháng = Tiền thuê + Các phí tiện ích
let totalAmount = contract.monthlyRent;  // Tiền thuê phòng
const items = [];

// Thêm các phí tiện ích (chỉ tính những phí KHÔNG được bao gồm trong tiền thuê)
if (utilities.electricityPricePerKwh > 0 && !includedInRent.electricity) {
  totalAmount += utilities.electricityPricePerKwh;  // Phí điện
}
if (utilities.waterPrice > 0 && !includedInRent.water) {
  totalAmount += utilities.waterPrice;  // Phí nước
}
if (utilities.internetFee > 0 && !includedInRent.internet) {
  totalAmount += utilities.internetFee;  // Phí internet
}
// ... và các phí khác

invoiceType: 'monthly_rent'
dueDate: new Date(year, month - 1, 1)  // Ngày 1 của tháng
```

**Ví dụ hóa đơn hàng tháng (có các phí tiện ích):**
```json
{
  "invoiceId": 2,
  "contractId": 1,
  "roomId": 16,
  "tenantId": 17,
  "landlordId": 18,
  "invoiceType": "monthly_rent",
  "amount": 4200000,  // Tiền thuê + các phí tiện ích
  "status": "pending",
  "dueDate": "2025-11-01T00:00:00.000Z",
  "description": "Hóa đơn tháng 11/2025 - Phòng A104: Tiền thuê tháng 11/2025, Phí điện tháng 11/2025, Phí nước tháng 11/2025, Phí internet tháng 11/2025",
  "items": [
    {
      "description": "Tiền thuê tháng 11/2025",
      "amount": 3000000,
      "type": "rent"
    },
    {
      "description": "Phí điện tháng 11/2025",
      "amount": 500000,
      "type": "electricity"
    },
    {
      "description": "Phí nước tháng 11/2025",
      "amount": 200000,
      "type": "water"
    },
    {
      "description": "Phí internet tháng 11/2025",
      "amount": 500000,
      "type": "internet"
    }
  ]
}
```

**Ví dụ hóa đơn hàng tháng (chỉ tiền thuê - các phí đã bao gồm):**
```json
{
  "invoiceId": 3,
  "contractId": 2,
  "roomId": 17,
  "tenantId": 18,
  "landlordId": 19,
  "invoiceType": "monthly_rent",
  "amount": 3500000,  // Chỉ tiền thuê (các phí đã bao gồm)
  "status": "pending",
  "dueDate": "2025-11-01T00:00:00.000Z",
  "description": "Hóa đơn tháng 11/2025 - Phòng B205: Tiền thuê tháng 11/2025",
  "items": [
    {
      "description": "Tiền thuê tháng 11/2025",
      "amount": 3500000,
      "type": "rent"
    }
  ]
}
```

### 7.2. Các loại phí tiện ích được tính

Hệ thống tự động kiểm tra và tính các phí sau (chỉ tính những phí KHÔNG được bao gồm trong tiền thuê):

| Loại phí | Field trong Room.utilities | Điều kiện tính |
|----------|---------------------------|----------------|
| **Phí điện** | `electricityPricePerKwh` | `> 0` và `!includedInRent.electricity` |
| **Phí nước** | `waterPrice` | `> 0` và `!includedInRent.water` |
| **Phí internet** | `internetFee` | `> 0` và `!includedInRent.internet` |
| **Phí rác** | `garbageFee` | `> 0` và `!includedInRent.garbage` |
| **Phí vệ sinh** | `cleaningFee` | `> 0` và `!includedInRent.cleaning` |
| **Phí gửi xe máy** | `parkingMotorbikeFee` | `> 0` và `!includedInRent.parkingMotorbike` |
| **Phí gửi xe ô tô** | `parkingCarFee` | `> 0` và `!includedInRent.parkingCar` |
| **Phí quản lý** | `managementFee` | `> 0` và `!includedInRent.managementFee` |

### 7.3. Kiểm tra trùng lặp hóa đơn

Hệ thống tự động kiểm tra:
- ✅ **Không tạo trùng** hóa đơn cho cùng tháng/năm
- ✅ **Chỉ tạo cho hợp đồng active** và chưa hết hạn
- ✅ **Due date** là ngày 1 của tháng
- ✅ **Tự động tính các phí** dựa trên cấu hình phòng

### 7.4. Frontend Integration

```javascript
// Component tạo hóa đơn hàng tháng
const MonthlyInvoiceGenerator = ({ contractId }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const handleCreateInvoice = async () => {
    try {
      const result = await createMonthlyInvoice(contractId, selectedMonth, selectedYear);
      alert('Hóa đơn hàng tháng đã được tạo thành công!');
    } catch (error) {
      alert('Lỗi: ' + error.message);
    }
  };

  return (
    <div className="monthly-invoice-generator">
      <h3>Tạo hóa đơn hàng tháng</h3>
      <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
        {Array.from({length: 12}, (_, i) => (
          <option key={i+1} value={i+1}>Tháng {i+1}</option>
        ))}
      </select>
      <input 
        type="number" 
        value={selectedYear} 
        onChange={(e) => setSelectedYear(Number(e.target.value))}
        min="2025"
        max="2030"
      />
      <button onClick={handleCreateInvoice}>
        Tạo hóa đơn tháng {selectedMonth}/{selectedYear}
      </button>
    </div>
  );
};
```

## 8. LUỒNG TỰ ĐỘNG THÊM VÀO PHÒNG SAU THANH TOÁN

### Chi tiết luồng thanh toán và cập nhật phòng

**Khi nào người dùng được thêm vào phòng?**

1. **Approve yêu cầu thuê** → Tạo hợp đồng, **CHƯA** thêm vào phòng
2. **Thanh toán thành công** → **TỰ ĐỘNG** thêm vào phòng + cập nhật occupancy

**Điều kiện thanh toán kích hoạt:**
- `orderType === 'initial_payment'` (tiền thuê đầu tiên)
- `orderType === 'deposit'` (tiền đặt cọc)

**Luồng tự động sau thanh toán thành công:**

```javascript
// Backend tự động thực hiện (không cần frontend gọi API)
const autoAddTenantToRoomAfterPayment = async (paymentOrder) => {
  // 1. Tìm rental request từ payment order
  // 2. Kiểm tra tenant đã có trong room chưa
  // 3. Lấy thông tin user và room
  // 4. Thêm tenant vào room.currentTenants[]
  // 5. Cập nhật room.currentOccupants++
  // 6. Cập nhật room.availableSpots--
  // 7. Log thành công
};
```

**Frontend không cần làm gì thêm:**
- Sau khi thanh toán thành công, hệ thống tự động xử lý
- User có thể kiểm tra trạng thái room occupancy qua API khác
- Không cần gọi API thêm để "chuyển vào phòng"

**Kiểm tra trạng thái room sau thanh toán:**

```javascript
// Frontend có thể kiểm tra user đã được thêm vào room chưa
const checkRoomOccupancy = async (roomId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/rooms/${roomId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const room = await response.json();
  
  // Kiểm tra user có trong currentTenants không
  const user = JSON.parse(localStorage.getItem('user'));
  const isInRoom = room.currentTenants.some(tenant => 
    tenant.userId === user.userId
  );
  
  return isInRoom;
};
```

## 7. COMPLETE INTEGRATION EXAMPLE

### App.jsx - Main Application

```javascript
// Frontend: App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import RoomList from './components/RoomList';
import MyRentalRequests from './components/MyRentalRequests';
import ContractView from './components/ContractView';
import PendingInvoices from './components/PendingInvoices';
import PaymentQR from './components/PaymentQR';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData.user);
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData.user));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <h1>Nhà Trọ App</h1>
          {user && (
            <div className="user-menu">
              <span>Xin chào, {user.fullName}</span>
              <button onClick={handleLogout}>Đăng xuất</button>
            </div>
          )}
        </nav>

        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
              <Route path="/register" element={<RegisterForm />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          ) : (
            <>
              <Route path="/" element={<RoomList />} />
              <Route path="/my-requests" element={<MyRentalRequests />} />
              <Route path="/contract/:contractId" element={<ContractView />} />
              <Route path="/invoices" element={<PendingInvoices />} />
              <Route path="/payment/:invoiceId" element={<PaymentQR />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
};

export default App;
```

## 8. ERROR HANDLING & LOADING STATES

### API Service với Error Handling

```javascript
// Frontend: apiService.js
class ApiService {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
  }

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Có lỗi xảy ra');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth APIs
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  // Payment APIs
  async generatePaymentQR(invoiceId) {
    return this.request('/payments/generate-qr', {
      method: 'POST',
      body: JSON.stringify({ invoiceId })
    });
  }

  async checkPaymentStatus(orderId) {
    return this.request(`/payments/status/${orderId}`);
  }

  async getPendingInvoices() {
    return this.request('/payments/pending-invoices');
  }
}

export default new ApiService();
```

## 9. STATE MANAGEMENT (Redux/Zustand)

### Zustand Store Example

```javascript
// Frontend: store.js
import { create } from 'zustand';
import apiService from './apiService';

const useStore = create((set, get) => ({
  // Auth state
  user: null,
  token: null,
  isAuthenticated: false,

  // Rooms state
  rooms: [],
  loadingRooms: false,

  // Invoices state
  invoices: [],
  loadingInvoices: false,

  // Actions
  login: async (credentials) => {
    try {
      const data = await apiService.login(credentials);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true
      });
      return data;
    } catch (error) {
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false
    });
  },

  fetchRooms: async () => {
    set({ loadingRooms: true });
    try {
      const data = await apiService.getAvailableRooms();
      set({ rooms: data.rooms, loadingRooms: false });
    } catch (error) {
      set({ loadingRooms: false });
      throw error;
    }
  },

  fetchInvoices: async () => {
    set({ loadingInvoices: true });
    try {
      const data = await apiService.getPendingInvoices();
      set({ invoices: data, loadingInvoices: false });
    } catch (error) {
      set({ loadingInvoices: false });
      throw error;
    }
  }
}));

export default useStore;
```

## 10. RESPONSIVE DESIGN & UX

### CSS cho Payment Components

```css
/* Frontend: PaymentComponents.css */
.payment-qr {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

.qr-container img {
  width: 250px;
  height: 250px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin: 20px 0;
}

.payment-instructions {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin: 20px 0;
  text-align: left;
}

.fallback-instructions {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  padding: 15px;
  border-radius: 8px;
  margin: 20px 0;
  text-align: left;
}

.fallback-instructions p {
  margin: 5px 0;
  color: #856404;
}

.fallback-instructions ul {
  margin: 10px 0;
  padding-left: 20px;
}

.payment-instructions ol {
  margin: 10px 0;
  padding-left: 20px;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
}

.status.paid {
  background: #d4edda;
  color: #155724;
}

.status.pending {
  background: #fff3cd;
  color: #856404;
}

.invoice-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin: 10px 0;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.contract-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.contract-details {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.download-pdf-btn {
  background: #007bff;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  text-decoration: none;
  display: inline-block;
  font-weight: bold;
  transition: background-color 0.3s;
}

.download-pdf-btn:hover {
  background: #0056b3;
  color: white;
  text-decoration: none;
}

@media (max-width: 768px) {
  .payment-qr {
    padding: 10px;
  }
  
  .qr-container img {
    width: 200px;
    height: 200px;
  }
  
  .contract-view {
    padding: 10px;
  }
}
```

## 11. TESTING STRATEGY

### Unit Tests Example

```javascript
// Frontend: PaymentQR.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaymentQR from '../components/PaymentQR';
import apiService from '../services/apiService';

jest.mock('../services/apiService');

describe('PaymentQR Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders generate QR button initially', () => {
    render(<PaymentQR invoiceId={123} />);
    expect(screen.getByText('Tạo mã QR thanh toán')).toBeInTheDocument();
  });

  test('generates QR code on button click', async () => {
    const mockQRData = {
      success: true,
      data: {
        qrCodeUrl: 'data:image/png;base64,test',
        amount: 1000000,
        orderId: 'ORD_123'
      }
    };

    apiService.generatePaymentQR.mockResolvedValue(mockQRData);

    render(<PaymentQR invoiceId={123} />);
    
    fireEvent.click(screen.getByText('Tạo mã QR thanh toán'));

    await waitFor(() => {
      expect(screen.getByText('Quét mã QR để thanh toán')).toBeInTheDocument();
      expect(screen.getByText('1,000,000 VND')).toBeInTheDocument();
    });
  });
});
```

## 12. DEPLOYMENT CHECKLIST

### Frontend Deployment

- [ ] Set correct API base URL for production
- [ ] Configure HTTPS for payment security
- [ ] Test all payment flows in staging
- [ ] Implement proper error boundaries
- [ ] Add loading states for all async operations
- [ ] Test responsive design on mobile devices
- [ ] Verify ZaloPay integration works
- [ ] Set up monitoring and error tracking
- [ ] Configure CDN for static assets
- [ ] Test offline scenarios

### Environment Variables

```env
# Frontend .env
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_ZALOPAY_REDIRECT_URL=https://yourdomain.com/payment/success
REACT_APP_ENVIRONMENT=production
```

## 19. DEBUG & TROUBLESHOOTING

### Debug Payment Orders

**API Debug:** `GET /api/payments/debug/orders`

```javascript
// Frontend: Debug component
const debugPaymentOrders = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/payments/debug/orders', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const orders = await response.json();
  console.log('🔍 All Payment Orders in DB:', orders);
  
  // Hiển thị tất cả orderId có trong DB
  orders.forEach(order => {
    console.log(`Order ID: ${order.orderId}, Status: ${order.status}, Amount: ${order.amount}`);
  });
};
```

**Postman Testing:**
```json
GET http://localhost:3001/api/payments/debug/orders
Authorization: Bearer <jwt_token>
```

**Response Example:**
```json
[
  {
    "_id": "68db661759efd8d4b355578c",
    "orderId": "ORD_1759208983621_1",
    "invoiceId": 1,
    "amount": 6000000,
    "status": "pending",
    "createdAt": "2025-09-30T05:09:43.710Z"
  }
]
```

### Common Issues

1. **CORS Errors**
   - Ensure backend has proper CORS configuration
   - Check API base URL in frontend

2. **Token Expiry**
   - Implement token refresh logic
   - Handle 401 errors gracefully

3. **Payment QR Not Working**
   - **ZaloPay API Error (-401)**: Dữ liệu yêu cầu không hợp lệ
     - ✅ **Đã sửa**: Format đúng ZaloPay API (app_trans_id, item JSON, MAC checksum)
     - ✅ **Fallback mechanism**: Tạo QR JSON nếu ZaloPay API lỗi
   - **QR không quét được**: 
     - ✅ **ZaloPay API thành công**: QR từ `responseData.order_url`
     - ✅ **ZaloPay API lỗi**: QR từ JSON data cho chuyển khoản thủ công
   - **Test với ZaloPay sandbox** trước khi production

4. **Payment Order Not Found Error (404)**
   - **Nguyên nhân**: FE đang sử dụng `orderId` không tồn tại trong DB
   - **Giải pháp**:
     ```javascript
     // 1. Kiểm tra tất cả PaymentOrder trong DB
     const orders = await fetch('/api/payments/debug/orders');
     
     // 2. Sử dụng orderId đúng từ response của generatePaymentQR
     const qrResult = await generatePaymentQR(invoiceId);
     const correctOrderId = qrResult.orderId; // Lưu lại orderId này
     
     // 3. Sử dụng orderId đúng khi check status
     const status = await checkPaymentStatus(correctOrderId);
     ```
   - **Debug steps**:
     - Gọi `GET /api/payments/debug/orders` để xem tất cả orderId có trong DB
     - So sánh với orderId mà FE đang sử dụng
     - Đảm bảo FE lưu và sử dụng orderId từ API response

4. **State Management Issues**
   - Use proper state management library
   - Implement optimistic updates
   - Handle loading and error states

This comprehensive guide covers the complete frontend integration flow for the rental, contract, and payment system. Each component is production-ready with proper error handling, loading states, and responsive design.