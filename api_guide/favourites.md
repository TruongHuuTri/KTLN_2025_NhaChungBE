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

## 🗑️ Remove from Favourites
```http
DELETE /api/favourites/user/:userId/post/:postType/:postId
```

**Example:**
```http
DELETE /api/favourites/user/1/post/rent/1
```
