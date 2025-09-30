# 🏠 HỆ THỐNG QUẢN LÝ CHỦ TRỌ & TÌM NGƯỜI Ở GHÉP

## 📋 TỔNG QUAN

Hệ thống hỗ trợ chủ trọ quản lý phòng trọ và người dùng tìm kiếm phòng ở ghép, bao gồm:
- Quản lý dãy nhà, tầng, phòng trọ
- Xử lý yêu cầu thuê trọ
- Quản lý hợp đồng thuê
- Tạo và quản lý hóa đơn
- Báo cáo doanh thu
- Tìm kiếm người ở ghép

## 🗄️ CẤU TRÚC DATABASE

### 1. **rooms** - Quản lý phòng trọ (FULL INFO)
```javascript
{
  roomId: Number,           // Auto-increment
  landlordId: Number,       // userId của chủ trọ
  buildingId: Number,       // ID dãy nhà
  roomNumber: String,       // Số phòng (A101, B205)
  floor: Number,            // Tầng
  category: String,         // 'phong-tro', 'chung-cu', 'nha-nguyen-can'
  
  // BasicInfo (từ rent-posts schema)
  area: Number,             // Diện tích (m²)
  price: Number,            // Giá thuê/tháng
  deposit: Number,          // Tiền cọc
  furniture: String,        // Tình trạng nội thất: 'full', 'co-ban', 'trong'
  bedrooms: Number,         // Số phòng ngủ
  bathrooms: Number,        // Số phòng vệ sinh
  direction: String,        // Hướng: 'dong', 'tay', 'nam', 'bac'
  legalStatus: String,      // Tình trạng sổ: 'co-so-hong', 'cho-so'

  // Thông tin riêng theo loại
  chungCuInfo: {            // Chỉ có khi category = 'chung-cu'
    buildingName: String,   // Tên tòa nhà/dự án
    blockOrTower: String,   // Block/Tháp
    floorNumber: Number,    // Tầng số
    unitCode: String,       // Mã căn
    propertyType: String    // 'chung-cu', 'can-ho-dv', 'officetel', 'studio'
  },
  
  nhaNguyenCanInfo: {       // Chỉ có khi category = 'nha-nguyen-can'
    khuLo: String,          // Tên khu/lô
    unitCode: String,       // Mã căn
    propertyType: String,   // 'nha-pho', 'biet-thu', 'nha-hem', 'nha-cap4'
    totalFloors: Number,    // Tổng số tầng
    landArea: Number,       // Diện tích đất (m²)
    usableArea: Number,     // Diện tích sử dụng (m²)
    width: Number,          // Chiều ngang (m)
    length: Number,         // Chiều dài (m)
    features: [String]      // Đặc điểm nhà/đất
  },

  // Utilities (từ rent-posts schema)
  utilities: {
    electricityPricePerKwh: Number,
    waterPrice: Number,
    waterBillingType: String,    // 'per_m3' | 'per_person'
    internetFee: Number,
    garbageFee: Number,
    cleaningFee: Number,
    parkingMotorbikeFee: Number,
    parkingCarFee: Number,
    managementFee: Number,
    managementFeeUnit: String,   // 'per_month' | 'per_m2_per_month'
    gardeningFee: Number,
    cookingGasFee: Number,
    includedInRent: {
      electricity: Boolean,
      water: Boolean,
      internet: Boolean,
      garbage: Boolean,
      cleaning: Boolean,
      parkingMotorbike: Boolean,
      parkingCar: Boolean,
      managementFee: Boolean
    }
  },

  // Address (từ rent-posts schema)
  address: {
    street: String,
    ward: String,
    city: String,
    specificAddress: String,
    showSpecificAddress: Boolean,
    provinceCode: String,
    provinceName: String,
    wardCode: String,
    wardName: String,
    additionalInfo: String
  },

  // Thông tin cho ở ghép
  maxOccupancy: Number,     // Số người tối đa
  canShare: Boolean,        // Có thể ở ghép không
  sharePrice: Number,       // Giá mỗi người khi ở ghép
  currentOccupants: Number, // Số người hiện tại
  availableSpots: Number,   // Số chỗ trống (maxOccupancy - currentOccupants)
  
  // Thông tin chia sẻ tiện ích (cho ở ghép)
  shareMethod: String,      // 'split_evenly' | 'by_usage' | 'included'
  estimatedMonthlyUtilities: Number, // Ước tính tổng phí tiện ích
  capIncludedAmount: Number, // Mức free tối đa, vượt thì chia thêm
  
  // Thông tin người ở hiện tại (cho ở ghép)
  currentTenants: [{
    userId: Number,         // ID người thuê
    fullName: String,       // Tên
    age: Number,            // Tuổi
    gender: String,         // Giới tính
    occupation: String,     // Nghề nghiệp
    moveInDate: Date,       // Ngày chuyển vào
    lifestyle: String,      // 'early', 'normal', 'late'
    cleanliness: String     // 'very_clean', 'clean', 'normal', 'flexible'
  }],

  // Media & mô tả
  images: [String],         // Ảnh phòng
  videos: [String],         // Video phòng
  description: String,      // Mô tả phòng

  // Trạng thái
  status: String,           // 'available', 'occupied', 'maintenance'
  isActive: Boolean,        // Có đang cho thuê không
  createdAt: Date,
  updatedAt: Date
}
```

### 2. **posts** - Collection bài đăng thống nhất (Gộp rent-posts + roommate-posts)
```javascript
{
  postId: Number,           // Auto-increment
  userId: Number,           // Người đăng
  postType: String,         // 'rent' | 'roommate'
  
  // Thông tin bài đăng
  title: String,
  description: String,
  images: [String],
  videos: [String],
  
  // Liên kết với room (optional)
  roomId: Number,           // ID phòng (nếu từ room management)
  buildingId: Number,       // ID dãy nhà
  landlordId: Number,       // ID chủ trọ (nếu từ room management)
  isManaged: Boolean,       // true = từ room management
  source: String,           // 'room_management' | 'manual_post' | 'user_post'
  
  // Thông tin phòng (chỉ khi không có roomId)
  roomInfo: {               // Chỉ lưu khi đăng bài tự do, không từ room management
    address: Object,        // Address schema
    basicInfo: Object,      // BasicInfo schema
    chungCuInfo: Object,    // ChungCuInfo schema (optional)
    nhaNguyenCanInfo: Object, // NhaNguyenCanInfo schema (optional)
    utilities: Object       // Utilities schema
  },
  
  // Thông tin riêng cho roommate posts
  personalInfo: {           // Chỉ có khi postType = 'roommate'
    fullName: String,
    age: Number,
    gender: String,
    occupation: String,
    hobbies: [String],
    habits: [String],
    lifestyle: String,      // 'early', 'normal', 'late'
    cleanliness: String     // 'very_clean', 'clean', 'normal', 'flexible'
  },
  
  requirements: {           // Chỉ có khi postType = 'roommate'
    ageRange: [Number],
    gender: String,
    traits: [String],
    maxPrice: Number
  },
  
  // Liên hệ
  phone: String,
  email: String,
  
  // Trạng thái
  status: String,           // 'pending', 'active', 'inactive', 'rejected'
  
  createdAt: Date,
  updatedAt: Date
}
```

### 3. **buildings** - Quản lý dãy nhà
```javascript
{
  buildingId: Number,       // Auto-increment
  landlordId: Number,       // userId của chủ trọ
  name: String,             // Tên dãy nhà (VD: "Dãy A", "Dãy B")
  address: Object,          // Địa chỉ (reuse Address schema)
  totalFloors: Number,      // Số tầng
  totalRooms: Number,       // Tổng số phòng
  buildingType: String,     // 'apartment', 'house', 'dormitory'
  images: [String],         // Ảnh dãy nhà
  description: String,      // Mô tả
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 4. **rental-contracts** - Hợp đồng thuê
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

### 5. **user-current-room** - Phòng hiện tại của user
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

### 6. **rental-requests** - Yêu cầu thuê trọ
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

### 7. **invoices** - Hóa đơn
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

### 8. **contract-updates** - Cập nhật hợp đồng
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

### 8. **roommate-applications** - Đơn apply ở ghép
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

## 🔄 CẬP NHẬT COLLECTIONS HIỆN TẠI

### **XÓA COLLECTIONS CŨ**
- **rent-posts** → Gộp vào **posts** collection
- **roommate-posts** → Gộp vào **posts** collection

### **MIGRATION STRATEGY**
1. Tạo **posts** collection mới
2. Migrate dữ liệu từ **rent-posts** và **roommate-posts** sang **posts**
3. Xóa **rent-posts** và **roommate-posts** collections cũ
4. Cập nhật tất cả API endpoints để sử dụng **posts** collection

## 🚀 FLOW HOẠT ĐỘNG CHI TIẾT

### 1. **LANDLORD QUẢN LÝ PHÒNG**

#### **A. Tạo dãy nhà và phòng:**
```
1. Landlord đăng nhập → Chọn "Quản lý phòng"
2. Tạo dãy nhà mới → Nhập thông tin dãy nhà (VD: "Dãy A", "Dãy B")
3. Tạo phòng trong dãy nhà → Nhập thông tin phòng (số phòng, tầng)
4. Cấu hình phòng có thể ở ghép hay không
5. Upload ảnh phòng và dãy nhà
```

#### **B. Đăng bài cho thuê:**
```
1. Chọn phòng cần đăng → Chọn "Đăng bài cho thuê"
2. Hệ thống tự động lấy TẤT CẢ thông tin từ rooms collection
3. Landlord chỉ cần nhập: title, description bổ sung
4. Chọn loại đăng: "Cho thuê toàn bộ" hoặc "Tìm người ở ghép"
5. Đăng bài → Bài đăng xuất hiện trong posts collection với postType='rent' và roomId
```

#### **C. Xử lý yêu cầu thuê:**
```
1. Nhận thông báo có yêu cầu thuê mới
2. Xem chi tiết yêu cầu và thông tin người thuê
3. Chat với người thuê để tìm hiểu thêm
4. Duyệt/từ chối yêu cầu
5. Nếu duyệt → Tạo hợp đồng thuê
```

#### **D. Quản lý hợp đồng:**
```
1. Xem danh sách hợp đồng đang hoạt động
2. Thêm người ở ghép vào hợp đồng hiện tại
3. Xóa người ở ghép khỏi hợp đồng
4. Cập nhật thông tin hợp đồng
5. Theo dõi lịch sử thay đổi hợp đồng
```

#### **E. Tạo và quản lý hóa đơn:**
```
1. Tạo hóa đơn tiền thuê hàng tháng
2. Tạo hóa đơn tiền cọc
3. Tạo hóa đơn tiền điện nước
4. Theo dõi trạng thái thanh toán
5. Gửi nhắc nhở thanh toán
```

#### **F. Xem báo cáo:**
```
1. Báo cáo doanh thu theo tháng/quý/năm
2. Báo cáo tỷ lệ lấp đầy phòng
3. Báo cáo người thuê
4. Báo cáo phòng trống
5. Xuất báo cáo PDF/Excel
```

### 2. **USER THUÊ PHÒNG**

#### **A. Tìm phòng thuê:**
```
1. Tìm kiếm phòng theo khu vực, giá, loại phòng
2. Xem chi tiết phòng và thông tin chủ trọ
3. Chat với chủ trọ để hỏi thêm thông tin
4. Gửi yêu cầu thuê phòng
5. Chờ phản hồi từ chủ trọ
```

#### **B. Ký hợp đồng:**
```
1. Nhận thông báo yêu cầu được duyệt
2. Xem chi tiết hợp đồng
3. Ký hợp đồng (upload chữ ký)
4. Thanh toán tiền cọc
5. Nhận thông tin phòng và chìa khóa
```

#### **C. Quản lý phòng hiện tại:**
```
1. Xem thông tin phòng đang thuê
2. Xem thông tin chủ trọ
3. Xem lịch sử thanh toán
4. Báo cáo sự cố phòng
5. Gia hạn hợp đồng
```

### 3. **USER TÌM NGƯỜI Ở GHÉP**

#### **A. Tìm phòng ở ghép:**
```
1. Tìm kiếm phòng ở ghép theo khu vực, giá
2. Xem chi tiết phòng và thông tin người đăng
3. Chat với người đăng để hỏi thêm thông tin
4. Gửi đơn apply ở ghép
5. Chờ phản hồi từ người đăng
```

#### **B. Đăng bài tìm người ở ghép:**
```
1. Có phòng hiện tại → Chọn "Đăng tìm người ở ghép"
2. Hệ thống tự động điền thông tin phòng
3. Chỉnh sửa mô tả và yêu cầu
4. Đăng bài → Bài đăng xuất hiện trong roommate-posts
5. Nhận thông báo khi có người apply
```

#### **C. Quản lý ứng viên:**
```
1. Xem danh sách ứng viên apply
2. Chat với từng ứng viên để tìm hiểu
3. Duyệt/từ chối ứng viên
4. Chọn ứng viên phù hợp
5. Liên hệ với chủ trọ để cập nhật hợp đồng
```

### 4. **LANDLORD TÌM NGƯỜI Ở GHÉP**

#### **A. Đăng bài tìm người ở ghép:**
```
1. Chọn phòng cần tìm người ở ghép
2. Chọn "Đăng tìm người ở ghép"
3. Hệ thống tự động điền thông tin phòng
4. Chỉnh sửa mô tả và yêu cầu
5. Đăng bài → Bài đăng xuất hiện trong roommate-posts
```

#### **B. Quản lý ứng viên:**
```
1. Xem danh sách ứng viên apply
2. Chat với từng ứng viên để tìm hiểu
3. Duyệt/từ chối ứng viên
4. Chọn ứng viên phù hợp
5. Thêm vào hợp đồng hiện tại
```

## 🔗 API ENDPOINTS

### **1. Room Management:**
```javascript
GET    /api/landlord/rooms              // Lấy danh sách phòng
POST   /api/landlord/rooms              // Tạo phòng mới
GET    /api/landlord/rooms/:id          // Lấy chi tiết phòng
PUT    /api/landlord/rooms/:id          // Cập nhật phòng
DELETE /api/landlord/rooms/:id          // Xóa phòng
```

### **2. Building Management:**
```javascript
GET    /api/landlord/buildings          // Lấy danh sách dãy nhà
POST   /api/landlord/buildings          // Tạo dãy nhà mới
GET    /api/landlord/buildings/:id      // Lấy chi tiết dãy nhà
PUT    /api/landlord/buildings/:id      // Cập nhật dãy nhà
DELETE /api/landlord/buildings/:id      // Xóa dãy nhà
```

### **3. Rental Requests:**
```javascript
GET    /api/landlord/rental-requests    // Lấy yêu cầu thuê
GET    /api/landlord/rental-requests/:id // Lấy chi tiết yêu cầu
PUT    /api/landlord/rental-requests/:id/approve // Duyệt yêu cầu
PUT    /api/landlord/rental-requests/:id/reject  // Từ chối yêu cầu
```

### **4. Contract Management:**
```javascript
GET    /api/landlord/contracts          // Lấy danh sách hợp đồng
POST   /api/landlord/contracts          // Tạo hợp đồng mới
GET    /api/landlord/contracts/:id      // Lấy chi tiết hợp đồng
PUT    /api/landlord/contracts/:id      // Cập nhật hợp đồng
POST   /api/landlord/contracts/:id/add-tenant    // Thêm người ở ghép
POST   /api/landlord/contracts/:id/remove-tenant // Xóa người ở ghép
```

### **5. Invoice Management:**
```javascript
GET    /api/landlord/invoices           // Lấy danh sách hóa đơn
GET    /api/landlord/invoices/:id       // Lấy chi tiết hóa đơn
PUT    /api/landlord/invoices/:id       // Cập nhật hóa đơn
PUT    /api/landlord/invoices/:id/mark-paid // Đánh dấu đã thanh toán
POST   /api/landlord/invoices/monthly-rent // Tạo hóa đơn hàng tháng
POST   /api/landlord/invoices/generate-monthly // Tạo hóa đơn hàng tháng cho tất cả (Admin)
```

### **6. Report APIs:**
```javascript
GET    /api/landlord/reports/revenue    // Báo cáo doanh thu
GET    /api/landlord/reports/occupancy  // Báo cáo tỷ lệ lấp đầy
GET    /api/landlord/reports/tenants    // Báo cáo người thuê
GET    /api/landlord/reports/rooms      // Báo cáo phòng
```

### **7. User APIs:**
```javascript
GET    /api/users/me/current-room       // Lấy phòng hiện tại
GET    /api/users/me/roommate-applications // Lấy đơn apply ở ghép
PUT    /api/users/me/roommate-applications/:id/approve // Duyệt ứng viên
PUT    /api/users/me/roommate-applications/:id/reject  // Từ chối ứng viên
```

### **8. Roommate Posts:**
```javascript
GET    /api/roommate-posts              // Tìm phòng ở ghép
POST   /api/roommate-posts              // Đăng tìm người ở ghép
GET    /api/roommate-posts/:id          // Lấy chi tiết bài đăng
PUT    /api/roommate-posts/:id          // Cập nhật bài đăng
DELETE /api/roommate-posts/:id          // Xóa bài đăng
```

### **9. Roommate Applications:**
```javascript
POST   /api/roommate-applications       // Apply ở ghép
GET    /api/roommate-applications/:id   // Lấy chi tiết đơn apply
PUT    /api/roommate-applications/:id/cancel // Hủy đơn apply
```

## 🔔 THÔNG BÁO

### **1. Thông báo cho Landlord:**
- Có yêu cầu thuê mới
- Có ứng viên apply ở ghép
- Hóa đơn đến hạn thanh toán
- Người thuê rời phòng
- Báo cáo sự cố phòng

### **2. Thông báo cho User:**
- Yêu cầu thuê được duyệt/từ chối
- Có ứng viên apply ở ghép
- Hóa đơn mới
- Nhắc nhở thanh toán
- Cập nhật hợp đồng

## 🔒 BẢO MẬT

### **1. Phân quyền:**
- Chỉ landlord mới có thể quản lý phòng của mình
- Chỉ user mới có thể quản lý ứng viên của mình
- Admin có thể xem tất cả thông tin

### **2. Validation:**
- Kiểm tra quyền truy cập trước khi thực hiện action
- Validate dữ liệu đầu vào
- Kiểm tra trạng thái phòng và hợp đồng

### **3. Audit Log:**
- Ghi log tất cả thay đổi quan trọng
- Theo dõi lịch sử hoạt động
- Backup dữ liệu định kỳ

## 📱 FRONTEND INTEGRATION

### **1. Landlord Dashboard:**
- Quản lý dãy nhà và phòng
- Xử lý yêu cầu thuê
- Quản lý hợp đồng
- Tạo hóa đơn
- Xem báo cáo

### **2. User Dashboard:**
- Tìm phòng thuê
- Quản lý phòng hiện tại
- Tìm người ở ghép
- Quản lý ứng viên
- Thanh toán hóa đơn

### **3. Mobile App:**
- Tìm kiếm phòng
- Chat với chủ trọ/ứng viên
- Nhận thông báo
- Thanh toán online
- Quản lý hợp đồng

## 🚀 DEPLOYMENT

### **1. Database:**
- MongoDB với các collections mới
- Index cho performance
- Backup strategy

### **2. API:**
- NestJS với các modules mới
- Rate limiting
- Caching cho báo cáo

### **3. Frontend:**
- React/Vue.js cho web
- React Native cho mobile
- Real-time notifications

## 📊 MONITORING

### **1. Performance:**
- Response time của API
- Database query performance
- Memory usage

### **2. Business Metrics:**
- Số lượng phòng được đăng
- Tỷ lệ lấp đầy phòng
- Doanh thu hàng tháng
- Số lượng người dùng hoạt động

### **3. Error Tracking:**
- API errors
- Database errors
- Frontend errors
- User feedback

---

## ✅ KẾT LUẬN

Hệ thống này cung cấp giải pháp toàn diện cho việc quản lý phòng trọ và tìm kiếm người ở ghép, với các tính năng:

1. **Quản lý tập trung**: Landlord quản lý tất cả từ phòng đến người thuê
2. **Linh hoạt**: Hỗ trợ cả cho thuê toàn bộ và ở ghép
3. **Thực tế**: Phù hợp với nhu cầu thực tế của thị trường
4. **Theo dõi**: Báo cáo chi tiết về doanh thu và tỷ lệ lấp đầy
5. **Tự động**: Sync thông tin giữa các collections
6. **Bảo mật**: Phân quyền rõ ràng và audit log
7. **User-friendly**: Giao diện thân thiện và dễ sử dụng
8. **Scalable**: Có thể mở rộng theo nhu cầu

Hệ thống này sẽ giúp tối ưu hóa quá trình quản lý phòng trọ và tìm kiếm người ở ghép, mang lại trải nghiệm tốt nhất cho cả chủ trọ và người thuê.
