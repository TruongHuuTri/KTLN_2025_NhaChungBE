# 🔄 Hướng Dẫn Cập Nhật Frontend - Thêm Field Smoking và Pets cho Matching

## 📋 Tổng Quan

Tài liệu này mô tả các thay đổi mới trong hệ thống roommate matching: **thêm 2 field mới** để matching chính xác hơn:

1. **Smoking Preference** - Yêu cầu về hút thuốc
2. **Pets Preference** - Yêu cầu về thú cưng

---

## 🆕 Field Mới Được Thêm

### 1. Smoking Preference (Yêu cầu về hút thuốc)

**Giá trị có thể:**
- `'smoker'` - Chỉ chấp nhận người hút thuốc
- `'non_smoker'` - Chỉ chấp nhận người không hút thuốc
- `'any'` - Không quan trọng (mặc định)

### 2. Pets Preference (Yêu cầu về thú cưng)

**Giá trị có thể:**
- `'has_pets'` - Chỉ chấp nhận người có thú cưng
- `'no_pets'` - Chỉ chấp nhận người không có thú cưng
- `'any'` - Không quan trọng (mặc định)

---

## 📝 Cập Nhật API

### 1. Tạo/Cập Nhật Roommate Preference (Poster)

**Endpoint:** `PUT /api/users/rooms/:roomId/roommate-preference`

**Request Body - Cập nhật:**

```json
{
  "enabled": true,
  "requirements": {
    "ageRange": [20, 30],
    "gender": "any",
    "traits": ["sạch sẽ"],
    "maxPrice": 3000000,
    "smokingPreference": "non_smoker",  // ⭐ Field mới
    "petsPreference": "no_pets"          // ⭐ Field mới
  },
  "posterTraits": ["sạch sẽ", "hòa đồng"],
  "posterSmoking": "non_smoker",         // ⭐ Field mới - Thông tin của Poster
  "posterPets": "no_pets"                 // ⭐ Field mới - Thông tin của Poster
}
```

**Lưu ý:**
- `smokingPreference` và `petsPreference` trong `requirements`: Yêu cầu về người ở ghép
- `posterSmoking` và `posterPets`: Thông tin thực tế của Poster (người đăng bài)

**TypeScript Interface:**

```typescript
interface CreateRoommatePreferenceDto {
  enabled: boolean;
  requirements?: {
    ageRange: [number, number];
    gender: 'male' | 'female' | 'any';
    traits?: string[];
    maxPrice: number;
    smokingPreference?: 'smoker' | 'non_smoker' | 'any';  // ⭐ Mới
    petsPreference?: 'has_pets' | 'no_pets' | 'any';      // ⭐ Mới
  };
  posterTraits?: string[];
  posterSmoking?: 'smoker' | 'non_smoker';  // ⭐ Mới
  posterPets?: 'has_pets' | 'no_pets';      // ⭐ Mới
}
```

---

### 2. Tìm Phòng Ở Ghép (Seeker)

**Endpoint:** `POST /api/posts/roommate/find`

**Request Body - Cập nhật:**

```json
{
  "ageRange": [20, 30],
  "gender": "any",
  "traits": ["sạch sẽ", "hòa đồng"],
  "maxPrice": 3000000,
  "smokingPreference": "non_smoker",  // ⭐ Field mới - Yêu cầu về Poster
  "petsPreference": "any",             // ⭐ Field mới - Yêu cầu về Poster
  "personalInfo": {
    "fullName": "Nguyễn Văn B",
    "gender": "male",
    "occupation": "Sinh viên",
    "lifestyle": "normal",
    "cleanliness": "clean",
    "smoking": "non_smoker",           // ⭐ Field mới - Thông tin của Seeker
    "pets": "no_pets"                   // ⭐ Field mới - Thông tin của Seeker
  }
}
```

**TypeScript Interface:**

```typescript
interface FindRoommateDto {
  ageRange: [number, number];
  gender: 'male' | 'female' | 'any';
  traits?: string[];
  maxPrice: number;
  smokingPreference?: 'smoker' | 'non_smoker' | 'any';  // ⭐ Mới
  petsPreference?: 'has_pets' | 'no_pets' | 'any';      // ⭐ Mới
  personalInfo?: {
    fullName?: string;
    gender?: 'male' | 'female' | 'other';
    occupation?: string;
    lifestyle?: 'early' | 'normal' | 'late';
    cleanliness?: 'very_clean' | 'clean' | 'normal' | 'flexible';
    smoking?: 'smoker' | 'non_smoker';    // ⭐ Mới
    pets?: 'has_pets' | 'no_pets';        // ⭐ Mới
  };
}
```

---

### 3. Lấy Preferences của Seeker

**Endpoint:** `GET /api/users/me/seeker-preference`

**Response - Cập nhật:**

```json
{
  "hasPreferences": true,
  "requirements": {
    "ageRange": [20, 30],
    "gender": "any",
    "traits": ["sạch sẽ"],
    "maxPrice": 3000000,
    "smokingPreference": "non_smoker",  // ⭐ Field mới
    "petsPreference": "any"              // ⭐ Field mới
  },
  "seekerTraits": ["sạch sẽ", "hòa đồng"],
  "seekerAge": 25,
  "seekerGender": "male",
  "seekerSmoking": "non_smoker",        // ⭐ Field mới
  "seekerPets": "no_pets",               // ⭐ Field mới
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**TypeScript Interface:**

```typescript
interface SeekerPreferenceResponse {
  hasPreferences: boolean;
  requirements?: {
    ageRange: [number, number];
    gender: 'male' | 'female' | 'any';
    traits: string[];
    maxPrice: number;
    smokingPreference?: 'smoker' | 'non_smoker' | 'any';  // ⭐ Mới
    petsPreference?: 'has_pets' | 'no_pets' | 'any';      // ⭐ Mới
  };
  seekerTraits?: string[];
  seekerAge?: number;
  seekerGender?: string;
  seekerSmoking?: 'smoker' | 'non_smoker';  // ⭐ Mới
  seekerPets?: 'has_pets' | 'no_pets';      // ⭐ Mới
  updatedAt?: Date;
}
```

---

### 4. Lấy Preferences của Poster

**Endpoint:** `GET /api/users/rooms/:roomId/roommate-preference`

**Response - Cập nhật:**

```json
{
  "enabled": true,
  "postId": 456,
  "postStatus": "active",
  "requirements": {
    "ageRange": [20, 30],
    "gender": "any",
    "traits": ["sạch sẽ"],
    "maxPrice": 3000000,
    "smokingPreference": "non_smoker",  // ⭐ Field mới
    "petsPreference": "no_pets"          // ⭐ Field mới
  },
  "posterTraits": ["sạch sẽ", "hòa đồng"],
  "posterAge": 25,
  "posterGender": "male",
  "posterSmoking": "non_smoker",        // ⭐ Field mới
  "posterPets": "no_pets"                // ⭐ Field mới
}
```

**TypeScript Interface:**

```typescript
interface RoommatePreferenceResponse {
  enabled: boolean;
  postId?: number | null;
  postStatus?: string | null;
  requirements?: {
    ageRange: [number, number];
    gender: 'male' | 'female' | 'any';
    traits: string[];
    maxPrice: number;
    smokingPreference?: 'smoker' | 'non_smoker' | 'any';  // ⭐ Mới
    petsPreference?: 'has_pets' | 'no_pets' | 'any';      // ⭐ Mới
  };
  posterTraits?: string[];
  posterAge?: number | null;
  posterGender?: string | null;
  posterSmoking?: 'smoker' | 'non_smoker' | null;  // ⭐ Mới
  posterPets?: 'has_pets' | 'no_pets' | null;      // ⭐ Mới
}
```

---

## 🎯 Logic Matching Mới

### Condition 1: Seeker phù hợp với yêu cầu của Poster

**Kiểm tra mới:**
1. **Smoking:**
   - Nếu Poster yêu cầu `'non_smoker'` → Seeker phải là `'non_smoker'`
   - Nếu Poster yêu cầu `'smoker'` → Seeker phải là `'smoker'`
   - Nếu Poster yêu cầu `'any'` → Không kiểm tra (pass)

2. **Pets:**
   - Nếu Poster yêu cầu `'no_pets'` → Seeker phải là `'no_pets'`
   - Nếu Poster yêu cầu `'has_pets'` → Seeker phải là `'has_pets'`
   - Nếu Poster yêu cầu `'any'` → Không kiểm tra (pass)

**Nếu không match → Matching FAIL**

---

### Condition 2: Poster phù hợp với yêu cầu của Seeker

**Kiểm tra mới:**
1. **Smoking:**
   - Nếu Seeker yêu cầu `'non_smoker'` → Poster phải là `'non_smoker'`
   - Nếu Seeker yêu cầu `'smoker'` → Poster phải là `'smoker'`
   - Nếu Seeker yêu cầu `'any'` → Không kiểm tra (pass)

2. **Pets:**
   - Nếu Seeker yêu cầu `'no_pets'` → Poster phải là `'no_pets'`
   - Nếu Seeker yêu cầu `'has_pets'` → Poster phải là `'has_pets'`
   - Nếu Seeker yêu cầu `'any'` → Không kiểm tra (pass)

**Nếu không match → Matching FAIL**

---

## 🎨 UI/UX Gợi Ý

### Form Tạo/Cập Nhật Preference (Poster)

```
┌─────────────────────────────────────────┐
│ Tìm Người Ở Ghép                        │
├─────────────────────────────────────────┤
│                                         │
│ ✅ Yêu Cầu Về Người Ở Ghép:            │
│                                         │
│ Hút thuốc:                              │
│ ○ Không quan trọng                      │
│ ● Không hút thuốc                       │
│ ○ Hút thuốc                             │
│                                         │
│ Thú cưng:                               │
│ ○ Không quan trọng                      │
│ ● Không có thú cưng                     │
│ ○ Có thú cưng                           │
│                                         │
│ ✅ Thông Tin Của Bạn:                   │
│                                         │
│ Bạn có hút thuốc không?                 │
│ ○ Có                                    │
│ ● Không                                 │
│                                         │
│ Bạn có nuôi thú cưng không?             │
│ ● Không                                 │
│ ○ Có                                    │
│                                         │
└─────────────────────────────────────────┘
```

### Form Tìm Phòng (Seeker)

```
┌─────────────────────────────────────────┐
│ Tìm Phòng Ở Ghép                        │
├─────────────────────────────────────────┤
│                                         │
│ ✅ Yêu Cầu Về Người Ở Ghép:            │
│                                         │
│ Hút thuốc:                              │
│ ○ Không quan trọng                      │
│ ● Không hút thuốc                       │
│ ○ Hút thuốc                             │
│                                         │
│ Thú cưng:                               │
│ ● Không quan trọng                      │
│ ○ Không có thú cưng                     │
│ ○ Có thú cưng                           │
│                                         │
│ ✅ Thông Tin Của Bạn:                   │
│                                         │
│ Bạn có hút thuốc không?                 │
│ ○ Có                                    │
│ ● Không                                 │
│                                         │
│ Bạn có nuôi thú cưng không?             │
│ ● Không                                 │
│ ○ Có                                    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 💻 Ví Dụ Code

### 1. Tạo/Cập Nhật Preference (Poster)

```typescript
interface PreferenceFormData {
  enabled: boolean;
  requirements: {
    ageRange: [number, number];
    gender: 'male' | 'female' | 'any';
    traits: string[];
    maxPrice: number;
    smokingPreference: 'smoker' | 'non_smoker' | 'any';
    petsPreference: 'has_pets' | 'no_pets' | 'any';
  };
  posterTraits: string[];
  posterSmoking: 'smoker' | 'non_smoker';
  posterPets: 'has_pets' | 'no_pets';
}

const updateRoommatePreference = async (
  roomId: number,
  data: PreferenceFormData
) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/users/rooms/${roomId}/roommate-preference`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return response.json();
};

// Sử dụng
await updateRoommatePreference(123, {
  enabled: true,
  requirements: {
    ageRange: [20, 30],
    gender: 'any',
    traits: ['sạch sẽ'],
    maxPrice: 3000000,
    smokingPreference: 'non_smoker',  // ⭐ Mới
    petsPreference: 'no_pets'          // ⭐ Mới
  },
  posterTraits: ['sạch sẽ', 'hòa đồng'],
  posterSmoking: 'non_smoker',         // ⭐ Mới
  posterPets: 'no_pets'                 // ⭐ Mới
});
```

---

### 2. Tìm Phòng Ở Ghép (Seeker)

```typescript
interface FindRoommateFormData {
  ageRange: [number, number];
  gender: 'male' | 'female' | 'any';
  traits?: string[];
  maxPrice: number;
  smokingPreference?: 'smoker' | 'non_smoker' | 'any';
  petsPreference?: 'has_pets' | 'no_pets' | 'any';
  personalInfo?: {
    fullName?: string;
    gender?: 'male' | 'female' | 'other';
    occupation?: string;
    lifestyle?: 'early' | 'normal' | 'late';
    cleanliness?: 'very_clean' | 'clean' | 'normal' | 'flexible';
    smoking?: 'smoker' | 'non_smoker';
    pets?: 'has_pets' | 'no_pets';
  };
}

const findRoommate = async (data: FindRoommateFormData) => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/posts/roommate/find', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return response.json();
};

// Sử dụng
await findRoommate({
  ageRange: [20, 30],
  gender: 'any',
  traits: ['sạch sẽ', 'hòa đồng'],
  maxPrice: 3000000,
  smokingPreference: 'non_smoker',     // ⭐ Mới
  petsPreference: 'any',                // ⭐ Mới
  personalInfo: {
    fullName: 'Nguyễn Văn B',
    gender: 'male',
    occupation: 'Sinh viên',
    lifestyle: 'normal',
    cleanliness: 'clean',
    smoking: 'non_smoker',              // ⭐ Mới
    pets: 'no_pets'                      // ⭐ Mới
  }
});
```

---

### 3. Lấy Preferences và Điền Form Tự Động

```typescript
const getSeekerPreference = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/users/me/seeker-preference', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// Sử dụng
const preferences = await getSeekerPreference();

if (preferences.hasPreferences) {
  // Điền form tự động
  formData = {
    ageRange: preferences.requirements.ageRange,
    gender: preferences.requirements.gender,
    traits: preferences.seekerTraits || [],
    maxPrice: preferences.requirements.maxPrice,
    smokingPreference: preferences.requirements.smokingPreference || 'any',  // ⭐ Mới
    petsPreference: preferences.requirements.petsPreference || 'any',        // ⭐ Mới
    personalInfo: {
      smoking: preferences.seekerSmoking,  // ⭐ Mới
      pets: preferences.seekerPets         // ⭐ Mới
    }
  };
  
  // Tự động match
  const matches = await findRoommate(formData);
}
```

---

## ⚠️ Lưu Ý Quan Trọng

### 1. Giá Trị Mặc Định

- Nếu không gửi `smokingPreference` hoặc `petsPreference` → Mặc định là `'any'`
- Nếu không gửi `posterSmoking` hoặc `posterPets` → Có thể là `undefined` (backend sẽ lấy từ userProfile nếu có)

### 2. Backward Compatibility

- Các field mới đều là **optional**
- API vẫn hoạt động bình thường nếu không gửi field mới
- Mặc định matching sẽ pass nếu không có yêu cầu cụ thể

### 3. Lưu Thông Tin

- **Poster:** `posterSmoking` và `posterPets` được lưu trong `RoommatePreference`
- **Seeker:** `seekerSmoking` và `seekerPets` được lưu trong `SeekerPreference`
- Backend tự động lấy từ `UserProfile.pets` nếu chưa có

### 4. Matching Logic

- Matching là **hard filter** - Nếu không match → Matching FAIL ngay lập tức
- Không tính điểm cho smoking và pets, chỉ kiểm tra pass/fail

---

## 🔧 Logic Tạo/Cập Nhật Bài Đăng

### Quan Trọng: Backend đã sửa logic để không tạo bài đăng mới mỗi lần chỉnh sửa

**Trước đây (lỗi):**
- Mỗi lần Poster chỉnh sửa form → Tạo bài đăng MỚI
- Dẫn đến nhiều bài đăng trùng lặp

**Bây giờ (đã sửa):**
- Lần đầu: Tạo bài đăng mới (nếu chưa có)
- Các lần sau: Cập nhật bài đăng cũ (nếu đã có)
- Backend tự động kiểm tra `postId` và xử lý

**FE không cần làm gì thêm:**
- API endpoint và request body vẫn giữ nguyên
- Backend tự xử lý logic tạo/cập nhật
- FE chỉ cần gọi API như bình thường

---

## ✅ Checklist Tích Hợp

### Poster (Người Đăng Bài)

- [ ] Thêm field `smokingPreference` vào form requirements (radio: any/non_smoker/smoker)
- [ ] Thêm field `petsPreference` vào form requirements (radio: any/no_pets/has_pets)
- [ ] Thêm field `posterSmoking` vào form thông tin cá nhân (radio: smoker/non_smoker)
- [ ] Thêm field `posterPets` vào form thông tin cá nhân (radio: has_pets/no_pets)
- [ ] Cập nhật API call `PUT /api/users/rooms/:roomId/roommate-preference`
- [ ] Cập nhật hiển thị preferences khi GET (hiển thị 4 field mới)

### Seeker (Người Tìm Phòng)

- [ ] Thêm field `smokingPreference` vào form requirements (radio: any/non_smoker/smoker)
- [ ] Thêm field `petsPreference` vào form requirements (radio: any/no_pets/has_pets)
- [ ] Thêm field `smoking` vào `personalInfo` (radio: smoker/non_smoker)
- [ ] Thêm field `pets` vào `personalInfo` (radio: has_pets/no_pets)
- [ ] Cập nhật API call `POST /api/posts/roommate/find`
- [ ] Cập nhật auto-fill form từ preferences (hiển thị 4 field mới)

### UI/UX

- [ ] Hiển thị rõ ràng "Yêu cầu về người ở ghép" vs "Thông tin của bạn"
- [ ] Giải thích ngắn gọn: "Không quan trọng" = chấp nhận cả hai
- [ ] Validation: Nếu chọn "Không hút thuốc" ở yêu cầu → Bạn cũng phải là "Không hút thuốc"
- [ ] Hiển thị icons phù hợp (🚭 cho smoking, 🐾 cho pets)

---

## 🔍 Ví Dụ Matching

### Ví Dụ 1: Match Thành Công

**Poster:**
- Yêu cầu: `smokingPreference: 'non_smoker'`, `petsPreference: 'any'`
- Thông tin: `posterSmoking: 'non_smoker'`, `posterPets: 'no_pets'`

**Seeker:**
- Yêu cầu: `smokingPreference: 'any'`, `petsPreference: 'no_pets'`
- Thông tin: `smoking: 'non_smoker'`, `pets: 'no_pets'`

**Kết quả:** ✅ MATCH (cả 2 điều kiện đều pass)

---

### Ví Dụ 2: Match Thất Bại

**Poster:**
- Yêu cầu: `smokingPreference: 'non_smoker'`
- Thông tin: `posterSmoking: 'non_smoker'`

**Seeker:**
- Yêu cầu: `smokingPreference: 'any'`
- Thông tin: `smoking: 'smoker'` ❌

**Kết quả:** ❌ FAIL (Seeker hút thuốc nhưng Poster yêu cầu không hút thuốc)

---

## 📚 Tài Liệu Tham Khảo

- [Roommate Matching Updates](./roommate-matching-updates.md) - Tài liệu matching trước đó
- [Room Sharing Flow](./room-sharing-flow.md) - Luồng đăng ký ở ghép
- [Age Storage Update](./age-storage-update.md) - Cập nhật lưu trữ tuổi

---

## 🆘 Hỗ Trợ

Nếu gặp vấn đề, vui lòng liên hệ team Backend hoặc kiểm tra:
- Console log trong browser
- Network tab để xem request/response
- Backend logs để xem error chi tiết

