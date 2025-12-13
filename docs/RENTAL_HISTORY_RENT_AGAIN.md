# Cập Nhật Logic Hiển Thị Nút "Thuê lại" trong Lịch Sử Thuê

## 🎯 Mục đích

Fix logic hiển thị nút trong lịch sử thuê: khi hủy hợp đồng thuê, nếu phòng còn available và có bài đăng active thì hiển thị nút "Thuê lại" thay vì "Tìm phòng khác".

## 📡 API Response - Các trường mới

API `GET /api/users/me/rental-history` và `GET /api/users/me/rental-history/:contractId` đã được thêm 2 trường mới:

```typescript
interface RentalHistoryItem {
  // ... các trường cũ
  activePostId: number | null;
  roomStatus: 'available' | 'occupied' | 'unknown';  // ⬅️ MỚI
  canRentAgain: boolean;                             // ⬅️ MỚI
  // ... các trường khác
}
```

**Giải thích:**
- `roomStatus`: Trạng thái phòng hiện tại
- `canRentAgain`: `true` nếu phòng available và có bài đăng active, ngược lại `false`

## 🔧 Cách tích hợp

### 1. Cập nhật Type/Interface (TypeScript)

```typescript
interface RentalHistoryItem {
  contractId: number;
  roomId: number;
  roomNumber: string;
  buildingName: string;
  address: string;
  activePostId: number | null;
  roomStatus: 'available' | 'occupied' | 'unknown';  // ⬅️ THÊM
  canRentAgain: boolean;                             // ⬅️ THÊM
  contractStatus: 'expired' | 'terminated';
  // ... các trường khác
}
```

### 2. Cập nhật Logic Hiển Thị Nút

**Trước đây (sai):**
```tsx
{historyItem.activePostId ? (
  <Button>Thuê lại</Button>
) : (
  <Button>Tìm phòng khác</Button>
)}
```

**Bây giờ (đúng):**
```tsx
{historyItem.canRentAgain ? (
  <Button onClick={() => navigate(`/room_details/${postType}-${historyItem.activePostId}`)}>
    Thuê lại
  </Button>
) : (
  <Button onClick={() => navigate('/search')}>
    Tìm phòng khác
  </Button>
)}
```

## ✅ Checklist

- [ ] Cập nhật TypeScript interface với `roomStatus` và `canRentAgain`
- [ ] Thay đổi logic hiển thị nút từ dựa vào `activePostId` sang `canRentAgain`
- [ ] Test với trường hợp: phòng available + có post active → hiển thị "Thuê lại"
- [ ] Test với trường hợp: phòng occupied hoặc không có post → hiển thị "Tìm phòng khác"

## 📝 Lưu ý

- `canRentAgain === true` chỉ khi phòng có `status === 'available'` VÀ có `activePostId`
- Khi click "Thuê lại", navigate đến `/room_details/{postType}-{activePostId}`
- `roomStatus` có thể dùng để hiển thị thêm badge/thông tin (optional)

