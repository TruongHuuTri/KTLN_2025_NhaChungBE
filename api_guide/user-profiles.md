# 👤 User Profiles API

## 📋 Tổng quan

User Profiles API cho phép quản lý thông tin chi tiết của người dùng để cá nhân hóa trải nghiệm và gợi ý phù hợp.

## 🏗️ Kiến trúc

- **Collection riêng**: `UserProfile` tách biệt với `User`
- **Auto-increment ID**: `profileId` tự động tăng
- **Completion tracking**: Theo dõi % hoàn thiện profile
- **Role-based fields**: Thông tin khác nhau cho user/landlord

## 📊 Schema

```typescript
interface UserProfile {
  profileId: number;
  userId: number;
  
  // Basic Info
  age?: number;
  gender?: 'male' | 'female' | 'other';
  occupation?: string;
  income?: number;
  currentLocation?: string;
  
  // Preferences
  preferredDistricts?: string[];
  budgetRange?: { min: number; max: number };
  roomType?: string[];
  amenities?: string[];
  lifestyle?: 'quiet' | 'social' | 'party' | 'study';
  
  // Roommate specific
  smoking?: boolean;
  pets?: boolean;
  cleanliness?: number; // 1-5
  socialLevel?: number; // 1-5
  
  // Landlord specific
  businessType?: 'individual' | 'company' | 'agency';
  experience?: 'new' | '1-2_years' | '3-5_years' | '5+_years';
  propertiesCount?: number;
  propertyTypes?: string[];
  targetDistricts?: string[];
  priceRange?: { min: number; max: number };
  targetTenants?: string[];
  managementStyle?: 'strict' | 'flexible' | 'friendly';
  responseTime?: 'immediate' | 'within_hour' | 'within_day';
  additionalServices?: string[];
  
  // Business info
  businessLicense?: string;
  taxCode?: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  contactMethod?: string[];
  availableTime?: {
    weekdays: string;
    weekends: string;
  };
  
  // Completion status
  isBasicInfoComplete: boolean;
  isPreferencesComplete: boolean;
  isLandlordInfoComplete: boolean;
  completionPercentage: number;
}
```

## 🔗 API Endpoints

### 1. Tạo Profile

```http
POST /api/user-profiles
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 1,
  "age": 25,
  "gender": "male",
  "occupation": "Developer",
  "income": 15000000,
  "currentLocation": "Quận 1, TP.HCM",
  "preferredDistricts": ["Quận 1", "Quận 3", "Quận 7"],
  "budgetRange": {
    "min": 5000000,
    "max": 10000000
  },
  "roomType": ["phong_tro", "chung_cu"],
  "amenities": ["wifi", "parking", "gym"],
  "lifestyle": "quiet",
  "smoking": false,
  "pets": false,
  "cleanliness": 4,
  "socialLevel": 3
}
```

**Response:**
```json
{
  "profileId": 1,
  "userId": 1,
  "age": 25,
  "gender": "male",
  "occupation": "Developer",
  "income": 15000000,
  "currentLocation": "Quận 1, TP.HCM",
  "preferredDistricts": ["Quận 1", "Quận 3", "Quận 7"],
  "budgetRange": {
    "min": 5000000,
    "max": 10000000
  },
  "roomType": ["phong_tro", "chung_cu"],
  "amenities": ["wifi", "parking", "gym"],
  "lifestyle": "quiet",
  "smoking": false,
  "pets": false,
  "cleanliness": 4,
  "socialLevel": 3,
  "isBasicInfoComplete": true,
  "isPreferencesComplete": true,
  "isLandlordInfoComplete": true,
  "completionPercentage": 100,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. Lấy Profile theo UserId

```http
GET /api/user-profiles/user/:userId
Authorization: Bearer <token>
```

**Permission:** User chỉ có thể xem profile của mình, Admin có thể xem tất cả.

### 3. Cập nhật Profile

```http
PATCH /api/user-profiles/user/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "age": 26,
  "income": 18000000,
  "preferredDistricts": ["Quận 1", "Quận 2", "Quận 7"]
}
```

**Permission:** User chỉ có thể cập nhật profile của mình, Admin có thể cập nhật tất cả.

### 4. Xóa Profile

```http
DELETE /api/user-profiles/user/:userId
Authorization: Bearer <token>
```

**Permission:** User chỉ có thể xóa profile của mình, Admin có thể xóa tất cả.

### 5. Lấy Profiles theo Completion

```http
GET /api/user-profiles/completion?minPercentage=80
Authorization: Bearer <token>
```

### 6. Lấy Profiles theo Role

```http
GET /api/user-profiles/role/landlord
Authorization: Bearer <token>
```

## 🎯 Completion Percentage

Hệ thống tự động tính toán % hoàn thiện profile:

- **Basic Info (30%)**: age, gender, occupation, income, currentLocation
- **Preferences (40%)**: preferredDistricts, budgetRange, roomType, amenities, lifestyle
- **Role-specific (30%)**: 
  - User: smoking, pets, cleanliness, socialLevel
  - Landlord: experience, propertiesCount, propertyTypes, targetDistricts, priceRange

## 🔄 Flow Integration

### 1. Sau khi đăng ký thành công

```json
{
  "message": "Đăng ký thành công. Vui lòng đăng nhập và hoàn thiện hồ sơ cá nhân.",
  "user": { ... },
  "nextStep": "complete_profile"
}
```

### 2. Tự động tạo profile mặc định

Khi user đăng ký thành công, hệ thống tự động tạo profile với:
- `profileId` tự động tăng
- `userId` từ user vừa tạo
- `completionPercentage: 0`
- Tất cả fields khác = undefined

### 3. Khi upgrade role

Khi user chuyển từ `user` → `landlord`, cần cập nhật thêm:
- `businessType`
- `experience`
- `propertiesCount`
- `propertyTypes`
- `targetDistricts`
- `priceRange`
- `targetTenants`
- `managementStyle`
- `responseTime`
- `additionalServices`
- `businessLicense`
- `taxCode`
- `bankAccount`
- `contactMethod`
- `availableTime`

## 🎨 Frontend Integration

### 1. API Usage với UserId

```typescript
// Frontend sử dụng userId từ JWT token
const getUserIdFromToken = () => {
  const token = localStorage.getItem('token');
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.sub; // userId
};

// Lấy profile của user hiện tại
const getMyProfile = async () => {
  const userId = getUserIdFromToken();
  const response = await fetch(`/api/user-profiles/user/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Cập nhật profile của user hiện tại
const updateMyProfile = async (data) => {
  const userId = getUserIdFromToken();
  const response = await fetch(`/api/user-profiles/user/${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return response.json();
};
```

### 2. Profile Form Steps

```typescript
// Step 1: Basic Info
const basicInfoFields = [
  'age', 'gender', 'occupation', 'income', 'currentLocation'
];

// Step 2: Preferences
const preferenceFields = [
  'preferredDistricts', 'budgetRange', 'roomType', 'amenities', 'lifestyle'
];

// Step 3: Role-specific
const userFields = ['smoking', 'pets', 'cleanliness', 'socialLevel'];
const landlordFields = [
  'businessType', 'experience', 'propertiesCount', 'propertyTypes',
  'targetDistricts', 'priceRange', 'targetTenants', 'managementStyle',
  'responseTime', 'additionalServices', 'businessLicense', 'taxCode',
  'bankAccount', 'contactMethod', 'availableTime'
];
```

### 3. Progress Tracking

```typescript
// Hiển thị progress bar
const progress = profile.completionPercentage;
const isComplete = profile.completionPercentage === 100;

// Gợi ý fields cần hoàn thiện
const incompleteFields = getIncompleteFields(profile);
```

### 4. Smart Recommendations

```typescript
// Gợi ý dựa trên profile
const recommendations = {
  posts: getRecommendedPosts(profile),
  roommates: getRecommendedRoommates(profile),
  districts: getRecommendedDistricts(profile),
  priceRange: getRecommendedPriceRange(profile)
};
```

## 🚀 Lợi ích

1. **Cá nhân hóa**: Gợi ý phù hợp với từng user
2. **Matching tốt hơn**: Roommate matching chính xác
3. **Filter thông minh**: Kết quả tìm kiếm phù hợp
4. **Analytics**: Dữ liệu để cải thiện hệ thống
5. **User Experience**: Trải nghiệm mượt mà hơn

## 📝 Notes

- Profile được tạo tự động sau khi đăng ký
- Completion percentage được tính tự động
- Role change cần cập nhật thêm thông tin landlord
- Tất cả endpoints cần authentication
- Profile có thể cập nhật nhiều lần
