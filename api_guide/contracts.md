# 📋 Contracts API - Contract Management System

> **Base URL**: `http://localhost:3001/api/landlord/contracts`  
> **Content-Type**: `application/json`  
> **Authentication**: Bearer Token (JWT)

## 📋 Overview

Hệ thống quản lý hợp đồng thuê, hóa đơn, yêu cầu thuê và ứng tuyển ở ghép cho cả landlord và user.

## 🏗️ Data Structure

### **Rental Contract Schema**
```javascript
{
  contractId: Number,       // Auto-increment
  roomId: Number,           // ID phòng
  landlordId: Number,       // ID chủ trọ
  contractType: String,     // 'single', 'shared'
  status: String,           // 'active', 'expired', 'terminated'
  startDate: Date,          // Ngày bắt đầu thuê
  endDate: Date,            // Ngày kết thúc thuê
  monthlyRent: Number,      // Tổng tiền thuê/tháng
  deposit: Number,          // Tổng tiền cọc
  contractFile: String,     // File hợp đồng
  tenants: [{               // Danh sách người thuê
    tenantId: Number,       // ID người thuê
    moveInDate: Date,       // Ngày chuyển vào
    monthlyRent: Number,    // Tiền thuê/tháng của người này
    deposit: Number,        // Tiền cọc của người này
    status: String,         // 'active', 'left', 'terminated'
    leftDate: Date          // Ngày rời phòng (nếu có)
  }],
  roomInfo: {               // Thông tin phòng
    roomNumber: String,
    area: Number,
    maxOccupancy: Number,
    currentOccupancy: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### **User Current Room Schema**
```javascript
{
  userId: Number,           // ID user
  roomId: Number,           // ID phòng hiện tại
  landlordId: Number,       // ID chủ trọ
  contractId: Number,       // ID hợp đồng
  moveInDate: Date,         // Ngày chuyển vào
  monthlyRent: Number,      // Tiền thuê/tháng
  status: String,           // 'active', 'expired', 'terminated'
  canPostRoommate: Boolean, // Có thể đăng tìm người ở ghép không
  createdAt: Date,
  updatedAt: Date
}
```

### **Rental Request Schema**
```javascript
{
  requestId: Number,        // Auto-increment
  tenantId: Number,         // userId của người thuê
  landlordId: Number,       // userId của chủ trọ
  roomId: Number,           // ID phòng
  rentPostId: Number,       // ID bài đăng (optional)
  status: String,           // 'pending', 'approved', 'rejected', 'cancelled'
  message: String,          // Lời nhắn từ người thuê
  requestedMoveInDate: Date, // Ngày muốn chuyển vào
  requestedDuration: Number, // Thời gian thuê (tháng)
  landlordResponse: String,  // Phản hồi từ chủ trọ
  respondedAt: Date,        // Thời gian phản hồi
  createdAt: Date,
  updatedAt: Date
}
```

### **Invoice Schema**
```javascript
{
  invoiceId: Number,        // Auto-increment
  tenantId: Number,         // userId của người thuê
  landlordId: Number,       // userId của chủ trọ
  roomId: Number,           // ID phòng
  contractId: Number,       // ID hợp đồng
  invoiceType: String,      // 'rent', 'deposit', 'utilities', 'penalty'
  amount: Number,           // Số tiền
  dueDate: Date,            // Ngày đến hạn
  paidDate: Date,           // Ngày thanh toán
  status: String,           // 'pending', 'paid', 'overdue', 'cancelled'
  paymentMethod: String,    // 'cash', 'bank_transfer', 'momo', 'zalopay'
  description: String,      // Mô tả hóa đơn
  attachments: [String],    // File đính kèm
  createdAt: Date,
  updatedAt: Date
}
```

### **Contract Update Schema**
```javascript
{
  contractId: Number,       // ID hợp đồng gốc
  updateType: String,       // 'add_tenant', 'remove_tenant', 'modify_terms'
  updateData: Object,       // Dữ liệu cập nhật
  updatedBy: Number,        // ID người cập nhật
  reason: String,           // Lý do cập nhật
  createdAt: Date
}
```

### **Roommate Application Schema**
```javascript
{
  applicationId: Number,    // Auto-increment
  postId: Number,           // ID bài đăng tìm người ở ghép
  applicantId: Number,      // ID người apply
  posterId: Number,         // ID người đăng bài
  roomId: Number,           // ID phòng
  status: String,           // 'pending', 'approved', 'rejected', 'cancelled'
  message: String,          // Lời nhắn từ ứng viên
  appliedAt: Date,          // Thời gian apply
  respondedAt: Date,        // Thời gian phản hồi
  responseMessage: String,  // Lời nhắn phản hồi
  createdAt: Date,
  updatedAt: Date
}
```

## 🔗 API Endpoints

### **1. Contract Management (Landlord)**

#### **POST /api/landlord/contracts**
Tạo hợp đồng mới

**Request Body:**
```javascript
{
  "roomId": 1,
  "contractType": "single",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.000Z",
  "monthlyRent": 3000000,
  "deposit": 3000000,
  "contractFile": "contract_123.pdf",
  "tenants": [
    {
      "tenantId": 456,
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
  }
}
```

**Response:**
```javascript
{
  "contractId": 1,
  "roomId": 1,
  "landlordId": 123,
  "contractType": "single",
  "status": "active",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.000Z",
  "monthlyRent": 3000000,
  "deposit": 3000000,
  "tenants": [/* ... */],
  "roomInfo": {/* ... */},
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### **GET /api/landlord/contracts**
Lấy danh sách hợp đồng của landlord

**Response:**
```javascript
[
  {
    "contractId": 1,
    "roomId": 1,
    "contractType": "single",
    "status": "active",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-12-31T23:59:59.000Z",
    "monthlyRent": 3000000,
    "tenants": [
      {
        "tenantId": 456,
        "monthlyRent": 3000000,
        "status": "active"
      }
    ]
  }
]
```

#### **GET /api/landlord/contracts/:id**
Lấy chi tiết hợp đồng

#### **PUT /api/landlord/contracts/:id**
Cập nhật hợp đồng

#### **POST /api/landlord/contracts/:id/add-tenant**
Thêm người ở ghép vào hợp đồng

**Request Body:**
```javascript
{
  "tenantId": 789,
  "moveInDate": "2024-02-01T00:00:00.000Z",
  "monthlyRent": 1500000,
  "deposit": 1500000
}
```

#### **POST /api/landlord/contracts/:id/remove-tenant**
Xóa người ở ghép khỏi hợp đồng

**Request Body:**
```javascript
{
  "tenantId": 789
}
```

### **2. Rental Requests (Landlord)**

#### **GET /api/landlord/rental-requests**
Lấy danh sách yêu cầu thuê

**Response:**
```javascript
[
  {
    "requestId": 1,
    "tenantId": 456,
    "roomId": 1,
    "status": "pending",
    "message": "Tôi muốn thuê phòng này",
    "requestedMoveInDate": "2024-01-15T00:00:00.000Z",
    "requestedDuration": 12,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### **GET /api/landlord/rental-requests/:id**
Lấy chi tiết yêu cầu thuê

#### **PUT /api/landlord/rental-requests/:id/approve**
Duyệt yêu cầu thuê

**Request Body:**
```javascript
{
  "landlordResponse": "Chào mừng bạn đến với phòng trọ của tôi!"
}
```

#### **PUT /api/landlord/rental-requests/:id/reject**
Từ chối yêu cầu thuê

**Request Body:**
```javascript
{
  "landlordResponse": "Xin lỗi, phòng đã có người thuê rồi."
}
```

### **3. Invoice Management (Landlord)**

#### **GET /api/landlord/invoices**
Lấy danh sách hóa đơn

#### **POST /api/landlord/invoices**
Tạo hóa đơn mới

**Request Body:**
```javascript
{
  "tenantId": 456,
  "roomId": 1,
  "contractId": 1,
  "invoiceType": "rent",
  "amount": 3000000,
  "dueDate": "2024-02-01T00:00:00.000Z",
  "description": "Tiền thuê tháng 2/2024"
}
```

#### **GET /api/landlord/invoices/:id**
Lấy chi tiết hóa đơn

#### **PUT /api/landlord/invoices/:id**
Cập nhật hóa đơn

### **4. User Current Room (User)**

#### **GET /api/users/me/current-room**
Lấy phòng hiện tại của user

**Response:**
```javascript
{
  "userId": 456,
  "roomId": 1,
  "landlordId": 123,
  "contractId": 1,
  "moveInDate": "2024-01-01T00:00:00.000Z",
  "monthlyRent": 3000000,
  "status": "active",
  "canPostRoommate": true
}
```

#### **POST /api/users/me/current-room**
Set phòng hiện tại cho user

**Request Body:**
```javascript
{
  "roomId": 1,
  "landlordId": 123,
  "contractId": 1,
  "moveInDate": "2024-01-01T00:00:00.000Z",
  "monthlyRent": 3000000
}
```

#### **PUT /api/users/me/current-room**
Cập nhật phòng hiện tại

### **5. Rental Requests (User)**

#### **POST /api/users/rental-requests**
Tạo yêu cầu thuê

**Request Body:**
```javascript
{
  "landlordId": 123,
  "roomId": 1,
  "rentPostId": 1,
  "message": "Tôi muốn thuê phòng này",
  "requestedMoveInDate": "2024-01-15T00:00:00.000Z",
  "requestedDuration": 12
}
```

### **6. Invoices (User)**

#### **GET /api/users/me/invoices**
Lấy hóa đơn của user

#### **PUT /api/users/me/invoices/:id/pay**
Thanh toán hóa đơn

**Request Body:**
```javascript
{
  "paymentMethod": "momo"
}
```

### **7. Roommate Applications (User)**

#### **GET /api/users/me/roommate-applications**
Lấy đơn apply ở ghép của user

#### **POST /api/users/roommate-applications**
Apply ở ghép

**Request Body:**
```javascript
{
  "postId": 1,
  "posterId": 123,
  "roomId": 1,
  "message": "Tôi muốn ở ghép với bạn"
}
```

#### **PUT /api/users/roommate-applications/:id/cancel**
Hủy đơn apply

### **8. Roommate Applications (Landlord)**

#### **GET /api/landlord/roommate-applications**
Lấy đơn apply ở ghép cho landlord

#### **GET /api/landlord/roommate-applications/:id**
Lấy chi tiết đơn apply

#### **PUT /api/landlord/roommate-applications/:id/approve**
Duyệt đơn apply

**Request Body:**
```javascript
{
  "responseMessage": "Chào mừng bạn đến với phòng trọ!"
}
```

#### **PUT /api/landlord/roommate-applications/:id/reject**
Từ chối đơn apply

**Request Body:**
```javascript
{
  "responseMessage": "Xin lỗi, phòng đã đủ người rồi."
}
```

## 🚀 Frontend Integration

### **React/Next.js Example:**
```javascript
// Create contract
const createContract = async (contractData) => {
  const response = await fetch('/api/landlord/contracts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(contractData)
  });
  return response.json();
};

// Get user's current room
const getCurrentRoom = async () => {
  const response = await fetch('/api/users/me/current-room', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Pay invoice
const payInvoice = async (invoiceId, paymentMethod) => {
  const response = await fetch(`/api/users/me/invoices/${invoiceId}/pay`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ paymentMethod })
  });
  return response.json();
};
```

### **Vue.js Example:**
```javascript
// Vue Composition API
import { ref, onMounted } from 'vue';

export default {
  setup() {
    const contracts = ref([]);
    const invoices = ref([]);
    const currentRoom = ref(null);

    const fetchContracts = async () => {
      const response = await fetch('/api/landlord/contracts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      contracts.value = await response.json();
    };

    const fetchInvoices = async () => {
      const response = await fetch('/api/users/me/invoices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      invoices.value = await response.json();
    };

    const fetchCurrentRoom = async () => {
      try {
        const response = await fetch('/api/users/me/current-room', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        currentRoom.value = await response.json();
      } catch (error) {
        currentRoom.value = null;
      }
    };

    onMounted(() => {
      fetchContracts();
      fetchInvoices();
      fetchCurrentRoom();
    });

    return {
      contracts,
      invoices,
      currentRoom,
      fetchContracts,
      fetchInvoices,
      fetchCurrentRoom
    };
  }
};
```

## 📊 Business Logic

### **Contract Status:**
- **active**: Hợp đồng đang có hiệu lực
- **expired**: Hợp đồng đã hết hạn
- **terminated**: Hợp đồng bị chấm dứt sớm

### **Request Status:**
- **pending**: Chờ phản hồi
- **approved**: Được duyệt
- **rejected**: Bị từ chối
- **cancelled**: Bị hủy

### **Invoice Status:**
- **pending**: Chưa thanh toán
- **paid**: Đã thanh toán
- **overdue**: Quá hạn thanh toán
- **cancelled**: Bị hủy

### **Application Status:**
- **pending**: Chờ phản hồi
- **approved**: Được duyệt
- **rejected**: Bị từ chối
- **cancelled**: Bị hủy

## ⚠️ Important Notes

1. **Contract Updates**: Mọi thay đổi hợp đồng đều được log
2. **Tenant Management**: Tự động cập nhật occupancy khi thêm/xóa tenant
3. **Invoice Generation**: Tự động tạo hóa đơn theo lịch
4. **Status Synchronization**: Đồng bộ status giữa các collections
5. **File Management**: Hỗ trợ upload file hợp đồng và đính kèm
6. **Payment Tracking**: Theo dõi lịch sử thanh toán

## 📊 Complete API List

> **📋 JSON Examples**: Xem file [contracts-examples.md](./contracts-examples.md) để có đầy đủ JSON examples cho tất cả API endpoints.

### **🏠 Landlord Contract APIs**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/landlord/contracts` | Tạo hợp đồng thuê | ✅ Landlord |
| GET | `/api/landlord/contracts` | Lấy danh sách hợp đồng | ✅ Landlord |
| GET | `/api/landlord/contracts/:id` | Lấy chi tiết hợp đồng | ✅ Landlord |
| PUT | `/api/landlord/contracts/:id` | Cập nhật hợp đồng | ✅ Landlord |
| POST | `/api/landlord/contracts/:id/tenants` | Thêm người thuê vào hợp đồng | ✅ Landlord |
| DELETE | `/api/landlord/contracts/:id/tenants/:userId` | Xóa người thuê khỏi hợp đồng | ✅ Landlord |

### **💰 Landlord Invoice APIs**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/landlord/invoices` | Tạo hóa đơn | ✅ Landlord |
| GET | `/api/landlord/invoices` | Lấy danh sách hóa đơn | ✅ Landlord |
| GET | `/api/landlord/invoices/:id` | Lấy chi tiết hóa đơn | ✅ Landlord |
| PUT | `/api/landlord/invoices/:id` | Cập nhật hóa đơn | ✅ Landlord |
| PUT | `/api/landlord/invoices/:id/mark-paid` | Đánh dấu đã thanh toán | ✅ Landlord |

### **📋 Landlord Request APIs**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/landlord/rental-requests` | Lấy yêu cầu thuê | ✅ Landlord |
| GET | `/api/landlord/rental-requests/:id` | Lấy chi tiết yêu cầu | ✅ Landlord |
| PUT | `/api/landlord/rental-requests/:id/approve` | Duyệt yêu cầu thuê | ✅ Landlord |
| PUT | `/api/landlord/rental-requests/:id/reject` | Từ chối yêu cầu thuê | ✅ Landlord |

### **👥 Landlord Roommate APIs**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/landlord/roommate-applications` | Lấy đơn ứng tuyển ở ghép | ✅ Landlord |
| GET | `/api/landlord/roommate-applications/:id` | Lấy chi tiết đơn ứng tuyển | ✅ Landlord |
| PUT | `/api/landlord/roommate-applications/:id/approve` | Duyệt đơn ứng tuyển | ✅ Landlord |
| PUT | `/api/landlord/roommate-applications/:id/reject` | Từ chối đơn ứng tuyển | ✅ Landlord |

### **👤 User Contract APIs**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/user/me/contracts` | Lấy hợp đồng của tôi | ✅ User |
| GET | `/api/user/me/contracts/:id` | Lấy chi tiết hợp đồng | ✅ User |
| POST | `/api/user/me/rental-requests` | Tạo yêu cầu thuê | ✅ User |
| GET | `/api/user/me/rental-requests` | Lấy yêu cầu thuê của tôi | ✅ User |
| PUT | `/api/user/me/rental-requests/:id/cancel` | Hủy yêu cầu thuê | ✅ User |

### **🏠 User Current Room APIs**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/user/me/current-room` | Lấy phòng hiện tại | ✅ User |
| POST | `/api/user/me/current-room` | Đặt phòng hiện tại | ✅ User |
| PUT | `/api/user/me/current-room` | Cập nhật phòng hiện tại | ✅ User |
| DELETE | `/api/user/me/current-room` | Xóa phòng hiện tại | ✅ User |

### **💰 User Invoice APIs**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/user/me/invoices` | Lấy hóa đơn của tôi | ✅ User |
| GET | `/api/user/me/invoices/:id` | Lấy chi tiết hóa đơn | ✅ User |
| PUT | `/api/user/me/invoices/:id/pay` | Thanh toán hóa đơn | ✅ User |

### **👥 User Roommate APIs**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/user/me/roommate-applications` | Tạo đơn ứng tuyển ở ghép | ✅ User |
| GET | `/api/user/me/roommate-applications` | Lấy đơn ứng tuyển của tôi | ✅ User |
| PUT | `/api/user/me/roommate-applications/:id/cancel` | Hủy đơn ứng tuyển | ✅ User |

## 🔒 Security

- **JWT Authentication**: Required cho tất cả endpoints
- **Role-based Access**: Landlord và User có quyền khác nhau
- **Data Validation**: Validate tất cả input data
- **File Upload Security**: Validate file types và sizes
- **Audit Trail**: Ghi log tất cả thay đổi quan trọng

---

**Happy Contract Managing! 📋✨**
