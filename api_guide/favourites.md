# ❤️ Favourites API

## 📋 Get All Favourites
```http
GET /api/favourites
```

**Query Parameters:**
- `userId` (optional): Filter by user ID

**Response:**
```json
[
  {
    "favouriteId": 1,
    "userId": 1,
    "postType": "rent",
    "postId": 1,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

## ➕ Add to Favourites
```http
POST /api/favourites
```

**Request Body:**
```json
{
  "userId": 1,
  "postType": "rent",
  "postId": 1
}
```

**Validation:**
- `postType`: Required, enum: ["rent", "roommate"]

## 🔁 Toggle Favourite (Thêm/Xóa tự động)
```http
POST /api/favourites/toggle
```

Yêu cầu JWT. Nếu bản ghi yêu thích đã tồn tại với `userId` + `postType` + `postId` thì xóa; nếu chưa tồn tại thì tạo mới.

**Request Body:**
```json
{
  "userId": 1,
  "postType": "rent",
  "postId": 1
}
```

**Response (added):**
```json
{
  "action": "added",
  "favourite": {
    "favouriteId": 12,
    "userId": 1,
    "postType": "rent",
    "postId": 1,
    "createdAt": "2025-10-29T10:00:00.000Z"
  }
}
```

**Response (removed):**
```json
{
  "action": "removed"
}
```

## 🗑️ Remove from Favourites
```http
DELETE /api/favourites/user/:userId/post/:postType/:postId
```

**Example:**
```http
DELETE /api/favourites/user/1/post/rent/1
```
