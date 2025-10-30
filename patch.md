# 1. Tổng quan dự án
- **Node/Nest**: NestJS 11, TypeScript 5.7, Node types ^22; chạy Express (NestExpressApplication), prefix `api`, ValidationPipe global, CORS bật.
- **Kiến trúc**: Monolith NestJS theo module; MongoDB với Mongoose; nhiều module nghiệp vụ: Users/Auth/Rooms/Posts/Contracts/Payments/S3/Email Verification/NLP Search.
- **Modules chính**: `users`, `auth`, `rooms` (kèm `buildings`), `posts`, `contracts` (hợp đồng, invoice), `payments`, `nlp-search`, `s3`, `verifications`, `favourites`, `reviews`, `addresses`.
- **Thư viện quan trọng**: `@nestjs/*`, `mongoose`, `@nestjs/mongoose`, `ioredis` (cache), `node-geocoder` (Mapbox), `@google/generative-ai` (Gemini), `@aws-sdk/client-s3` (S3), `bcrypt`, `passport-jwt`, `puppeteer`, `qrcode`, `nodemailer`.

# 2. package.json
```json
{
  "name": "nha_chung_be",
  "version": "0.0.1",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/core": "^11.0.1",
    "@nestjs/mongoose": "^11.0.3",
    "mongoose": "^8.18.0",
    "ioredis": "^5.8.1",
    "node-geocoder": "^4.4.1",
    "@google/generative-ai": "^0.24.1",
    "@aws-sdk/client-s3": "^3.883.0",
    "@nestjs/jwt": "^11.0.0",
    "@nestjs/passport": "^11.0.5",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.1",
    "axios": "^1.12.2",
    "qrcode": "^1.5.4",
    "nodemailer": "^7.0.6",
    "puppeteer": "^24.22.3"
  }
}
```

3. Sơ đồ Module → Service → Controller
- App bootstrap
```1:62:/Users/huutri/Documents/KLTN/KTLN_2025_NhaChungBE/src/app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({ useFactory: async (configService: ConfigService) => ({
      uri: configService.get<string>('MONGO_URI') || 'mongodb+srv://.../nha_chung_db?...',
    })}),
    UsersModule, FavouritesModule, VerificationsModule, AdminModule, AddressesModule, S3Module,
    AuthModule, EmailVerificationModule, UserProfilesModule, RoomsModule, PostsModule,
    ContractsModule, PaymentsModule, NlpSearchModule, ReviewsModule,
  ],
})
export class AppModule {}
```

- Config/Validation/CORS
```9:44:/Users/huutri/Documents/KLTN/KTLN_2025_NhaChungBE/src/main.ts
const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true }}));
app.setGlobalPrefix('api');
app.enableCors();
app.use(bodyParser.json({ limit: '50mb' }));
```

- Auth (JWT/OTP)
  - Files: `modules/auth/auth.controller.ts`, `modules/auth/auth.service.ts`, `modules/users/guards/jwt-auth.guard.ts`, `modules/users/guards/landlord.guard.ts`, `modules/admin/guards/admin-jwt.guard.ts`.
  - Service: đăng ký/OTP/verify, đổi role, resend OTP.

- Users
  - Files: `modules/users/users.module.ts`, `modules/users/users.service.ts`, `modules/users/users.controller.ts`, `modules/users/schemas/user.schema.ts`.
  - Service: CRUD, login JWT, change password, soft delete, admin quản lý, verification, phòng đã thuê.

- RoomsModule
  - `rooms.module.ts` (ConfigModule, MongooseModule.forFeature Room/Building).
  - `rooms.service.ts` (Mapbox geocode + Redis cache; CRUD building/room; search rooms).
  - `rooms.controller.ts` (Landlord: `/api/landlord/...`; Public: `/api/rooms/...`).

- PostsModule
  - `posts.module.ts` (Post + Room models).
  - `posts.service.ts` (CRUD, enrich từ Room, search keyword/price/location...).
  - `posts.controller.ts` (Public/User/Admin endpoints).

- Contracts/Payments
  - `contracts.controller.ts` (landlord + users; hợp đồng, rental requests, invoices, PDF).
  - `payments.controller.ts` + `payments.service.ts` (QR/ZaloPay, lịch sử hóa đơn).

- NLP Search
  - `nlp-search.controller.ts` → `/api/search/nlp?q=...`
  - `nlp-search.service.ts` (Gemini + Mapbox + Redis, build aggregation, $geoNear, ranking).

- S3/Email/Verifications/Addresses
  - `s3.service.ts` dùng AWS env; `shared/services/email.service.ts` dùng Gmail env.
  - `addresses` chứa chuẩn tỉnh/ward (không geocode).


4. Mô hình dữ liệu
Room Schema/Entity
// src/modules/rooms/schemas/room.schema.ts
```183:275:/Users/huutri/Documents/KLTN/KTLN_2025_NhaChungBE/src/modules/rooms/schemas/room.schema.ts
export class Room {
  @Prop({ required: true, unique: true }) roomId: number;
  @Prop({ required: true }) landlordId: number;
  @Prop({ required: true }) buildingId: number;
  @Prop({ required: true }) roomNumber: string;
  @Prop({ required: true }) category: string;
  @Prop({ required: true }) area: number;
  @Prop({ required: true }) price: number;
  @Prop({ default: 0 }) deposit: number;
  @Prop({ default: '' }) furniture: string;
  @Prop({ type: Address, required: true }) address: Address; // address.location là GeoJSON
  @Prop({ type: GeoLocation, required: false }) location?: GeoLocation;
  @Prop({ type: [String], default: [] }) images: string[];
  @Prop({ default: 'available' }) status: string;
  @Prop({ default: true }) isActive: boolean;
}
RoomSchema.index({ 'address.location': '2dsphere' });
```
- Có coords chưa: Có. `address.location` (GeoJSON Point, 2dsphere index). Root `location?` optional.
- Các trường address: `street`, `ward`, `city`, `specificAddress`, `showSpecificAddress`, `provinceCode`, `provinceName`, `wardCode`, `wardName`, `additionalInfo`, `location?: { type: 'Point', coordinates: [lon, lat] }`.

RentPost Schema/Entity
// src/modules/posts/schemas/post.schema.ts
```273:349:/Users/huutri/Documents/KLTN/KTLN_2025_NhaChungBE/src/modules/posts/schemas/post.schema.ts
export class Post {
  @Prop({ required: true, unique: true }) postId: number;
  @Prop({ required: true }) userId: number;
  @Prop({ required: true }) postType: string;
  @Prop() category?: string;
  @Prop({ required: true }) title: string;
  @Prop({ default: '' }) description: string;
  @Prop({ type: [String], default: [] }) images: string[];
  @Prop({ type: [String], default: [] }) videos: string[];
  @Prop() roomId?: number;
  @Prop() buildingId?: number;
  @Prop() landlordId?: number;
  @Prop({ default: false }) isManaged: boolean;
  @Prop({ default: 'manual_post' }) source: string;
  @Prop({ type: RoomInfo }) roomInfo?: RoomInfo;
  @Prop({ default: 'pending' }) status: string;
}
```
- Quan hệ với Room: qua `roomId` (optional); post được enrich từ Room khi tạo.

- Seed/migration/change streams/soft delete:
  - Không thấy seed/migration/Change Streams.
  - Soft delete: Users (`isActive`), Posts (`status: 'inactive'`), Rooms (`isActive`).


5. Endpoints hiện có
- Rooms
  - Landlord (JWT + LandlordGuard):
    - `POST /api/landlord/buildings` (CreateBuildingDto)
    - `GET /api/landlord/buildings`, `GET /api/landlord/buildings/:id`, `PUT /api/landlord/buildings/:id`, `DELETE /api/landlord/buildings/:id`
    - `POST /api/landlord/rooms` (CreateRoomDto)
    - `GET /api/landlord/rooms[?buildingId=]`, `GET /api/landlord/rooms/:id`
    - `PUT /api/landlord/rooms/:id` (UpdateRoomDto, merge utilities)
    - `DELETE /api/landlord/rooms/:id`
    - Tenants: `GET /api/landlord/rooms/:id/tenants`, `POST /api/landlord/rooms/:id/tenants`, `DELETE /api/landlord/rooms/:id/tenants/:userId`
    - Search: `GET /api/landlord/rooms/search?minPrice&maxPrice&minArea&maxArea&category&buildingId`
  - Public:
    - `GET /api/rooms/search`
    - `GET /api/rooms/:id`
    - `POST /api/rooms/:id/sharing-request` (JWT)

- Posts
  - Public: `GET /api/posts`, `GET /api/posts/search`, `GET /api/posts/:id`, `GET /api/posts/:id/with-room`
  - User (JWT): `POST /api/posts` (CreatePostDto), `PUT /api/posts/:id`, `DELETE /api/posts/:id`, `GET /api/posts/user/my-posts`, `GET /api/posts/user/rooms?postType=...`
  - Admin: `GET /api/admin/posts`, `GET /api/admin/posts/pending`, `PUT /api/admin/posts/:id/approve`, `PUT /api/admin/posts/:id/reject`

- NLP Search
  - `GET /api/search/nlp?q=...` (Gemini → Mongo aggregation → optional $geoNear → ranking)

- Users/Auth
  - Auth: `POST /api/auth/register`, `POST /api/auth/verify-registration`, `POST /api/auth/resend-otp`, `PUT /api/auth/change-role/:userId` (JWT)
  - Users: `POST /api/users`, `POST /api/users/login`, `POST /api/users/:id/change-password` (JWT)
  - GET: `/api/users`, `/api/users/admin` (Admin), `/api/users/me/verification` (JWT), `/api/users/:id/verification`, `/api/users/profile/:id`, `/api/users/rooms` (JWT), `/api/users/:id`
  - Admin users: `PUT /api/users/admin/:id/status`, `POST /api/users/admin/:id/reset-password`


6. Cấu hình & môi trường
- ConfigModule: Global, load `.env` trong `app.module.ts`.
- ENV keys thấy trong code:
  - CSDL/Server: `MONGO_URI`, `PORT`
  - Redis: `REDIS_HOST`, `REDIS_PORT`
  - Mapbox: `MAPBOX_API_KEY`
  - Gemini: `GEMINI_API_KEY`
  - AWS S3: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `PUBLIC_BASE_URL`
  - Email: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `FROM_NAME`, `FROM_EMAIL`
- Redis: Có. Dùng cache geocode, cache kết quả NLP, user prefs.
- Docker/Compose: Không thấy `Dockerfile`/`docker-compose.yml`.
- Logger/Swagger/Rate limit:
  - Logger: mặc định Nest.
  - Swagger: không thấy `@nestjs/swagger`.
  - Rate limit: không thấy `@nestjs/throttler`.
  - CORS: bật.
- URL deploy hardcode: Không thấy; có fallback `MONGO_URI` hardcoded trong `app.module.ts` (nên bỏ khi deploy).


7. Khoảng trống & đề xuất tích hợp
- Elasticsearch: Chưa có client hay cấu hình.
  - Đề xuất:
    - Tạo `SearchModule` riêng: `ElasticsearchService` (kết nối, mapping), `SearchIndexerService` (đồng bộ dữ liệu), `SearchService` (API truy vấn).
    - Indices: `rooms`, `posts` (hoặc 1 index hợp nhất với trường `type`).
    - Mapping: `geo_point` cho tọa độ (lat/lon), text fields có analyzer phù hợp (vi-analyzer nếu có, hoặc standard + ngram).

- Geocode (Mapbox): Đã tích hợp tại `rooms.service.ts` và `nlp-search.service.ts` với Redis cache.
  - Đề xuất: Trích xuất `GeocodeService` dùng chung (chuẩn hoá `fullAddress`, TTL cache, circuit breaker), lưu thêm `address.full` khi tạo/cập nhật.

- NLP (Gemini): Đã có `nlp-search.service.ts` trả Mongo aggregation.
  - Đề xuất: Cho phép output ES DSL (chế độ `mode=es`), hoặc service riêng `NlpService` để chuyển NL → filters cho ES.

- Hook đồng bộ ES:
  - `RoomsService`: sau `createRoom`/`updateRoom`/`deleteRoom` (hoặc `isActive/status`) → index/update/delete ES.
  - `PostsService`: sau `createPost`/`updatePost`/`deletePost` → index/update/delete ES.
  - `PaymentsService.confirmPayment`: khi set room `occupied` và post `inactive` → cập nhật ES tương ứng.
  - Job backfill initial: index toàn bộ rooms/posts hiện có.


8. Rủi ro & việc cần sửa nhỏ trước khi tích hợp
- Thêm pagination/sort chuẩn cho search (`page`, `limit`, `sort`) để khớp ES.
- Chuẩn hoá địa chỉ: thêm `address.full`; đảm bảo post có `coords` (copy từ room hoặc geocode khi `roomInfo.address`).
- Bỏ fallback hardcode `MONGO_URI` trong `app.module.ts`.
- OTP temp register đang lưu in-memory Map → cân nhắc chuyển Redis để tránh mất khi restart.
- Thêm Swagger để quan sát, và throttling cơ bản cho endpoint search.


TODO tích hợp (theo thứ tự)
- Tạo `SearchModule`: ES client + `SearchService` (query) + `SearchIndexerService` (đồng bộ) + mapping `rooms`/`posts` (text + geo_point).
- Tách `GeocodeService` dùng chung (Mapbox + Redis cache), thêm `address.full`, chuẩn hoá geocode pipeline.
- Gắn hook ES tại `RoomsService`/`PostsService`/`PaymentsService` cho create/update/delete/status; viết job backfill dữ liệu.
- Mở rộng `NlpSearchService` hỗ trợ `mode=es` (NL → ES DSL) và thêm endpoint `/api/search` tổng hợp (keyword + filters + geo + NLP).
- Bổ sung pagination/sort cho `/posts`, `/posts/search`, `/rooms/search`, `/search/nlp`.
- Thêm ENV cho ES (`ELASTIC_NODE`, `ELASTIC_USERNAME`, `ELASTIC_PASSWORD`) và validate cấu hình; bỏ hardcode Mongo.
- Viết docs nhanh cho Search API + plan index backfill/rollover; thêm Swagger để công bố.
