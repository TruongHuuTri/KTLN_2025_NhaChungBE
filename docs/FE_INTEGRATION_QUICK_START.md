# Hướng Dẫn Tích Hợp Search API cho FE - Quick Start

## 🚀 Tóm Tắt

**2 API chính:**

### 1. Search API: `GET /api/search`

**3 trường hợp sử dụng:**

1. **Có query**: `GET /api/search?q=phòng trọ gò vấp 3tr&userId=123`
2. **Không query + có userId**: `GET /api/search?userId=123` → Personalized feed
3. **Không query + không userId**: `GET /api/search` → Freshness feed

### 2. Click Event API: `POST /api/events/click`

**Mục đích**: Gửi signal khi user click vào kết quả search → Cải thiện personalization

**Khi nào gọi:**

- User click vào một bài đăng trong kết quả search
- User xem chi tiết bài đăng

## ⚡ Sửa Code FE Ngay

### SearchDetails.tsx - Sửa hàm `performSearch`

#### 1. Thêm userId vào API call

```typescript
const params = new URLSearchParams();
if (finalQuery) params.append('q', finalQuery);

// ✅ THÊM DÒNG NÀY
if (user?.userId) {
  params.append('userId', String(user.userId));
}
```

#### 2. Sửa mapCategory (dòng 269-275)

```typescript
const mapCategory = (text: string) => {
  const t = text.toLowerCase();
  if (t.includes('phòng trọ')) return 'phong-tro'; // ❌ ĐỔI: phong_tro -> phong-tro
  if (t.includes('chung cư')) return 'chung-cu'; // ❌ ĐỔI: chung_cu -> chung-cu
  if (t.includes('nhà nguyên căn')) return 'nha-nguyen-can'; // ❌ ĐỔI: nha_nguyen_can -> nha-nguyen-can
  return undefined;
};
```

#### 3. Sửa rentType mapping (dòng 319-322)

```typescript
// rentType -> postType
if (activeFilters.rentType && activeFilters.rentType !== 'Tất cả') {
  const t = activeFilters.rentType.toLowerCase();
  if (t.includes('ở ghép')) {
    params.set('postType', 'roommate'); // ❌ ĐỔI: o_ghep -> roommate
  } else {
    params.set('postType', 'rent'); // ❌ ĐỔI: cho_thue -> rent
  }
}
```

#### 4. Sửa furniture mapping (dòng 329-334)

```typescript
// furniture
if (activeFilters.furniture && activeFilters.furniture !== 'Tất cả') {
  const f = activeFilters.furniture.toLowerCase();
  if (f.includes('có nội thất'))
    params.set('furniture', 'full'); // ❌ ĐỔI: co_noi_that -> full
  else if (f.includes('không nội thất'))
    params.set('furniture', 'none'); // ❌ ĐỔI: khong_noi_that -> none
  else if (f.includes('bán nội thất')) params.set('furniture', 'basic'); // ❌ ĐỔI: ban_noi_that -> basic
}
```

#### 5. Sửa demand -> gender (dòng 336-341)

```typescript
// demand -> gender (cho ở ghép)
if (activeFilters.demand && activeFilters.demand !== 'Tất cả') {
  const d = activeFilters.demand.toLowerCase();
  if (d === 'nam')
    params.set('gender', 'male'); // ❌ ĐỔI: demand -> gender, nam -> male
  else if (d === 'nữ' || d === 'nu')
    params.set('gender', 'female'); // ❌ ĐỔI: nu -> female
  else params.set('gender', 'any');
}
```

#### 6. Sửa bedrooms param (dòng 347)

```typescript
if (typeof bedrooms !== 'undefined')
  params.set('minBedrooms', String(bedrooms)); // ❌ ĐỔI: bedrooms -> minBedrooms
```

#### 7. Thêm user vào dependencies (dòng 412)

```typescript
}, [selected, activeFilters, user]); // ✅ THÊM: user vào dependencies
```

## 📋 Checklist Sửa Code

### SearchDetails.tsx

- [ ] Thêm `userId` vào API call (dòng ~243)
- [ ] Sửa `mapCategory`: `phong_tro` → `phong-tro` (dòng 271)
- [ ] Sửa `rentType`: `o_ghep` → `roommate` (dòng 321)
- [ ] Sửa `furniture`: `co_noi_that` → `full` (dòng 331)
- [ ] Sửa `demand` → `gender`: `nam` → `male` (dòng 338)
- [ ] Sửa `bedrooms` → `minBedrooms` (dòng 347)
- [ ] Thêm `user` vào dependencies (dòng 412)

### Click Event API

- [ ] Tạo hàm `handlePostClick` để gửi click signal
- [ ] Tích hợp vào PostCard/PropertyList khi user click vào bài đăng
- [ ] Chỉ gửi khi user đã đăng nhập (`userId` có giá trị)

## 🎯 Format Chuẩn

| Field       | Format Đúng                               | Format Sai                      |
| ----------- | ----------------------------------------- | ------------------------------- |
| `category`  | `phong-tro`, `chung-cu`, `nha-nguyen-can` | `phong_tro`, `chung_cu`         |
| `postType`  | `rent`, `roommate`                        | `cho_thue`, `o_ghep`            |
| `furniture` | `full`, `basic`, `none`                   | `co_noi_that`, `khong_noi_that` |
| `gender`    | `male`, `female`, `any`                   | `nam`, `nu`, `nam_nu`           |
| `bedrooms`  | `minBedrooms`                             | `bedrooms`                      |

## 📝 Response Format

```typescript
{
  statusCode: 200,
  message: "Search completed successfully.",
  data: {
    page: 1,
    limit: 20,
    total: 150,
    items: [
      {
        id: "123",
        postId: 456,
        title: "Cho thuê chung cư...",
        category: "chung-cu",
        type: "cho-thue",
        price: 7000000,
        // ... các field khác
        highlight: {
          title: ["Cho thuê <em>chung cư</em>..."],
          description: ["..."]
        }
      }
    ],
    prefetch: [
      {
        page: 2,
        items: [...]
      }
    ]
  }
}
```

## ✅ PropertyList.tsx

**Không cần sửa gì!** Code đã đúng format.

## 📡 API Click Event (Personalization)

### Endpoint: `POST /api/events/click`

**Mục đích**: Gửi signal khi user click vào kết quả search để cải thiện personalization

### Request Body

```typescript
{
  userId: number;        // Required: ID của user đã đăng nhập
  postId?: number;       // Required: ID của post được click
  roomId?: number;       // Optional: ID của room (nếu có)
  amenities?: string[];  // Optional: Tiện ích của post (nếu FE đã có sẵn)
}
```

### Response

```typescript
{
  status: 'ok' | 'ignored',
  reason?: string  // Nếu ignored, có lý do
}
```

### Ví Dụ Sử Dụng

```typescript
// Khi user click vào một bài đăng trong kết quả search
const handlePostClick = async (
  postId: number,
  userId: number,
  amenities?: string[],
) => {
  try {
    const response = await fetch('/api/events/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        postId,
        amenities, // Optional: nếu đã có sẵn trong item data
      }),
    });

    const result = await response.json();
    // Không cần xử lý response, chỉ cần gửi signal
  } catch (error) {
    // Silent fail: không làm gián đoạn UX
    console.error('Failed to log click:', error);
  }
};
```

### Tích Hợp Vào PostCard Component

```typescript
// Trong PostCard component hoặc PropertyList
<PostCard
  onClick={() => {
    if (user?.userId && item.postId) {
      handlePostClick(item.postId, user.userId, item.amenities);
    }
    // Navigate to detail page...
  }}
  // ... other props
/>
```

### Lưu Ý

1. **Chỉ gửi khi user đã đăng nhập**: `userId` là required
2. **Silent fail**: Nếu API lỗi, không làm gián đoạn UX (không hiển thị error)
3. **Gửi async**: Không cần đợi response, chỉ cần fire-and-forget
4. **TTL**: Signals được lưu 7 ngày trong Redis
5. **Tự động boost**: Backend tự động boost các post được click nhiều trong search results

## 🧪 Test Sau Khi Sửa

### Search API

1. **Test với userId:**

   ```
   GET /api/search?q=phòng trọ gò vấp&userId=123
   ```

   → Kiểm tra có personalization không

2. **Test zero-query:**

   ```
   GET /api/search?userId=123
   ```

   → Kiểm tra có personalized feed không

3. **Test với filters:**
   ```
   GET /api/search?q=chung cư&category=chung-cu&postType=rent&minPrice=5000000
   ```
   → Kiểm tra filters có hoạt động không

### Click Event API

4. **Test click event:**

   ```bash
   curl -X POST http://localhost:3001/api/events/click \
     -H "Content-Type: application/json" \
     -d '{"userId": 123, "postId": 456}'
   ```

   → Response: `{"status": "ok"}`

5. **Test với amenities:**
   ```bash
   curl -X POST http://localhost:3001/api/events/click \
     -H "Content-Type: application/json" \
     -d '{"userId": 123, "postId": 456, "amenities": ["ho_boi", "may_lanh"]}'
   ```
   → Response: `{"status": "ok"}`

## 📚 Xem Thêm

- **Tính năng đã làm**: Xem `SEARCH_FEATURES_SUMMARY.md` (file tóm tắt cho báo cáo)

## ⚠️ Lưu Ý

1. **Luôn gửi userId** nếu user đã đăng nhập → có personalization
2. **Category format**: Luôn dùng dấu gạch ngang (`phong-tro`, không phải `phong_tro`)
3. **PostType**: Dùng `rent`/`roommate` (hoặc `cho-thue`/`tim-o-ghep`)
4. **Response**: Parse từ `json.data.items`, không phải `json.items`

## 🆘 Nếu Vẫn Lỗi

1. Check console log để xem request/response
2. Check Network tab để xem API call có đúng params không
3. Check `_debug` object trong response (dev mode) để debug
4. Liên hệ backend team
