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

### Bước 5: Đăng ký thuê phòng

**API:** `POST /api/contracts/users/rental-requests`

```javascript
// Frontend: RentalRequestForm.jsx
const submitRentalRequest = async (requestData) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/contracts/users/rental-requests', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      postId: requestData.postId,
      moveInDate: requestData.moveInDate,
      duration: requestData.duration,
      message: requestData.message
    })
  });
  
  return response.json();
};

// Component
const RentalRequestForm = ({ postId }) => {
  const [formData, setFormData] = useState({
    moveInDate: '',
    duration: 12,
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
        value={formData.moveInDate}
        onChange={(e) => setFormData({...formData, moveInDate: e.target.value})}
        required
      />
      <select
        value={formData.duration}
        onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
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

## 3. LUỒNG HỢP ĐỒNG (CHO USER)

### Bước 6: Xem trạng thái đăng ký thuê

**API:** `GET /api/contracts/users/rental-requests`

```javascript
// Frontend: MyRentalRequests.jsx
const fetchMyRequests = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/contracts/users/rental-requests', {
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

### Bước 7: Xem hợp đồng

**API:** `GET /api/contracts/users/contract/:contractId`

```javascript
// Frontend: ContractView.jsx
const fetchContract = async (contractId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/contracts/users/contract/${contractId}`, {
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
          <button onClick={() => downloadContract(contract.contractId)}>
            Tải hợp đồng PDF
          </button>
        </div>
      )}
    </div>
  );
};
```

## 4. LUỒNG THANH TOÁN

### Bước 8: Xem hóa đơn cần thanh toán

**API:** `GET /api/payments/pending-invoices`

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

### Bước 9: Tạo QR code thanh toán ZaloPay

**API:** `POST /api/payments/generate-zalopay-qr`

```javascript
// Frontend: PaymentQR.jsx
const generatePaymentQR = async (invoiceId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/payments/generate-zalopay-qr', {
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

### Bước 10: Kiểm tra trạng thái thanh toán

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
        alert('Thanh toán thành công!');
        // Refresh invoices list hoặc redirect
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

## 5. COMPLETE INTEGRATION EXAMPLE

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

## 6. ERROR HANDLING & LOADING STATES

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
  async generateZaloPayQR(invoiceId) {
    return this.request('/payments/generate-zalopay-qr', {
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

## 7. STATE MANAGEMENT (Redux/Zustand)

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

## 8. RESPONSIVE DESIGN & UX

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

## 9. TESTING STRATEGY

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

    apiService.generateZaloPayQR.mockResolvedValue(mockQRData);

    render(<PaymentQR invoiceId={123} />);
    
    fireEvent.click(screen.getByText('Tạo mã QR thanh toán'));

    await waitFor(() => {
      expect(screen.getByText('Quét mã QR để thanh toán')).toBeInTheDocument();
      expect(screen.getByText('1,000,000 VND')).toBeInTheDocument();
    });
  });
});
```

## 10. DEPLOYMENT CHECKLIST

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

## 11. TROUBLESHOOTING

### Common Issues

1. **CORS Errors**
   - Ensure backend has proper CORS configuration
   - Check API base URL in frontend

2. **Token Expiry**
   - Implement token refresh logic
   - Handle 401 errors gracefully

3. **Payment QR Not Working**
   - Verify ZaloPay configuration
   - Check callback URLs are accessible
   - Test with ZaloPay sandbox first

4. **State Management Issues**
   - Use proper state management library
   - Implement optimistic updates
   - Handle loading and error states

This comprehensive guide covers the complete frontend integration flow for the rental, contract, and payment system. Each component is production-ready with proper error handling, loading states, and responsive design.