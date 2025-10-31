### 1️⃣ ROOM → MONGODB

- **Geocoding Mapbox (RoomsService)**: ✔
```21:26:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/rooms/rooms.service.ts
const options: NodeGeocoder.Options = {
  provider: 'mapbox',
  apiKey: this.configService.get<string>('MAPBOX_API_KEY') as string,
};
this.geocoder = NodeGeocoder(options);
```
```49:56:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/rooms/rooms.service.ts
// Geocode từ Mapbox
const result = await this.geocoder.geocode(`${addressText}, Vietnam`);
if (result.length > 0) {
  const { longitude, latitude } = result[0];
  // cache & return
}
```

- **Build fullAddress & gọi geocode khi create/update**: ✔
```62:70:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/rooms/rooms.service.ts
private buildAddressText(addr: any): string {
  const parts = [
    addr?.specificAddress || addr?.street || '',
    addr?.wardName || addr?.ward || '',
    addr?.city || '',
    addr?.provinceName || '',
  ].filter(Boolean);
  return parts.join(', ');
}
```
```133:142:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/rooms/rooms.service.ts
const addressText = this.buildAddressText(roomData.address);
const geo = await this.geocodeAndCache(addressText);
if (geo) {
  roomToCreate.address = {
    ...roomData.address,
    location: { type: 'Point', coordinates: [geo.lon, geo.lat] },
  };
}
```
```197:207:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/rooms/rooms.service.ts
const addressText = this.buildAddressText(updateData.address);
const geo = await this.geocodeAndCache(addressText);
if (geo) {
  updatePayload.address = {
    ...updateData.address,
    location: { type: 'Point', coordinates: [geo.lon, geo.lat] },
  };
}
```

- **GeoJSON Point lưu `address.location`**: ✔
```138:141:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/rooms/rooms.service.ts
location: { type: 'Point', coordinates: [geo.lon, geo.lat] },
```

- **2dsphere index trên RoomSchema**: ✔
```272:275:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/rooms/schemas/room.schema.ts
export const RoomSchema = SchemaFactory.createForClass(Room);
// 2dsphere index trên GeoJSON location trong address
RoomSchema.index({ 'address.location': '2dsphere' });
```


### 2️⃣ POST → ROOM

- **Tạo Post có đọc `roomId` để lấy Room**: ✔
```17:23:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/posts/posts.service.ts
const postId = await this.getNextPostId();
const room = await this.validateAndGetRoom(postData.roomId);
// ... enrich metadata từ room
```

- **Truyền Room (kèm `address.location`) sang Indexer khi index**: ✔ (qua Watcher — xem mục 4)
```27:34:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/search/search-watcher.service.ts
if (chg.operationType === 'insert' || chg.operationType === 'update' || chg.operationType === 'replace') {
  const post = chg.fullDocument;
  let room: any | null = null;
  if (post?.roomId != null) {
    room = await rooms.findOne({ roomId: post.roomId });
  }
  await this.indexer.indexPost(post, room);
}
```

- **Fallback khi Room chưa có toạ độ**: ⚠ (không thấy fallback; chỉ map nếu có `room.address.location`)
```17:22:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/search/search-indexer.service.ts
const coords = room?.address?.location?.coordinates;
const lon = Array.isArray(coords) ? Number(coords[0]) : undefined;
const lat = Array.isArray(coords) ? Number(coords[1]) : undefined;
```
→ Nếu Room chưa có `address.location`, `coords` sẽ null; không thấy log cảnh báo hoặc geocode bù từ `post.roomInfo.address`.


### 3️⃣ SEARCH INDEXER (Elasticsearch document)

- **Lấy `coords` từ `room.address.location.coordinates`**: ✔
```17:21:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/search/search-indexer.service.ts
const coords = room?.address?.location?.coordinates;
const lon = Array.isArray(coords) ? Number(coords[0]) : undefined;
const lat = Array.isArray(coords) ? Number(coords[1]) : undefined;
```

- **Đẩy `coords` dạng `{lon,lat}` (phù hợp `geo_point`)**: ✔
```32:41:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/search/search-indexer.service.ts
coords: lon != null && lat != null ? { lon, lat } : null,
```

- **Mapping `geo_point` cho `coords`**: ⚠ (không thấy tạo mapping trong code; cần đảm bảo index ES có mapping sẵn)

- **Nếu không có `coords`, filter geo_distance**: ✔ (SearchService chỉ áp dụng filter khi có lat/lon input; document thiếu coords sẽ không match geo_distance)
```62:69:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/search/search.service.ts
if (p.lat != null && p.lon != null && p.distance) {
  filter.push({
    geo_distance: {
      distance: p.distance,
      coords: { lat: Number(p.lat), lon: Number(p.lon) },
    },
  });
}
```


### 4️⃣ WATCHER & REINDEX

- **Room thay đổi địa chỉ/toạ độ → Reindex các Post liên quan**: ✔
```47:60:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/search/search-watcher.service.ts
const cs = rooms.watch([], { fullDocument: 'updateLookup' });
// ... lấy roomId và room
const related = await posts.find({ roomId }).toArray();
await Promise.all(related.map((p: any) => this.indexer.indexPost(p, room)));
```

- **Post thay đổi → Load Room và index lại**: ✔
```20:34:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/search/search-watcher.service.ts
const cs = posts.watch([], { fullDocument: 'updateLookup' });
// ... nếu có roomId thì load room rồi indexPost(post, room)
```


### 5️⃣ NLP SEARCH

- **Geocode Mapbox theo location text**: ✔
```32:37:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/nlp-search/nlp-search.service.ts
const options: NodeGeocoder.Options = {
  provider: 'mapbox',
  apiKey: this.configService.get<string>('MAPBOX_API_KEY') as string,
};
this.geocoder = NodeGeocoder(options);
```

- **Sinh `$geoNear` với key `address.location` khi có geo**: ✔
```142:151:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/nlp-search/nlp-search.service.ts
const geoNearStage = {
  $geoNear: {
    near: { type: 'Point', coordinates: [longitude, latitude] },
    distanceField: 'distance',
    maxDistance: 10000,
    spherical: true,
    key: 'address.location',
  },
};
```


### 6️⃣ ĐỀ XUẤT (Tối thiểu, không đổi hiện trạng code)

- **Fallback geocode trong Indexer khi không có Room hoặc Room thiếu toạ độ**: ⚠
  - File: `src/modules/search/search-indexer.service.ts`
  - Vị trí: `buildDoc(post, room)`.
  - Logic gợi ý: Nếu `coords` null và `post.roomInfo?.address` có dữ liệu, build `fullAddress` (specificAddress/street, wardName, city, provinceName), gọi Mapbox (qua `ConfigService.MAPBOX_API_KEY`) để lấy `{lon,lat}`, set `coords` trước khi index.

- **Đảm bảo mapping ES**: ⚠
  - Tạo index template/mapping cho `ELASTIC_INDEX_POSTS` với `coords` kiểu `geo_point` để `geo_distance` hoạt động chính xác.

- **Log cảnh báo khi thiếu coords**: ⚠
  - File: `search-indexer.service.ts`
  - Khi `coords` null nhưng có `post.roomId`, ghi log warning để theo dõi chất lượng dữ liệu địa lý.

- **Chia sẻ GeocodeService dùng chung**: (khuyến nghị)
  - Gom logic `node-geocoder` + Redis cache hiện đang lặp ở `RoomsService` và `NlpSearchService` vào một `GeocodeService` dùng chung.


### Đọc ENV Mapbox

- **MAPBOX_API_KEY từ ConfigService**: ✔ (RoomsService, NlpSearchService)
```21:24:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/modules/rooms/rooms.service.ts
apiKey: this.configService.get<string>('MAPBOX_API_KEY') as string,
```
```32:35:/Users/huutri/Documents/KTLN/KTLN_2025_NhaChungBE/src/nlp-search/nlp-search.service.ts
apiKey: this.configService.get<string>('MAPBOX_API_KEY') as string,
```


### Tổng quan trạng thái (Rooms / Posts / SearchIndexer / SearchWatcher / NLP)

- **Rooms**: ✔ Geocode Mapbox, lưu GeoJSON `[lon,lat]`, có 2dsphere index.
- **Posts**: ✔ Tạo từ Room, Watcher sẽ lấy Room và gửi sang Indexer.
- **SearchIndexer**: ✔ Map `room.address.location` → `coords`; ⚠ thiếu fallback khi `coords` null; ⚠ cần đảm bảo mapping ES `geo_point`.
- **SearchWatcher**: ✔ Theo dõi thay đổi Post/Room và reindex tương ứng.
- **NLP**: ✔ Geocode truy vấn, tạo `$geoNear` với `key: 'address.location'`.


### Rủi ro chính

- `coords` null cho các post không gắn room hoặc room thiếu `address.location` → mất filter khoảng cách tại ES.
- Chưa thấy nơi đảm bảo mapping `coords: geo_point` cho index ES → có thể gây lỗi hoặc không áp dụng `geo_distance`.


### Trả lời ngắn

- **ES nhận coords cho post có roomId?** YES — Room đã geocode và Watcher truyền Room vào Indexer để map `coords`.
- **Cần fallback geocode ở Indexer?** YES — Post không có room hoặc room thiếu toạ độ sẽ khiến `coords=null`.
- **Test nhanh bằng curl:**
```bash
# 1) Tìm quanh toạ độ (geo_distance filter)
curl -G "http://localhost:3000/search/posts" \
  --data-urlencode "lat=10.7769" \
  --data-urlencode "lon=106.7009" \
  --data-urlencode "distance=3km" \
  --data-urlencode "limit=5"

# 2) NLP search với địa điểm (NLP sẽ geocode)
curl -G "http://localhost:3000/nlp-search" --data-urlencode "q=phòng trọ gần quận 1 giá dưới 5 triệu"
```
