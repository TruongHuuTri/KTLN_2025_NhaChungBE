# 📝 Posts API - Unified Posts System

> **Base URL**: `http://localhost:3001/api/posts`  
> **Content-Type**: `application/json`  
> **Authentication**: Bearer Token (JWT) for protected endpoints

## 📋 Overview

Hệ thống Posts thống nhất gộp **rent-posts** và **roommate-posts** thành một collection duy nhất với `postType` để phân biệt loại bài đăng.

### **🔄 Luồng tạo Post mới:**
1. **Chọn loại post**: `cho-thue` hoặc `tim-o-ghep`
2. **Chọn phòng**: từ danh sách phòng được filter theo loại post
   - **Cho thuê**: Chỉ hiển thị phòng trống hoàn toàn (`currentOccupants = 0`)
   - **Tìm ở ghép**: Chỉ hiển thị phòng có chỗ trống (`availableSpots > 0`) và cho phép ở ghép (`canShare = true`)
3. **Nhập thông tin**: tiêu đề, mô tả
4. **System tự động**:
   - Validate phòng có phù hợp với loại post không
   - Lấy thông tin phòng từ Room collection
   - Set `isManaged = true` và `source = 'room_management'`
   - Tự động set `category` từ room
   - Set `status = 'active'` (tự động duyệt)

### **💾 Lưu trữ dữ liệu:**
- ✅ **Post chỉ lưu `roomId`** (reference)
- ✅ **Khi hiển thị, JOIN với Room collection**
- ❌ **Không duplicate toàn bộ thông tin phòng**

### **🖼️ Xử lý Media (Ảnh/Video):**
- ✅ **Post có thể có `images`, `videos` riêng** (optional)
- ✅ **Nếu Post có media**: dùng media của Post
- ✅ **Nếu Post không có media**: dùng media của Room
- ✅ **Fallback logic**: Post media > Room media

### **✅ Validation Rules:**
- **Cho thuê (`cho-thue`)**:
  - Phòng phải trống hoàn toàn (`currentOccupants = 0`)
  - Phòng phải active và available
- **Tìm ở ghép (`tim-o-ghep`)**:
  - Phòng phải có chỗ trống (`availableSpots > 0`)
  - Phòng phải cho phép ở ghép (`canShare = true`)
  - Phòng phải active và available

## 🏗️ Data Structure

### **Post Schema**
```javascript
{
  postId: Number,           // Auto-increment
  userId: Number,           // Người đăng
  postType: String,         // 'cho-thue' | 'tim-o-ghep'
  
  // Thông tin bài đăng
  title: String,
  description: String,
  images: [String],        // Optional - nếu có thì dùng, không có thì lấy từ Room
  videos: [String],        // Optional - nếu có thì dùng, không có thì lấy từ Room
  
  // Liên kết với room (optional)
  roomId: Number,           // ID phòng (nếu từ room management)
  buildingId: Number,       // ID dãy nhà
  landlordId: Number,       // ID chủ trọ (nếu từ room management)
  isManaged: Boolean,       // true = từ room management
  source: String,           // 'room_management' | 'manual_post' | 'user_post'
  
  // Thông tin phòng (chỉ khi không có roomId)
  roomInfo: {
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

## 🔗 API Endpoints

### **1. Public Endpoints**

#### **GET /api/posts**
Lấy danh sách bài đăng

**Query Parameters:**
```javascript
{
  postType?: 'cho-thue' | 'tim-o-ghep',    // Lọc theo loại bài đăng
  userId?: number,                    // Lọc theo người đăng
  landlordId?: number,                // Lọc theo chủ trọ
  roomId?: number,                    // Lọc theo phòng
  isManaged?: boolean,                // Lọc theo nguồn
  source?: string,                    // Lọc theo nguồn
  status?: string                     // Lọc theo trạng thái
}
```

**Response:**
```javascript
[
  {
    "postId": 1,
    "userId": 123,
    "postType": "rent",
    "title": "Phòng trọ đẹp gần trường",
    "description": "Phòng trọ 25m², đầy đủ tiện nghi...",
    "images": ["image1.jpg", "image2.jpg"],
    "videos": [],
    "roomId": 456,
    "buildingId": 789,
    "landlordId": 101,
    "isManaged": true,
    "source": "room_management",
    "phone": "0123456789",
    "email": "landlord@example.com",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### **GET /api/posts/search**
Tìm kiếm bài đăng

**Query Parameters:**
```javascript
{
  postType?: 'rent' | 'roommate',
  keyword?: string,                   // Tìm kiếm trong title, description
  minPrice?: number,                  // Giá tối thiểu
  maxPrice?: number,                  // Giá tối đa
  gender?: string,                    // Giới tính (cho roommate posts)
  ageRange?: [number, number],        // Khoảng tuổi (cho roommate posts)
  location?: string                   // Địa điểm
}
```

#### **GET /api/posts/:id**
Lấy chi tiết bài đăng

**Response:**
```javascript
{
  "postId": 1,
  "userId": 123,
  "postType": "rent",
  "title": "Phòng trọ đẹp gần trường",
  "description": "Phòng trọ 25m², đầy đủ tiện nghi...",
  "images": ["image1.jpg", "image2.jpg"],
  "videos": [],
  "roomId": 456,
  "buildingId": 789,
  "landlordId": 101,
  "isManaged": true,
  "source": "room_management",
  "roomInfo": {
    "address": {
      "street": "123 Đường ABC",
      "ward": "Phường XYZ",
      "city": "Hà Nội",
      "provinceCode": "01",
      "provinceName": "Hà Nội"
    },
    "basicInfo": {
      "area": 25,
      "price": 3000000,
      "deposit": 3000000,
      "furniture": "full",
      "bedrooms": 1,
      "bathrooms": 1,
      "direction": "nam",
      "legalStatus": "co-so-hong"
    },
    "utilities": {
      "electricityPricePerKwh": 3500,
      "waterPrice": 25000,
      "internetFee": 200000,
      "garbageFee": 50000
    }
  },
  "phone": "0123456789",
  "email": "landlord@example.com",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### **GET /api/posts/:id/with-room**
Lấy bài đăng với thông tin phòng đầy đủ (cho managed posts)

**Response:**
```javascript
{
  "postId": 1,
  "userId": 123,
  "postType": "rent",
  "title": "Phòng trọ đẹp gần trường",
  "description": "Phòng trọ 25m², đầy đủ tiện nghi...",
  "roomId": 456,
  "isManaged": true,
  "roomInfo": {
    // Thông tin phòng đầy đủ từ rooms collection
    "roomId": 456,
    "landlordId": 101,
    "buildingId": 789,
    "roomNumber": "A101",
    "floor": 1,
    "area": 25,
    "price": 3000000,
    "maxOccupancy": 2,
    "canShare": true,
    "sharePrice": 1500000,
    "currentOccupants": 1,
    "availableSpots": 1,
    "currentTenants": [
      {
        "userId": 456,
        "fullName": "Nguyễn Văn A",
        "age": 25,
        "gender": "male",
        "occupation": "Developer",
        "moveInDate": "2024-01-01T00:00:00.000Z",
        "lifestyle": "normal",
        "cleanliness": "clean"
      }
    ],
    "address": { /* ... */ },
    "utilities": { /* ... */ }
  }
}
```

### **2. Protected Endpoints (Require Authentication)**

#### **GET /api/posts/user/rooms**
Lấy danh sách phòng của user để tạo post

**Headers:**
```javascript
{
  "Authorization": "Bearer <jwt_token>"
}
```

**Query Parameters:**
- `postType` (optional): `cho-thue` | `tim-o-ghep`
  - **Cho thuê**: Chỉ trả về phòng trống hoàn toàn
  - **Tìm ở ghép**: Chỉ trả về phòng có chỗ trống và cho phép ở ghép
  - **Không có**: Trả về tất cả phòng available

**Examples:**
```javascript
// Lấy tất cả phòng
GET /api/posts/user/rooms

// Lấy phòng cho thuê (chỉ phòng trống)
GET /api/posts/user/rooms?postType=cho-thue

// Lấy phòng tìm ở ghép (có chỗ trống + cho phép ở ghép)
GET /api/posts/user/rooms?postType=tim-o-ghep
```

**Response:**
```javascript
[
  {
    "roomId": 1,
    "buildingId": 1,
    "roomNumber": "A101",
    "floor": 1,
    "area": 25,
    "price": 3000000,
    "maxOccupancy": 2,
    "canShare": true,
    "sharePrice": 1500000,
    "currentOccupants": 0,
    "availableSpots": 2,
    "status": "available"
  }
]
```

#### **POST /api/posts**
Tạo bài đăng mới

**Validation:**
- **Cho thuê**: Phòng phải trống hoàn toàn (`currentOccupants = 0`)
- **Tìm ở ghép**: Phòng phải có chỗ trống (`availableSpots > 0`) và cho phép ở ghép (`canShare = true`)
- **Tự động duyệt**: `status = 'active'` (hiển thị ngay lập tức)

**Request Body:**
```javascript
{
  "postType": "cho-thue",             // 'cho-thue' | 'tim-o-ghep'
  "title": "Phòng trọ đẹp gần trường",
  "description": "Phòng trọ 25m², đầy đủ tiện nghi...",
  "images": ["image1.jpg", "image2.jpg"],
  "videos": [],
  "roomId": 456,                      // Required - chọn từ danh sách phòng
  "phone": "0123456789",
  "email": "landlord@example.com"
  // category sẽ tự động lấy từ room
}
```

**Error Responses:**
```javascript
// Phòng không trống cho thuê
{
  "statusCode": 400,
  "message": "Room must be completely empty to rent out",
  "error": "Bad Request"
}

// Phòng hết chỗ cho ở ghép
{
  "statusCode": 400,
  "message": "Room is full, no available spots",
  "error": "Bad Request"
}

// Phòng không cho phép ở ghép
{
  "statusCode": 400,
  "message": "Room does not allow sharing",
  "error": "Bad Request"
}
```

**Ví dụ 1: Tạo post cho thuê (có media riêng)**
```javascript
{
  "postType": "cho-thue",
  "title": "Phòng trọ A101 - Gần trường đại học",
  "description": "Phòng trọ 25m², đầy đủ tiện nghi, gần trường đại học...",
  "images": ["post1.jpg", "post2.jpg"],  // Media riêng cho post
  "videos": ["post_video.mp4"],
  "roomId": 456,                      // Chọn từ danh sách phòng
  "phone": "0123456789",
  "email": "landlord@example.com"
}
```

**Ví dụ 2: Tạo post cho thuê (dùng media của Room)**
```javascript
{
  "postType": "cho-thue",
  "title": "Phòng trọ A101 - Gần trường đại học",
  "description": "Phòng trọ 25m², đầy đủ tiện nghi, gần trường đại học...",
  // Không có images, videos - sẽ dùng từ Room
  "roomId": 456,                      // Chọn từ danh sách phòng
  "phone": "0123456789",
  "email": "landlord@example.com"
}
```

**Ví dụ 3: Tạo post tìm ở ghép**
```javascript
{
  "postType": "tim-o-ghep",
  "title": "Tìm bạn ở ghép phòng trọ",
  "description": "Mình đang tìm bạn ở ghép phòng trọ gần trường...",
  "roomId": 789,                      // Chọn từ danh sách phòng
  "personalInfo": {
    "fullName": "Nguyễn Văn A",
    "age": 25,
    "gender": "male",
    "occupation": "Developer",
    "lifestyle": "normal",
    "cleanliness": "clean"
  },
  "phone": "0123456789"
}
```

**Response:**
```javascript
{
  "postId": 1,
  "userId": 123,
  "postType": "rent",
  "title": "Phòng trọ đẹp gần trường",
  "description": "Phòng trọ 25m², đầy đủ tiện nghi...",
  "isManaged": false,
  "source": "manual_post",
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### **GET /api/posts/user/my-posts**
Lấy bài đăng của user hiện tại

**Response:**
```javascript
[
  {
    "postId": 1,
    "postType": "rent",
    "title": "Phòng trọ đẹp gần trường",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### **PUT /api/posts/:id**
Cập nhật bài đăng

**Request Body:**
```javascript
{
  "title": "Phòng trọ đẹp gần trường - UPDATED",
  "description": "Mô tả mới...",
  "images": ["new_image.jpg"]
}
```

#### **DELETE /api/posts/:id**
Xóa bài đăng (chuyển status thành 'inactive')

### **3. Landlord Endpoints**

#### **GET /api/landlord/posts**
Lấy bài đăng của landlord

**Response:**
```javascript
[
  {
    "postId": 1,
    "postType": "rent",
    "title": "Phòng trọ đẹp gần trường",
    "roomId": 456,
    "isManaged": true,
    "source": "room_management",
    "status": "active"
  }
]
```

#### **GET /api/landlord/posts/room/:roomId**
Lấy bài đăng theo phòng

### **4. Admin Endpoints**

#### **PUT /api/posts/:id/status**
Cập nhật trạng thái bài đăng (Admin only)

**Request Body:**
```javascript
{
  "status": "approved"  // 'pending', 'active', 'inactive', 'rejected'
}
```

## 🔍 Search & Filter Examples

### **Tìm phòng thuê:**
```bash
GET /api/posts/search?postType=rent&minPrice=2000000&maxPrice=5000000&location=Hà Nội
```

### **Tìm người ở ghép:**
```bash
GET /api/posts/search?postType=roommate&gender=male&ageRange=20,30&maxPrice=2000000
```

### **Tìm bài đăng theo từ khóa:**
```bash
GET /api/posts/search?keyword=phòng trọ&postType=rent
```

## 🚀 Frontend Integration

### **Luồng giao diện mới:**

#### **1. Chọn loại post:**
```javascript
// User chọn loại post
const [postType, setPostType] = useState('cho-thue'); // 'cho-thue' | 'tim-o-ghep'
```

#### **2. Lấy danh sách phòng được filter:**
```javascript
// Lấy phòng theo loại post
const getFilteredRooms = async (postType) => {
  const response = await fetch(`/api/posts/user/rooms?postType=${postType}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Sử dụng
const rooms = await getFilteredRooms('cho-thue'); // Chỉ phòng trống
const rooms = await getFilteredRooms('tim-o-ghep'); // Chỉ phòng có chỗ trống + cho phép ở ghép
```

#### **3. Hiển thị phòng phù hợp:**
```javascript
// Cho thuê - chỉ hiển thị phòng trống
{rooms.map(room => (
  <div key={room.roomId}>
    <h3>{room.roomNumber}</h3>
    <p>✅ Phòng trống ({room.currentOccupants}/{room.maxOccupancy})</p>
    <button onClick={() => selectRoom(room)}>Chọn phòng này</button>
  </div>
))}

// Tìm ở ghép - chỉ hiển thị phòng có chỗ trống
{rooms.map(room => (
  <div key={room.roomId}>
    <h3>{room.roomNumber}</h3>
    <p>✅ Có chỗ trống ({room.availableSpots} chỗ)</p>
    <p>✅ Cho phép ở ghép</p>
    <button onClick={() => selectRoom(room)}>Chọn phòng này</button>
  </div>
))}
```

#### **4. Tạo post với validation:**
```javascript
// Create post
const createPost = async (postData) => {
  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(postData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return response.json();
  } catch (error) {
    // Handle validation errors
    if (error.message.includes('completely empty')) {
      alert('Phòng phải trống hoàn toàn để cho thuê');
    } else if (error.message.includes('no available spots')) {
      alert('Phòng đã hết chỗ trống');
    } else if (error.message.includes('does not allow sharing')) {
      alert('Phòng không cho phép ở ghép');
    }
  }
};
```

### **React/Next.js Example:**
```javascript
// Search posts
const searchPosts = async (filters) => {
  const response = await fetch(`/api/posts/search?${new URLSearchParams(filters)}`);
  return response.json();
};

// Get post with room info
const getPostWithRoomInfo = async (postId) => {
  const response = await fetch(`/api/posts/${postId}/with-room`);
  return response.json();
};
```

### **Vue.js Example:**
```javascript
// Vue Composition API
import { ref, onMounted } from 'vue';

export default {
  setup() {
    const posts = ref([]);
    const loading = ref(false);

    const fetchPosts = async (filters = {}) => {
      loading.value = true;
      try {
        const params = new URLSearchParams(filters);
        const response = await fetch(`/api/posts/search?${params}`);
        posts.value = await response.json();
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchPosts({ postType: 'rent' });
    });

    return {
      posts,
      loading,
      fetchPosts
    };
  }
};
```

## 📊 Migration from Old System

### **From rent-posts:**
```javascript
// Old rent-post data
{
  "rentPostId": 1,
  "userId": 123,
  "title": "Phòng trọ đẹp",
  "address": { /* ... */ },
  "basicInfo": { /* ... */ }
}

// New post data
{
  "postId": 1,
  "userId": 123,
  "postType": "rent",
  "title": "Phòng trọ đẹp",
  "roomInfo": {
    "address": { /* ... */ },
    "basicInfo": { /* ... */ }
  },
  "isManaged": false,
  "source": "manual_post"
}
```

### **From roommate-posts:**
```javascript
// Old roommate-post data
{
  "roommatePostId": 1,
  "userId": 123,
  "title": "Tìm người ở ghép",
  "currentRoom": { /* ... */ },
  "personalInfo": { /* ... */ }
}

// New post data
{
  "postId": 1,
  "userId": 123,
  "postType": "tim-o-ghep",
  "title": "Tìm người ở ghép",
  "roomInfo": {
    "address": { /* ... */ },
    "basicInfo": { /* ... */ }
  },
  "personalInfo": { /* ... */ },
  "isManaged": false,
  "source": "user_post"
}
```

## 📊 Complete API List

### **📝 Public Posts APIs**

#### **GET /api/posts** - Lấy danh sách bài đăng
**Query Parameters:**
- `postType`: 'rent' | 'roommate'
- `keyword`: string
- `minPrice`: number
- `maxPrice`: number
- `gender`: string
- `ageRange`: number[]
- `location`: string

**Response:**
```json
[
  {
    "postId": 1,
    "userId": 123,
    "postType": "rent",
    "title": "Phòng trọ đẹp gần trung tâm",
    "description": "Phòng trọ mới xây, đầy đủ tiện nghi...",
    "images": ["url1", "url2"],
    "videos": ["video1"],
    "roomId": 1,
    "buildingId": 1,
    "landlordId": 456,
    "isManaged": true,
    "source": "room_management",
    "roomInfo": {
      "address": {
        "street": "123 Đường ABC",
        "ward": "Phường XYZ",
        "city": "Quận 1"
      },
      "basicInfo": {
        "area": 25,
        "price": 3000000,
        "deposit": 3000000,
        "furniture": "full",
        "bedrooms": 1,
        "bathrooms": 1
      }
    },
    "phone": "0123456789",
    "email": "landlord@example.com",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### **GET /api/posts/search** - Tìm kiếm bài đăng
**Query Parameters:** (Tương tự GET /api/posts)

**Response:** (Tương tự GET /api/posts)

#### **GET /api/posts/:id** - Lấy chi tiết bài đăng
**Response:**
```json
{
  "postId": 1,
  "userId": 123,
  "postType": "rent",
  "title": "Phòng trọ đẹp gần trung tâm",
  "description": "Phòng trọ mới xây, đầy đủ tiện nghi...",
  "images": ["url1", "url2"],
  "videos": ["video1"],
  "roomId": 1,
  "buildingId": 1,
  "landlordId": 456,
  "isManaged": true,
  "source": "room_management",
  "roomInfo": {
    "address": {
      "street": "123 Đường ABC",
      "ward": "Phường XYZ",
      "city": "Quận 1",
      "provinceCode": "79",
      "provinceName": "TP.HCM",
      "wardCode": "26734",
      "wardName": "Phường Bến Nghé"
    },
    "basicInfo": {
      "area": 25,
      "price": 3000000,
      "deposit": 3000000,
      "furniture": "full",
      "bedrooms": 1,
      "bathrooms": 1,
      "direction": "dong",
      "legalStatus": "co-so-hong"
    },
    "utilities": {
      "electricityPricePerKwh": 3500,
      "waterPrice": 25000,
      "internetFee": 200000,
      "garbageFee": 50000
    }
  },
  "phone": "0123456789",
  "email": "landlord@example.com",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### **GET /api/posts/:id/room-info** - Lấy thông tin phòng từ bài đăng
**Response:**
```json
{
  "roomId": 1,
  "roomNumber": "A101",
  "floor": 1,
  "area": 25,
  "price": 3000000,
  "deposit": 3000000,
  "furniture": "full",
  "bedrooms": 1,
  "bathrooms": 1,
  "direction": "dong",
  "legalStatus": "co-so-hong",
  "maxOccupancy": 2,
  "canShare": true,
  "sharePrice": 1500000,
  "currentOccupants": 0,
  "availableSpots": 2,
  "images": ["url1", "url2"],
  "description": "Phòng trọ đẹp, gần trung tâm"
}
```

### **👤 Posts APIs**

#### **POST /api/posts** - Tạo bài đăng mới

**1. CHUNG CƯ (Rent Post):**
```json
{
  "postType": "cho-thue",
  "title": "Căn hộ chung cư cao cấp, view thành phố đẹp",
  "description": "Căn hộ chung cư mới xây, đầy đủ tiện nghi, view thành phố tuyệt đẹp...",
  "images": ["url1", "url2"],
  "videos": ["video1"],
  "roomId": 1,
  "phone": "0123456789",
  "email": "user@example.com"
}
```

**2. PHÒNG TRỌ (Rent Post):**
```json
{
  "postType": "cho-thue",
  "title": "Phòng trọ đẹp gần trung tâm",
  "description": "Phòng trọ mới xây, đầy đủ tiện nghi...",
  "images": ["url1", "url2"],
  "videos": ["video1"],
  "roomId": 1,
  "phone": "0123456789",
  "email": "user@example.com"
}
```

**3. NHÀ NGUYÊN CĂN (Rent Post):**
```json
{
  "postType": "cho-thue",
  "title": "Nhà phố 3 tầng cho thuê",
  "description": "Nhà phố 3 tầng, đầy đủ tiện nghi, gần trung tâm...",
  "images": ["url1", "url2"],
  "videos": ["video1"],
  "roomId": 1,
  "phone": "0123456789",
  "email": "user@example.com"
}
```

**4. Ở GHÉP (Roommate Post):**
```json
{
  "postType": "tim-o-ghep",
  "title": "Tìm người ở ghép phòng A101",
  "description": "Tìm người ở ghép phòng 2 người...",
  "images": ["url1", "url2"],
  "roomId": 1,
  "personalInfo": {
    "fullName": "Nguyễn Văn A",
    "age": 25,
    "gender": "male",
    "occupation": "Developer",
    "hobbies": ["đọc sách", "xem phim"],
    "habits": ["dậy sớm", "tập thể dục"],
    "lifestyle": "normal",
    "cleanliness": "clean"
  },
  "requirements": {
    "ageRange": [20, 30],
    "gender": "any",
    "traits": ["sạch sẽ", "yên tĩnh"],
    "maxPrice": 2000000
  },
  "phone": "0123456789",
  "email": "user@example.com"
}
```

#### **GET /api/posts/user/my-posts** - Lấy bài đăng của tôi
**Response:**
```json
[
  {
    "postId": 1,
    "userId": 123,
    "postType": "rent",
    "title": "Phòng trọ đẹp gần trung tâm",
    "description": "Phòng trọ mới xây, đầy đủ tiện nghi...",
    "images": ["url1", "url2"],
    "roomId": 1,
    "isManaged": true,
    "source": "room_management",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### **PUT /api/posts/:id** - Cập nhật bài đăng
```json
{
  "title": "Phòng trọ đẹp gần trung tâm (Updated)",
  "description": "Mô tả mới...",
  "images": ["url1", "url2", "url3"]
}
```

#### **DELETE /api/posts/:id** - Xóa bài đăng
**Response:**
```json
{
  "message": "Post deleted successfully",
  "postId": 1
}
```

### **🏠 Landlord Posts APIs**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/landlord/posts` | Lấy bài đăng của landlord | ✅ Landlord |
| GET | `/api/landlord/posts/room/:roomId` | Lấy bài đăng theo phòng | ✅ Landlord |

**Lưu ý:** 
- **Tạo bài đăng**: Dùng chung `POST /api/posts` (cả user và landlord)
- **Cập nhật/Xóa bài đăng**: Dùng chung `PUT/DELETE /api/posts/:id` (FE phân quyền theo role)

### **👨‍💼 Admin Posts APIs**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/posts` | Lấy tất cả bài đăng | ✅ Admin |
| GET | `/api/admin/posts/pending` | Lấy bài đăng chờ duyệt | ✅ Admin |
| PUT | `/api/admin/posts/:id/approve` | Duyệt bài đăng | ✅ Admin |
| PUT | `/api/admin/posts/:id/reject` | Từ chối bài đăng | ✅ Admin |
| DELETE | `/api/admin/posts/:id` | Xóa bài đăng | ✅ Admin |

## ⚠️ Important Notes

1. **Post Type Required**: Mọi bài đăng phải có `postType` ('rent' | 'roommate')
2. **Room Management**: Nếu có `roomId`, hệ thống tự động set `isManaged = true`
3. **Room Info**: Chỉ lưu `roomInfo` khi không có `roomId` (đăng bài tự do)
4. **Personal Info**: Chỉ có khi `postType = 'roommate'`
5. **Requirements**: Chỉ có khi `postType = 'roommate'`
6. **Status Management**: Admin có thể approve/reject bài đăng
7. **Search Optimization**: Sử dụng indexes cho performance tốt

## 🔒 Security

- **Authentication**: Required cho tất cả protected endpoints
- **Authorization**: User chỉ có thể edit/delete bài đăng của mình
- **Admin Override**: Admin có thể quản lý tất cả bài đăng
- **Input Validation**: Tất cả input được validate trước khi lưu

## 🔄 Recent Updates

### **Validation & Filtering (Latest)**
- ✅ **Room Validation**: Kiểm tra phòng trống dựa trên loại post
- ✅ **Smart Filtering**: API lấy phòng được filter theo loại post
- ✅ **Auto Approval**: Bài đăng tự động active (không cần admin duyệt)
- ✅ **Error Handling**: Thông báo lỗi rõ ràng cho từng trường hợp

### **New Features:**
- **GET /posts/user/rooms?postType=cho-thue**: Chỉ phòng trống hoàn toàn
- **GET /posts/user/rooms?postType=tim-o-ghep**: Chỉ phòng có chỗ trống + cho phép ở ghép
- **Validation Rules**: 
  - Cho thuê: `currentOccupants = 0`
  - Tìm ở ghép: `availableSpots > 0` AND `canShare = true`
- **Auto Status**: `status = 'active'` (hiển thị ngay lập tức)

---

**Happy Posting! 📝✨**
