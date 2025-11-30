# Hướng Dẫn Tích Hợp - Cập Nhật User Profile

## 📋 Tổng Quan Thay Đổi

Backend đã được cập nhật với 2 thay đổi chính:

1. **Normalize Response**: Đảm bảo các field array luôn là mảng (không bao giờ `null` hoặc `undefined`)
2. **Auto-clear preferredWards**: Tự động xóa `preferredWards` cũ khi user đổi thành phố

---

## 🔄 Thay Đổi 1: Normalize Response

### Vấn Đề Trước Đây
- API `GET /api/user-profiles/me` đôi khi không trả về `preferredWards` hoặc trả về `null/undefined`
- Các field array (`preferredWards`, `roomType`, `contactMethod`) có thể bị thiếu

### Giải Pháp
**Backend đã tự động normalize tất cả response**, đảm bảo:
- `preferredWards` luôn là mảng (có thể rỗng `[]` nhưng không bao giờ `null`)
- `roomType` luôn là mảng
- `contactMethod` luôn là mảng

### Frontend Không Cần Thay Đổi
✅ Frontend có thể yên tâm sử dụng các field này mà không cần check `null/undefined`

**Ví dụ:**
```typescript
// Trước đây cần check:
const wards = profile.preferredWards || [];

// Bây giờ không cần check nữa:
const wards = profile.preferredWards; // Luôn là mảng
```

---

## 🔄 Thay Đổi 2: Auto-clear preferredWards Khi Đổi Thành Phố

### Vấn Đề Trước Đây
Khi user đổi thành phố (ví dụ: HCM → Vĩnh Long), các phường cũ (Phường A, Phường B) vẫn còn trong DB, dẫn đến:
- User chọn Vĩnh Long nhưng vẫn thấy phường của HCM
- **Đặc biệt nguy hiểm**: Có phường/xã trùng tên ở các thành phố khác nhau (ví dụ: "Bình Minh" ở cả Vĩnh Long và Hà Nội)
- Nếu user chọn "Bình Minh" ở Vĩnh Long, sau đó đổi sang Hà Nội, DB vẫn lưu "Bình Minh" (từ Vĩnh Long) dù user không chọn

### Giải Pháp
**Backend tự động xóa `preferredWards` cũ khi `preferredCity` thay đổi và IGNORE `preferredWards` trong request để tránh lưu phường cũ**

### Logic Backend
```typescript
// 1. Kiểm tra thành phố có thay đổi không
const cityChanged = preferredCity !== undefined && preferredCity !== profile.preferredCity;

// 2. Nếu thay đổi, clear preferredWards cũ và IGNORE preferredWards trong request
if (cityChanged) {
  profile.preferredWards = [];
  // Loại bỏ preferredWards khỏi DTO để không ghi đè
  const { preferredWards, ...updateDtoWithoutWards } = updateUserProfileDto;
  Object.assign(profile, updateDtoWithoutWards);
} else {
  // Nếu thành phố không thay đổi, update bình thường
  Object.assign(profile, updateUserProfileDto);
}
```

### ⚠️ QUAN TRỌNG: Frontend Phải Gửi 2 Request Riêng

**Khi user đổi thành phố, Frontend PHẢI gửi 2 request riêng:**

#### ✅ Request 1: Update preferredCity (Backend Tự Động Clear preferredWards)

```typescript
// Ví dụ: User đổi từ HCM → Vĩnh Long
const updateData = {
  preferredCity: "Vĩnh Long"
  // KHÔNG gửi preferredWards trong request này
};

await updateProfile(updateData);
```

**Kết quả:**
- Backend tự động clear `preferredWards` cũ
- `preferredWards` sẽ là mảng rỗng `[]`
- ✅ User sẽ thấy form phường trống, sẵn sàng chọn phường mới

#### ✅ Request 2: Update preferredWards Sau Khi User Chọn Phường Mới

```typescript
// Sau khi user chọn phường mới (ví dụ: Phường C, Phường D)
const updateData = {
  preferredWards: ["Phường C", "Phường D"]
  // KHÔNG gửi preferredCity trong request này (vì đã set ở request trước)
};

await updateProfile(updateData);
```

**Kết quả:**
- Backend update `preferredWards` mới
- ✅ Dữ liệu đúng

### ❌ KHÔNG ĐƯỢC: Gửi Cả preferredCity Và preferredWards Cùng Lúc

**Backend sẽ IGNORE `preferredWards` trong request nếu `preferredCity` thay đổi:**

```typescript
// ❌ SAI - Backend sẽ IGNORE preferredWards
const updateData = {
  preferredCity: "Vĩnh Long",
  preferredWards: ["Phường C", "Phường D"] // ← Sẽ bị IGNORE
};

await updateProfile(updateData);
// Kết quả: preferredCity = "Vĩnh Long", preferredWards = [] (bị clear)
```

### ✅ Đúng: Gửi 2 Request Riêng

```typescript
// ✅ ĐÚNG - Request 1: Update city
await updateProfile({ preferredCity: "Vĩnh Long" });

// ✅ ĐÚNG - Request 2: Update wards sau khi user chọn
await updateProfile({ preferredWards: ["Phường C", "Phường D"] });
```

---

## 📝 Best Practices Cho Frontend

### 1. Khi User Đổi Thành Phố

```typescript
const handleCityChange = async (newCity: string) => {
  // Clear phường trong state trước
  setSelectedWards([]);
  
  // Request 1: Chỉ gửi preferredCity (KHÔNG gửi preferredWards)
  await updateProfile({
    preferredCity: newCity
    // KHÔNG gửi preferredWards
  });
  
  // Load lại danh sách phường theo thành phố mới
  await loadWardsByCity(newCity);
};
```

### 2. Khi User Chọn Phường Mới

```typescript
const handleWardsChange = async (selectedWards: string[]) => {
  // Request 2: Chỉ gửi preferredWards (KHÔNG gửi preferredCity)
  // Vì preferredCity đã được set ở request trước
  await updateProfile({
    preferredWards: selectedWards
    // KHÔNG gửi preferredCity
  });
};
```

### 3. Khi User Chỉ Cập Nhật Phường (Không Đổi Thành Phố)

```typescript
const handleWardsChange = async (selectedWards: string[]) => {
  // Nếu thành phố không thay đổi, có thể gửi preferredWards bình thường
  await updateProfile({
    preferredWards: selectedWards
  });
};
```

### 3. Khi Load Profile

```typescript
const loadProfile = async () => {
  const profile = await getMyProfile();
  
  // Không cần check null/undefined nữa
  setCity(profile.preferredCity || '');
  setWards(profile.preferredWards); // ← Luôn là mảng
  setRoomType(profile.roomType); // ← Luôn là mảng
  setContactMethod(profile.contactMethod); // ← Luôn là mảng
};
```

---

## 🧪 Test Cases

### Test Case 1: Đổi Thành Phố Và Chọn Phường Mới (2 Requests)
```typescript
// Initial: HCM, ["Phường A", "Phường B"]
// Action: Đổi sang Vĩnh Long, chọn ["Phường C", "Phường D"]

// Request 1: Update city
await updateProfile({
  preferredCity: "Vĩnh Long"
  // KHÔNG gửi preferredWards
});

// Expected Result sau Request 1:
// - preferredCity: "Vĩnh Long"
// - preferredWards: [] ✅ (đã được clear)

// Request 2: Update wards
await updateProfile({
  preferredWards: ["Phường C", "Phường D"]
});

// Expected Result sau Request 2:
// - preferredCity: "Vĩnh Long"
// - preferredWards: ["Phường C", "Phường D"] ✅
```

### Test Case 2: Chỉ Đổi Thành Phố
```typescript
// Initial: HCM, ["Phường A", "Phường B"]
// Action: Đổi sang Vĩnh Long, chưa chọn phường
await updateProfile({
  preferredCity: "Vĩnh Long"
});

// Expected Result:
// - preferredCity: "Vĩnh Long"
// - preferredWards: [] ✅ (đã được clear)
```

### Test Case 3: Phường Trùng Tên (Quan Trọng!)
```typescript
// Initial: Vĩnh Long, ["Phường Bình Minh"] (từ Vĩnh Long)
// Action: Đổi sang Hà Nội (Hà Nội cũng có "Phường Bình Minh" nhưng là phường khác)

// Request 1: Update city
await updateProfile({
  preferredCity: "Hà Nội"
  // KHÔNG gửi preferredWards
});

// Expected Result:
// - preferredCity: "Hà Nội"
// - preferredWards: [] ✅ (đã được clear, KHÔNG lưu "Bình Minh" từ Vĩnh Long)

// Request 2: User chọn phường mới
await updateProfile({
  preferredWards: ["Phường Bình Minh"] // Phường Bình Minh của Hà Nội
});

// Expected Result:
// - preferredCity: "Hà Nội"
// - preferredWards: ["Phường Bình Minh"] ✅ (phường mới từ Hà Nội)
```

### Test Case 4: Gửi Cả City Và Wards Cùng Lúc (Sẽ Bị Ignore Wards)
```typescript
// Initial: HCM, ["Phường A", "Phường B"]
// Action: Đổi sang Vĩnh Long, gửi cả preferredWards cùng lúc

await updateProfile({
  preferredCity: "Vĩnh Long",
  preferredWards: ["Phường C", "Phường D"] // ← Sẽ bị IGNORE
});

// Expected Result:
// - preferredCity: "Vĩnh Long"
// - preferredWards: [] ✅ (bị clear, preferredWards trong request bị IGNORE)
```

### Test Case 3: Load Profile
```typescript
const profile = await getMyProfile();

// Expected:
// - profile.preferredWards luôn là mảng (không bao giờ null)
// - profile.roomType luôn là mảng
// - profile.contactMethod luôn là mảng
```

---

## 📊 API Endpoints (Không Thay Đổi)

### GET /api/user-profiles/me
**Response Format:**
```json
{
  "_id": "...",
  "profileId": 2,
  "userId": 3,
  "preferredCity": "Tp Hồ Chí Minh",
  "preferredWards": [],  // ← Luôn là mảng, không bao giờ null
  "roomType": [],        // ← Luôn là mảng
  "contactMethod": [],   // ← Luôn là mảng
  "occupation": "student",
  "pets": true,
  ...
}
```

### PATCH /api/user-profiles/me
**Request Body:**
```json
{
  "preferredCity": "Vĩnh Long",
  "preferredWards": ["Phường C", "Phường D"]  // ← Nên gửi cùng lúc với preferredCity
}
```

---

## ⚠️ Breaking Changes

**KHÔNG CÓ BREAKING CHANGES**

- API endpoints không thay đổi
- Request format không thay đổi
- Response format không thay đổi (chỉ đảm bảo consistency hơn)

---

## ✅ Checklist Tích Hợp

- [ ] Kiểm tra code Frontend có check `preferredWards === null` không → Có thể bỏ đi
- [ ] Đảm bảo khi đổi thành phố, Frontend gửi 2 request riêng (không gửi cả `preferredCity` và `preferredWards` cùng lúc)
- [ ] Test flow: Đổi thành phố → Chọn phường mới → Verify data đúng
- [ ] Test flow: Load profile → Verify các field array luôn là mảng
- [ ] Test flow: Phường trùng tên (ví dụ: "Bình Minh" ở cả Vĩnh Long và Hà Nội) → Verify không lưu nhầm

---

## 📞 Hỗ Trợ

Nếu có vấn đề khi tích hợp, vui lòng liên hệ Backend team.

