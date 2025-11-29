# KẾ HOẠCH CẢI THIỆN HỆ THỐNG SEARCH

## TỔNG QUAN

Kế hoạch này bao gồm 4 nhóm cải thiện chính:
1. **Type Safety** - Giảm `any` types, thêm interfaces
2. **Error Handling** - Thêm retry mechanism, circuit breaker
3. **Performance** - Thêm caching cho geocode, optimize queries
4. **Personalization** - Tích hợp từ `planuxsearch.md`

**Timeline tổng thể: ~10-12 tuần**

---

## PHẦN 1: TYPE SAFETY (Ưu tiên cao)

### Mục tiêu
Giảm `any` types từ 19 xuống < 5, tăng type safety cho codebase.

### 1.1. Tạo Interfaces & Types

**File mới: `src/modules/search/types.ts`**

```typescript
// Elasticsearch response types
export interface ElasticsearchHit {
  _id: string;
  _score: number;
  _source: SearchDocument;
  highlight?: Record<string, string[]>;
}

export interface SearchDocument {
  postId: number;
  roomId: number | null;
  title: string;
  description: string;
  category: string;
  type: 'rent' | 'roommate';
  price: number | null;
  area: number | null;
  address: {
    full: string;
    city: string;
    district: string;
    ward: string;
    provinceCode?: string;
    wardCode?: string;
  };
  coords: { lon: number; lat: number } | null;
  bedrooms?: number;
  bathrooms?: number;
  furniture?: string;
  legalStatus?: string;
  propertyType?: string;
  buildingName?: string;
  // ... các field khác
}

export interface SearchResponseItem {
  id: string;
  score: number;
  postId: number;
  roomId: number | null;
  title: string;
  description: string;
  category: string;
  type: 'rent' | 'roommate';
  price: number | null;
  area: number | null;
  address: SearchDocument['address'];
  images: string[];
  coords: { lon: number; lat: number } | null;
  createdAt: Date;
  bedrooms?: number;
  bathrooms?: number;
  furniture?: string;
  legalStatus?: string;
  propertyType?: string;
  buildingName?: string;
  // ... các field khác
  highlight?: Record<string, string[]>;
}

// Elasticsearch query types
export interface FunctionScoreFunction {
  filter?: any;
  weight?: number;
  gauss?: any;
}

export interface ElasticsearchQueryBody {
  track_total_hits: boolean;
  from: number;
  size: number;
  sort: any[];
  query: {
    function_score: {
      query: {
        bool: {
          must: any[];
          filter: any[];
        };
      };
      functions: FunctionScoreFunction[];
      boost_mode: 'sum' | 'multiply' | 'max' | 'min' | 'avg' | 'replace';
      score_mode: 'sum' | 'multiply' | 'max' | 'min' | 'avg' | 'first' | 'avg';
    };
  };
  highlight?: any;
}
```

### 1.2. Cập nhật SearchPostsParams

**Thêm các field còn thiếu:**
```typescript
export type SearchPostsParams = {
  // ... các field hiện tại
  priceComparison?: 'cheaper' | 'more_expensive'; // Thêm vào thay vì (p as any)
  minCreatedAt?: string; // Thêm vào thay vì (p as any)
  userId?: number; // Cho personalization (từ planuxsearch.md)
}
```

### 1.3. Refactor SearchService

**Thay đổi:**
- `buildResponseItem(h: any)` → `buildResponseItem(h: ElasticsearchHit): SearchResponseItem`
- `(p as any).priceComparison` → `p.priceComparison`
- `(p as any).minCreatedAt` → `p.minCreatedAt`
- `body as any` → `body: ElasticsearchQueryBody`

### Timeline: 1 tuần
- Day 1-2: Tạo interfaces và types
- Day 3-4: Refactor SearchService
- Day 5: Refactor SearchIndexerService, SearchWatcherService
- Day 6-7: Testing và fix lỗi TypeScript

---

## PHẦN 2: ERROR HANDLING (Ưu tiên cao)

### Mục tiêu
Thêm retry mechanism, circuit breaker, và error recovery cho các operations quan trọng.

### 2.1. Tạo Retry Utility

**File mới: `src/shared/utils/retry.util.ts`**

```typescript
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: string[];
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryableErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'],
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Nếu không phải retryable error hoặc đã hết retry → throw
      if (attempt === maxRetries || !isRetryableError(error, retryableErrors)) {
        throw error;
      }

      // Exponential backoff
      await sleep(delay);
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError!;
}

function isRetryableError(error: any, retryableErrors: string[]): boolean {
  const errorCode = error?.code || error?.message || '';
  return retryableErrors.some(code => errorCode.includes(code));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 2.2. Tạo Circuit Breaker Utility

**File mới: `src/shared/utils/circuit-breaker.util.ts`**

```typescript
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

### 2.3. Áp dụng vào SearchIndexerService

**Geocode fallback với retry:**
```typescript
// Thay vì:
const res = await this.geocoder.geocode(`${addressText}, Vietnam`);

// Dùng:
const res = await retry(
  () => this.geocoder.geocode(`${addressText}, Vietnam`),
  { maxRetries: 3, initialDelay: 1000 }
);
```

### 2.4. Áp dụng vào SearchWatcherService

**Change stream với error recovery:**
```typescript
cs.on('error', async (e: any) => {
  this.logger.error(`watchPosts stream error: ${e?.message || e}`);
  
  // Retry reconnect sau 5 giây
  await sleep(5000);
  this.watchPosts(); // Reconnect
});
```

### Timeline: 1 tuần
- Day 1-2: Tạo retry và circuit breaker utilities
- Day 3-4: Áp dụng vào SearchIndexerService (geocode)
- Day 5: Áp dụng vào SearchWatcherService (change streams)
- Day 6-7: Testing và monitoring

---

## PHẦN 3: PERFORMANCE - CACHING (Ưu tiên trung bình)

### Mục tiêu
Thêm caching cho geocode để giảm latency và chi phí API.

### 3.1. Tạo GeocodeCacheService

**File mới: `src/modules/search/geocode-cache.service.ts`**

```typescript
@Injectable()
export class GeocodeCacheService {
  private readonly cachePrefix = 'geo:';
  private readonly ttl = 60 * 60 * 24 * 7; // 7 ngày

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly logger: Logger,
  ) {}

  async get(address: string): Promise<{ lat: number; lon: number } | null> {
    const key = `${this.cachePrefix}${this.normalizeAddress(address)}`;
    const cached = await this.redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }

  async set(address: string, coords: { lat: number; lon: number }): Promise<void> {
    const key = `${this.cachePrefix}${this.normalizeAddress(address)}`;
    await this.redis.setex(key, this.ttl, JSON.stringify(coords));
  }

  private normalizeAddress(address: string): string {
    return address.toLowerCase().trim().replace(/\s+/g, ' ');
  }
}
```

### 3.2. Cập nhật SearchIndexerService

**Sử dụng cache:**
```typescript
// Trước khi geocode, check cache
const cached = await this.geocodeCache.get(addressText);
if (cached) {
  lon = cached.lon;
  lat = cached.lat;
} else {
  // Geocode và cache lại
  const res = await retry(() => this.geocoder.geocode(...));
  if (res) {
    lon = res.longitude;
    lat = res.latitude;
    await this.geocodeCache.set(addressText, { lat, lon });
  }
}
```

### 3.3. Cập nhật SearchController.geocode

**Sử dụng cache:**
```typescript
@Get('geocode')
async geocodeAddress(@Query('address') address: string) {
  // Check cache trước
  const cached = await this.geocodeCache.get(address);
  if (cached) {
    return cached;
  }

  // Geocode và cache lại
  const result = await this.geocodeAddressInternal(address);
  if (result) {
    await this.geocodeCache.set(address, { lat: result.lat, lon: result.lon });
  }
  
  return result;
}
```

### Timeline: 3 ngày
- Day 1: Tạo GeocodeCacheService
- Day 2: Tích hợp vào SearchIndexerService và SearchController
- Day 3: Testing và monitoring cache hit rate

---

## PHẦN 4: PERSONALIZATION (Ưu tiên trung bình - từ planuxsearch.md)

### Mục tiêu
Tích hợp personalization dựa trên lịch sử hành vi của user.

### 4.1. Database Schema (Bước 1 từ planuxsearch.md)

**Collections:**
- `user_search_history` - Lưu lịch sử search
- `user_view_history` - Lưu lịch sử xem bài đăng
- `user_preferences` - Cache preferences (optional, có thể tính real-time)

**Timeline: 2 tuần** (từ planuxsearch.md)

### 4.2. Tracking Service (Bước 2 từ planuxsearch.md)

**File mới: `src/modules/search/user-behavior-tracking.service.ts`**

**Chức năng:**
- `trackSearch(userId, query, filters, resultCount)`
- `trackView(userId, postId, postData, action, duration)`
- `trackClick(userId, postId)`
- `trackContact(userId, postId)`
- `trackSave(userId, postId)`

**Timeline: 2 tuần** (từ planuxsearch.md)

### 4.3. Preference Service (Bước 3 từ planuxsearch.md)

**File mới: `src/modules/search/user-preference.service.ts`**

**Chức năng:**
- `calculatePreferences(userId)`: Tính từ history
- `getPreferences(userId)`: Lấy từ cache hoặc tính lại
- `updatePreferences(userId)`: Cập nhật khi có hành vi mới

**Caching:**
- Redis key: `user:pref:${userId}`
- TTL: 24h
- Invalidate khi có hành vi quan trọng

**Timeline: 1 tuần** (từ planuxsearch.md)

### 4.4. Tích hợp vào SearchService (Bước 4 từ planuxsearch.md)

**Cập nhật `SearchService.searchPosts()`:**

```typescript
// Thêm userId vào SearchPostsParams
export type SearchPostsParams = {
  // ... existing
  userId?: number;
}

// Trong buildFunctions, thêm personalization boost:
const buildFunctions = (isCategoryBoost = false, preferences?: UserPreferences) => {
  const functions: any[] = [];
  
  // ... existing Tier 1-4 logic ...
  
  // Personalization boost (ưu tiên thấp hơn Tier nhưng cao hơn default)
  if (preferences) {
    // Boost category
    if (preferences.categoryWeights['chung-cu'] > 0.5) {
      functions.push({
        filter: { term: { category: 'chung-cu' } },
        weight: preferences.categoryWeights['chung-cu'] * 10,
      });
    }
    
    // Boost location
    // Boost amenities
    // ...
  }
  
  return functions;
};
```

**Timeline: 1 tuần** (từ planuxsearch.md)

### 4.5. API Endpoints (Bước 5 từ planuxsearch.md)

**Tracking endpoints:**
- `POST /api/search/track/view`
- `POST /api/search/track/click`
- `POST /api/search/track/contact`
- `POST /api/search/track/save`

**Search endpoints (cập nhật):**
- `GET /api/search/posts?userId=123&q=...`
- `GET /api/search/nlp?userId=123&q=...`

**Timeline: 1 tuần** (từ planuxsearch.md)

### Timeline tổng: 7-8 tuần (từ planuxsearch.md)

---

## KẾ HOẠCH TỔNG HỢP & ƯU TIÊN

### Phase 1: Foundation (Tuần 1-2)
**Mục tiêu:** Cải thiện code quality và stability

1. **Type Safety** (Tuần 1)
   - Tạo interfaces và types
   - Refactor SearchService
   - Refactor các service khác

2. **Error Handling** (Tuần 2)
   - Tạo retry và circuit breaker utilities
   - Áp dụng vào geocode fallback
   - Áp dụng vào change streams

**Kết quả:** Code ổn định hơn, dễ maintain hơn

---

### Phase 2: Performance (Tuần 3)
**Mục tiêu:** Tối ưu performance

3. **Geocode Caching** (Tuần 3)
   - Tạo GeocodeCacheService
   - Tích hợp vào SearchIndexerService
   - Tích hợp vào SearchController

**Kết quả:** Giảm latency và chi phí geocode API

---

### Phase 3: Personalization (Tuần 4-11)
**Mục tiêu:** Thêm tính năng personalization

4. **Personalization** (Tuần 4-11, từ planuxsearch.md)
   - Database schema (Tuần 4-5)
   - Tracking service (Tuần 6-7)
   - Preference service (Tuần 8)
   - Integration (Tuần 9)
   - API endpoints (Tuần 10)
   - Testing & Rollout (Tuần 11)

**Kết quả:** Search thông minh hơn, UX tốt hơn

---

## TIMELINE TỔNG THỂ

| Tuần | Task | Ưu tiên | Phụ thuộc |
|------|------|---------|-----------|
| 1 | Type Safety | Cao | - |
| 2 | Error Handling | Cao | Type Safety |
| 3 | Geocode Caching | Trung bình | Error Handling |
| 4-5 | Personalization: Database | Trung bình | - |
| 6-7 | Personalization: Tracking | Trung bình | Database |
| 8 | Personalization: Preference | Trung bình | Tracking |
| 9 | Personalization: Integration | Trung bình | Preference |
| 10 | Personalization: API | Trung bình | Integration |
| 11 | Personalization: Testing | Trung bình | API |

**Tổng: 11 tuần**

---

## LƯU Ý QUAN TRỌNG

### 1. **Thứ tự thực hiện:**
- ✅ **Bắt đầu với Type Safety và Error Handling** (Phase 1) - Quan trọng cho stability
- ✅ **Sau đó Performance** (Phase 2) - Cải thiện UX
- ✅ **Cuối cùng Personalization** (Phase 3) - Feature mới

### 2. **Có thể làm song song:**
- Type Safety và Error Handling có thể làm song song (khác files)
- Geocode Caching có thể làm song song với Personalization (khác modules)

### 3. **Có thể bỏ qua nếu không quan trọng:**
- ⚠️ **Geocode Caching**: Có thể bỏ qua nếu không có vấn đề performance
- ⚠️ **Personalization**: Có thể bỏ qua nếu không cần tính năng này ngay

### 4. **Minimum Viable:**
- ✅ **Type Safety**: Nên làm (quan trọng cho maintainability)
- ✅ **Error Handling**: Nên làm (quan trọng cho stability)
- ⚠️ **Geocode Caching**: Có thể làm sau
- ⚠️ **Personalization**: Có thể làm sau

---

## KHUYẾN NGHỊ

### **Nếu chỉ có 2-3 tuần:**
1. ✅ Type Safety (1 tuần)
2. ✅ Error Handling (1 tuần)
3. ⚠️ Geocode Caching (1 tuần) - Optional

### **Nếu có 4-6 tuần:**
1. ✅ Type Safety (1 tuần)
2. ✅ Error Handling (1 tuần)
3. ✅ Geocode Caching (1 tuần)
4. ⚠️ Personalization: Database + Tracking (2 tuần) - Bắt đầu

### **Nếu có đủ 11 tuần:**
1. ✅ Làm tất cả theo timeline

---

## KẾT LUẬN

Kế hoạch này kết hợp:
- ✅ **Type Safety** - Cải thiện code quality
- ✅ **Error Handling** - Tăng stability
- ✅ **Performance** - Tối ưu caching
- ✅ **Personalization** - Feature mới (từ planuxsearch.md)

**Có thể thực hiện từng phần, không cần làm hết một lúc.**

