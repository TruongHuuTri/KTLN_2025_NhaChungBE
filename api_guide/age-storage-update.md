# Hướng Dẫn Cập Nhật Frontend - Lưu Tuổi và Giới Tính Vào Preferences

## 📋 Tổng Quan Thay Đổi

Backend đã cập nhật logic lưu và sử dụng tuổi và giới tính trong hệ thống roommate matching:

1. **Tuổi và giới tính được lưu vào Preferences** - Không cần query verification mỗi lần matching
2. **Seeker không cho nhập tuổi và giới tính** - Chỉ lấy từ verification (đã xác thực)
3. **Poster tuổi và giới tính lấy từ verification** - Tự động lưu khi tạo/cập nhật preference
4. **Bắt buộc phải có verification** - Không có fallback cứng, nếu không có verification sẽ throw error

---

## 🔄 Thay Đổi Chi Tiết

### 1. Seeker (User B) - Không Cho Nhập Tuổi và Giới Tính

**Trước:**
- FE có thể gửi `personalInfo.age` và `personalInfo.gender` trong request
- Backend ưu tiên sử dụng từ request

**Sau:**
- ❌ **KHÔNG gửi `personalInfo.age` và `personalInfo.gender` trong request nữa**
- Backend tự động lấy từ `verification.dateOfBirth` và `verification.gender`
- Tuổi và giới tính được lưu vào `seekerPreference.seekerAge` và `seekerPreference.seekerGender`
- **Bắt buộc phải có verification** - Nếu không có sẽ throw error: "Vui lòng xác thực lại tài khoản để sử dụng tính năng này"

**Action Required:**
- ❌ Bỏ field `age` và `gender` trong `personalInfo` khi gọi API tìm phòng
- ✅ Backend tự động lấy từ verification
- ✅ Hiển thị tuổi và giới tính trong form (từ preferences) nhưng **KHÔNG cho sửa**

---

### 2. Poster (User A) - Tuổi và Giới Tính Tự Động Lấy Từ Verification

**Trước:**
- Tuổi và giới tính lấy từ verification mỗi lần

**Sau:**
- Tuổi và giới tính lấy từ verification và **lưu vào `preference.posterAge` và `preference.posterGender`**
- **Bắt buộc phải có verification** - Nếu không có sẽ throw error

---

### 3. API Không Thay Đổi

Tất cả API endpoints vẫn giữ nguyên:

- `GET /api/users/me/seeker-preference` - Lấy preferences đã lưu (bao gồm tuổi và giới tính)
- `GET /api/posts/roommate/find` - Tự động match
- `POST /api/posts/roommate/find` - Tìm phòng với form
- `PUT /api/users/rooms/:roomId/roommate-preference` - Tạo/cập nhật preference (Poster)

**Lưu ý:** Chỉ logic backend thay đổi, API contract không đổi.

---

## 📝 Cập Nhật DTOs

### FindRoommateDto (Request Body)

**Trước:**
```typescript
interface FindRoommateDto {
  ageRange: [number, number];
  gender: 'male' | 'female' | 'any';
  traits?: string[];
  maxPrice: number;
  personalInfo?: {
    fullName?: string;
    age?: number;  // ❌ BỎ FIELD NÀY
    gender?: 'male' | 'female' | 'other';  // ❌ BỎ FIELD NÀY
    occupation?: string;
    lifestyle?: 'early' | 'normal' | 'late';
    cleanliness?: 'very_clean' | 'clean' | 'normal' | 'flexible';
  };
}
```

**Sau:**
```typescript
interface FindRoommateDto {
  ageRange: [number, number];
  gender: 'male' | 'female' | 'any';
  traits?: string[];
  maxPrice: number;
  personalInfo?: {
    fullName?: string;
    // ❌ KHÔNG GỬI age và gender NỮA - Backend tự động lấy từ verification
    occupation?: string;
    lifestyle?: 'early' | 'normal' | 'late';
    cleanliness?: 'very_clean' | 'clean' | 'normal' | 'flexible';
  };
}
```

---

### SeekerPreferenceResponse (Response từ GET /api/users/me/seeker-preference)

**Mới:** Response có thể bao gồm tuổi và giới tính đã lưu:

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
  seekerAge?: number;  // ⭐ Tuổi đã lưu từ verification
  seekerGender?: string;  // ⭐ Giới tính đã lưu từ verification
  updatedAt?: Date;
}
```

---

## 🔧 Cập Nhật Frontend Code

### 1. Form Tìm Phòng (Seeker) - Hiển Thị Nhưng Không Cho Sửa

**Trước:**
```typescript
const formData = {
  ageRange: [20, 30],
  gender: 'any',
  traits: ['sạch sẽ', 'hòa đồng'],
  maxPrice: 3000000,
  personalInfo: {
    fullName: 'Nguyễn Văn B',
    age: 25,  // ❌ BỎ FIELD NÀY
    gender: 'male',  // ❌ BỎ FIELD NÀY
    occupation: 'Sinh viên',
    lifestyle: 'normal',
    cleanliness: 'clean'
  }
};
```

**Sau:**
```typescript
// Lấy preferences đã lưu (có tuổi và giới tính)
const preferences = await getSeekerPreference();

const formData = {
  ageRange: [20, 30],
  gender: 'any',
  traits: ['sạch sẽ', 'hòa đồng'],
  maxPrice: 3000000,
  personalInfo: {
    fullName: 'Nguyễn Văn B',
    // ❌ KHÔNG GỬI age và gender - Backend tự động lấy từ verification
    occupation: 'Sinh viên',
    lifestyle: 'normal',
    cleanliness: 'clean'
  }
};

// Hiển thị trong form (read-only):
// - Tuổi: preferences.seekerAge (nếu có) hoặc từ verification
// - Giới tính: preferences.seekerGender (nếu có) hoặc từ verification
```

---

### 2. UI/UX - Hiển Thị Tuổi và Giới Tính (Read-Only)

```typescript
// Component Form Tìm Phòng
const FindRoommateForm = () => {
  const [preferences, setPreferences] = useState(null);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [userGender, setUserGender] = useState<string | null>(null);

  useEffect(() => {
    // Lấy preferences đã lưu
    getSeekerPreference().then(data => {
      if (data.hasPreferences) {
        setPreferences(data);
        // Hiển thị tuổi và giới tính từ preferences
        setUserAge(data.seekerAge);
        setUserGender(data.seekerGender);
      }
    });
  }, []);

  return (
    <form>
      {/* Hiển thị tuổi (read-only) */}
      <div className="form-group">
        <label>Tuổi của bạn:</label>
        <input 
          type="text" 
          value={userAge ? `${userAge} tuổi` : 'Đang tải...'} 
          disabled 
          readOnly
        />
        <small>Tuổi được lấy từ thông tin xác thực</small>
      </div>

      {/* Hiển thị giới tính (read-only) */}
      <div className="form-group">
        <label>Giới tính của bạn:</label>
        <input 
          type="text" 
          value={userGender === 'male' ? 'Nam' : userGender === 'female' ? 'Nữ' : 'Đang tải...'} 
          disabled 
          readOnly
        />
        <small>Giới tính được lấy từ thông tin xác thực</small>
      </div>

      {/* Các field khác có thể chỉnh sửa */}
      <div className="form-group">
        <label>Khoảng tuổi mong muốn:</label>
        <input type="number" name="ageRangeMin" />
        <input type="number" name="ageRangeMax" />
      </div>
      {/* ... */}
    </form>
  );
};
```

---

## ⚠️ Breaking Changes

### 1. Bỏ Field `age` và `gender` trong `personalInfo`

**Trước:**
- FE có thể gửi `personalInfo.age` và `personalInfo.gender` trong request
- Backend ưu tiên sử dụng từ request

**Sau:**
- ❌ **KHÔNG gửi `personalInfo.age` và `personalInfo.gender` nữa**
- Backend tự động lấy từ verification
- Nếu gửi, backend sẽ **bỏ qua** và lấy từ verification

**Action Required:**
- ❌ Xóa field `age` và `gender` khỏi form tìm phòng (input fields)
- ✅ Hiển thị tuổi và giới tính từ preferences (read-only)
- ❌ Xóa `personalInfo.age` và `personalInfo.gender` khỏi request body

---

### 2. Bắt Buộc Phải Có Verification

**Trước:**
- Nếu không có verification → Backend dùng giá trị mặc định (25 tuổi, 'other')

**Sau:**
- ❌ **KHÔNG có fallback cứng**
- Nếu không có verification hoặc verification thiếu `dateOfBirth`/`gender` → **Throw error**

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Vui lòng xác thực lại tài khoản để sử dụng tính năng này"
}
```

**Action Required:**
- ✅ Kiểm tra verification trước khi cho phép user sử dụng tính năng
- ✅ Hiển thị thông báo yêu cầu xác thực nếu chưa có verification
- ✅ Xử lý error khi API trả về error này

---

## 🎯 Luồng Hoạt Động Mới

### Scenario 1: User B điền form lần đầu

1. User B vào trang tìm phòng
2. FE kiểm tra verification:
   - Nếu chưa có verification → Hiển thị thông báo yêu cầu xác thực
   - Nếu có verification → Tiếp tục
3. FE gọi `GET /api/users/me/seeker-preference` để lấy preferences (nếu có)
4. FE hiển thị form:
   - Tuổi và giới tính: Hiển thị từ preferences hoặc verification (read-only)
   - Các field khác: Cho phép chỉnh sửa
5. User B điền form và submit
6. FE gọi `POST /api/posts/roommate/find` với form data (không có `personalInfo.age` và `personalInfo.gender`)
7. Backend:
   - Lấy tuổi và giới tính từ `verification.dateOfBirth` và `verification.gender`
   - Lưu vào `seekerPreference.seekerAge` và `seekerPreference.seekerGender`
   - Match với các phòng phù hợp
   - Trả về danh sách matches
8. FE hiển thị matches

---

### Scenario 2: User B vào lại (tự động match)

1. User B vào trang tìm phòng
2. FE gọi `GET /api/posts/roommate/find`
3. Backend:
   - Lấy tuổi và giới tính từ `seekerPreference.seekerAge` và `seekerPreference.seekerGender` (đã lưu)
   - Nếu chưa có → Lấy từ verification (bắt buộc)
   - Match tự động với các phòng phù hợp
   - Trả về danh sách matches
4. FE hiển thị matches (không cần form)

---

### Scenario 3: User A tạo/cập nhật preference

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
     "posterTraits": ["sạch sẽ", "hòa đồng"]
   }
   ```
3. Backend:
   - Lấy tuổi và giới tính từ `verification.dateOfBirth` và `verification.gender` (bắt buộc)
   - Lưu vào `preference.posterAge` và `preference.posterGender`
   - Tự động tạo bài đăng "tìm ở ghép"
   - Lưu `posterTraits`, `posterAge`, và `posterGender` để matching

---

## 📋 Checklist Frontend

### ✅ Cần cập nhật

1. **Form tìm phòng:**
   - [ ] ❌ Xóa input field `age` khỏi form
   - [ ] ❌ Xóa input field `gender` khỏi form
   - [ ] ✅ Thêm hiển thị tuổi (read-only) từ preferences
   - [ ] ✅ Thêm hiển thị giới tính (read-only) từ preferences
   - [ ] ❌ Không gửi `personalInfo.age` và `personalInfo.gender` trong request
   - [ ] ✅ Giữ nguyên các field khác (fullName, occupation, etc.)

2. **API Service:**
   - [ ] ❌ Xóa `age` và `gender` khỏi `FindRoommateDto.personalInfo`
   - [ ] ✅ Cập nhật `SeekerPreferenceResponse` interface (thêm `seekerAge` và `seekerGender`)
   - [ ] ✅ Giữ nguyên các API calls (không thay đổi endpoints)

3. **Error Handling:**
   - [ ] ✅ Xử lý error "Vui lòng xác thực lại tài khoản để sử dụng tính năng này"
   - [ ] ✅ Kiểm tra verification trước khi cho phép user sử dụng tính năng
   - [ ] ✅ Hiển thị thông báo yêu cầu xác thực nếu chưa có verification

4. **UI/UX:**
   - [ ] ✅ Hiển thị tuổi và giới tính từ preferences (read-only)
   - [ ] ✅ Thêm tooltip/note: "Tuổi và giới tính được lấy từ thông tin xác thực"
   - [ ] ✅ Disable input fields cho tuổi và giới tính

---

## 🔍 Ví Dụ Sử Dụng

### Ví dụ 1: User B điền form lần đầu (SAU KHI CẬP NHẬT)

```typescript
// 1. Kiểm tra verification trước
const checkVerification = async () => {
  try {
    const verification = await getVerificationStatus();
    if (!verification || verification.status !== 'approved') {
      // Hiển thị thông báo yêu cầu xác thực
      showVerificationRequired();
      return;
    }
  } catch (error) {
    showVerificationRequired();
    return;
  }
};

// 2. Lấy preferences đã lưu (nếu có)
const preferences = await getSeekerPreference();

// 3. User B điền form (KHÔNG CÓ TUỔI VÀ GIỚI TÍNH)
const formData = {
  ageRange: [20, 30],
  gender: 'any',
  traits: ['sạch sẽ', 'hòa đồng'],
  maxPrice: 3000000,
  personalInfo: {
    fullName: 'Nguyễn Văn B',
    // ❌ KHÔNG GỬI age và gender
    occupation: 'Sinh viên',
    lifestyle: 'normal',
    cleanliness: 'clean'
  }
};

// 4. Gọi API
try {
  const result = await findRoommate(formData);
  // Backend tự động:
  // 1. Lấy tuổi và giới tính từ verification (bắt buộc)
  // 2. Lưu vào seekerPreference.seekerAge và seekerPreference.seekerGender
  // 3. Match và trả về matches
} catch (error) {
  if (error.message.includes('xác thực lại tài khoản')) {
    // Hiển thị thông báo yêu cầu xác thực
    showVerificationRequired();
  }
}
```

---

### Ví dụ 2: User B vào lại (tự động match)

```typescript
// User B vào trang tìm phòng
const preferences = await getSeekerPreference();

if (preferences.hasPreferences) {
  // Hiển thị tuổi và giới tính từ preferences (read-only)
  displayUserInfo({
    age: preferences.seekerAge,
    gender: preferences.seekerGender
  });
  
  // Điền form tự động (KHÔNG CÓ TUỔI VÀ GIỚI TÍNH)
  fillForm(preferences.requirements, preferences.seekerTraits);
  
  // Tự động match
  try {
    const result = await findRoommateAuto();
    // Backend tự động:
    // 1. Lấy tuổi và giới tính từ seekerPreference (đã lưu)
    // 2. Match và trả về matches
  } catch (error) {
    if (error.message.includes('xác thực lại tài khoản')) {
      showVerificationRequired();
    }
  }
} else {
  // Hiển thị form trống (KHÔNG CÓ FIELD TUỔI VÀ GIỚI TÍNH)
  showEmptyForm();
}
```

---

## ⚠️ Lưu Ý Quan Trọng

1. **Tuổi và giới tính được lấy từ verification:**
   - User B phải có verification approved với `dateOfBirth` và `gender`
   - Nếu không có → **Throw error**, không có fallback
   - Tuổi và giới tính được lưu vào `seekerPreference` sau lần tìm phòng đầu tiên

2. **Không gửi tuổi và giới tính từ request:**
   - Backend sẽ **bỏ qua** nếu FE gửi `personalInfo.age` hoặc `personalInfo.gender`
   - Luôn lấy từ verification để đảm bảo tính chính xác

3. **Hiển thị trong form nhưng không cho sửa:**
   - Tuổi và giới tính hiển thị từ preferences (đã lưu từ verification)
   - Input fields phải **disabled/read-only**
   - Thêm tooltip/note giải thích

4. **Bắt buộc phải có verification:**
   - Không có fallback cứng
   - Nếu không có verification → Error: "Vui lòng xác thực lại tài khoản để sử dụng tính năng này"
   - FE cần kiểm tra và xử lý error này

---

## 🐛 Troubleshooting

### 1. Error: "Vui lòng xác thực lại tài khoản để sử dụng tính năng này"

**Nguyên nhân:**
- User chưa có verification approved
- Verification thiếu `dateOfBirth` hoặc `gender`

**Giải pháp:**
- Yêu cầu User verify tài khoản
- Kiểm tra verification có đầy đủ `dateOfBirth` và `gender` không
- Hiển thị thông báo và redirect đến trang xác thực

---

### 2. Tuổi và giới tính không hiển thị trong form

**Nguyên nhân:**
- Preferences chưa có `seekerAge` và `seekerGender`
- Chưa gọi API lấy preferences

**Giải pháp:**
- Gọi `GET /api/users/me/seeker-preference` để lấy preferences
- Nếu chưa có → Lấy từ verification (sau khi user tìm phòng lần đầu)

---

### 3. Matching không chính xác do tuổi/giới tính

**Nguyên nhân:**
- Tuổi/giới tính trong preferences cũ (chưa cập nhật)
- Verification chưa được approve

**Giải pháp:**
- User B tìm phòng lại → Backend tự động cập nhật tuổi và giới tính
- Đảm bảo verification đã được approve với đầy đủ thông tin

---

## 📚 Tài Liệu Tham Khảo

- [Roommate Matching Updates](./roommate-matching-updates.md) - Tài liệu cập nhật matching trước đó
- [Room Sharing Flow](./room-sharing-flow.md) - Luồng đăng ký ở ghép

---

## ✅ Checklist Tích Hợp

- [ ] ❌ Xóa input field `age` và `gender` khỏi form tìm phòng
- [ ] ✅ Thêm hiển thị tuổi và giới tính (read-only) từ preferences
- [ ] ❌ Xóa `personalInfo.age` và `personalInfo.gender` khỏi request body
- [ ] ✅ Cập nhật TypeScript interfaces (bỏ `age` và `gender` khỏi `FindRoommateDto.personalInfo`)
- [ ] ✅ Cập nhật `SeekerPreferenceResponse` interface (thêm `seekerAge` và `seekerGender`)
- [ ] ✅ Xử lý error "Vui lòng xác thực lại tài khoản để sử dụng tính năng này"
- [ ] ✅ Kiểm tra verification trước khi cho phép user sử dụng tính năng
- [ ] ✅ Test flow điền form lần đầu (không có tuổi và giới tính)
- [ ] ✅ Test flow vào lại (tự động match)
- [ ] ✅ Test với user chưa có verification (throw error)
- [ ] ✅ Test với user có verification (lấy từ verification)

---

**Cập nhật lần cuối:** 2024-01-15

**Tóm tắt:** 
- Seeker không cho nhập tuổi và giới tính nữa, backend tự động lấy từ verification và lưu vào preferences
- Tuổi và giới tính hiển thị trong form (read-only) nhưng không cho sửa
- Bắt buộc phải có verification, không có fallback cứng
