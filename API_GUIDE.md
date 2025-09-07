# 📚 API Documentation - Nhà Chung Backend

> **Base URL**: `http://localhost:3001/api`  
> **Content-Type**: `application/json`  
> **Authentication**: Bearer Token (JWT)

## 🚀 Quick Start

### 1. Cài đặt và chạy Backend
```bash
# Clone repository
git clone <repository-url>
cd nha_chung_be

# Cài đặt dependencies
npm install

# Chạy server
npm run start:dev
```

### 2. Test API
```bash
# Test server
curl http://localhost:3001/api

# Test users endpoint
curl http://localhost:3001/api/users
```

---

## 🔐 Authentication

### Login Flow
```javascript
// 1. Đăng nhập
const loginResponse = await fetch('http://localhost:3001/api/users/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: '123456'
  })
});

const { access_token, user } = await loginResponse.json();

// 2. Lưu token
localStorage.setItem('token', access_token);

// 3. Sử dụng token cho các request tiếp theo
const headers = {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
};
```

### Token Usage
```javascript
// Axios interceptor example
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 👥 Users API

### 📋 Get All Users
```http
GET /api/users
```

**Response:**
```json
[
  {
    "userId": 1,
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "phone": "0123456789",
    "role": "user",
    "avatar": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### ➕ Create User
```http
POST /api/users
```

**Request Body:**
```json
{
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "password": "password123",
  "phone": "0123456789",
  "role": "user"
}
```

**Response:**
```json
{
  "userId": 1,
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "phone": "0123456789",
  "role": "user",
  "avatar": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 🔑 Login
```http
POST /api/users/login
```

**Request Body:**
```json
{
  "email": "nguyenvana@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": 1,
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "role": "user",
    "avatar": null,
    "phone": "0123456789"
  }
}
```

### 👤 Get User by ID
```http
GET /api/users/:id
```

**Response:**
```json
{
  "userId": 1,
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "phone": "0123456789",
  "role": "user",
  "avatar": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### ✏️ Update User
```http
PUT /api/users/:id
```

**Request Body:**
```json
{
  "name": "Nguyễn Văn A Updated",
  "phone": "0987654321"
}
```

### 🗑️ Delete User
```http
DELETE /api/users/:id
```

---

## 🏠 Rent Posts API

> **Lưu ý**: API đã được cập nhật để hỗ trợ 3 loại hình bất động sản: Phòng trọ, Chung cư, Nhà nguyên căn với cấu trúc dữ liệu linh hoạt.

### 📋 Get All Rent Posts
```http
GET /api/rent-posts
```

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `category` (optional): Filter by category (`phong-tro`, `chung-cu`, `nha-nguyen-can`)
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

**Examples:**
```http
# Lấy tất cả bài đăng
GET /api/rent-posts

# Lấy bài đăng theo user
GET /api/rent-posts?userId=1

# Lấy bài đăng theo loại
GET /api/rent-posts?category=phong-tro

# Lấy bài đăng phòng trọ của user
GET /api/rent-posts?userId=1&category=phong-tro
```

**Response:**
```json
[
  {
    "rentPostId": 1,
    "userId": 1,
    "title": "Phòng trọ đẹp gần trường đại học",
    "description": "Phòng trọ rộng rãi, thoáng mát, có đầy đủ tiện nghi cơ bản",
    "images": ["phong-tro-1.jpg", "phong-tro-2.jpg"],
    "videos": ["phong-tro-video.mp4"],
    "address": {
      "street": "Đường Nguyễn Văn Cừ",
      "ward": "Phường 4",
      "district": "Quận 5",
      "city": "TP.HCM",
      "houseNumber": "123/45",
      "showHouseNumber": true
    },
    "category": "phong-tro",
    "basicInfo": {
      "area": 25,
      "price": 3000000,
      "deposit": 3000000,
      "furniture": "co-ban",
      "bedrooms": 0,
      "bathrooms": 0,
      "direction": "",
      "legalStatus": ""
    },
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### ➕ Create Rent Posts

#### Create Phòng Trọ Post
```http
POST /api/rent-posts/phong-tro
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": "1",
  "title": "Phòng trọ đẹp gần trường đại học",
  "description": "Phòng trọ rộng rãi, thoáng mát, có đầy đủ tiện nghi cơ bản",
  "images": ["phong-tro-1.jpg", "phong-tro-2.jpg"],
  "videos": ["phong-tro-video.mp4"],
  "address": {
    "street": "Đường Nguyễn Văn Cừ",
    "ward": "Phường 4",
    "district": "Quận 5",
    "city": "TP.HCM",
    "houseNumber": "123/45",
    "showHouseNumber": true
  },
  "area": 25,
  "price": 3000000,
  "deposit": 3000000,
  "furniture": "co-ban",
  "status": "active"
}
```

#### Create Chung Cư Post
```http
POST /api/rent-posts/chung-cu
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": "1",
  "title": "Căn hộ chung cư cao cấp view sông",
  "description": "Căn hộ 2PN/2WC, view sông đẹp, nội thất đầy đủ, an ninh 24/7",
  "images": ["chung-cu-1.jpg", "chung-cu-2.jpg"],
  "videos": ["chung-cu-video.mp4"],
  "address": {
    "street": "Đường Võ Văn Kiệt",
    "ward": "Phường 1",
    "district": "Quận 1",
    "city": "TP.HCM",
    "houseNumber": "456",
    "showHouseNumber": true
  },
  "buildingInfo": {
    "buildingName": "Chung cư Diamond Plaza",
    "blockOrTower": "Tower A",
    "floorNumber": 15,
    "unitCode": "A15-03"
  },
  "area": 60,
  "price": 8000000,
  "deposit": 8000000,
  "furniture": "full",
  "bedrooms": 2,
  "bathrooms": 2,
  "direction": "nam",
  "propertyType": "chung-cu",
  "legalStatus": "co-so-hong",
  "status": "active"
}
```

#### Create Nhà Nguyên Căn Post
```http
POST /api/rent-posts/nha-nguyen-can
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": "1",
  "title": "Nhà phố 3 tầng đẹp, hẻm xe hơi",
  "description": "Nhà phố mới xây, thiết kế hiện đại, 4PN/3WC, có sân thượng",
  "images": ["nha-pho-1.jpg", "nha-pho-2.jpg"],
  "videos": ["nha-pho-video.mp4"],
  "address": {
    "street": "Đường Lê Văn Việt",
    "ward": "Phường Hiệp Phú",
    "district": "Quận 9",
    "city": "TP.HCM",
    "houseNumber": "789",
    "showHouseNumber": true
  },
  "propertyInfo": {
    "khuLo": "Khu A",
    "unitCode": "A-001",
    "propertyType": "nha-pho",
    "totalFloors": 3,
    "features": ["Hẻm xe hơi", "Nhà nở hậu"]
  },
  "landArea": 100,
  "usableArea": 200,
  "width": 5,
  "length": 20,
  "price": 15000000,
  "deposit": 15000000,
  "furniture": "full",
  "bedrooms": 4,
  "bathrooms": 3,
  "direction": "dong",
  "legalStatus": "co-so-hong",
  "status": "active"
}
```

### 👁️ Get Rent Post by ID
```http
GET /api/rent-posts/:id
```

**Response:**
```json
{
  "rentPostId": 1,
  "userId": 1,
  "title": "Phòng trọ đẹp gần trường đại học",
  "description": "Phòng trọ rộng rãi, thoáng mát, có đầy đủ tiện nghi cơ bản",
  "images": ["phong-tro-1.jpg", "phong-tro-2.jpg"],
  "videos": ["phong-tro-video.mp4"],
  "address": {
    "street": "Đường Nguyễn Văn Cừ",
    "ward": "Phường 4",
    "district": "Quận 5",
    "city": "TP.HCM",
    "houseNumber": "123/45",
    "showHouseNumber": true
  },
  "category": "phong-tro",
  "basicInfo": {
    "area": 25,
    "price": 3000000,
    "deposit": 3000000,
    "furniture": "co-ban",
    "bedrooms": 0,
    "bathrooms": 0,
    "direction": "",
    "legalStatus": ""
  },
  "status": "active",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### ✏️ Update Rent Post
```http
PUT /api/rent-posts/:id
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Tiêu đề đã cập nhật",
  "basicInfo": {
    "area": 30,
    "price": 4000000,
    "furniture": "full"
  }
}
```

### 🗑️ Delete Rent Post
```http
DELETE /api/rent-posts/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Xóa bài đăng thuê phòng thành công"
}
```

### 📊 Data Structure

> **⚠️ Lưu ý quan trọng**: Tất cả thông tin về giá thuê, diện tích, nội thất, v.v. đều nằm trong object `basicInfo`, không phải ở root level. Khi update, phải update trong `basicInfo`.

#### RentPost (Cấu trúc chính)
```typescript
{
  rentPostId: number;           // ID bài đăng
  userId: number;               // ID người dùng
  title: string;                // Tiêu đề
  description: string;          // Mô tả
  images: string[];             // Danh sách hình ảnh
  videos: string[];             // Danh sách video
  address: Address;             // Địa chỉ
  category: string;             // Loại: 'phong-tro', 'chung-cu', 'nha-nguyen-can'
  basicInfo: BasicInfo;         // Thông tin cơ bản (BẮT BUỘC)
  chungCuInfo?: ChungCuInfo;    // Thông tin chung cư (tùy chọn)
  nhaNguyenCanInfo?: NhaNguyenCanInfo; // Thông tin nhà nguyên căn (tùy chọn)
  status: string;               // Trạng thái: 'active', 'inactive'
  createdAt: Date;              // Ngày tạo
  updatedAt: Date;              // Ngày cập nhật
}
```

### 🖼️ Upload file S3 (Presigned URL)

> Quy trình: BE cấp presigned URL → FE/Postman PUT file lên S3 → dùng `publicUrl` lưu vào bài đăng.

1) Xin URL upload (POST)
```http
POST /api/files/presign
```

Body (JSON):
```json
{
  "userId": "1",
  "fileName": "hinh-anh.jpg",
  "contentType": "image/jpeg",
  "folder": "images" // hoặc "videos"
}
```

Response (200):
```json
{
  "key": "uploads/1/images/1717920000000-uuid.jpg",
  "uploadUrl": "https://s3.amazonaws.com/...signed-url...",
  "publicUrl": "https://<your-cdn-or-s3-domain>/uploads/1/images/1717920000000-uuid.jpg"
}
```

2) Tải file lên S3 (PUT)
```bash
curl -X PUT "<uploadUrl>" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/path/to/hinh-anh.jpg
```

Kết quả mong đợi: HTTP 200 OK.

3) Dùng `publicUrl` trong bài đăng
- Với ảnh: thêm vào mảng `images`
- Với video: thêm vào mảng `videos`

Ví dụ tạo bài đăng phòng trọ sau khi upload xong ảnh:
```json
{
  "userId": "1",
  "title": "Phòng trọ gần trường",
  "description": "Phòng thoáng mát",
  "images": [
    "https://<domain>/uploads/1/images/1717920000000-uuid.jpg"
  ],
  "videos": [],
  "address": {
    "street": "Đường ABC",
    "ward": "Phường XYZ",
    "district": "Quận 1",
    "city": "TP.HCM"
  },
  "area": 25,
  "price": 3000000,
  "furniture": "co-ban"
}
```

Lưu ý:
- `folder` nhận `images` hoặc `videos` để phân loại.
- Phải truyền đúng `Content-Type` khi PUT.
- Mở `publicUrl` trên trình duyệt thấy ảnh/vid hiển thị là ✅ thành công.

#### BasicInfo (Thông tin cơ bản - BẮT BUỘC)
```typescript
{
  area: number;                 // Diện tích (m²) - BẮT BUỘC
  price: number;                // Giá thuê (đ/tháng) - BẮT BUỘC
  deposit?: number;             // Số tiền cọc (đ)
  furniture?: string;           // Tình trạng nội thất: 'full', 'co-ban', 'trong'
  bedrooms?: number;            // Số phòng ngủ
  bathrooms?: number;           // Số phòng vệ sinh
  direction?: string;           // Hướng: 'dong', 'tay', 'nam', 'bac', etc.
  legalStatus?: string;         // Tình trạng sổ: 'co-so-hong', 'cho-so'
}
```

#### Address (Địa chỉ)
```typescript
{
  street: string;               // Đường - BẮT BUỘC
  ward: string;                 // Phường - BẮT BUỘC
  district: string;             // Quận/Huyện - BẮT BUỘC
  city: string;                 // Thành phố - BẮT BUỘC
  houseNumber?: string;         // Số nhà
  showHouseNumber?: boolean;    // Hiển thị số nhà
}
```

#### ChungCuInfo (Thông tin chung cư)
```typescript
{
  buildingName?: string;        // Tên tòa nhà/dự án
  blockOrTower?: string;        // Block/Tháp
  floorNumber?: number;         // Tầng số
  unitCode?: string;            // Mã căn
  propertyType?: string;        // Loại hình: 'chung-cu', 'can-ho-dv', 'officetel', 'studio'
}
```

#### NhaNguyenCanInfo (Thông tin nhà nguyên căn)
```typescript
{
  khuLo?: string;               // Tên khu/lô
  unitCode?: string;            // Mã căn
  propertyType?: string;        // Loại hình: 'nha-pho', 'biet-thu', 'nha-hem', 'nha-cap4'
  totalFloors?: number;         // Tổng số tầng
  landArea?: number;            // Diện tích đất (m²)
  usableArea?: number;          // Diện tích sử dụng (m²)
  width?: number;               // Chiều ngang (m)
  length?: number;              // Chiều dài (m)
  features?: string[];          // Đặc điểm nhà/đất
}
```

## 🤝 Roommate Posts API

### 📋 Get All Roommate Posts
```http
GET /api/roommate-posts
```

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
[
  {
    "postId": 1,
    "userId": 1,
    "title": "Tìm bạn ở ghép Quận 7",
    "description": "Cần tìm bạn ở ghép hoà đồng, gọn gàng",
    "images": ["https://example.com/roommate1.jpg"],
    "currentRoom": {
      "address": "456 Lê Văn Việt, Quận 7, TP.HCM",
      "price": 4000000,
      "area": 30,
      "description": "Có ban công, nội thất đầy đủ"
    },
    "personalInfo": {
      "age": 25,
      "gender": "male",
      "occupation": "Developer",
      "hobbies": ["đọc sách", "chơi game"],
      "habits": ["ngủ sớm", "dậy sớm"]
    },
    "requirements": {
      "ageRange": [20, 30],
      "gender": "any",
      "traits": ["gọn gàng", "hoà đồng"],
      "maxPrice": 2000000
    },
    "status": "searching",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### ➕ Create Roommate Post
```http
POST /api/roommate-posts
```

**Request Body:**
```json
{
  "userId": 1,
  "title": "Tìm bạn ở ghép Quận 7",
  "description": "Cần tìm bạn ở ghép hoà đồng, gọn gàng",
  "images": ["https://example.com/roommate1.jpg"],
  "currentRoom": {
    "address": "456 Lê Văn Việt, Quận 7, TP.HCM",
    "price": 4000000,
    "area": 30,
    "description": "Có ban công, nội thất đầy đủ"
  },
  "personalInfo": {
    "age": 25,
    "gender": "male",
    "occupation": "Developer",
    "hobbies": ["đọc sách", "chơi game"],
    "habits": ["ngủ sớm", "dậy sớm"]
  },
  "requirements": {
    "ageRange": [20, 30],
    "gender": "any",
    "traits": ["gọn gàng", "hoà đồng"],
    "maxPrice": 2000000
  }
}
```

**Validation Rules:**
- `userId`: Required, number
- `title`: Required, string, max 200 chars
- `description`: Required, string, max 1000 chars
- `personalInfo.age`: Required, number, min 18, max 100
- `personalInfo.gender`: Required, enum: ["male", "female", "other"]
- `requirements.ageRange`: Required, array of 2 numbers
- `requirements.gender`: Required, enum: ["male", "female", "any"]

---

## ❤️ Favourites API

### 📋 Get All Favourites
```http
GET /api/favourites
```

**Query Parameters:**
- `userId` (optional): Filter by user ID

**Response:**
```json
[
  {
    "favouriteId": 1,
    "userId": 1,
    "postType": "rent",
    "postId": 1,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### ➕ Add to Favourites
```http
POST /api/favourites
```

**Request Body:**
```json
{
  "userId": 1,
  "postType": "rent",
  "postId": 1
}
```

**Validation:**
- `postType`: Required, enum: ["rent", "roommate"]

### 🗑️ Remove from Favourites
```http
DELETE /api/favourites/user/:userId/post/:postType/:postId
```

**Example:**
```http
DELETE /api/favourites/user/1/post/rent/1
```

---

## 🛠️ Frontend Integration Examples

### React/Next.js Example
```javascript
// API service
class ApiService {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
    this.token = localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  // Users
  async login(email, password) {
    const result = await this.request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = result.access_token;
    localStorage.setItem('token', this.token);
    return result;
  }

  async getUsers() {
    return this.request('/users');
  }

  // Rent Posts
  async getRentPosts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/rent-posts${queryString ? `?${queryString}` : ''}`);
  }

  async getRentPostsByCategory(category, userId = null) {
    const queryString = userId ? `?userId=${userId}` : '';
    return this.request(`/rent-posts/${category}${queryString}`);
  }

  async createRentPost(data) {
    return this.request('/rent-posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createPhongTro(data) {
    return this.request('/rent-posts/phong-tro', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createChungCu(data) {
    return this.request('/rent-posts/chung-cu', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createNhaNguyenCan(data) {
    return this.request('/rent-posts/nha-nguyen-can', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRentPostById(id) {
    return this.request(`/rent-posts/${id}`);
  }

  async updateRentPost(id, data) {
    return this.request(`/rent-posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRentPost(id) {
    return this.request(`/rent-posts/${id}`, {
      method: 'DELETE',
    });
  }

  // Favourites
  async getFavourites(userId) {
    return this.request(`/favourites?userId=${userId}`);
  }

  async addFavourite(userId, postType, postId) {
    return this.request('/favourites', {
      method: 'POST',
      body: JSON.stringify({ userId, postType, postId }),
    });
  }
}

// Usage
const api = new ApiService();

// Login
const { user } = await api.login('user@example.com', 'password123');

// Get all rent posts
const allRentPosts = await api.getRentPosts({ page: 1, limit: 10 });

// Get posts by category
const phongTroPosts = await api.getRentPostsByCategory('phong-tro');
const chungCuPosts = await api.getRentPostsByCategory('chung-cu');
const nhaNguyenCanPosts = await api.getRentPostsByCategory('nha-nguyen-can');

// Get user's posts by category
const userPhongTroPosts = await api.getRentPostsByCategory('phong-tro', user.userId);

// Create different types of posts
const phongTroData = {
  userId: user.userId.toString(),
  title: "Phòng trọ đẹp gần trường đại học",
  description: "Phòng trọ rộng rãi, thoáng mát",
  address: {
    street: "Đường ABC",
    ward: "Phường XYZ",
    district: "Quận 1",
    city: "TP.HCM"
  },
  area: 25,
  price: 3000000,
  furniture: "co-ban"
};

const chungCuData = {
  userId: user.userId.toString(),
  title: "Căn hộ chung cư cao cấp",
  description: "Căn hộ 2PN/2WC, view đẹp",
  address: {
    street: "Đường DEF",
    ward: "Phường GHI",
    district: "Quận 2",
    city: "TP.HCM"
  },
  buildingInfo: {
    buildingName: "Chung cư ABC",
    blockOrTower: "Block A",
    floorNumber: 15,
    unitCode: "A15-03"
  },
  area: 60,
  price: 8000000,
  bedrooms: 2,
  bathrooms: 2,
  furniture: "full",
  propertyType: "chung-cu"
};

// Create posts
const phongTroPost = await api.createPhongTro(phongTroData);
const chungCuPost = await api.createChungCu(chungCuData);

// Get specific post
const post = await api.getRentPostById(phongTroPost.rentPostId);

// Update post
await api.updateRentPost(phongTroPost.rentPostId, {
  title: "Phòng trọ đã cập nhật",
  basicInfo: {
    price: 3500000,
    area: 30
  }
});

// Delete post
await api.deleteRentPost(phongTroPost.rentPostId);

// Add to favourites
await api.addFavourite(user.userId, 'rent', phongTroPost.rentPostId);
```

### Vue.js Example
```javascript
// composables/useApi.js
import { ref } from 'vue';

export function useApi() {
  const baseURL = 'http://localhost:3001/api';
  const token = ref(localStorage.getItem('token'));

  const request = async (endpoint, options = {}) => {
    const url = `${baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token.value && { Authorization: `Bearer ${token.value}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    return response.json();
  };

  const login = async (email, password) => {
    const result = await request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    token.value = result.access_token;
    localStorage.setItem('token', token.value);
    return result;
  };

  return {
    request,
    login,
    // ... other methods
  };
}
```

---

## 📝 Error Handling

### Common Error Responses
```json
// Validation Error (400)
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "email must be an email"
  ],
  "error": "Bad Request"
}

// Unauthorized (401)
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}

// Not Found (404)
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}

// Internal Server Error (500)
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

### Frontend Error Handling
```javascript
try {
  const data = await api.getUsers();
  // Handle success
} catch (error) {
  if (error.status === 401) {
    // Redirect to login
    router.push('/login');
  } else if (error.status === 400) {
    // Show validation errors
    setErrors(error.message);
  } else {
    // Show generic error
    showNotification('Có lỗi xảy ra, vui lòng thử lại');
  }
}
```

---

## 🔧 Development Tips

### 1. Environment Variables
```javascript
// .env.local (Frontend)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Nhà Chung
```

### 2. TypeScript Types
```typescript
// types/api.ts
export interface User {
  userId: number;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'landlord';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentPost {
  rentPostId: number;
  userId: number;
  title: string;
  description: string;
  images: string[];
  videos: string[];
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    houseNumber?: string;
    showHouseNumber?: boolean;
  };
  category: 'phong-tro' | 'chung-cu' | 'nha-nguyen-can';
  basicInfo: {
    area: number;
    price: number;
    deposit?: number;
    furniture?: string;
    bedrooms?: number;
    bathrooms?: number;
    direction?: string;
    legalStatus?: string;
  };
  chungCuInfo?: {
    buildingName?: string;
    blockOrTower?: string;
    floorNumber?: number;
    unitCode?: string;
    propertyType?: string;
  };
  nhaNguyenCanInfo?: {
    khuLo?: string;
    unitCode?: string;
    propertyType?: string;
    totalFloors?: number;
    landArea?: number;
    usableArea?: number;
    width?: number;
    length?: number;
    features?: string[];
  };
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreatePhongTroDto {
  userId: string;
  title: string;
  description: string;
  images?: string[];
  videos?: string[];
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    houseNumber?: string;
    showHouseNumber?: boolean;
  };
  area: number;
  price: number;
  deposit?: number;
  furniture?: string;
  status?: string;
}

export interface CreateChungCuDto {
  userId: string;
  title: string;
  description: string;
  images?: string[];
  videos?: string[];
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    houseNumber?: string;
    showHouseNumber?: boolean;
  };
  buildingInfo?: {
    buildingName?: string;
    blockOrTower?: string;
    floorNumber?: number;
    unitCode?: string;
  };
  area: number;
  price: number;
  deposit?: number;
  furniture?: string;
  bedrooms?: number;
  bathrooms?: number;
  direction?: string;
  propertyType?: string;
  legalStatus?: string;
  status?: string;
}

export interface CreateNhaNguyenCanDto {
  userId: string;
  title: string;
  description: string;
  images?: string[];
  videos?: string[];
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    houseNumber?: string;
    showHouseNumber?: boolean;
  };
  propertyInfo?: {
    khuLo?: string;
    unitCode?: string;
    propertyType?: string;
    totalFloors?: number;
    features?: string[];
  };
  landArea: number;
  usableArea?: number;
  width?: number;
  length?: number;
  price: number;
  deposit?: number;
  furniture?: string;
  bedrooms?: number;
  bathrooms?: number;
  direction?: string;
  legalStatus?: string;
  status?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}
```

### 3. Pagination
```javascript
// Backend pagination
const getRentPosts = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return api.request(`/rent-posts?page=${page}&limit=${limit}`);
};

// Frontend pagination state
const [posts, setPosts] = useState([]);
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);

const loadPosts = async (page) => {
  const data = await getRentPosts(page, 10);
  setPosts(data);
  setCurrentPage(page);
  setTotalPages(Math.ceil(data.total / 10));
};
```

---

## 🚀 Production Deployment

### Environment Variables
```bash
# Production .env
MONGO_URI=mongodb://your-production-db
PORT=3001
JWT_SECRET=your-super-secure-secret
NODE_ENV=production
```

### CORS Configuration
```javascript
// For production, update CORS in main.ts
app.enableCors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true,
});
```

---

## 📞 Support

- **Backend Issues**: Check server logs and database connection
- **API Questions**: Refer to this documentation
- **Frontend Integration**: Use the provided examples as starting points

**Happy Coding! 🎉**