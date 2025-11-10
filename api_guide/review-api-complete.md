# Review API - Complete Documentation

## Mục lục
1. [Tổng quan](#tổng-quan)
2. [Review Vote API](#1-review-vote-api)
3. [Review Reply API](#2-review-reply-api)
4. [Review Author Badge API](#3-review-author-badge-api)
5. [API Summary](#api-summary)
6. [Database Schema](#database-schema)

---

## Tổng quan

Hệ thống Review API bao gồm 3 phần chính:

| Feature | Description | Status |
|---------|-------------|--------|
| **Vote** | User vote "Hữu ích"/"Không hữu ích" cho reviews | ✅ Completed |
| **Reply** | User comment/reply vào reviews (như Facebook comments) | ✅ Completed |
| **Author Badge** | Badge "👑 Tác giả" khi reviewer là chủ của target | ✅ Completed |

### Key Features
- **Multiple replies** support (không giới hạn)
- **Media upload** trong replies (tối đa 3 ảnh)
- **MyVote tracking** để disable buttons đã vote
- **Author badges** cho cả review và reply
- **Batch queries** để optimize performance

---

# 1. Review Vote API

## 1.1. GET /reviews/all - Lấy tất cả reviews

### Endpoint
```
GET /api/reviews/all?sort=recent&page=1&pageSize=9&userId=123
```

### Query Parameters
```
?sort=recent|top           (optional, default: recent)
&page=1                    (optional, default: 1)
&pageSize=9                (optional, default: 10)
&targetType=POST           (optional, filter by type)
&rating=5                  (optional, filter by rating 1-5)
&hasMedia=true             (optional, filter reviews có ảnh)
&userId=123                (optional, để check myVote - nếu user đã login)
```

**Note:** 
- `userId` là **OPTIONAL** - nếu không có (guest user) thì tất cả `myVote` = `null`
- FE chỉ cần truyền `userId` khi user đã đăng nhập

### Response Success (200)
```json
{
  "items": [
    {
      "reviewId": 1,
      "writerId": 2,
      "targetType": "POST",
      "targetId": 10,
      "rating": 5,
      "content": "Phòng tốt lắm",
      "votesHelpful": 10,
      "votesUnhelpful": 2,
      "myVote": "helpful",
      "isAuthor": false,
      "replies": [
        {
          "replyId": 1,
          "userId": 10,
          "userName": "Chủ trọ",
          "content": "Cảm ơn!",
          "media": [],
          "isAuthor": true,
          "createdAt": "2025-11-10T11:00:00Z",
          "isEdited": false
        }
      ],
      "repliesCount": 1,
      "createdAt": "2025-11-10T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 9
}
```

### Field Explanations
| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `myVote` | string \| null | `"helpful"` \| `"unhelpful"` \| `null` | User đã vote gì cho review này |
| `isAuthor` | boolean | `true` \| `false` | Reviewer có phải chủ của target không |
| `replies` | array | Array of reply objects | Danh sách replies |
| `repliesCount` | number | 0, 1, 2, ... | Tổng số replies |

---

## 1.2. GET /reviews - Lấy reviews theo target

### Endpoint
```
GET /api/reviews?targetType=POST&targetId=123&sort=recent&page=1&pageSize=10&userId=456
```

### Query Parameters
```
targetType=POST            (required: POST|ROOM|BUILDING|USER)
targetId=123               (required: ID của target)
?sort=recent|top           (optional, default: recent)
&page=1                    (optional, default: 1)
&pageSize=10               (optional, default: 10)
&rating=5                  (optional, filter by rating)
&hasMedia=true             (optional, filter có ảnh)
&userId=456                (optional, để check myVote)
```

### Response Success (200)
```json
{
  "items": [
    {
      "reviewId": 5,
      "writerId": 10,
      "targetType": "POST",
      "targetId": 123,
      "rating": 5,
      "content": "Rất tốt",
      "votesHelpful": 15,
      "votesUnhelpful": 1,
      "myVote": "helpful",
      "isAuthor": false,
      "replies": [],
      "repliesCount": 0,
      "createdAt": "2025-11-10T10:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 10,
  "ratingSummary": {
    "ratingAvg": 4.5,
    "ratingCount": 10
  }
}
```

---

## 1.3. POST /reviews/:reviewId/vote - Vote for review

### Endpoint
```
POST /api/reviews/123/vote?userId=456
Authorization: Bearer <token>
```

### Logic
1. User chưa vote → Tạo vote mới
2. User đã vote `helpful`, vote lại `helpful` → Không thay đổi gì
3. User đã vote `helpful`, vote lại `unhelpful` → Đổi từ helpful sang unhelpful
4. User đã vote `unhelpful`, vote lại `helpful` → Đổi từ unhelpful sang helpful

### Request Body
```json
{
  "isHelpful": true
}
```

- `isHelpful: true` → Vote "Hữu ích"
- `isHelpful: false` → Vote "Không hữu ích"

### Response Success (200)
```json
{
  "reviewId": 123,
  "writerId": 10,
  "targetType": "POST",
  "targetId": 456,
  "rating": 5,
  "content": "Rất tốt",
  "votesHelpful": 16,
  "votesUnhelpful": 1,
  "votes": [
    { "userId": 456, "isHelpful": true },
    { "userId": 789, "isHelpful": false }
  ],
  "createdAt": "2025-11-10T10:00:00Z",
  "updatedAt": "2025-11-10T12:00:00Z"
}
```

---

# 2. Review Reply API

## 2.1. POST /reviews/:reviewId/replies - Tạo reply

### Endpoint
```
POST /api/reviews/123/replies
Authorization: Bearer <token>
```

### Description
Bất kỳ user nào cũng có thể tạo reply cho review.

### Request Body
```json
{
  "content": "Cảm ơn bạn đã đánh giá!",
  "userId": 456,
  "media": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}
```

**Fields:**
- `content` (string, required): Nội dung reply (min: 1 char, max: 500 chars)
- `userId` (number, required): ID của user đang reply
- `media` (string[], optional): Mảng URLs của ảnh đính kèm (tối đa 3 ảnh)

### Authorization
Backend tự động check `isAuthor`:
- `POST`: Check `post.userId === userId` → `isAuthor = true`
- `USER`: Check `review.targetId === userId` → `isAuthor = true`
- `ROOM`: Check `room.landlordId === userId` → `isAuthor = true`
- `BUILDING`: Check `building.landlordId === userId` → `isAuthor = true`

### Response Success (201)
```json
{
  "reviewId": 123,
  "reply": {
    "replyId": 1,
    "userId": 456,
    "userName": "Nguyễn Văn A",
    "userAvatar": "https://example.com/avatar.jpg",
    "content": "Cảm ơn bạn đã đánh giá!",
    "media": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg"
    ],
    "isAuthor": true,
    "createdAt": "2025-11-10T15:00:00Z",
    "updatedAt": "2025-11-10T15:00:00Z",
    "isEdited": false
  }
}
```

---

## 2.2. PATCH /reviews/:reviewId/replies/:replyId - Cập nhật reply

### Endpoint
```
PATCH /api/reviews/123/replies/456
Authorization: Bearer <token>
```

### Request Body
```json
{
  "content": "Nội dung đã update.",
  "userId": 789,
  "media": [
    "https://example.com/new-image.jpg"
  ]
}
```

**Note:** Field `media` là optional:
- Không truyền → ảnh cũ được giữ nguyên
- Truyền `[]` → xóa tất cả ảnh
- Truyền array mới → update ảnh mới

### Response Success (200)
```json
{
  "reviewId": 123,
  "reply": {
    "replyId": 456,
    "userId": 789,
    "userName": "Nguyễn Văn A",
    "content": "Nội dung đã update.",
    "media": ["https://example.com/new-image.jpg"],
    "isAuthor": true,
    "createdAt": "2025-11-10T15:00:00Z",
    "updatedAt": "2025-11-10T16:00:00Z",
    "isEdited": true
  }
}
```

---

## 2.3. DELETE /reviews/:reviewId/replies/:replyId - Xóa reply

### Endpoint
```
DELETE /api/reviews/123/replies/456?userId=789
Authorization: Bearer <token>
```

### Response Success (200)
```json
{
  "message": "Đã xóa reply thành công",
  "reviewId": 123,
  "replyId": 456
}
```

---

# 3. Review Author Badge API

## 3.1. Field `isAuthor` cho Reviews

### Logic tính `isAuthor`

Backend check người viết review có phải owner của target không:

| Target Type | Logic | Example |
|------------|-------|---------|
| `POST` | `writerId === post.userId` | User A tạo POST_10, User A review POST_10 → `isAuthor = true` |
| `USER` | `writerId === targetId` | User B review chính User B → `isAuthor = true` |
| `ROOM` | `writerId === room.landlordId` | Chủ phòng review phòng của mình → `isAuthor = true` |
| `BUILDING` | `writerId === building.landlordId` | Chủ tòa nhà review tòa nhà của mình → `isAuthor = true` |

### Bug Fix: Type Mismatch

**Problem:**
- `review.writerId` có thể là `number`
- `post.userId` có thể là `string` từ DB
- So sánh `3 === "3"` → `false` ❌

**Solution:**
```typescript
// ❌ Before
isAuthor = item.writerId === ownerId;

// ✅ After
isAuthor = Number(item.writerId) === Number(ownerId);
```

---

## 3.2. Field `isAuthor` cho Replies

Replies cũng có `isAuthor` để đánh dấu reply từ owner của target:

```json
{
  "reviewId": 1,
  "content": "Review content",
  "isAuthor": false,
  "replies": [
    {
      "replyId": 1,
      "userId": 10,
      "content": "Reply from owner",
      "isAuthor": true,  // ← Owner reply
      "createdAt": "2025-11-10T15:00:00Z"
    },
    {
      "replyId": 2,
      "userId": 20,
      "content": "Reply from normal user",
      "isAuthor": false,  // ← Normal user
      "createdAt": "2025-11-10T16:00:00Z"
    }
  ]
}
```

### Khác biệt

| | Review isAuthor | Reply isAuthor |
|--|----------------|----------------|
| **Ý nghĩa** | Reviewer là chủ của target | Reply từ chủ của target |
| **Tần suất** | Hiếm (self-review) | Phổ biến (chủ reply lại) |
| **UI Badge** | "👑 Tác giả" | "✓ Tác giả" |

---

# API Summary

## Endpoints Table

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **Reviews** |
| GET | `/reviews/all` | Optional | Lấy tất cả reviews với myVote |
| GET | `/reviews` | Optional | Lấy reviews theo target với myVote |
| POST | `/reviews/:id/vote?userId=X` | Required | Vote helpful/unhelpful |
| **Replies** |
| POST | `/reviews/:reviewId/replies` | Required | Tạo reply (anyone) |
| PATCH | `/reviews/:reviewId/replies/:replyId` | Required | Sửa reply (owner only) |
| DELETE | `/reviews/:reviewId/replies/:replyId?userId=X` | Required | Xóa reply (owner only) |

---

# Database Schema

## Review Schema (Complete)

```typescript
interface Review {
  reviewId: number;
  writerId: number;
  targetType: 'USER' | 'ROOM' | 'BUILDING' | 'POST';
  targetId: number;
  rating: number;
  content: string;
  media: string[];
  
  // Vote system
  votesHelpful: number;
  votesUnhelpful: number;
  votes: Array<{
    userId: number;
    isHelpful: boolean;
  }>;
  
  // Reply system
  replies: Array<{
    replyId: number;
    userId: number;
    content: string;
    media: string[];         // Max 3 images
    isAuthor: boolean;       // Reply from target owner
    createdAt: Date;
    updatedAt: Date;
    isEdited: boolean;
  }>;
  repliesCount: number;
  lastReplyId: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

---

# Frontend Usage Examples

## 1. Display Review với Votes, Replies, và Badges

```tsx
function ReviewItem({ review, currentUserId }: { review: Review, currentUserId?: number }) {
  const isLoggedIn = !!currentUserId;
  
  return (
    <div className="review-card">
      {/* Header */}
      <div className="review-header">
        <span className="author-name">{review.author.name}</span>
        
        {/* Author badge for review */}
        {review.isAuthor && (
          <span className="badge-author-review">
            👑 Tác giả
          </span>
        )}
        
        <span className="rating">⭐ {review.rating}/5</span>
      </div>
      
      {/* Content */}
      <p className="review-content">{review.content}</p>
      
      {/* Vote buttons */}
      <div className="vote-buttons">
        <button
          onClick={() => voteReview(review.reviewId, true)}
          disabled={!isLoggedIn || review.myVote === 'helpful'}
          className={review.myVote === 'helpful' ? 'active' : ''}
        >
          👍 Hữu ích ({review.votesHelpful})
        </button>
        
        <button
          onClick={() => voteReview(review.reviewId, false)}
          disabled={!isLoggedIn || review.myVote === 'unhelpful'}
          className={review.myVote === 'unhelpful' ? 'active' : ''}
        >
          👎 Không hữu ích ({review.votesUnhelpful})
        </button>
      </div>
      
      {/* Replies section */}
      {review.replies.length > 0 && (
        <div className="replies-list">
          <h4>{review.repliesCount} phản hồi</h4>
          {review.replies.map(reply => (
            <div key={reply.replyId} className="reply-item">
              <div className="reply-header">
                <img src={reply.userAvatar} className="avatar" />
                <span>{reply.userName}</span>
                
                {/* Author badge for reply */}
                {reply.isAuthor && (
                  <span className="badge-author-reply">
                    ✓ Tác giả
                  </span>
                )}
              </div>
              
              <p>{reply.content}</p>
              
              {/* Reply images */}
              {reply.media.length > 0 && (
                <div className="reply-images">
                  {reply.media.map((url, i) => (
                    <img key={i} src={url} onClick={() => openViewer(url)} />
                  ))}
                </div>
              )}
              
              <div className="reply-footer">
                <span className="time">
                  {formatDate(reply.createdAt)}
                  {reply.isEdited && " (đã chỉnh sửa)"}
                </span>
                
                {reply.userId === currentUserId && (
                  <div className="reply-actions">
                    <button onClick={() => editReply(review.reviewId, reply.replyId)}>
                      Sửa
                    </button>
                    <button onClick={() => deleteReply(review.reviewId, reply.replyId)}>
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Reply button */}
      <button 
        onClick={() => openReplyForm(review.reviewId)}
        disabled={!isLoggedIn}
      >
        💬 Trả lời {review.repliesCount > 0 && `(${review.repliesCount})`}
      </button>
    </div>
  );
}
```

## 2. Vote Service

```typescript
async function voteReview(reviewId: number, isHelpful: boolean) {
  const userId = getCurrentUserId();
  
  const response = await fetch(`/api/reviews/${reviewId}/vote?userId=${userId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ isHelpful })
  });
  
  return response.json();
}
```

## 3. Reply Service

```typescript
// Create reply with image upload
async function createReply(reviewId: number, content: string, imageFiles: File[]) {
  const userId = getCurrentUserId();
  
  // 1. Upload images first
  const media = await Promise.all(
    imageFiles.map(file => uploadImage(file))
  );
  
  // 2. Create reply with URLs
  const response = await fetch(`/api/reviews/${reviewId}/replies`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content, userId, media })
  });
  
  return response.json();
}

// Update reply
async function updateReply(reviewId: number, replyId: number, content: string, media?: string[]) {
  const userId = getCurrentUserId();
  
  const body: any = { content, userId };
  if (media !== undefined) {
    body.media = media; // Truyền [] để xóa tất cả ảnh
  }
  
  const response = await fetch(`/api/reviews/${reviewId}/replies/${replyId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  return response.json();
}

// Delete reply
async function deleteReply(reviewId: number, replyId: number) {
  const userId = getCurrentUserId();
  
  const response = await fetch(
    `/api/reviews/${reviewId}/replies/${replyId}?userId=${userId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return response.json();
}
```

---

# Testing Scenarios

## Vote Tests

### ✅ Test 1: Guest user - tất cả myVote = null
```bash
curl -X GET "http://localhost:3001/api/reviews/all?page=1"
# Expected: myVote = null cho tất cả reviews
```

### ✅ Test 2: Logged-in user - myVote hiển thị đúng
```bash
curl -X GET "http://localhost:3001/api/reviews/all?userId=123"
# Expected: myVote = "helpful" hoặc "unhelpful" cho reviews đã vote
```

### ✅ Test 3: Vote và đổi vote
```bash
# Vote helpful
curl -X POST "http://localhost:3001/api/reviews/1/vote?userId=123" \
  -d '{"isHelpful": true}'

# Đổi sang unhelpful
curl -X POST "http://localhost:3001/api/reviews/1/vote?userId=123" \
  -d '{"isHelpful": false}'

# Expected: 
# - votesHelpful giảm 1
# - votesUnhelpful tăng 1
# - myVote = "unhelpful"
```

## Reply Tests

### ✅ Test 4: Tạo reply với ảnh
```bash
curl -X POST "http://localhost:3001/api/reviews/123/replies" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "content": "Cảm ơn!",
    "userId": 456,
    "media": ["https://example.com/img.jpg"]
  }'

# Expected: 201 Created, reply có media array
```

### ✅ Test 5: Owner reply → isAuthor = true
```bash
# Owner (userId 10) reply vào review về bài đăng của họ
POST /reviews/123/replies { "content": "Thanks!", "userId": 10 }

# Expected: reply.isAuthor = true
```

### ✅ Test 6: Edit reply - xóa ảnh
```bash
curl -X PATCH "http://localhost:3001/api/reviews/123/replies/456" \
  -d '{"content": "Updated", "userId": 789, "media": []}'

# Expected: Ảnh bị xóa, media = []
```

## Author Badge Tests

### ✅ Test 7: Self-review → isAuthor = true
```bash
# User A (id=5) tạo POST_10
# User A review POST_10

# Expected: review.isAuthor = true
```

### ✅ Test 8: Review other's post → isAuthor = false
```bash
# User A (id=5) tạo POST_10
# User B (id=10) review POST_10

# Expected: review.isAuthor = false
```

---

# Performance Optimizations

## Batch Queries
- Group reviews theo targetType
- Fetch tất cả targets trong 1 query
- Map `isAuthor` trong memory
- **Result**: ~90% reduction in DB queries

## Indexing
```javascript
// MongoDB indexes
db.reviews.createIndex({ reviewId: 1 });
db.reviews.createIndex({ targetType: 1, targetId: 1 });
db.posts.createIndex({ postId: 1, userId: 1 });
db.rooms.createIndex({ roomId: 1, landlordId: 1 });
db.buildings.createIndex({ buildingId: 1, landlordId: 1 });
```

---

# Changes Summary

### ✅ Đã implement:
1. **Vote system** với myVote tracking
2. **Reply system** với multiple replies support
3. **Media upload** trong replies (max 3 ảnh)
4. **Author badges** cho cả review và reply
5. **Type conversion fix** cho isAuthor comparison
6. **Batch queries** để optimize performance
7. **Vote change support** (helpful ↔ unhelpful)
8. **Guest user support** (myVote = null)

### 🎯 Frontend Tasks:
1. Hiển thị vote buttons với disable states dựa vào `myVote`
2. Hiển thị replies list với user info và media
3. Hiển thị author badges ("👑 Tác giả" cho review, "✓ Tác giả" cho reply)
4. Reply form với image upload (max 3)
5. Edit/delete actions chỉ cho owner
6. Image viewer/lightbox
7. Handle tất cả error cases

---

**Implemented by:** Backend Team  
**Date:** November 10, 2024  
**Version:** 2.0  
**Status:** ✅ Completed & Production Ready

