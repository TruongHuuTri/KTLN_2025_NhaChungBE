## API: Lấy thông tin người thuê hiện tại của phòng (Landlord)

- Method: GET
- URL: `/landlord/rooms/{roomId}/tenant`
- Auth: Bearer Token (vai trò landlord). Chỉ chủ của phòng được truy cập.

### Quy tắc truy xuất
- Xác định phòng theo `roomId` và thuộc về `landlordId` trong token.
- Tìm hợp đồng có hiệu lực: `status = "active"` và `startDate <= now <= endDate` cho phòng đó.
- Nếu nhiều hợp đồng thỏa, lấy bản mới nhất theo `startDate` (giảm dần).
- Nếu không có hợp đồng active → trả `204 No Content`.

### 200 OK - Response body
```json
{
  "roomId": 123,
  "contractId": 456,
  "contractStatus": "active",
  "tenant": {
    "userId": 789,
    "fullName": "Nguyễn Văn A",
    "phone": "0901234567",
    "email": "a@example.com",
    "avatarUrl": "https://.../avatar.jpg"
  },
  "period": {
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T00:00:00.000Z"
  },
  "monthlyRent": 5500000,
  "deposit": 5500000
}
```

Ghi chú:
- `monthlyRent`, `deposit`: số nguyên VNĐ.
- `period.startDate/endDate`: ISO 8601.
- `tenant` được chọn từ danh sách `tenants` của hợp đồng với `status = "active"` (nếu không có sẽ lấy phần tử đầu tiên).

### 204 No Content
- Không có hợp đồng active cho phòng.

### Lỗi
- 401 Unauthorized: Thiếu/Token không hợp lệ.
- 403 Forbidden: Không có quyền landlord hoặc không phải chủ phòng.
- 404 Room not found: Phòng không tồn tại hoặc không thuộc landlord.
- 500 Internal Server Error: Lỗi máy chủ.

### Ví dụ cURL
```bash
curl -X GET \
  -H "Authorization: Bearer <TOKEN>" \
  https://api.example.com/landlord/rooms/123/tenant
```

### Ảnh hưởng tới FE
- FE gọi endpoint khi landlord bấm vào card phòng có `status = "occupied"` trong `app/landlord/buildings/[id]/rooms/page.tsx`.
- 200: Mở modal hiển thị thông tin người thuê.
- 204: Hiển thị thông báo “Chưa có người thuê hiện tại”.
- 403/404: Hiển thị toast lỗi phù hợp.


