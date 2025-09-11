# 🏠 Rent Posts API

> **Lưu ý**: API đã được cập nhật để hỗ trợ 3 loại hình bất động sản: Phòng trọ, Chung cư, Nhà nguyên căn với cấu trúc dữ liệu linh hoạt.

## 📋 Get All Rent Posts
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
      "city": "Thành phố Hồ Chí Minh",
      "specificAddress": "123/45A",
      "showSpecificAddress": true,
      "provinceCode": "79",
      "provinceName": "Thành phố Hồ Chí Minh",
      "wardCode": "26734",
      "wardName": "Phường 4",
      "additionalInfo": "Gần chợ Bình Tây, tiện đi lại"
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

## ➕ Create Rent Posts

### Create Phòng Trọ Post
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
    "city": "Thành phố Hồ Chí Minh",
    "specificAddress": "123/45A",
    "showSpecificAddress": true,
    "provinceCode": "79",
    "provinceName": "Thành phố Hồ Chí Minh",
    "wardCode": "26734",
    "wardName": "Phường 4",
    "additionalInfo": "Gần chợ Bình Tây, tiện đi lại"
  },
  "utilities": {
    "electricityPricePerKwh": 3500,
    "waterPrice": 20000,
    "waterBillingType": "per_m3",
    "internetFee": 150000,
    "garbageFee": 20000,
    "cleaningFee": 0,
    "parkingMotorbikeFee": 100000,
    "cookingGasFee": 0,
    "includedInRent": {
      "electricity": false,
      "water": false,
      "internet": true,
      "garbage": true,
      "cleaning": false,
      "parkingMotorbike": false
    }
  },
  "area": 25,
  "price": 3000000,
  "deposit": 3000000,
  "furniture": "co-ban",
  "status": "active"
}
```

### Create Chung Cư Post
```http
POST /api/rent-posts/chung-cu
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": 1,
  "title": "Căn hộ chung cư cao cấp view sông",
  "description": "Căn hộ 2PN/2WC, view sông đẹp, nội thất đầy đủ, an ninh 24/7",
  "images": ["chung-cu-1.jpg", "chung-cu-2.jpg"],
  "videos": ["chung-cu-video.mp4"],
  "address": {
    "street": "Đường Võ Văn Kiệt",
    "ward": "Phường 1",
    "city": "Thành phố Hồ Chí Minh",
    "specificAddress": "456/12B",
    "showSpecificAddress": true,
    "provinceCode": "79",
    "provinceName": "Thành phố Hồ Chí Minh",
    "wardCode": "26701",
    "wardName": "Phường 1",
    "additionalInfo": "Gần trung tâm thành phố, tiện đi lại"
  },
  "utilities": {
    "electricityPricePerKwh": 3500,
    "waterPrice": 20000,
    "waterBillingType": "per_m3",
    "internetFee": 200000,
    "garbageFee": 30000,
    "cleaningFee": 0,
    "parkingMotorbikeFee": 100000,
    "parkingCarFee": 1200000,
    "managementFee": 15000,
    "managementFeeUnit": "per_m2_per_month",
    "includedInRent": {
      "electricity": false,
      "water": false,
      "internet": false,
      "garbage": false,
      "cleaning": false,
      "parkingMotorbike": false,
      "parkingCar": false,
      "managementFee": false
    }
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

### Create Nhà Nguyên Căn Post
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
    "city": "Thành phố Hồ Chí Minh",
    "specificAddress": "789/34C",
    "showSpecificAddress": true,
    "provinceCode": "79",
    "provinceName": "Thành phố Hồ Chí Minh",
    "wardCode": "26914",
    "wardName": "Phường Hiệp Phú",
    "additionalInfo": "Hẻm xe hơi, gần trường học"
  },
  "utilities": {
    "electricityPricePerKwh": 3500,
    "waterPrice": 20000,
    "waterBillingType": "per_person",
    "internetFee": 200000,
    "garbageFee": 30000,
    "cleaningFee": 0,
    "parkingMotorbikeFee": 100000,
    "parkingCarFee": 800000,
    "managementFee": 0,
    "managementFeeUnit": "per_month",
    "gardeningFee": 100000,
    "includedInRent": {
      "electricity": false,
      "water": false,
      "internet": false,
      "garbage": false,
      "cleaning": false,
      "parkingMotorbike": false,
      "parkingCar": false,
      "managementFee": false
    }
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

## 👁️ Get Rent Post by ID
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
    "city": "Thành phố Hồ Chí Minh",
    "specificAddress": "123/45A",
    "showSpecificAddress": true
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

## ✏️ Update Rent Post
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

## 🗑️ Delete Rent Post
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

## 🖼️ Upload file S3 (Presigned URL)

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
    "city": "Thành phố Hồ Chí Minh"
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

## 📊 Data Structure

> **⚠️ Lưu ý quan trọng**: Tất cả thông tin về giá thuê, diện tích, nội thất, v.v. đều nằm trong object `basicInfo`, không phải ở root level. Khi update, phải update trong `basicInfo`.

### RentPost (Cấu trúc chính)
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

### BasicInfo (Thông tin cơ bản - BẮT BUỘC)
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

### Address (Địa chỉ)
```typescript
{
  street?: string;              // Đường - TÙY CHỌN
  ward: string;                 // Phường - BẮT BUỘC
  district: string;             // Quận/Huyện - BẮT BUỘC
  city: string;                 // Thành phố - BẮT BUỘC
  specificAddress?: string;     // Địa chỉ cụ thể
  showSpecificAddress?: boolean; // Hiển thị địa chỉ cụ thể
}
```

### ChungCuInfo (Thông tin chung cư)
```typescript
{
  buildingName?: string;        // Tên tòa nhà/dự án
  blockOrTower?: string;        // Block/Tháp
  floorNumber?: number;         // Tầng số
  unitCode?: string;            // Mã căn
  propertyType?: string;        // Loại hình: 'chung-cu', 'can-ho-dv', 'officetel', 'studio'
}
```

### NhaNguyenCanInfo (Thông tin nhà nguyên căn)
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

## ⚡ Utilities (Phí điện, nước và dịch vụ)

### Cấu trúc chung
```json
{
  "utilities": {
    "electricityPricePerKwh": 3500,
    "waterPrice": 20000,
    "waterBillingType": "per_m3",
    "internetFee": 150000,
    "garbageFee": 20000,
    "cleaningFee": 0,
    "parkingMotorbikeFee": 100000,
    "parkingCarFee": 1200000,
    "managementFee": 15000,
    "managementFeeUnit": "per_m2_per_month",
    "gardeningFee": 0,
    "cookingGasFee": 0,
    "includedInRent": {
      "electricity": false,
      "water": false,
      "internet": true,
      "garbage": true,
      "cleaning": false,
      "parkingMotorbike": false,
      "parkingCar": false,
      "managementFee": false
    }
  }
}
```

### Áp dụng theo loại bài đăng
- Phòng trọ (`phong-tro`): dùng các trường chung; có thêm `cookingGasFee`; không dùng `parkingCarFee`, `managementFee`, `managementFeeUnit` (sẽ bị bỏ qua nếu gửi).
- Chung cư (`chung-cu`): dùng các trường chung; bổ sung `parkingCarFee`, `managementFee`, `managementFeeUnit` và `includedInRent.parkingCar`, `includedInRent.managementFee`.
- Nhà nguyên căn (`nha-nguyen-can`): dùng các trường chung; bổ sung `parkingCarFee`, `managementFee`, `managementFeeUnit`, `gardeningFee`.

### Ghi chú
- `waterBillingType`: `per_m3` (tính theo m3) hoặc `per_person` (tính theo đầu người).
- `managementFeeUnit` (chung cư/nhà nguyên căn): `per_month` hoặc `per_m2_per_month`.
- `includedInRent.*`: đánh dấu chi phí đã bao gồm trong giá thuê.
