# Chiến lược cải thiện Search System

## 1. Không cần Train Model

### AI (Gemini)
- ✅ **Model đã được train sẵn** bởi Google
- ✅ **Chỉ cần prompt engineering** - điều chỉnh prompt để hiểu context tiếng Việt và real estate
- ✅ **Hiện tại đã có prompt tối ưu** với rules và examples

### ES Search
- ✅ **BM25 scoring built-in** - không cần train
- ✅ **Function score boosting** - đã config sẵn (geo, freshness)
- ✅ **Multi-field indexing** - đã setup (raw/fold/ngram)

## 2. Cần Fine-tune dựa trên Data thực tế

### A. Synonyms (Đã có config/synonyms.txt)
- ✅ Thêm từ khóa khi user search không ra kết quả
- ✅ Monitor zero-result queries → thêm synonyms
- ✅ Ví dụ: "q1" → "quận 1", "quận một"

### B. Amenities (Đã có config/amenities.json)
- ✅ Bổ sung keywords khi thiếu
- ✅ Thêm synonyms cho amenities mới
- ✅ Ví dụ: "phòng tập yoga" → thêm vào gym keywords

### C. Boost Weights (Trong search.service.ts)
- ✅ Điều chỉnh boost dựa trên user behavior
- ✅ Monitor click-through rates
- ✅ Boost posts được click nhiều hơn

### D. Ranking Optimization
- ✅ Học từ search logs
- ✅ A/B testing các boost weights
- ✅ User feedback loop

## 3. Monitoring & Learning System (Cần implement)

### A. Search Logging
```typescript
// Log mỗi search query
- Query text
- Parsed params (from AI)
- Results count
- Clicked posts
- Zero-result queries
```

### B. Analytics Dashboard
- Top queries
- Zero-result queries
- Click-through rates
- Popular amenities
- Popular locations

### C. Auto-improvement
- Tự động suggest synonyms dựa trên zero-result queries
- Tự động adjust boost weights dựa trên CTR
- Alert khi có query patterns mới

## 4. Chiến lược cải thiện

### Phase 1: Baseline (Hiện tại)
- ✅ ES với ICU, multi-field
- ✅ NLP với Gemini
- ✅ Amenities matching
- ✅ Synonyms cho địa danh

### Phase 2: Monitoring (Cần implement)
- [ ] Log search queries
- [ ] Track click-through rates
- [ ] Identify zero-result queries
- [ ] Analytics dashboard

### Phase 3: Learning (Cần implement)
- [ ] Auto-suggest synonyms từ zero-result queries
- [ ] Adjust boost weights từ CTR data
- [ ] User feedback loop
- [ ] A/B testing framework

### Phase 4: Advanced (Tùy chọn)
- [ ] Learning-to-rank model (nếu cần)
- [ ] Personalization (user preferences)
- [ ] Query expansion từ user history
- [ ] Semantic search với embeddings (nếu cần)

## 5. Kết luận

**Không cần train AI model** - Gemini đã được train sẵn.

**Cần fine-tune config** dựa trên data thực tế:
- Synonyms: thêm khi thiếu
- Boost weights: điều chỉnh từ CTR
- Amenities: bổ sung keywords

**Cần monitoring system** để học từ user behavior và tự động improve.

