# 🤝 Roommate Posts API

> **Lưu ý**: API đã được cập nhật để hỗ trợ đầy đủ các field từ form frontend, bao gồm thông tin liên hệ, video, thói quen sinh hoạt và các thông tin chi tiết khác.

## 📋 Get All Roommate Posts
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
    "userId": 1,
    "title": "Tìm bạn ở ghép phòng 2 người tại Quận 1",
    "description": "Mình là sinh viên năm 3, sạch sẽ, yên tĩnh, muốn tìm bạn ở ghép cùng phòng. Phòng rộng rãi, có đầy đủ tiện nghi.",
    "images": ["https://example.com/roommate1.jpg", "https://example.com/roommate2.jpg"],
    "video": "https://example.com/intro_video.mp4",
    "currentRoom": {
      "address": {
        "street": "Đường Nguyễn Huệ",
        "ward": "Phường Bến Nghé",
        "city": "Thành phố Hồ Chí Minh",
        "specificAddress": "123/45A",
        "showSpecificAddress": true,
        "provinceCode": "79",
        "provinceName": "Thành phố Hồ Chí Minh",
        "wardCode": "26701",
        "wardName": "Phường Bến Nghé",
        "additionalInfo": "Gần trung tâm thành phố, tiện đi lại"
      },
      "price": 3000000,
      "area": 25,
      "description": "Phòng 2 người, có điều hòa, wifi, nước nóng",
      "roomType": "double",
      "currentOccupants": 1,
      "remainingDuration": "6-12 months"
    },
    "personalInfo": {
      "fullName": "Nguyễn Văn A",
      "age": 22,
      "gender": "male",
      "occupation": "Sinh viên",
      "hobbies": ["Đọc sách", "Xem phim", "Thể thao"],
      "habits": ["Dậy sớm", "Tập thể dục"],
      "lifestyle": "early",
      "cleanliness": "very_clean"
    },
    "requirements": {
      "ageRange": [20, 25],
      "gender": "any",
      "traits": ["Hòa đồng", "Sạch sẽ", "Yên tĩnh"],
      "maxPrice": 4000000
    },
    "phone": "0123456789",
    "email": "test@example.com",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

## ➕ Create Roommate Post
```http
POST /api/roommate-posts
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "userId": "1",
  "title": "Tìm bạn ở ghép phòng 2 người tại Quận 1",
  "description": "Mình là sinh viên năm 3, sạch sẽ, yên tĩnh, muốn tìm bạn ở ghép cùng phòng. Phòng rộng rãi, có đầy đủ tiện nghi.",
  "images": ["https://example.com/roommate1.jpg", "https://example.com/roommate2.jpg"],
  "video": "https://example.com/intro_video.mp4",
  "currentRoom": {
    "address": {
      "street": "Đường Nguyễn Huệ",
      "ward": "Phường Bến Nghé",
      "city": "Thành phố Hồ Chí Minh",
      "specificAddress": "123/45A",
      "showSpecificAddress": true,
      "provinceCode": "79",
      "provinceName": "Thành phố Hồ Chí Minh",
      "wardCode": "26701",
      "wardName": "Phường Bến Nghé",
      "additionalInfo": "Gần trung tâm thành phố, tiện đi lại"
    },
    "price": 3000000,
    "area": 25,
    "description": "Phòng 2 người, có điều hòa, wifi, nước nóng",
    "roomType": "double",
    "currentOccupants": 1,
    "remainingDuration": "6-12 months",
    "shareMethod": "split_evenly",
    "estimatedMonthlyUtilities": 500000,
    "capIncludedAmount": 0,
    "electricityPricePerKwh": 3500,
    "waterPrice": 20000,
    "waterBillingType": "per_m3",
    "internetFee": 150000,
    "garbageFee": 20000,
    "cleaningFee": 0
  },
  "personalInfo": {
    "fullName": "Nguyễn Văn A",
    "age": 22,
    "gender": "male",
    "occupation": "Sinh viên",
    "hobbies": ["Đọc sách", "Xem phim", "Thể thao"],
    "habits": ["Dậy sớm", "Tập thể dục"],
    "lifestyle": "early",
    "cleanliness": "very_clean"
  },
  "requirements": {
    "ageRange": [20, 25],
    "gender": "any",
    "traits": ["Hòa đồng", "Sạch sẽ", "Yên tĩnh"],
    "maxPrice": 4000000
  },
  "phone": "0123456789",
  "email": "test@example.com",
  "status": "active"
}
```

> Lưu ý quan trọng: JSON chỉ được phép có MỘT khóa `currentRoom`. Nếu lặp lại khóa `currentRoom`, block phía sau sẽ ghi đè block phía trước và gây thiếu field bắt buộc.

**Validation Rules:**
- `userId`: Required, string (number as string)
- `title`: Required, string
- `description`: Required, string
- `images`: Optional, array of strings (URLs)
- `video`: Optional, string (URL)
- `phone`: Optional, string
- `email`: Optional, valid email format
- `currentRoom.address.street`: Optional, string
- `currentRoom.address.ward`: Required, string
- `currentRoom.address.city`: Required, string
- `currentRoom.address.provinceCode`: Required, string
- `currentRoom.address.provinceName`: Required, string
- `currentRoom.address.wardCode`: Required, string
- `currentRoom.address.wardName`: Required, string
- `currentRoom.address.specificAddress`: Optional, string
- `currentRoom.address.showSpecificAddress`: Optional, boolean
- `currentRoom.address.additionalInfo`: Optional, string
- `currentRoom.price`: Required, number
- `currentRoom.area`: Required, number
- `currentRoom.description`: Required, string
- `currentRoom.roomType`: Optional, enum: ["single", "double", "shared"]
- `currentRoom.currentOccupants`: Optional, number, min 1
- `currentRoom.remainingDuration`: Optional, enum: ["1-3 months", "3-6 months", "6-12 months", "over_1_year"]
- `currentRoom.shareMethod`: Optional, enum: ["split_evenly", "by_usage"]
- `currentRoom.estimatedMonthlyUtilities`: Optional, number
- `currentRoom.capIncludedAmount`: Optional, number
- `currentRoom.electricityPricePerKwh`: Optional, number
- `currentRoom.waterPrice`: Optional, number
- `currentRoom.waterBillingType`: Optional, enum: ["per_m3", "per_person"]
- `currentRoom.internetFee`: Optional, number
- `currentRoom.garbageFee`: Optional, number
- `currentRoom.cleaningFee`: Optional, number
- `personalInfo.fullName`: Required, string
- `personalInfo.age`: Required, number, min 18, max 100
- `personalInfo.gender`: Required, enum: ["male", "female", "other"]
- `personalInfo.occupation`: Required, string
- `personalInfo.hobbies`: Optional, array of strings
- `personalInfo.habits`: Optional, array of strings
- `personalInfo.lifestyle`: Optional, enum: ["early", "normal", "late"]
- `personalInfo.cleanliness`: Optional, enum: ["very_clean", "clean", "normal", "flexible"]
- `requirements.ageRange`: Required, array of 2 numbers
- `requirements.gender`: Required, enum: ["male", "female", "any"]
- `requirements.traits`: Optional, array of strings
- `requirements.maxPrice`: Required, number, min 0

## ✏️ Update Roommate Post
```http
PUT /api/roommate-posts/:id
Authorization: Bearer <token>
```

**Request Body (partial update) — cập nhật đầy đủ:**
```json
{
  "title": "Cập nhật tiêu đề bài tìm bạn ở ghép",
  "description": "Mô tả mới về bản thân và yêu cầu",
  "images": ["https://cdn.domain.com/uploads/1/images/new-image-1.jpg"],
  "video": "https://cdn.domain.com/uploads/1/videos/new-video.mp4",
  "currentRoom": {
    "address": {
      "street": "Đường Lê Lợi",
      "ward": "Phường Bến Thành",
      "city": "Thành phố Hồ Chí Minh",
      "specificAddress": "456/12B",
      "showSpecificAddress": false,
      "provinceCode": "79",
      "provinceName": "Thành phố Hồ Chí Minh",
      "wardCode": "26704",
      "wardName": "Phường Bến Thành"
    },
    "price": 3500000,
    "area": 30,
    "description": "Mô tả phòng mới",
    "roomType": "shared",
    "currentOccupants": 2,
    "remainingDuration": "3-6 months",
    "shareMethod": "by_usage",
    "estimatedMonthlyUtilities": 600000,
    "capIncludedAmount": 300000,
    "electricityPricePerKwh": 3500,
    "waterPrice": 20000,
    "waterBillingType": "per_person",
    "internetFee": 200000,
    "garbageFee": 30000,
    "cleaningFee": 50000
  },
  "personalInfo": {
    "fullName": "Tên mới",
    "age": 26,
    "gender": "male",
    "occupation": "Designer",
    "hobbies": ["đọc sách", "chạy bộ"],
    "habits": ["ngủ sớm"],
    "lifestyle": "normal",
    "cleanliness": "clean"
  },
  "requirements": {
    "ageRange": [22, 30],
    "gender": "any",
    "traits": ["gọn gàng", "hoà đồng"],
    "maxPrice": 2500000
  },
  "phone": "0987654321",
  "email": "newemail@example.com"
}
```

**Request Body (partial update) — chỉ cập nhật một số field:**
```json
{
  "title": "Cập nhật tiêu đề bài tìm bạn ở ghép",
  "images": ["https://cdn.domain.com/uploads/1/images/new-image-1.jpg"],
  "phone": "0987654321",
  "email": "newemail@example.com"
}
```

**Lưu ý:**
- Chỉ cần gửi các field muốn thay đổi (partial update)
- Nếu gửi `personalInfo` thì bắt buộc có đủ `fullName`, `age` (18-100) và `gender` (male/female/other)
- Nếu gửi `currentRoom` thì bắt buộc có đủ `address`, `price`, `area`, `description`
- Nếu gửi `requirements` thì bắt buộc có đủ `ageRange`, `gender`, `maxPrice`
- Ảnh và video nên là URL public (có thể lấy từ quy trình Presigned URL ở mục Upload file S3)
- Email phải đúng định dạng email hợp lệ
- Các field được gửi sẽ được validate theo rule tương ứng như khi tạo mới

## 📝 Field Descriptions

### CurrentRoom Object
- `address`: Địa chỉ phòng hiện tại (object, bắt buộc)
  - `street`: Đường (tùy chọn)
  - `ward`: Tên phường/xã (bắt buộc)
  - `city`: Tên thành phố/tỉnh (bắt buộc)
  - `provinceCode`: Mã tỉnh (bắt buộc)
  - `provinceName`: Tên tỉnh/thành phố (bắt buộc)
  - `wardCode`: Mã phường/xã (bắt buộc)
  - `wardName`: Tên phường/xã (bắt buộc)
  - `specificAddress`: Địa chỉ cụ thể (tùy chọn)
  - `showSpecificAddress`: Hiển thị địa chỉ cụ thể (tùy chọn, boolean)
  - `additionalInfo`: Thông tin bổ sung (tùy chọn)
- `price`: Giá thuê phòng (VNĐ/tháng) (bắt buộc)
- `area`: Diện tích phòng (m²) (bắt buộc)
- `description`: Mô tả chi tiết về phòng (bắt buộc)
- `roomType`: Loại phòng - "single" (đơn), "double" (đôi), "shared" (3-4 người) (tùy chọn)
- `currentOccupants`: Số người hiện tại đang ở (tùy chọn, tối thiểu 1)
- `remainingDuration`: Thời gian ở còn lại - "1-3 months", "3-6 months", "6-12 months", "over_1_year" (tùy chọn)
  
  Các trường utilities trong `currentRoom` (tùy chọn):
  - `shareMethod`: Cách chia tiền điện nước - `split_evenly` | `by_usage`
  - `estimatedMonthlyUtilities`: Ước tính tổng phí mỗi tháng (VNĐ)
  - `capIncludedAmount`: Mức trần nếu đã bao gồm trong giá thuê (VNĐ)
  - `electricityPricePerKwh`: Giá điện (đ/kWh)
  - `waterPrice`: Giá nước (đ)
  - `waterBillingType`: Cách tính nước - `per_m3` | `per_person`
  - `internetFee`: Phí internet (đ/tháng)
  - `garbageFee`: Phí rác (đ/tháng)
  - `cleaningFee`: Phí vệ sinh (đ/tháng)

### PersonalInfo Object
- `fullName`: Họ và tên đầy đủ (bắt buộc)
- `age`: Tuổi (bắt buộc, 18-100)
- `gender`: Giới tính - "male", "female", "other" (bắt buộc)
- `occupation`: Nghề nghiệp (bắt buộc)
- `hobbies`: Danh sách sở thích (tùy chọn)
- `habits`: Danh sách thói quen (tùy chọn)
- `lifestyle`: Thói quen sinh hoạt - "early" (dậy sớm), "normal" (bình thường), "late" (dậy muộn) (tùy chọn)
- `cleanliness`: Mức độ sạch sẽ - "very_clean", "clean", "normal", "flexible" (tùy chọn)

### Requirements Object
- `ageRange`: Khoảng tuổi mong muốn [min, max] (bắt buộc)
- `gender`: Giới tính mong muốn - "male", "female", "any" (bắt buộc)
- `traits`: Danh sách tính cách mong muốn (tùy chọn)
- `maxPrice`: Giá tối đa sẵn sàng chi trả (VNĐ/tháng) (bắt buộc)

### Root Level Fields
- `roommatePostId`: ID duy nhất của bài đăng (tự động tạo)
- `userId`: ID của người đăng (bắt buộc)
- `title`: Tiêu đề bài đăng (bắt buộc)
- `description`: Mô tả chi tiết (bắt buộc)
- `images`: Danh sách URL hình ảnh (tùy chọn)
- `video`: URL video giới thiệu (tùy chọn)
- `phone`: Số điện thoại liên hệ (tùy chọn)
- `email`: Email liên hệ (tùy chọn, phải đúng định dạng)
- `status`: Trạng thái bài đăng - "active", "inactive" (mặc định: "active")
