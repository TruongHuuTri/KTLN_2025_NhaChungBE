# 👤 User Profiles API

## 📋 Tổng quan

User Profiles API cho phép quản lý thông tin **NGƯỜI THUÊ** để cá nhân hóa trải nghiệm và gợi ý phù hợp.

> **⚠️ LƯU Ý QUAN TRỌNG:**
> - API này **CHỈ DÀNH CHO USER THƯỜNG** (role = 'user')
> - **Chủ nhà (landlord) KHÔNG CẦN** profile, chỉ cần xác thực (verification)

## 📊 Schema

```typescript
interface UserProfile {
  profileId: number;
  userId: number;
  
  // Preferences (sở thích)
  preferredCity?: string;        // Thành phố ưu tiên
  preferredWards?: string[];      // Danh sách phường ưu tiên
  roomType?: string[];            // Loại phòng quan tâm
  
  // Basic Info (thông tin cơ bản)
  occupation?: string;            // Nghề nghiệp
  pets?: boolean;                 // Có nuôi thú cưng?
  
  // Contact info (thông tin liên hệ)
  contactMethod?: string[];       // Cách liên hệ ưa thích
  
  // Completion status (trạng thái hoàn thiện)
  isBasicInfoComplete: boolean;
  isPreferencesComplete: boolean;
  completionPercentage: number;
}
```

## 🔗 API Endpoints

### 1. Tạo profile trống cho user hiện tại

```http
POST /api/user-profiles/me
Authorization: Bearer <token>
```

### 2. Lấy Profile của User hiện tại

```http
GET /api/user-profiles/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "profileId": 1,
  "userId": 20,
  "preferredCity": "TP. Hồ Chí Minh",
  "preferredWards": ["Phường 7", "Phường 10"],
  "roomType": ["phong_tro", "chung_cu"],
  "occupation": "Sinh viên",
  "pets": false,
  "contactMethod": ["Zalo", "Điện thoại"],
  "isBasicInfoComplete": true,
  "isPreferencesComplete": true,
  "completionPercentage": 100
}
```

### 3. Cập nhật Profile của User hiện tại

```http
PATCH /api/user-profiles/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "preferredCity": "TP. Hồ Chí Minh",
  "preferredWards": ["Phường 7", "Phường 10"],
  "roomType": ["phong_tro", "chung_cu"],
  "occupation": "Sinh viên",
  "pets": false,
  "contactMethod": ["Zalo", "Điện thoại"]
}
```

**Response (200):**
```json
{
  "profileId": 1,
  "userId": 20,
  "preferredCity": "TP. Hồ Chí Minh",
  "preferredWards": ["Phường 7", "Phường 10"],
  "roomType": ["phong_tro", "chung_cu"],
  "occupation": "Sinh viên",
  "pets": false,
  "contactMethod": ["Zalo", "Điện thoại"],
  "isBasicInfoComplete": true,
  "isPreferencesComplete": true,
  "completionPercentage": 100,
  "updatedAt": "2025-10-26T04:14:25.727Z"
}
```

### 4. Các endpoints khác

```http
# Xóa Profile
DELETE /api/user-profiles/user/:userId
Authorization: Bearer <token>

# Lấy profiles theo completion
GET /api/user-profiles/completion?minPercentage=80
Authorization: Bearer <token>

# Lấy profiles theo role
GET /api/user-profiles/role/user
Authorization: Bearer <token>
```

## 🎯 Completion Percentage

Hệ thống tự động tính toán % hoàn thiện profile:

- **Basic Info (50%)**: occupation, pets (2/2 fields)
- **Preferences (50%)**: preferredCity, preferredWards, roomType (3/3 fields)

**Công thức:**
- `isBasicInfoComplete`: true khi có occupation và pets
- `isPreferencesComplete`: true khi có preferredCity, preferredWards và roomType
- `completionPercentage`: Tổng phần trăm hoàn thiện

## 🎨 Frontend Integration

### 1. Tạo Profile mới

```typescript
const createMyProfile = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/user-profiles/me`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### 2. Cập nhật Profile

```typescript
const updateMyProfile = async (data) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/user-profiles/me`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      preferredCity: data.city,
      preferredWards: data.wards,
      roomType: data.roomTypes,
      occupation: data.occupation,
      pets: data.hasPets,
      contactMethod: data.contactMethods
    })
  });
  return response.json();
};
```

### 3. Lấy Profile

```typescript
const getMyProfile = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/user-profiles/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### 4. Ví dụ Form Data

```typescript
// Dữ liệu từ form
const formData = {
  preferredCity: "TP. Hồ Chí Minh",
  preferredWards: ["Phường 7", "Phường 10"],
  roomType: ["phong_tro", "chung_cu"],
  occupation: "Sinh viên",
  pets: false,
  contactMethod: ["Zalo", "Điện thoại"]
};

// Gửi lên server
await updateMyProfile(formData);
```

## 📝 Notes

- Tất cả fields đều optional
- Profile được tạo tự động sau khi đăng ký
- Completion percentage được tính tự động
- Endpoints cần authentication
- Profile có thể cập nhật nhiều lần

## 🔔 Thay đổi gần đây

### Schema đã được đơn giản hóa
- **Chỉ còn**: preferredCity, preferredWards, roomType, occupation, pets, contactMethod
- **Đã xóa**: dateOfBirth, gender, income, currentLocation, budgetRange, amenities, lifestyle, smoking, cleanliness, socialLevel, availableTime
- **Mục đích**: Chỉ lưu thông tin tối thiểu cần thiết cho user thường
