# Hướng Dẫn Cập Nhật Frontend - Roommate Matching

## 📋 Tổng Quan

Tài liệu này mô tả các thay đổi và tính năng mới trong hệ thống roommate matching:

1. **Tự động lưu preferences của Seeker** - User B điền form lần đầu, lần sau tự động match
2. **API lấy preferences đã lưu** - FE có thể lấy preferences để điền form
3. **API tự động match** - Match với preferences đã lưu (không cần form)
4. **Field mới: `posterTraits`** - Traits của Poster được lưu trong `roommatePreferences`
5. **Logic matching cập nhật** - So sánh giá với `maxPrice` trong preferences, không phải `room.price`

---

## 🆕 API Mới

### 1. Lấy preferences của Seeker (User B)

**Endpoint:** `GET /api/users/me/seeker-preference`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200) - Có preferences:**
```json
{
  "hasPreferences": true,
  "requirements": {
    "ageRange": [20, 30],
    "gender": "any",
    "traits": ["sạch sẽ", "yên tĩnh"],
    "maxPrice": 3000000
  },
  "seekerTraits": ["sạch sẽ", "hòa đồng"],
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Response (200) - Chưa có preferences:**
```json
{
  "hasPreferences": false,
  "requirements": null,
  "seekerTraits": null
}
```

**TypeScript Interface:**
```typescript
interface SeekerPreferenceResponse {
  hasPreferences: boolean;
  requirements: {
    ageRange: [number, number];
    gender: 'male' | 'female' | 'any';
    traits: string[];
    maxPrice: number;
  } | null;
  seekerTraits: string[] | null;
  updatedAt?: Date;
}
```

**Use Case:**
- FE có thể gọi API này khi User B vào trang tìm phòng
- Nếu có preferences → Điền form tự động
- Nếu không có → Hiển thị form trống

---

### 2. Tự động match với preferences đã lưu

**Endpoint:** `GET /api/posts/roommate/find`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200) - Có preferences:**
```json
{
  "matches": [
    {
      "postId": 456,
      "roomId": 123,
      "posterId": 20,
      "posterName": "Nguyễn Văn A",
      "posterAge": 25,
      "posterGender": "male",
      "posterOccupation": "Sinh viên",
      "roomNumber": "101",
      "buildingName": "Tòa ABC",
      "address": "123 Đường XYZ, Quận 1, TP.HCM",
      "price": 2500000,
      "area": 20,
      "traits": ["sạch sẽ", "hòa đồng"],
      "matchScore": 85,
      "images": ["url1", "url2"]
    }
  ],
  "totalMatches": 1
}
```

**Response (200) - Chưa có preferences:**
```json
{
  "matches": [],
  "totalMatches": 0,
  "message": "Bạn chưa có preferences. Vui lòng điền form tìm phòng."
}
```

**Use Case:**
- User B vào lại trang tìm phòng → Gọi `GET /api/posts/roommate/find`
- Tự động match với preferences đã lưu → Hiển thị danh sách matches
- Không cần điền form lại

---

### 3. Tìm phòng với form (điền mới hoặc sửa)

**Endpoint:** `POST /api/posts/roommate/find`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "ageRange": [20, 30],
  "gender": "any",
  "traits": ["sạch sẽ", "hòa đồng"],
  "maxPrice": 3000000,
  "personalInfo": {
    "fullName": "Nguyễn Văn B",
    "age": 25,
    "gender": "male",
    "occupation": "Sinh viên",
    "lifestyle": "normal",
    "cleanliness": "clean"
  }
}
```

**Response (200):**
```json
{
  "matches": [...],
  "totalMatches": 5
}
```

**Lưu ý:**
- Backend tự động lưu/update preferences khi gọi API này
- Lần sau User B có thể dùng `GET /api/posts/find-roommate` để match tự động

---

## 🔄 API Đã Cập Nhật

### 1. Tạo/cập nhật Roommate Preference (Poster)

**Endpoint:** `PUT /api/users/rooms/:roomId/roommate-preference`

**Request Body mới:**
```json
{
  "enabled": true,
  "requirements": {
    "ageRange": [20, 30],
    "gender": "any",
    "traits": ["sạch sẽ", "yên tĩnh"],
    "maxPrice": 3000000
  },
  "posterTraits": ["sạch sẽ", "hòa đồng"]  // ⭐ Field mới
}
```

**TypeScript Interface:**
```typescript
interface CreateRoommatePreferenceDto {
  enabled: boolean;
  requirements?: {
    ageRange: [number, number];
    gender: 'male' | 'female' | 'any';
    traits?: string[];
    maxPrice: number;
  };
  posterTraits?: string[];  // ⭐ Traits của chính Poster
}
```

**Lưu ý:**
- `posterTraits`: Traits của chính Poster (người đăng bài)
- `requirements.traits`: Yêu cầu về traits của người ở ghép
- Cả hai field đều optional, nhưng nên gửi để matching chính xác hơn

---

## 📊 Schema Mới

### SeekerPreference

**Collection:** `seeker_preferences`

**Schema:**
```typescript
interface SeekerPreference {
  seekerPreferenceId: number;
  userId: number;  // Seeker ID (unique)
  requirements: {
    ageRange: [number, number];
    gender: 'male' | 'female' | 'any';
    traits: string[];
    maxPrice: number;
  };
  seekerTraits: string[];  // Traits của chính Seeker
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔄 Logic Matching Đã Cập Nhật

### 1. So sánh giá

**Trước:**
- Condition 1: `seeker.maxPrice >= room.price`
- Condition 2: `room.price <= seeker.maxPrice`

**Sau:**
- Condition 1: `seeker.maxPrice >= postRequirements.maxPrice` (từ `preference.requirements.maxPrice`)
- Condition 2: `postRequirements.maxPrice <= seeker.maxPrice`

**Lý do:** So sánh với giá tối đa trong preferences, không phải giá phòng thực tế.

---

### 2. Traits của Poster

**Trước:**
- Poster traits: Lấy từ `personalInfo.habits` (đã bỏ)

**Sau:**
- Poster traits: Lấy từ `preference.posterTraits` (đã lưu trong `roommatePreferences`)

**Lưu ý:**
- Poster cần gửi `posterTraits` khi tạo/cập nhật preference
- Nếu không có `posterTraits` và Seeker yêu cầu traits → Condition 2 sẽ FAIL

---

### 3. Traits của Seeker

**Trước:**
- Seeker traits: Lấy từ `personalInfo.habits` (đã bỏ)

**Sau:**
- Seeker traits: Lấy từ `findRoommateDto.traits` (FE gửi trong request)

**Lưu ý:**
- FE cần gửi `traits` trong request body
- Traits này được lưu vào `seekerPreferences.seekerTraits`

---

## 🎯 Luồng Hoạt Động Mới

### Scenario 1: User B điền form lần đầu

1. User B điền form tìm phòng
2. FE gọi `POST /api/posts/find-roommate` với form data
3. Backend:
   - Lưu preferences vào `seeker_preferences`
   - Match với các phòng phù hợp
   - Trả về danh sách matches
4. FE hiển thị matches

---

### Scenario 2: User B vào lại (tự động match)

1. User B vào trang tìm phòng
2. FE gọi `GET /api/posts/roommate/find`
3. Backend:
   - Lấy preferences đã lưu từ `seeker_preferences`
   - Lấy personalInfo từ user/profile
   - Match tự động với các phòng phù hợp
   - Trả về danh sách matches
4. FE hiển thị matches (không cần form)

---

### Scenario 3: User B sửa form

1. User B sửa form tìm phòng
2. FE gọi `POST /api/posts/roommate/find` với form data mới
3. Backend:
   - Update preferences trong `seeker_preferences`
   - Match lại với các phòng phù hợp
   - Trả về danh sách matches mới
4. FE hiển thị matches mới

---

### Scenario 4: User A tạo/cập nhật preference

1. User A bật toggle "Tìm người ở ghép" trên My Rooms
2. FE gọi `PUT /api/users/rooms/:roomId/roommate-preference` với:
   ```json
   {
     "enabled": true,
     "requirements": {
       "ageRange": [20, 30],
       "gender": "any",
       "traits": ["sạch sẽ"],
       "maxPrice": 3000000
     },
     "posterTraits": ["sạch sẽ", "hòa đồng"]  // ⭐ Bắt buộc gửi
   }
   ```
3. Backend:
   - Lưu preferences vào `roommate_preferences`
   - Tự động tạo bài đăng "tìm ở ghép"
   - Lưu `posterTraits` để matching

---

## 📝 Checklist Frontend

### ✅ Cần cập nhật

1. **Form tìm phòng:**
   - [ ] Thêm field `traits` (traits của User B)
   - [ ] Gửi `traits` trong request body

2. **Form tạo/cập nhật preference (Poster):**
   - [ ] Thêm field `posterTraits` (traits của User A)
   - [ ] Gửi `posterTraits` trong request body

3. **Trang tìm phòng:**
   - [ ] Gọi `GET /api/users/seeker-preference` khi vào trang
   - [ ] Nếu có preferences → Điền form tự động
   - [ ] Gọi `GET /api/posts/find-roommate` để tự động match
   - [ ] Nếu không có preferences → Hiển thị form trống

4. **API Service:**
   - [ ] Thêm function `getSeekerPreference()`
   - [ ] Thêm function `findRoommateAuto()` (GET)
   - [ ] Cập nhật function `findRoommate()` (POST) - thêm field `traits`
   - [ ] Cập nhật function `updateRoommatePreference()` - thêm field `posterTraits`

---

## 🔧 API Service Functions (TypeScript)

```typescript
// Lấy preferences đã lưu
async getSeekerPreference(): Promise<SeekerPreferenceResponse> {
  const response = await axios.get(
    `${API_BASE_URL}/users/seeker-preference`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    }
  );
  return response.data;
}

// Tự động match (không cần form)
async findRoommateAuto(): Promise<{ matches: RoomMatch[]; totalMatches: number; message?: string }> {
  const response = await axios.get(
    `${API_BASE_URL}/posts/roommate/find`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    }
  );
  return response.data;
}

// Tìm phòng với form (điền mới hoặc sửa)
async findRoommate(data: FindRoommateDto): Promise<{ matches: RoomMatch[]; totalMatches: number }> {
  const response = await axios.post(
    `${API_BASE_URL}/posts/roommate/find`,
    data,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

// Tạo/cập nhật preference (Poster)
async updateRoommatePreference(
  roomId: number,
  data: CreateRoommatePreferenceDto
): Promise<any> {
  const response = await axios.put(
    `${API_BASE_URL}/users/rooms/${roomId}/roommate-preference`,
    data,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}
```

---

## 📋 DTOs Cập Nhật

### FindRoommateDto

```typescript
interface FindRoommateDto {
  ageRange: [number, number];
  gender: 'male' | 'female' | 'any';
  traits?: string[];  // ⭐ Traits của User B (Seeker)
  maxPrice: number;
  personalInfo?: {
    fullName?: string;
    age?: number;
    gender?: 'male' | 'female' | 'other';
    occupation?: string;
    lifestyle?: 'early' | 'normal' | 'late';
    cleanliness?: 'very_clean' | 'clean' | 'normal' | 'flexible';
  };
}
```

### CreateRoommatePreferenceDto

```typescript
interface CreateRoommatePreferenceDto {
  enabled: boolean;
  requirements?: {
    ageRange: [number, number];
    gender: 'male' | 'female' | 'any';
    traits?: string[];  // Yêu cầu về traits của người ở ghép
    maxPrice: number;
  };
  posterTraits?: string[];  // ⭐ Traits của chính Poster (User A)
}
```

---

## ⚠️ Breaking Changes

### 1. Field `habits` đã bỏ

**Trước:**
- `personalInfo.habits` được dùng để matching

**Sau:**
- Không còn `habits` trong `personalInfo`
- Dùng `traits` từ request body

**Action Required:**
- FE không nên gửi `habits` trong `personalInfo`
- FE nên gửi `traits` trong request body

---

### 2. So sánh giá đã thay đổi

**Trước:**
- So sánh với `room.price`

**Sau:**
- So sánh với `preference.requirements.maxPrice`

**Action Required:**
- Không có thay đổi ở FE (logic matching ở backend)

---

## 🎨 UI/UX Gợi Ý

### 1. Trang tìm phòng

**Khi User B vào trang:**
1. Gọi `GET /api/users/seeker-preference`
2. Nếu có preferences:
   - Điền form tự động với preferences đã lưu
   - Gọi `GET /api/posts/find-roommate` để tự động match
   - Hiển thị matches ngay lập tức
   - Có nút "Sửa tìm kiếm" để sửa form
3. Nếu không có preferences:
   - Hiển thị form trống
   - User B điền form → Gọi `POST /api/posts/find-roommate`

---

### 2. Form tìm phòng

**Fields cần có:**
- Age Range (min, max)
- Gender (male/female/any)
- Traits (multi-select) - ⭐ Traits của User B
- Max Price
- Personal Info (optional):
  - Full Name
  - Age
  - Gender
  - Occupation
  - Lifestyle
  - Cleanliness

---

### 3. Form tạo/cập nhật preference (Poster)

**Fields cần có:**
- Enabled (toggle)
- Requirements:
  - Age Range (min, max)
  - Gender (male/female/any)
  - Traits (multi-select) - Yêu cầu về traits của người ở ghép
  - Max Price
- Poster Traits (multi-select) - ⭐ Traits của chính Poster

---

## 📝 Lưu Ý Quan Trọng

1. **Traits của Poster:**
   - Poster cần gửi `posterTraits` khi tạo/cập nhật preference
   - Nếu không có `posterTraits` và Seeker yêu cầu traits → Matching sẽ FAIL

2. **Traits của Seeker:**
   - Seeker cần gửi `traits` trong request body
   - Traits này được lưu vào `seekerPreferences.seekerTraits`

3. **Tự động lưu preferences:**
   - Mỗi khi gọi `POST /api/posts/find-roommate`, backend tự động lưu/update preferences
   - Lần sau User B có thể dùng `GET /api/posts/find-roommate` để match tự động

4. **So sánh giá:**
   - Matching so sánh với `maxPrice` trong preferences, không phải `room.price`
   - Đảm bảo logic matching chính xác hơn

---

## 🔍 Ví Dụ Sử Dụng

### Ví dụ 1: User B điền form lần đầu

```typescript
// User B điền form
const formData = {
  ageRange: [20, 30],
  gender: 'any',
  traits: ['sạch sẽ', 'hòa đồng'],
  maxPrice: 3000000,
  personalInfo: {
    fullName: 'Nguyễn Văn B',
    age: 25,
    gender: 'male',
    occupation: 'Sinh viên',
    lifestyle: 'normal',
    cleanliness: 'clean'
  }
};

// Gọi API
const result = await findRoommate(formData);
// Backend tự động lưu preferences
// Trả về matches
```

### Ví dụ 2: User B vào lại (tự động match)

```typescript
// User B vào trang tìm phòng
const preferences = await getSeekerPreference();

if (preferences.hasPreferences) {
  // Điền form tự động
  fillForm(preferences.requirements, preferences.seekerTraits);
  
  // Tự động match
  const result = await findRoommateAuto();
  // Trả về matches
} else {
  // Hiển thị form trống
  showEmptyForm();
}
```

### Ví dụ 3: User A tạo preference

```typescript
// User A bật toggle "Tìm người ở ghép"
const preferenceData = {
  enabled: true,
  requirements: {
    ageRange: [20, 30],
    gender: 'any',
    traits: ['sạch sẽ'],  // Yêu cầu về traits của người ở ghép
    maxPrice: 3000000
  },
  posterTraits: ['sạch sẽ', 'hòa đồng']  // Traits của chính User A
};

await updateRoommatePreference(roomId, preferenceData);
// Backend tự động tạo bài đăng
```

---

## 🐛 Troubleshooting

### 1. Không có matches mặc dù có preferences

**Nguyên nhân:**
- Preferences không đầy đủ
- Không có phòng phù hợp
- Contract không active

**Giải pháp:**
- Kiểm tra preferences có đầy đủ không
- Kiểm tra có phòng nào enabled không
- Kiểm tra contract status

---

### 2. Matching FAIL ở Condition 2 (Traits)

**Nguyên nhân:**
- Poster không có `posterTraits`
- Seeker yêu cầu traits nhưng Poster không có

**Giải pháp:**
- Đảm bảo Poster gửi `posterTraits` khi tạo/cập nhật preference
- Hoặc Seeker không yêu cầu traits

---

### 3. Preferences không được lưu

**Nguyên nhân:**
- Lỗi khi lưu preferences (nhưng không throw error)

**Giải pháp:**
- Kiểm tra log backend
- Thử gọi API lại

---

## 📚 Tài Liệu Tham Khảo

- [Roommate Auto Post Integration Guide](./roommate-auto-post-integration.md)
- [Roommate Matching Summary](./roommate-matching-summary.md)
- [Roommate Matching Answers](./roommate-matching-answers.md)

---

## ✅ Checklist Tích Hợp

- [ ] Cập nhật API service functions
- [ ] Thêm field `traits` vào form tìm phòng (Seeker)
- [ ] Thêm field `posterTraits` vào form tạo/cập nhật preference (Poster)
- [ ] Implement logic tự động điền form từ preferences
- [ ] Implement logic tự động match khi vào trang
- [ ] Test flow điền form lần đầu
- [ ] Test flow vào lại (tự động match)
- [ ] Test flow sửa form
- [ ] Test matching với `posterTraits`
- [ ] Test matching với `traits` của Seeker

---

**Cập nhật lần cuối:** 2024-01-15

