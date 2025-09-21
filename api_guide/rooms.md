# 🏠 Rooms API - Room Management System

> **Base URL**: `http://localhost:3001/api/landlord/rooms`  
> **Content-Type**: `application/json`  
> **Authentication**: Bearer Token (JWT) - Landlord only

## 📋 Overview

Hệ thống quản lý phòng trọ cho landlord, bao gồm quản lý dãy nhà, tầng, phòng với đầy đủ thông tin chi tiết.

## 🏗️ Data Structure

### **Room Schema**
```javascript
{
  roomId: Number,           // Auto-increment
  landlordId: Number,       // userId của chủ trọ
  buildingId: Number,       // ID dãy nhà
  roomNumber: String,       // Số phòng (A101, B205)
  // floor: dùng chungCuInfo.floorNumber khi là chung cư
  category: String,         // 'phong-tro', 'chung-cu', 'nha-nguyen-can'
  
  // BasicInfo
  area: Number,             // Diện tích (m²)
  price: Number,            // Giá thuê/tháng
  deposit: Number,          // Tiền cọc
  furniture: String,        // Tình trạng nội thất: 'full', 'co-ban', 'trong' (đặt ngoài)

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

  // Utilities
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

  // Address
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
  
  // Thông tin chia sẻ tiện ích
  shareMethod: String,      // 'split_evenly' | 'by_usage' | 'included'
  estimatedMonthlyUtilities: Number, // Ước tính tổng phí tiện ích
  capIncludedAmount: Number, // Mức free tối đa, vượt thì chia thêm
  
  // Thông tin người ở hiện tại
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

### **Building Schema**
```javascript
{
  buildingId: Number,       // Auto-increment
  landlordId: Number,       // userId của chủ trọ
  name: String,             // Tên dãy nhà (VD: "Dãy A", "Dãy B")
  address: Object,          // Địa chỉ (reuse Address schema)
  totalRooms: Number,       // Tổng số phòng
  buildingType: String,     // 'chung-cu', 'nha-nguyen-can', 'phong-tro'
  images: [String],         // Ảnh dãy nhà
  description: String,      // Mô tả
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔗 API Endpoints

> **Lưu ý**: Tất cả endpoints đều yêu cầu authentication và quyền landlord

## 🚀 Frontend Integration

### **React/Next.js Example:**
```javascript
// Create building
const createBuilding = async (buildingData) => {
  const response = await fetch('/api/landlord/buildings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(buildingData)
  });
  return response.json();
};

// Create room
const createRoom = async (roomData) => {
  const response = await fetch('/api/landlord/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(roomData)
  });
  return response.json();
};

// Search rooms
const searchRooms = async (filters) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/rooms/search?${params}`);
  return response.json();
};
```

### **Vue.js Example:**
```javascript
// Vue Composition API
import { ref, onMounted } from 'vue';

export default {
  setup() {
    const rooms = ref([]);
    const buildings = ref([]);
    const loading = ref(false);

    const fetchBuildings = async () => {
      const response = await fetch('/api/landlord/buildings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      buildings.value = await response.json();
    };

    const fetchRooms = async (buildingId) => {
      loading.value = true;
      try {
        const url = buildingId 
          ? `/api/landlord/rooms?buildingId=${buildingId}`
          : '/api/landlord/rooms';
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        rooms.value = await response.json();
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchBuildings();
      fetchRooms();
    });

    return {
      rooms,
      buildings,
      loading,
      fetchRooms
    };
  }
};
```

## 📊 Business Logic

### **Room Status Management:**
- **available**: Phòng trống, có thể cho thuê
- **occupied**: Phòng đã có người thuê
- **maintenance**: Phòng đang bảo trì

### **Occupancy Management:**
- `availableSpots` = `maxOccupancy` - `currentOccupants`
- Tự động cập nhật khi thêm/xóa người ở ghép
- Kiểm tra giới hạn trước khi thêm người mới

### **Room Types:**
- **phong-tro**: Phòng trọ thông thường
- **chung-cu**: Chung cư (có thêm chungCuInfo)
- **nha-nguyen-can**: Nhà nguyên căn (có thêm nhaNguyenCanInfo)

## 📊 Complete API List

### **🏢 Building APIs**

#### **POST /api/landlord/buildings** - Tạo dãy nhà mới

**1. CHUNG CƯ:**
```json
{
  "name": "Chung cư ABC Tower",
  "address": {
    "street": "123 Đường ABC",
    "ward": "Phường XYZ",
    "city": "Quận 1",
    "provinceCode": "79",
    "provinceName": "TP.HCM",
    "wardCode": "26734",
    "wardName": "Phường Bến Nghé"
  },
  "totalRooms": 200,
  "buildingType": "chung-cu",
  "images": ["url1", "url2"],
  "description": "Chung cư cao cấp, đầy đủ tiện nghi"
}
```

**2. PHÒNG TRỌ:**
```json
{
  "name": "Dãy A - Khu A",
  "address": {
    "street": "456 Đường DEF",
    "ward": "Phường GHI",
    "city": "Quận 2",
    "provinceCode": "79",
    "provinceName": "TP.HCM",
    "wardCode": "26735",
    "wardName": "Phường Thủ Thiêm"
  },
  "totalRooms": 20,
  "buildingType": "phong-tro",
  "images": ["url1", "url2"],
  "description": "Dãy nhà trọ mới xây"
}
```

**3. NHÀ NGUYÊN CĂN:**
```json
{
  "name": "Khu nhà phố XYZ",
  "address": {
    "street": "789 Đường JKL",
    "ward": "Phường MNO",
    "city": "Quận 3",
    "provinceCode": "79",
    "provinceName": "TP.HCM",
    "wardCode": "26736",
    "wardName": "Phường Võ Thị Sáu"
  },
  "totalRooms": 10,
  "buildingType": "nha-nguyen-can",
  "images": ["url1", "url2"],
  "description": "Khu nhà phố sang trọng"
}
```

#### **GET /api/landlord/buildings** - Lấy danh sách dãy nhà
**Response:**
```json
[
  {
    "buildingId": 1,
    "landlordId": 123,
    "name": "Dãy A - Khu A",
    "address": { /* ... */ },
    "totalRooms": 20,
    "buildingType": "phong-tro",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### **GET /api/landlord/buildings/:id** - Lấy thông tin dãy nhà
**Response:**
```json
{
  "buildingId": 1,
  "landlordId": 123,
  "name": "Dãy A - Khu A",
  "address": {
    "street": "123 Đường ABC",
    "ward": "Phường XYZ",
    "city": "Quận 1",
    "provinceCode": "79",
    "provinceName": "TP.HCM",
    "wardCode": "26734",
    "wardName": "Phường Bến Nghé"
  },
  "totalFloors": 5,
  "totalRooms": 20,
  "buildingType": "phong-tro",
  "images": ["url1", "url2"],
  "description": "Dãy nhà trọ mới xây",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### **PUT /api/landlord/buildings/:id** - Cập nhật dãy nhà
```json
{
  "name": "Dãy A - Khu A (Updated)",
  "description": "Mô tả mới",
  
}
```

#### **DELETE /api/landlord/buildings/:id** - Xóa dãy nhà
**Response:**
```json
{
  "message": "Building deleted successfully",
  "buildingId": 1
}
```

### **🏠 Room APIs**

#### **POST /api/landlord/rooms** - Tạo phòng mới
*Lưu ý: `category` sẽ được tự động lấy từ `buildingType` của building*

**1. CHUNG CƯ (Building có buildingType: "chung-cu"):**        
```json
{
  "buildingId": 1,
  "roomNumber": "A101",
  "area": 45,
  "price": 8000000,
  "deposit": 8000000,
  "furniture": "full",
  "chungCuInfo": {
    "buildingName": "Dãy nhà A",
    "blockOrTower": "Block A",
    "floorNumber": 1,
    "unitCode": "A101",
    "propertyType": "chung-cu",
    "bedrooms": 1,
    "bathrooms": 1,
    "direction": "nam",
    "legalStatus": "co-so-hong"
  },
  "utilities": {
    "electricityPricePerKwh": 3500,
    "waterPrice": 25000,
    "waterBillingType": "per-person",
    "internetFee": 200000,
    "garbageFee": 50000,
    "cleaningFee": 100000,
    "parkingMotorbikeFee": 100000,
    "parkingCarFee": 500000,
    "managementFee": 200000,
    "managementFeeUnit": "per-room",
    "includedInRent": {
      "electricity": false,
      "water": false,
      "internet": true,
      "garbage": true,
      "cleaning": false,
      "parkingMotorbike": true,
      "parkingCar": false,
      "managementFee": false
    }
  },
  "address": {
    "street": "123 Đường ABC",
    "ward": "Phường XYZ",
    "city": "Quận 1",
    "provinceCode": "79",
    "provinceName": "TP.HCM",
    "wardCode": "26734",
    "wardName": "Phường Bến Nghé"
  },
  "maxOccupancy": 2,
  "canShare": true,
  "sharePrice": 1500000,
  "currentOccupants": 0,
  "shareMethod": "equal",
  "estimatedMonthlyUtilities": 500000,
  "capIncludedAmount": 200000,
  "images": ["url1", "url2"],
  "videos": ["video1"],
  "description": "Căn hộ chung cư cao cấp, view thành phố đẹp"
}
```

**2. PHÒNG TRỌ (Building có buildingType: "phong-tro"):**
```json
{
  "buildingId": 2,
  "roomNumber": "B201",
  "area": 25,
  "price": 3000000,
  "deposit": 3000000,
  "furniture": "full",
  "utilities": {
    "electricityPricePerKwh": 3500,
    "waterPrice": 25000,
    "waterBillingType": "per-person",
    "internetFee": 200000,
    "garbageFee": 50000,
    "cleaningFee": 100000,
    "parkingMotorbikeFee": 100000,
    "parkingCarFee": 500000,
    "managementFee": 200000,
    "managementFeeUnit": "per-room",
    "includedInRent": {
      "electricity": false,
      "water": false,
      "internet": true,
      "garbage": true,
      "cleaning": false,
      "parkingMotorbike": true,
      "parkingCar": false,
      "managementFee": false
    }
  },
  "address": {
    "street": "123 Đường ABC",
    "ward": "Phường XYZ",
    "city": "Quận 1",
    "provinceCode": "79",
    "provinceName": "TP.HCM",
    "wardCode": "26734",
    "wardName": "Phường Bến Nghé"
  },
  "maxOccupancy": 2,
  "canShare": true,
  "sharePrice": 1500000,
  "currentOccupants": 0,
  "shareMethod": "equal",
  "estimatedMonthlyUtilities": 500000,
  "capIncludedAmount": 200000,
  "images": ["url1", "url2"],
  "videos": ["video1"],
  "description": "Phòng trọ đẹp, gần trung tâm"
}
```

**3. NHÀ NGUYÊN CĂN (Building có buildingType: "nha-nguyen-can"):**
```json
{
  "buildingId": 3,
  "roomNumber": "C301",
  "area": 120,
  "price": 15000000,
  "deposit": 15000000,
  "furniture": "full",
  "nhaNguyenCanInfo": {
    "khuLo": "Khu A",
    "unitCode": "C301",
    "propertyType": "nha-pho",
    "bedrooms": 3,
    "bathrooms": 2,
    "direction": "nam",
    "totalFloors": 3,
    "legalStatus": "co-so-hong",
    "features": ["Hẻm xe hơi", "Nhà nở hậu"],
    "landArea": 100,
    "usableArea": 120,
    "width": 5,
    "length": 20
  },
  "utilities": {
    "electricityPricePerKwh": 3500,
    "waterPrice": 25000,
    "waterBillingType": "per-person",
    "internetFee": 200000,
    "garbageFee": 50000,
    "cleaningFee": 100000,
    "parkingMotorbikeFee": 100000,
    "parkingCarFee": 500000,
    "managementFee": 200000,
    "managementFeeUnit": "per-room",
    "includedInRent": {
      "electricity": false,
      "water": false,
      "internet": true,
      "garbage": true,
      "cleaning": false,
      "parkingMotorbike": true,
      "parkingCar": false,
      "managementFee": false
    }
  },
  "address": {
    "street": "123 Đường ABC",
    "ward": "Phường XYZ",
    "city": "Quận 1",
    "provinceCode": "79",
    "provinceName": "TP.HCM",
    "wardCode": "26734",
    "wardName": "Phường Bến Nghé"
  },
  "maxOccupancy": 4,
  "canShare": true,
  "sharePrice": 4000000,
  "currentOccupants": 0,
  "shareMethod": "equal",
  "estimatedMonthlyUtilities": 1000000,
  "capIncludedAmount": 500000,
  "images": ["url1", "url2"],
  "videos": ["video1"],
  "description": "Nhà phố 3 tầng, đầy đủ tiện nghi, gần trung tâm"
}
```

#### **GET /api/landlord/rooms?buildingId=1** - Lấy danh sách phòng
**Response:**
```json
[
  {
    "roomId": 1,
    "landlordId": 123,
    "buildingId": 1,
    "roomNumber": "A101",
    "category": "phong-tro",
    "area": 25,
    "price": 3000000,
    "deposit": 3000000,
    "furniture": "full",
    "chungCuInfo": null,
    "nhaNguyenCanInfo": null,
    "maxOccupancy": 2,
    "canShare": true,
    "sharePrice": 1500000,
    "currentOccupants": 0,
    "availableSpots": 2,
    "shareMethod": "equal",
    "estimatedMonthlyUtilities": 500000,
    "capIncludedAmount": 200000,
    "currentTenants": [],
    "images": ["url1", "url2"],
    "videos": ["video1"],
    "description": "Phòng trọ đẹp, gần trung tâm",
    "status": "available",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### **GET /api/landlord/rooms/:id** - Lấy thông tin phòng
**Response:**
```json
{
  "roomId": 1,
  "landlordId": 123,
  "buildingId": 1,
  "roomNumber": "A101",
  "category": "phong-tro",
  "area": 25,
  "price": 3000000,
  "deposit": 3000000,
  "furniture": "full",
  "chungCuInfo": null,
  "nhaNguyenCanInfo": null,
  "utilities": {
    "electricityPricePerKwh": 3500,
    "waterPrice": 25000,
    "waterBillingType": "per-person",
    "internetFee": 200000,
    "garbageFee": 50000,
    "cleaningFee": 100000,
    "parkingMotorbikeFee": 100000,
    "parkingCarFee": 500000,
    "managementFee": 200000,
    "managementFeeUnit": "per-room",
    "includedInRent": {
      "electricity": false,
      "water": false,
      "internet": true,
      "garbage": true,
      "cleaning": false,
      "parkingMotorbike": true,
      "parkingCar": false,
      "managementFee": false
    }
  },
  "address": {
    "street": "123 Đường ABC",
    "ward": "Phường XYZ",
    "city": "Quận 1",
    "provinceCode": "79",
    "provinceName": "TP.HCM",
    "wardCode": "26734",
    "wardName": "Phường Bến Nghé"
  },
  "maxOccupancy": 2,
  "canShare": true,
  "sharePrice": 1500000,
  "currentOccupants": 0,
  "availableSpots": 2,
  "shareMethod": "equal",
  "estimatedMonthlyUtilities": 500000,
  "capIncludedAmount": 200000,
  "currentTenants": [],
  "images": ["url1", "url2"],
  "videos": ["video1"],
  "description": "Phòng trọ đẹp, gần trung tâm",
  "status": "available",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### **PUT /api/landlord/rooms/:id** - Cập nhật phòng
```json
{
  "price": 3500000,
  "description": "Mô tả mới",
  "maxOccupancy": 3,
  "sharePrice": 1200000
}
```

#### **DELETE /api/landlord/rooms/:id** - Xóa phòng
**Response:**
```json
{
  "message": "Room deleted successfully",
  "roomId": 1
}
```

#### **GET /api/public/rooms/search?keyword=phong&minPrice=2000000&maxPrice=5000000&category=phong-tro** - Tìm kiếm phòng công khai
**Response:**
```json
[
  {
    "roomId": 1,
    "roomNumber": "A101",
    "category": "phong-tro",
    "area": 25,
    "price": 3000000,
    "deposit": 3000000,
    "furniture": "full",
    "chungCuInfo": null,
    "nhaNguyenCanInfo": null,
    "maxOccupancy": 2,
    "canShare": true,
    "sharePrice": 1500000,
    "currentOccupants": 0,
    "availableSpots": 2,
    "images": ["url1", "url2"],
    "description": "Phòng trọ đẹp, gần trung tâm",
    "status": "available"
  }
]
```

#### **GET /api/public/rooms/:id** - Xem chi tiết phòng công khai
**Response:** (Tương tự GET /api/landlord/rooms/:id nhưng không có thông tin nhạy cảm)

### **👥 Roommate Management APIs**

#### **POST /api/landlord/rooms/:id/tenants** - Thêm người thuê vào phòng
```json
{
  "userId": 123,
  "fullName": "Nguyễn Văn A",
  "age": 25,
  "gender": "male",
  "occupation": "Developer",
  "moveInDate": "2024-01-01",
  "lifestyle": "normal",
  "cleanliness": "clean"
}
```

#### **DELETE /api/landlord/rooms/:id/tenants/:userId** - Xóa người thuê khỏi phòng
**Response:**
```json
{
  "message": "Tenant removed successfully",
  "roomId": 1,
  "userId": 123
}
```

#### **GET /api/landlord/rooms/:id/tenants** - Lấy danh sách người thuê
**Response:**
```json
[
  {
    "userId": 123,
    "fullName": "Nguyễn Văn A",
    "age": 25,
    "gender": "male",
    "occupation": "Developer",
    "moveInDate": "2024-01-01",
    "lifestyle": "normal",
    "cleanliness": "clean"
  },
  {
    "userId": 124,
    "fullName": "Trần Thị B",
    "age": 23,
    "gender": "female",
    "occupation": "Designer",
    "moveInDate": "2024-02-01",
    "lifestyle": "early",
    "cleanliness": "very_clean"
  }
]
```

## ⚠️ Important Notes

1. **Landlord Only**: Tất cả endpoints đều yêu cầu authentication và quyền landlord
2. **Building First**: Phải tạo dãy nhà trước khi tạo phòng
3. **Occupancy Limits**: Không thể thêm người vượt quá maxOccupancy
4. **Status Updates**: Tự động cập nhật availableSpots khi thay đổi occupancy
5. **Data Validation**: Tất cả input được validate trước khi lưu
6. **Image Upload**: Sử dụng S3 service cho upload ảnh/video

## 🔒 Security

- **JWT Authentication**: Required cho tất cả endpoints
- **Landlord Authorization**: Chỉ landlord mới có thể quản lý phòng của mình
- **Input Validation**: Validate tất cả input data
- **File Upload Security**: Validate file types và sizes

---

**Happy Room Managing! 🏠✨**
