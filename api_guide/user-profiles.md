# 👤 User Profiles API

## 📋 Tổng quan

User Profiles API cho phép quản lý thông tin chi tiết của người dùng để cá nhân hóa trải nghiệm và gợi ý phù hợp.

## 🔄 Flow Đăng Ký & Profile

### **Luồng đăng ký hoàn chỉnh:**
1. **Đăng ký** → `POST /api/auth/register` (gửi OTP)
2. **Xác thực OTP** → `POST /api/auth/verify-registration` (tạo user)
3. **Tạo profile mặc định** → `POST /api/user-profiles/me` (tạo profile trống cho user hiện tại)
4. **Đăng nhập** → `POST /api/users/login` (lấy token)

### **User được tạo khi verify OTP:**
- User được tạo ngay khi verify OTP thành công
- Profile được tạo riêng biệt sau đó
- User có thể đăng nhập ngay sau khi tạo profile

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
  dateOfBirth?: Date;  // Dùng dateOfBirth (không dùng age)
  gender?: 'male' | 'female' | 'other';
  occupation?: string;
  income?: number;
  currentLocation?: string;
  
  // Preferences
  // Ưu tiên dùng wards (tương thích preferredDistricts trong giai đoạn chuyển đổi)
  preferredWards?: string[];
  preferredWardCodes?: string[];
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
  // Ưu tiên dùng wards/city (tương thích targetDistricts trong giai đoạn chuyển đổi)
  targetCityCode?: string;
  targetCityName?: string;
  targetWards?: string[];
  targetWardCodes?: string[];
  targetDistricts?: string[];
  priceRange?: { min: number; max: number };
  // Chấp nhận cả bộ key mới và cũ
  targetTenants?: (
    'student' | 'office_worker' | 'family' | 'couple' | 'group_friends' |
    'sinh_vien' | 'nhan_vien_vp' | 'gia_dinh' | 'cap_doi' | 'nhom_ban'
  )[];
  managementStyle?: 'strict' | 'flexible' | 'friendly';
  responseTime?: 'immediate' | 'within_hour' | 'within_day';
  additionalServices?: string[];
  
  // Business info
  businessLicense?: string;
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

**Permission:** User chỉ có thể xem profile của mình, Admin có thể xem tất cả.

### 3. Cập nhật Profile của User hiện tại

```http
PATCH /api/user-profiles/me
Authorization: Bearer <token>
Content-Type: application/json

// Form Người Thuê (role=user)
{
  "dateOfBirth": "2000-05-10",
  "gender": "male",
  "occupation": "student",
  "currentLocation": "Phường 7, TP.HCM",
  "preferredDistricts": ["Phường 7", "Phường 10"],
  "budgetRange": { "min": 2000000, "max": 5000000 },
  "roomType": ["phong_tro", "chung_cu"],
  "amenities": ["wifi", "thang_may", "ban_cong"],
  "lifestyle": "quiet",
  "smoking": false,
  "pets": false,
  "cleanliness": 4,
  "socialLevel": 3,
  "contactMethod": ["Zalo", "Điện thoại"],
  "availableTime": { "weekdays": "Sau 18:00", "weekends": "Cả ngày" }
}

// Form Chủ Nhà (role=landlord)
{
  "businessType": "individual",
  "experience": "1-2_years",
  "propertiesCount": 5,
  "propertyTypes": ["phong_tro", "chung_cu"],
  "priceRange": { "min": 2500000, "max": 10000000 },
  "targetDistricts": ["Phường 7", "Phường 10"],
  "targetTenants": ["student", "office_worker"],
  "managementStyle": "friendly",
  "responseTime": "within_day",
  "additionalServices": ["bao_ve_24_7", "ve_sinh_khu_chung"],
  "businessLicense": "https://cdn.example.com/licenses/abc.jpg",
  "bankAccount": { "bankName": "Vietcombank", "accountNumber": "0123456789", "accountHolder": "Nguyen Van A" },
  "contactMethod": ["Điện thoại"],
  "availableTime": { "weekdays": "9:00-17:00", "weekends": "linh hoạt" }
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

Hệ thống tự động tính toán % hoàn thiện profile (theo nhóm field phù hợp với role):

- **Basic Info (30%)**: dateOfBirth, gender, occupation, income, currentLocation
- **Preferences (40%)**: preferredWards (hoặc preferredDistricts), budgetRange, roomType, amenities, lifestyle
- **Role-specific (30%)**:
  - User: smoking, pets, cleanliness, socialLevel
  - Landlord: experience, propertyTypes, targetWards (hoặc targetDistricts), priceRange

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

Khi user chuyển từ `user` → `landlord`, cần cập nhật thêm (tối thiểu các trường chính):
- `businessType`
- `experience`
- `propertyTypes`
- `targetCityCode/Name` và/hoặc `targetWards/targetWardCodes` (tương thích `targetDistricts`)
- `priceRange`
- `targetTenants`
- `managementStyle`
- `responseTime`
- `additionalServices`
- `businessLicense`
- `bankAccount`
- `contactMethod`
- `availableTime`

## 🎨 Frontend Integration

### 1. API Usage (sử dụng endpoint /me)

```typescript
// Lấy profile của user hiện tại
const getMyProfile = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/user-profiles/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Cập nhật profile của user hiện tại (gửi đúng form theo role)
const updateMyProfile = async (data) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/user-profiles/me`, {
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
  'dateOfBirth', 'gender', 'occupation', 'income', 'currentLocation'
];

// Step 2: Preferences
const preferenceFields = [
  'preferredWards', 'budgetRange', 'roomType', 'amenities', 'lifestyle'
];

// Step 3: Role-specific
const userFields = ['smoking', 'pets', 'cleanliness', 'socialLevel'];
const landlordFields = [
  'businessType', 'experience', 'propertyTypes', 'priceRange',
  'targetWards', 'targetWardCodes', 'targetCityCode', 'targetCityName',
  'targetTenants', 'managementStyle', 'responseTime', 'additionalServices',
  'businessLicense', 'bankAccount', 'contactMethod', 'availableTime'
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
- Verify-registration hiện trả về access_token để FE tiếp tục flow ngay (không bắt buộc login lại)
- BE không ép enum cho các trường lựa chọn nữa; FE gửi string/string[] theo select sẽ được lưu nguyên giá trị
- Địa chỉ khác nhau theo role được chấp nhận linh hoạt:
  - User: preferredWards | preferredWardCodes | preferredDistricts
  - Landlord: targetWards | targetWardCodes | targetDistricts | targetCityCode | targetCityName

## 🔔 Thay đổi gần đây (dành cho FE)

1) Auth/OTP
- verify-registration trả: { access_token, user, nextStep }
- FE dùng token này để gọi POST /user-profiles/me và PATCH /user-profiles/me ngay sau OTP

2) Bỏ enum cứng, lưu giá trị raw từ FE
- Không còn enum bắt buộc cho: gender, lifestyle, businessType, experience, managementStyle, responseTime
- Mảng lựa chọn: roomType[], propertyTypes[], targetTenants[], amenities[], additionalServices[]
- FE chịu trách nhiệm chuẩn hóa giá trị thông qua select; BE lưu nguyên trạng

3) Địa chỉ theo role và Completion
- User (Preferences 40%): cần 1 trong nhóm preferred* (preferredWards|preferredWardCodes|preferredDistricts) + budgetRange, roomType, amenities, lifestyle
- Landlord (Role 30%): cần experience, propertyTypes, priceRange + 1 trong nhóm target* (targetWards|targetWardCodes|targetDistricts|targetCityCode|targetCityName)
- Basic 30% dùng dateOfBirth (YYYY-MM-DD), gender, occupation, income, currentLocation

4) Gợi ý sử dụng
- Khi hoàn tất OTP, gọi: POST /user-profiles/me nếu chưa có profile, sau đó PATCH /user-profiles/me theo role hiện tại
- Tránh gửi đồng thời cả preferred* và target* trong cùng một payload nếu đang ở một role cụ thể; chỉ gửi nhóm phù hợp role
