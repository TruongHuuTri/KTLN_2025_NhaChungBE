## Reviews API - Tài liệu tích hợp FE

### Tổng quan
- Base URL (có prefix): `http://localhost:3001/api`
- Auth: Bearer JWT cho các endpoint tạo/sửa/xoá/vote và các endpoint `/me/*`.
- Nội dung JSON: `Content-Type: application/json`

Header chung (khi cần auth):
```
Authorization: Bearer <JWT>
Content-Type: application/json
```

### Kiểu dữ liệu chính
- targetType: `USER | ROOM | BUILDING | POST`
- rating: số nguyên 1..5
- isAnonymous: boolean (ẩn danh khi hiển thị, BE vẫn lưu writerId)

---

### 1) Tạo review
- POST `/reviews`
- Body
```json
{
  "writerId": 1001,
  "targetType": "ROOM",
  "targetId": 123,
  "contractId": 555,
  "rating": 5,
  "content": "Phòng sạch sẽ, chủ nhà thân thiện.",
  "isAnonymous": false,
  "media": ["https://.../image.jpg"]
}
```
- Response 201
```json
{
  "reviewId": 1730280000000,
  "writerId": 1001,
  "targetType": "ROOM",
  "targetId": 123,
  "contractId": 555,
  "rating": 5,
  "content": "Phòng sạch sẽ, chủ nhà thân thiện.",
  "media": ["https://.../image.jpg"],
  "isAnonymous": false,
  "isEdited": false,
  "votesHelpful": 0,
  "votesUnhelpful": 0,
  "createdAt": "2025-10-30T10:00:00.000Z",
  "updatedAt": "2025-10-30T10:00:00.000Z"
}
```

---

### 2) Lấy danh sách review theo đối tượng
- GET `/reviews?targetType=ROOM&targetId=123&rating=5&hasMedia=true&sort=recent&page=1&pageSize=10`
- Response 200
```json
{
  "items": [
    {
      "reviewId": 1730280000000,
      "writerId": 1001,
      "targetType": "ROOM",
      "targetId": 123,
      "rating": 5,
      "content": "Phòng sạch sẽ, chủ nhà thân thiện.",
      "media": [],
      "isAnonymous": false,
      "votesHelpful": 2,
      "votesUnhelpful": 0,
      "createdAt": "2025-10-30T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10,
  "ratingSummary": { "ratingAvg": 5, "ratingCount": 1 }
}
```

Query params hỗ trợ:
- `targetType` (bắt buộc), `targetId` (bắt buộc)
- `rating` (lọc đúng số sao), `hasMedia` (`true|false`)
- `sort`: `recent|top`
- `page`, `pageSize`

---

### 2.1) Lấy tất cả reviews (toàn hệ thống)
- GET `/reviews/all?sort=recent&page=1&pageSize=10&hasMedia=false&targetType=ROOM&rating=5`
- Response 200
```json
{
  "items": [
    {
      "reviewId": 1730280000000,
      "writerId": 1001,
      "targetType": "ROOM",
      "targetId": 123,
      "rating": 5,
      "content": "Phòng sạch sẽ, chủ nhà thân thiện.",
      "media": [],
      "isAnonymous": false,
      "votesHelpful": 2,
      "votesUnhelpful": 0,
      "createdAt": "2025-10-30T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

Query params hỗ trợ (tất cả đều optional):
- `targetType`: `USER|ROOM|BUILDING|POST`
- `rating`: number
- `hasMedia`: `true|false`
- `sort`: `recent|top`
- `page`, `pageSize`

---

### 3) Review tôi đã viết
- GET `/reviews/me/written?userId=1001`
- Response 200: mảng review

### 4) Review tôi nhận được (USER)
- GET `/reviews/me/received?userId=1002`
- Response 200: mảng review (`targetType=USER`, `targetId=userId`)

---

### 5) Cập nhật review
- PATCH `/reviews/{reviewId}?userId=1001`
- Body
```json
{
  "rating": 4,
  "content": "Cập nhật: mọi thứ ổn, wifi hơi yếu.",
  "isAnonymous": true
}
```
- Response 200: object review sau cập nhật, `isEdited=true`

### 6) Xoá review (soft delete)
- DELETE `/reviews/{reviewId}?userId=1001`
- Response 200
```json
{ "success": true }
```

### 7) Vote review hữu ích/không hữu ích
- POST `/reviews/{reviewId}/vote?userId=1001`
- Body
```json
{ "isHelpful": true }
```
- Response 200: object review sau khi cập nhật `votesHelpful`/`votesUnhelpful`

---

### Ghi chú tích hợp FE
- Trong giai đoạn đầu, BE chấp nhận `writerId`/`userId` qua body/query (đồng nhất với module `favourites`). Nếu FE đã có JWT payload, có thể bỏ các trường này và chuyển sang lấy từ `req.user` (sẽ cập nhật controller sau).
- `isAnonymous=true`: FE hiển thị tên ẩn danh/che avatar, nhưng vẫn gửi `writerId` để BE xác thực.
- Không có workflow duyệt review; review hiển thị ngay khi tạo. Xoá là soft delete.

