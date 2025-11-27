Mục tiêu tổng
Đích đến:
Tìm “chung cư Gò Vấp” cho ra đúng thứ tự Tier như bạn mô tả (King/Queen/Bishop/Pawn).
Kết quả luôn đủ “dày” (≥ 3–4 trang) bằng soft ranking (nới điều kiện dần), không bó chết bằng hard filter.
Card FE đủ data (phòng ngủ/tắm, nội thất, pháp lý, building…) lấy trực tiếp từ ES.
Bước 1: Hoàn thiện Document trong ES
1.1. Mở rộng buildDoc (SearchIndexerService)
Thêm vào doc ES các field sau (flatten, dễ query/boost):
Thông tin phòng: roomBedrooms, roomBathrooms, roomFurniture, roomDeposit, roomUtilities (các flag chính hoặc summary), roomDescriptionRaw.
Thông tin tòa nhà/chung cư: buildingName, buildingBlock, buildingFloor, buildingLegalStatus, buildingPropertyType.
Nhà nguyên căn: houseBedrooms, houseBathrooms, houseLegalStatus, housePropertyType, houseFloors, houseAreaLand, houseAreaUsable.
Loại hóa category chi tiết: ngoài category hiện tại (phong-tro, chung-cu, nha-nguyen-can), thêm categoryDetail nếu cần (ví dụ can-ho-dv, studio…).
1.2. Cập nhật template ES (SearchBootstrapService.ensureTemplate)
Tạo mapping cho các field mới:
keyword + normalizer: kwd_fold cho buildingName, buildingBlock, buildingLegalStatus, buildingPropertyType, roomFurniture.
integer/float cho roomBedrooms, roomBathrooms, các diện tích, số tầng…
Nếu muốn search theo tên tòa nhà: cho buildingName thêm subfield text với analyzer vi_fold + vi_fold_ngram tương tự title.
Không cần đổi analyzer cho title/description/address (BM25 vẫn giữ nguyên).
1.3. Reindex
Chạy POST /api/search/reindex/posts sau khi deploy để backfill toàn bộ document với field mới.
Bước 2: Thiết kế lại chiến lược Ranking (Tier + Soft)
2.1. Thiết kế “Tầng điểm” trong function_score
Trong SearchService.searchPosts:
Giữ multi_match + BM25 như hiện tại (đây là “lõi relevance”).
Dùng function_score.functions để tạo Tier rõ ràng:
Tier 1 – King: Chung cư + đúng phường (ward)
filter: type='rent' + category='chung-cu' + address.wardCode in exactWardCodes
weight: rất cao, ví dụ weight: 50–80.
Khi cộng với BM25, thường > 1000 (tùy base score, nhưng mục tiêu là “vượt trội”).
Tier 2 – Queen: Chung cư + gần đó (bán kính, hoặc ward mở rộng)
filter: category='chung-cu' + geo_distance gần (hoặc address.wardCode in expandedWardCodes).
weight: trung bình cao, ví dụ 20–40.
Tier 3 – Bishop: Phòng trọ nhưng đúng phường
filter: category='phong-tro' + address.wardCode in exactWardCodes.
weight: thấp hơn Tier 2, ví dụ 10–20.
Tier 4 – Pawn: Còn lại
Không cần explicit filter; đây là phần không match filter trên, sẽ nằm lại với trọng số chỉ từ BM25 + decay “newness/geo” hiện có.
Có thể chuyển boost_mode từ 'sum' sang 'multiply' hoặc 'max' tùy muốn, nhưng với mô hình “tier + BM25”, sum vẫn ổn: BM25 quyết định trong cùng tầng, weight quyết định giữa các tầng.
2.2. Soft ranking thay cho hard filter
Mục tiêu: luôn cố gắng có ≥ 3–4 trang (≥ 36–48 kết quả), nhưng vẫn ưu tiên mạnh theo thứ tự:
Đúng ward + đúng category (Tier 1/3).
Đúng ward + category khác / ward lân cận (Tier 2).
Rộng dần ra district/city nếu chưa đủ.
Cụ thể:
Thêm tham số mới (từ NlpSearchService sang SearchService):
strict?: boolean (mặc định false cho NLP search).
minResults?: number hoặc đơn giản minPages?: number (ví dụ 3, với limit=12 → 36 bản ghi).
Áp dụng trong searchPosts:
Phase 1 (Strict): giữ filter hẹp như hiện tại (exact ward, price range, category nếu được chỉ định).
Nếu totalHits < minResults và strict=false:
Relax 1: thay filter wardCode = exactWardCodes bằng wardCode in expandedWardCodes (phường cùng quận). (Đã có cơ chế này, chỉ cần buộc dùng khi totalHits thấp hơn minResults, không chỉ expansionThreshold cứng).
Nếu vẫn thiếu:
Relax 2:
Bỏ filter category (chuyển sang boost function_score như đã làm với categoryForBoost).
Có thể nới price (±10–20%) nếu query không chứa điều kiện giá chặt.
Nếu vẫn thiếu:
Relax 3: bỏ bớt constraint còn lại (ví dụ chỉ giữ status/isActive + basic geo), accept mọi loại phòng trong vùng lớn hơn.
Mỗi lần relax, giữ nguyên multi_match để BM25 luôn quyết định trong tập mới (soft ranking).
Bước 3: Bổ sung filter & query theo trường mới
Trong SearchService.searchPosts:
3.1. Filter mới (khi client truyền):
minBedrooms, maxBedrooms → range trên roomBedrooms / houseBedrooms.
minBathrooms, maxBathrooms.
legalStatus (keyword).
furnished / furniture → term hoặc terms trên roomFurniture.
buildingName → nếu filter cứng, dùng term trên buildingName.kwd; nếu “search theo tòa nhà”, dùng multi_match với field buildingName.text^X.
3.2. Boost tiện ích & nội thất
Với amenities đã index: giữ terms filter + function_score boost như hiện tại.
Với “nội thất đầy đủ”: định nghĩa bộ keyword → map vào amenities hoặc roomFurnitureNormalized, vừa filter vừa boost.
Bước 4: Cập nhật FE + Contract API
4.1. Response
Đảm bảo SearchService.buildResponseItem trả luôn các field FE cần:
bedrooms, bathrooms, buildingName, furniture, legalStatus, roomDescriptionRaw nếu muốn hiển thị snippet.
Có thể expose _score trong dev mode để debug ranking.
4.2. FE
Đọc các field mới từ response, bỏ default “0 phòng ngủ/0 phòng tắm”.
Tùy chỉnh UI cho filter nâng cao (phòng ngủ/tắm, nội thất, pháp lý, loại nhà…).
Bước 5: Lộ trình triển khai
Branch mới: implement mở rộng buildDoc + mapping template + field mới trong SearchService.buildResponseItem (chưa đổi ranking).
Reindex trên môi trường dev/staging, test card hiển thị đủ data.
Thêm function_score Tier + soft ranking (Tier 1–4, strict/relax). Log _score, tierTag (field phụ trong response nếu muốn debug).
Test A/B với một số query mẫu: “chung cư gò vấp”, “phòng trọ bình thạnh”… So sánh thứ tự vs kỳ vọng.
Khi ổn, deploy lên prod, chạy lại reindex/posts, monitor log NlpSearchController (total, itemsCount, sample).