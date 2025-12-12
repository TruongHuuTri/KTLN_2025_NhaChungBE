# Tóm Tắt Tính Năng Search Đã Hoàn Thành

## 🏗️ Kiến Trúc Multi-Agent System

### Flow Hoạt Động

```
User Query → OrchestratorService
                ↓
        ┌───────┴───────┐
        ↓               ↓
   ParserAgent    LocationAgent (parallel)
   (Parse NLP)    (Geocoding POI)
        ↓               ↓
        └───────┬───────┘
                ↓
        mapParsedToParams
                ↓
        RetrieverAgent
   (Search ES + Rerank)
                ↓
        PersonalizationAgent
   (Boost từ history/preferences)
                ↓
            Results
```

### Các Agents

1. **OrchestratorService**: Điều phối toàn bộ flow
   - Gọi ParserAgent và LocationAgent song song
   - Merge kết quả và chuyển sang RetrieverAgent

2. **ParserAgent**: Parse query tiếng Việt
   - **Heuristic parsing** (nhanh, không dùng AI):
     - Detect category: "phòng trọ" → `phong-tro`
     - Parse giá: "7tr" → `minPrice: 6.3M, maxPrice: 7.7M`
     - Extract location: "gò vấp" → `district: "go vap"`
     - Parse amenities từ keywords
   - **AI parsing** (Gemini, khi cần):
     - Query phức tạp có free-text: "thoáng mát", "yên tĩnh"
     - Query dài với nhiều yêu cầu phức tạp

3. **LocationAgent**: Geocoding POI
   - Context-aware extraction: Tìm POI sau "gần", "cạnh"
   - Geocoding với Mapbox API
   - Cache kết quả trong Redis

4. **RetrieverAgent**: Search và reranking
   - Gọi SearchService để query Elasticsearch
   - Rerank kết quả với AI (nếu cần)
   - Diversify results (tránh duplicate)

5. **PersonalizationAgent**: Quản lý personalization
   - Lưu lịch sử search (10 queries, TTL 7 ngày)
   - Lưu preferences từ profile
   - Boost dựa trên history và click signals

### Khi Nào Dùng AI vs Heuristic?

**Heuristic (nhanh, ~50-200ms):**

- Query có category + (price hoặc district hoặc POI) và không có free-text
- Ví dụ: "phòng trọ gò vấp 3tr" → Skip AI ✅
- Ví dụ: "chung cư gò vấp 7tr" → Skip AI ✅

**AI Gemini (chậm hơn, ~500-1000ms):**

- Query có free-text: "thoáng mát", "yên tĩnh", "sạch sẽ"
- Query phức tạp với nhiều yêu cầu
- Ví dụ: "chung cư gò vấp có hồ bơi gym sổ hồng" → Dùng AI ✅
- Ví dụ: "phòng trọ gần đại học Công nghiệp thoáng mát" → Dùng AI ✅

**Logic quyết định (`shouldSkipAi`):**

```typescript
// Skip AI nếu:
- Có category AND (price hoặc district hoặc POI) AND không có free-text
- Query ngắn <= 8 tokens với price/district và không có "gần" hay free-text
- Có POI + (price hoặc district) và không có free-text
```

### 2. Hybrid Search (BM25 + Vector) vs Rerank AI

**Có 3 lớp search/ranking:**

#### Lớp 1: BM25 Search (Luôn dùng khi có text query)
- **Text Matching** trong Elasticsearch
- Match keywords trong title, description
- Relevance score dựa trên TF-IDF
- Nhanh (~100-200ms), chính xác cho exact match
- **Luôn chạy** khi có `q` parameter

#### Lớp 2: Vector Search (Tự động thêm vào → Hybrid)
- **Semantic Search** với embedding
- Convert query → embedding (OpenAI)
- Tìm documents có embedding gần nhất
- Hiểu ngữ nghĩa, không cần exact match
- **Tự động áp dụng** khi có text query
- ES tự merge BM25 + Vector → **Hybrid Search**
- Fallback về BM25 nếu embedding fail

**Ví dụ Hybrid:**
```
Query: "phòng trọ gò vấp giá rẻ"

BM25: Match "phòng trọ", "gò vấp", "giá rẻ" trong text
Vector: Tìm semantic similarity với "affordable room rental in Go Vap"
→ ES merge 2 kết quả → Kết quả tốt hơn
```

#### Lớp 3: Rerank AI (Chỉ dùng khi cần)
- **RerankAgent** dùng AI để rerank top K results
- Chạy **SAU** khi đã có kết quả từ ES (BM25/Vector)
- Dùng để tinh chỉnh thứ tự kết quả với AI

**Khi nào dùng Rerank AI:**

✅ **Dùng Rerank AI khi:**
- Query dài (>8 tokens)
- Query phức tạp (có free-text: "thoáng mát", "yên tĩnh")
- Có nhiều kết quả (>12 items)
- Circuit breaker không active

❌ **Bỏ qua Rerank AI khi:**
- Query ngắn (<=8 tokens)
- Query đơn giản (có category + price/district, không có free-text)
- Query có cấu trúc rõ ràng (giá/địa lý/category)
- Circuit breaker active (quá nhiều lỗi trước đó)

**Ví dụ:**
```
Query: "phòng trọ gò vấp 3tr"
→ BM25 + Vector (Hybrid) ✅
→ Skip Rerank AI ❌ (query ngắn, có cấu trúc)

Query: "chung cư gò vấp có hồ bơi thoáng mát"
→ BM25 + Vector (Hybrid) ✅
→ Rerank AI ✅ (query dài, có free-text)
```

**So sánh:**

| Method | Khi Nào | Thời Gian | Mục Đích |
|--------|---------|-----------|----------|
| BM25 | Luôn (có text query) | ~100-200ms | Text matching |
| Vector | Tự động (có text query) | ~200-400ms | Semantic search |
| Hybrid | BM25 + Vector | ~200-400ms | Kết hợp text + semantic |
| Rerank AI | Query phức tạp/dài | +300-500ms | Tinh chỉnh thứ tự |

### 3. Soft Ranking với Multi-Phase Search

- ✅ Luôn trả về kết quả (không filter cứng)
- ✅ Multi-phase: mở rộng filters nếu kết quả ít
- ✅ Function score với boosts:
  - Category boost (phong-tro: 30, chung-cu: 25)
  - Price gauss boost (±30% giá mục tiêu)
  - Geo-distance boost (gần POI)
  - Freshness boost (bài mới)
  - PostType boost (cho-thue vs tim-o-ghep)

**Đặc biệt:**

- "Ở ghép" được đẩy xuống khi không tìm "ở ghép" (weight 0.05)
- "Ở ghép" được boost khi tìm "ở ghép" (weight 14)
- Category fallback để tránh null

### 4. Personalization

- ✅ Lưu lịch sử search (10 queries gần nhất, TTL 7 ngày)
- ✅ Boost dựa trên:
  - Category thường tìm
  - Khoảng giá trung bình
  - Địa điểm thường tìm (ward codes)
- ✅ Fallback về profile preferences nếu không có history
- ✅ Tự động lưu history khi user search với userId

### 5. Zero-query Feed

- ✅ Personalized feed cho returning user (dựa trên history hoặc profile)
- ✅ Freshness feed cho new user (sort by newest)
- ✅ Hỗ trợ filter category, postType, lat/lon

### 6. POI Geocoding

- ✅ Context-aware extraction (tìm POI sau "gần", "cạnh")
- ✅ Geocoding với Mapbox API
- ✅ Cache kết quả geocoding trong Redis
- ✅ Geo-distance boost (mặc định 3km, có thể config)

### 7. API Endpoints

- ✅ `GET /api/search`: Unified search API
  - Có query: NLP search
  - Không query + userId: Personalized feed
  - Không query + không userId: Freshness feed
- ✅ `GET /api/search/recommend`: Recommendations dựa trên history

### 8. Index & Reindex

- ✅ Index posts/rooms vào Elasticsearch
- ✅ Map legacy district names (quận cũ)
- ✅ Index type/postType chuẩn (cho-thue, tim-o-ghep)
- ✅ Index gender cho ở ghép
- ✅ Reindex script để update dữ liệu cũ

### 9. Error Handling & Fallbacks

- ✅ Category fallback khi parser không detect được
- ✅ Price fallback khi parser không parse được
- ✅ Location fallback (district → ward codes)
- ✅ Cache fallback để tránh parse lại

### 10. Debug & Monitoring

- ✅ `_debug` object trong response (dev mode)
- ✅ Log params, functions, phases để debug
- ✅ Cache hit/miss logging

## 📊 Kết Quả Test

### Test Cases Đã Pass

1. ✅ "phòng trọ gò vấp 3tr" → Top 3 phong-tro cho-thue
2. ✅ "chung cư gò vấp hồ bơi gym" → Top 3 chung-cu cho-thue
3. ✅ "ở ghép gò vấp" → Top 5 tim-o-ghep
4. ✅ Zero-query với userId → Personalized feed
5. ✅ Zero-query không userId → Freshness feed
6. ✅ Category không bị null (fallback hoạt động)

### Performance

- Parse query: ~50-200ms (heuristic) hoặc ~500-1000ms (AI)
- Search: ~100-300ms (tùy số lượng kết quả)
- Cache hit: ~10-50ms
- Hybrid search: tự động áp dụng khi cần

## 🔧 Technical Stack

- **Backend**: NestJS + TypeScript
- **Search Engine**: Elasticsearch 8.x
- **Vector**: OpenAI embeddings (cached trong Redis)
- **Geocoding**: Mapbox API
- **Cache**: Redis
- **NLP**: Heuristic parsing + Google Gemini AI

## 📊 So Sánh Performance

| Loại Query     | Method        | Thời Gian   | Khi Nào Dùng                    | Rerank AI? |
| -------------- | ------------- | ----------- | ------------------------------- | ---------- |
| Query đơn giản | Heuristic     | ~50-200ms   | "phòng trọ gò vấp 3tr"          | ❌ Skip    |
| Query phức tạp | AI Gemini     | ~500-1000ms | "chung cư có hồ bơi thoáng mát" | ✅ Dùng    |
| Search BM25    | Text matching | ~100-200ms  | Luôn (có text query)            | -          |
| Search Hybrid  | BM25 + Vector | ~200-400ms  | Tự động (có text query)         | -          |
| Rerank AI      | AI reranking  | +300-500ms  | Query phức tạp/dài              | ✅ Dùng    |
| Cache hit      | Redis cache   | ~10-50ms    | Query đã parse trước đó         | -          |

## 🔄 Flow Hoàn Chỉnh

```
1. User nhập query: "phòng trọ gò vấp 3tr"
   ↓
2. OrchestratorService nhận query
   ↓
3. ParserAgent + LocationAgent (parallel)
   - ParserAgent: Parse → {category: "phong-tro", price: "3tr", district: "go vap"}
     * Heuristic (nhanh) hoặc AI Gemini (chậm hơn, nếu query phức tạp)
   - LocationAgent: Geocoding POI (nếu có)
   ↓
4. mapParsedToParams: Convert sang SearchPostsParams
   ↓
5. RetrieverAgent.retrieve()
   ↓
6. SearchService.search() → Elasticsearch
   - Build ES query với filters và boosts
   - BM25: Text matching (luôn chạy nếu có text query)
   - Vector: Semantic search (tự động thêm nếu có text query)
   - Hybrid: ES tự merge BM25 + Vector
   - Multi-phase search nếu kết quả ít
   ↓
7. PersonalizationAgent.getBoosts() (nếu có userId)
   - Boost từ search history
   - Boost từ click signals
   ↓
8. RerankAgent.rerank() (CHỈ nếu cần)
   - Kiểm tra: query dài? phức tạp? có nhiều kết quả?
   - Nếu đơn giản → Skip rerank (giảm latency)
   - Nếu phức tạp → Rerank với AI để tinh chỉnh thứ tự
   ↓
9. Popularity boost (từ click signals)
   ↓
10. Diversify results (tránh duplicate)
   ↓
11. Return results với highlight
```

**Quyết định Rerank AI:**

```typescript
// Skip rerank nếu:
- Query ngắn (<=8 tokens) 
- Query đơn giản (có category + price/district, không free-text)
- Circuit breaker active (quá nhiều lỗi)

// Dùng rerank nếu:
- Query dài (>8 tokens)
- Query phức tạp (có free-text)
- Có nhiều kết quả (>12 items)
- Circuit breaker không active
```

## 📝 API Documentation

Xem chi tiết trong `docs/FE_INTEGRATION_QUICK_START.md`

## 🚀 Sẵn Sàng Tích Hợp FE

Tất cả tính năng đã hoàn thành và test xong. FE có thể bắt đầu tích hợp ngay.

**Endpoints chính:**

- `GET /api/search?q=...&userId=...` - Unified search API
- `POST /api/events/click` - Click event cho personalization
- `GET /api/search/recommend?userId=...` - Recommendations

**Lưu ý:**

- Luôn gửi `userId` nếu user đã đăng nhập để có personalization
- Gửi click events để cải thiện personalization
- Sử dụng `prefetch` để tăng UX (load trước trang tiếp theo)
- Xử lý `highlight` để hiển thị keywords được match
