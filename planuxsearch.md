# Kế hoạch triển khai UX Search - Personalization dựa trên lịch sử hành vi

## Mục tiêu
Tạo hệ thống tìm kiếm thông minh, tự động ưu tiên hiển thị các loại phòng/địa chỉ/tiện ích mà user đã từng quan tâm, dựa trên lịch sử hành vi của họ.

## Tình huống sử dụng
1. User đăng nhập lại → List phòng tự động ưu tiên loại/địa chỉ họ đã xem trước đó
2. User xóa search và reload trang → Vẫn ưu tiên theo sở thích của user
3. User search nhưng không có query cụ thể → Hiển thị recommendations dựa trên preference

---

## Bước 1: Thiết kế Database Schema

### 1.1. Collection: `user_search_history`
Lưu lịch sử tìm kiếm của user:
```typescript
{
  userId: number,
  query?: string,
  filters: {
    category?: string,
    district?: string,
    ward?: string,
    minPrice?: number,
    maxPrice?: number,
    amenities?: string[],
    // ... các filter khác
  },
  timestamp: Date,
  resultCount: number,
  clickedPosts: number[], // postIds mà user đã click vào
}
```

### 1.2. Collection: `user_view_history`
Lưu lịch sử xem bài đăng:
```typescript
{
  userId: number,
  postId: number,
  category: string,
  district: string,
  ward: string,
  price: number,
  amenities: string[],
  timestamp: Date,
  viewDuration: number, // seconds
  action: 'view' | 'contact' | 'save' | 'share', // hành động của user
}
```

### 1.3. Collection: `user_preferences` (hoặc tính toán real-time từ history)
Cache preferences để tối ưu performance:
```typescript
{
  userId: number,
  categoryWeights: {
    'chung-cu': number,    // 0-1, ví dụ 0.8
    'phong-tro': number,    // 0.3
    'nha-nguyen-can': number, // 0.1
  },
  locationWeights: {
    'quận 1': number,
    'quận 7': number,
    // ... các quận user thường xem
  },
  amenityWeights: {
    'gym': number,
    'ho_boi': number,
    // ...
  },
  priceRange: {
    preferredMin: number,
    preferredMax: number,
    average: number,
  },
  lastUpdated: Date,
}
```

---

## Bước 2: Xây dựng Service Tracking

### 2.1. `UserBehaviorTrackingService`
Service để track và lưu hành vi của user:

**Chức năng:**
- `trackSearch(userId, query, filters, resultCount)`: Lưu lịch sử search
- `trackView(userId, postId, postData, action, duration)`: Lưu lịch sử xem
- `trackClick(userId, postId)`: Track click vào bài đăng
- `trackContact(userId, postId)`: Track liên hệ chủ nhà
- `trackSave(userId, postId)`: Track lưu bài đăng

**Lưu ý:**
- Batch insert để tối ưu performance (không insert từng record)
- Tự động cleanup dữ liệu cũ (> 90 ngày)
- Rate limiting để tránh spam

---

## Bước 3: Xây dựng Service Tính toán Preference

### 3.1. `UserPreferenceService`
Service để tính toán và cache user preferences:

**Chức năng:**
- `calculatePreferences(userId)`: Tính toán preference từ history
- `getPreferences(userId)`: Lấy preferences (từ cache hoặc tính lại)
- `updatePreferences(userId)`: Cập nhật preferences khi có hành vi mới

**Công thức tính điểm:**
```typescript
// Category weight = (số lần xem category / tổng số lần xem) * recency_factor
// Recency factor: hành vi gần đây có trọng số cao hơn
// Ví dụ: view trong 7 ngày gần đây = 1.0, 30 ngày = 0.7, 90 ngày = 0.3

// Location weight: tương tự category
// Amenity weight: tương tự
// Price range: tính trung bình từ các bài đã xem/contact
```

**Caching:**
- Lưu vào Redis với key `user:pref:${userId}`
- TTL: 24h (hoặc update khi có hành vi mới)
- Invalidate cache khi user có hành vi mới quan trọng (contact, save)

---

## Bước 4: Tích hợp vào Search Service

### 4.1. Cập nhật `SearchService.searchPosts()`

**Thêm tham số:**
```typescript
export type SearchPostsParams = {
  // ... các field hiện tại
  userId?: number, // Thêm userId để personalization
}
```

**Logic personalization:**
1. Nếu có `userId`:
   - Gọi `UserPreferenceService.getPreferences(userId)`
   - Thêm function_score boost dựa trên preferences:
     ```typescript
     // Boost category theo preference
     if (preferences.categoryWeights['chung-cu'] > 0.5) {
       functions.push({
         filter: { term: { category: 'chung-cu' } },
         weight: preferences.categoryWeights['chung-cu'] * 10, // Scale lên
       });
     }
     
     // Boost location theo preference
     if (preferences.locationWeights['quận 1'] > 0.5) {
       const wardCodes = geo.expandDistrictAliasesToWardCodes('quận 1');
       functions.push({
         filter: { terms: { 'address.wardCode': wardCodes } },
         weight: preferences.locationWeights['quận 1'] * 8,
       });
     }
     
     // Boost amenities theo preference
     // ...
     ```

2. Nếu không có `userId` hoặc user mới (chưa có history):
   - Dùng default ranking (như hiện tại)

**Ưu tiên:**
- Query-specific ranking (Tier 1-4) vẫn là ưu tiên cao nhất
- Personalization boost là ưu tiên thứ 2 (thấp hơn query-specific nhưng cao hơn default)

---

## Bước 5: API Endpoints

### 5.1. Tracking Endpoints (Internal hoặc từ FE)
- `POST /api/search/track/view`: Track view bài đăng
- `POST /api/search/track/click`: Track click
- `POST /api/search/track/contact`: Track contact
- `POST /api/search/track/save`: Track save

### 5.2. Search Endpoints (Cập nhật)
- `GET /api/search/posts?userId=123&q=...`: Search với personalization
- `GET /api/search/nlp?userId=123&q=...`: NLP search với personalization

**Lưu ý:**
- `userId` là optional (nếu không có thì dùng default ranking)
- FE tự động gửi `userId` từ JWT token khi user đã đăng nhập

---

## Bước 6: Tối ưu hiệu năng

### 6.1. Caching Strategy
- **User Preferences**: Cache trong Redis (24h TTL)
- **Search Results**: Cache trong Redis (1h TTL) - key bao gồm userId để personalization
- **Preference Calculation**: Chạy background job mỗi đêm để tính lại preferences

### 6.2. Performance Optimization
- Batch insert tracking data (không insert từng record)
- Async tracking (không block search request)
- Index database cho queries thường dùng (userId + timestamp)
- Limit history data (chỉ giữ 90 ngày gần nhất)

---

## Bước 7: Privacy & Security

### 7.1. Data Privacy
- User có thể xóa lịch sử của mình
- Không lưu thông tin nhạy cảm (chỉ lưu behavior patterns)
- Tuân thủ GDPR (nếu cần)

### 7.2. Security
- Validate userId từ JWT token
- Rate limiting cho tracking endpoints
- Không expose preferences của user khác

---

## Bước 8: Testing & Monitoring

### 8.1. Unit Tests
- Test preference calculation logic
- Test ranking với/không có personalization
- Test edge cases (user mới, user không có history)

### 8.2. Integration Tests
- Test end-to-end flow: search → track → preference update → search lại
- Test performance với large dataset

### 8.3. Monitoring
- Track số lượng user có preferences
- Track improvement trong engagement (click rate, contact rate)
- Monitor performance impact (latency của search request)

---

## Bước 9: Rollout Strategy

### 9.1. Phase 1: Tracking (2 tuần)
- Implement tracking service
- Deploy tracking endpoints
- Bắt đầu collect data (không dùng để ranking)

### 9.2. Phase 2: Preference Calculation (1 tuần)
- Implement preference service
- Test với sample data
- Validate công thức tính điểm

### 9.3. Phase 3: Integration (1 tuần)
- Tích hợp vào search service
- A/B testing: 10% traffic dùng personalization
- Monitor metrics

### 9.4. Phase 4: Full Rollout (1 tuần)
- Tăng dần % traffic (50% → 100%)
- Monitor và fix bugs
- Collect feedback

---

## Metrics để đo lường thành công

1. **Engagement Metrics:**
   - Click-through rate (CTR) tăng bao nhiêu %
   - Contact rate tăng bao nhiêu %
   - Time on site tăng bao nhiêu %

2. **Relevance Metrics:**
   - User satisfaction (survey hoặc implicit feedback)
   - Bounce rate giảm bao nhiêu %
   - Số lần search trước khi tìm thấy phòng phù hợp

3. **Performance Metrics:**
   - Search latency (phải < 500ms)
   - Cache hit rate
   - Database query performance

---

## Rủi ro và Giải pháp

### Rủi ro 1: Privacy concerns
- **Giải pháp**: Cho phép user opt-out, xóa history, transparent về data usage

### Rủi ro 2: Performance impact
- **Giải pháp**: Caching, async processing, optimize queries

### Rủi ro 3: Over-personalization (filter bubble)
- **Giải pháp**: Vẫn giữ diversity trong kết quả, không chỉ show preference

### Rủi ro 4: Cold start (user mới)
- **Giải pháp**: Fallback về default ranking, có thể dùng collaborative filtering

---

## Timeline ước tính

- **Bước 1-2**: 2 tuần (Database + Tracking)
- **Bước 3**: 1 tuần (Preference Service)
- **Bước 4**: 1 tuần (Integration)
- **Bước 5-6**: 1 tuần (API + Optimization)
- **Bước 7-9**: 2 tuần (Testing + Rollout)

**Tổng: ~7-8 tuần**

---

## Notes

- Có thể bắt đầu đơn giản: chỉ track view history và boost category/location
- Sau đó mở rộng: thêm amenity preferences, price range, collaborative filtering
- Luôn có fallback: nếu personalization fail → dùng default ranking
- Monitor và iterate: dựa trên data thực tế để điều chỉnh công thức

