# Hướng Dẫn Deploy Lên Render

## Tổng quan

Code đã được cấu hình để hỗ trợ **cả local development và production (Render)**:
- ✅ **Local**: Dùng Elasticsearch local (`http://localhost:9200`), Redis local, MongoDB local
- ✅ **Production**: Dùng Elastic Cloud, Redis trên Render, MongoDB Atlas
- ✅ Code tự động phát hiện và cấu hình phù hợp dựa trên environment variables
- ✅ **Redis tự động fallback**: Nếu không set `REDIS_URL` hoặc `REDIS_HOST`, sẽ tự động dùng `localhost:6379` (tiện cho local dev)

## Setup Environment Variables

### Cho Local Development:

Tạo file `.env` trong thư mục root (copy từ `.env.example` nếu có):

```env
# Redis - Không cần set, code sẽ tự động dùng localhost:6379
# Hoặc set rõ:
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch - Local (dòng 26-28)
ELASTIC_NODE=http://localhost:9200
ELASTIC_USER=elastic
ELASTIC_PASS=your-local-password
ELASTIC_INDEX_POSTS=posts
# Nếu Elasticsearch local không có security, có thể bỏ ELASTIC_USER và ELASTIC_PASS

# MongoDB - Local hoặc Atlas
MONGO_URI=mongodb://localhost:27017/nha_chung_db
# Hoặc MongoDB Atlas:
# MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# Các biến khác...
JWT_SECRET=your-secret-key
# ... (xem phần Environment Variables bên dưới)
```

### Cho Production (Render):

Set environment variables trên Render Dashboard:
- Vào Backend service → Tab **Environment**
- Thêm các biến (xem chi tiết ở Bước 4)

**Quan trọng**: 
- ✅ **Local**: **KHÔNG set `REDIS_URL`** → Tự động dùng `localhost:6379`
  - Có thể set `REDIS_HOST=localhost` và `REDIS_PORT=6379` nếu muốn rõ ràng
- ✅ **Render**: **CHỈ set `REDIS_URL=redis://red-xxxxx:6379`** → Dùng Redis trên Render
  - ❌ **KHÔNG set `REDIS_HOST` và `REDIS_PORT`** khi đã có `REDIS_URL`

## Bước 1: Deploy Redis

1. Vào Render Dashboard → **New** → **Redis**
2. Chọn plan (Free hoặc Starter)
3. Đặt tên: `nha-chung-redis`
4. Sau khi tạo xong, lấy thông tin kết nối:
   - Vào tab **Info** của Redis service
   - **Quan trọng**: Có 2 loại URL:
     - **Internal Redis URL**: Chỉ dùng khi chạy **trên Render** (ví dụ: `redis://red-xxxxx:6379`)
     - **External Redis URL**: Dùng khi chạy **local** hoặc từ bên ngoài Render (nếu có)
   
   **⚠️ Lưu ý quan trọng**:
   - Nếu đang chạy **local development**: 
     - Dùng Redis local (`localhost:6379`) HOẶC
     - Dùng **External Redis URL** (nếu Render có cung cấp)
     - ❌ KHÔNG dùng Internal Redis URL (sẽ bị lỗi `ENOTFOUND`)
   - Nếu đang chạy **trên Render**: Dùng **Internal Redis URL**

## Bước 2: Setup Elasticsearch (Elastic Cloud - Khuyến nghị)

**Tại sao dùng Elastic Cloud?**
- ✅ Không cần tự quản lý infrastructure
- ✅ Có sẵn security, backup, scaling tự động
- ✅ Dễ setup và quản lý hơn
- ✅ Free trial 14 ngày, sau đó có plan rẻ (~$16/tháng)
- ✅ Render không hỗ trợ tốt Elasticsearch tự host

**Các bước setup:**

1. **Đăng ký Elastic Cloud**:
   - Truy cập: https://cloud.elastic.co/
   - Đăng ký tài khoản (có thể dùng email hoặc Google/GitHub)

2. **Tạo Deployment**:
   - Vào Dashboard → **Create deployment**
   - Chọn:
     - **Name**: `nha-chung-search`
     - **Cloud provider**: AWS (hoặc GCP/Azure)
     - **Region**: Chọn gần nhất (ví dụ: `ap-southeast-1` cho Singapore)
     - **Version**: Elasticsearch 8.x (khuyến nghị)
     - **Template**: Development (cho free trial) hoặc Production
     - **Size**: Bắt đầu với 1GB RAM (có thể scale sau)

3. **Lấy thông tin kết nối**:
   - Sau khi deploy xong, vào **Deployment** → Tab **Endpoints**
   - Copy **Elasticsearch endpoint** (ví dụ: `https://xxxxx.ap-southeast-1.aws.cloud.es.io:9243`)
   - Vào tab **Credentials**:
     - Copy **Username** (thường là `elastic`)
     - Copy **Password** (hoặc reset password mới)

4. **Lưu thông tin để dùng ở Bước 4**:
   - `ELASTIC_NODE` = Elasticsearch endpoint (URL đầy đủ)
   - `ELASTIC_USER` = Username (thường là `elastic`)
   - `ELASTIC_PASS` = Password

**Lưu ý**: 
- Elastic Cloud dùng HTTPS, code đã tự động xử lý
- Free trial có giới hạn, nhưng đủ để test và phát triển
- Có thể dùng Bonsai Elasticsearch (alternative) nếu muốn

## Bước 3: Deploy Backend (NestJS)

### 3.1. Chuẩn bị code trên GitHub

1. **Đảm bảo code đã push lên GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Quan trọng**: File `.env` KHÔNG được push lên GitHub (đã có trong `.gitignore`)
   - File `.env` chỉ dùng cho **local development**
   - Environment variables trên Render sẽ được set **trực tiếp trên Dashboard**

### 3.2. Tạo Web Service trên Render

1. Vào Render Dashboard → **New** → **Web Service**
2. **Kết nối GitHub repository**:
   - Chọn GitHub account
   - Chọn repository của bạn
   - Chọn branch (thường là `main` hoặc `master`)
3. Cấu hình:
   - **Name**: `nha-chung-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Chọn plan phù hợp (Free/Starter/Standard)
4. Click **Create Web Service**

### 3.3. Render sẽ tự động:
- Clone code từ GitHub
- Chạy build command
- Deploy ứng dụng
- Tạo URL public (ví dụ: `https://nha-chung-backend.onrender.com`)

## Bước 4: Cấu hình Environment Variables

**⚠️ QUAN TRỌNG**: 
- File `.env` (local) và Environment Variables trên Render là **2 phần RIÊNG BIỆT**
- File `.env` chỉ dùng cho **local development**
- Environment Variables trên Render dùng cho **production**
- Bạn chỉ cần **copy các KEY** từ file `.env` và set **VALUE tương ứng** trên Render Dashboard

### Cách set Environment Variables trên Render:

1. **Mở file `.env` local** của bạn (để xem các KEY cần set)
2. Vào **Backend service** trên Render → Tab **Environment**
3. Click **Add Environment Variable**
4. **Copy KEY từ `.env`** → Paste vào **Key** trên Render
5. **Set VALUE phù hợp cho production** (khác với local):
   - Local: `REDIS_HOST=localhost` 
   - Render: `REDIS_URL=redis://red-xxxxx:6379` (từ Redis service)
   - Local: `ELASTIC_NODE=http://localhost:9200`
   - Render: `ELASTIC_NODE=https://xxxxx.cloud.es.io:9243` (từ Elastic Cloud)
6. Click **Save Changes**
7. Render sẽ **tự động restart** service với env vars mới

### Ví dụ cụ thể:

**Trong file `.env` local của bạn:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
ELASTIC_NODE=http://localhost:9200
ELASTIC_USER=elastic
ELASTIC_PASS=your-local-password
ELASTIC_INDEX_POSTS=posts
MONGO_URI=mongodb://localhost:27017/nha_chung_db
JWT_SECRET=my-local-secret
```

**Trên Render Dashboard, bạn set:**
```
Key: REDIS_URL
Value: redis://red-d4d0v0i4d50c73dg237g:6379  (từ Redis service trên Render)

Key: ELASTIC_NODE  
Value: https://xxxxx.ap-southeast-1.aws.cloud.es.io:9243  (từ Elastic Cloud)

Key: ELASTIC_API_KEY
Value: your-api-key  (từ Elastic Cloud - API Keys tab)
# Hoặc nếu không dùng API Key:
# Key: ELASTIC_USER
# Value: elastic  (từ Elastic Cloud - Credentials tab)
# Key: ELASTIC_PASS
# Value: your-elastic-password  (từ Elastic Cloud - Credentials tab)

Key: MONGO_URI
Value: mongodb+srv://user:pass@cluster.mongodb.net/db  (MongoDB Atlas)

Key: JWT_SECRET
Value: your-production-secret-key  (khác với local, nên đổi)
```

**Lưu ý**: 
- ✅ Các KEY giống nhau (REDIS_HOST, ELASTIC_NODE, MONGO_URI, JWT_SECRET...)
- ✅ Nhưng VALUE khác nhau (local dùng localhost, Render dùng service thật)
- ✅ Không cần push file `.env` lên GitHub

### Danh sách các biến cần thêm:

### Cấu hình cơ bản
```
NODE_ENV=production
PORT=10000
```

### Database
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority
```

### JWT
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### Redis

**⚠️ QUAN TRỌNG: Chỉ dùng MỘT trong 2 cách, không set cả 2 cùng lúc!**

**Cho Local Development** (chạy trên máy của bạn):
```
# Cách 1: Không set gì cả (Khuyến nghị - tự động dùng localhost:6379)
# Code sẽ tự động fallback về localhost:6379

# Cách 2: Set rõ (nếu muốn)
REDIS_HOST=localhost
REDIS_PORT=6379

# ❌ KHÔNG set REDIS_URL khi chạy local (trừ khi có External URL)
```

**Cho Production (Render)** (chạy trên Render):
```
# Cách 1: Dùng REDIS_URL (Khuyến nghị - đơn giản nhất)
REDIS_URL=redis://red-xxxxx:6379
# ❌ KHÔNG set REDIS_HOST và REDIS_PORT khi đã set REDIS_URL

# Cách 2: Dùng REDIS_HOST + REDIS_PORT (nếu không muốn dùng URL)
REDIS_HOST=red-xxxxx
REDIS_PORT=6379
# ❌ KHÔNG set REDIS_URL khi đã set REDIS_HOST và REDIS_PORT
```

**Lưu ý quan trọng**:
- ✅ Code ưu tiên `REDIS_URL` trước, nếu có thì dùng luôn
- ✅ Nếu không có `REDIS_URL`, mới dùng `REDIS_HOST` + `REDIS_PORT`
- ✅ Nếu không có cả 2, tự động fallback về `localhost:6379` (cho local dev)
- ❌ **KHÔNG nên set cả `REDIS_URL` và `REDIS_HOST`/`REDIS_PORT` cùng lúc** (sẽ dùng REDIS_URL, bỏ qua REDIS_HOST)

**Cách lấy từ Render**: 
- Vào Redis service → Tab **Info**
- **Nếu chạy trên Render**: Copy **Internal Redis URL** → `REDIS_URL=redis://red-c1234567890:6379`
- **Nếu chạy local**: 
  - Dùng Redis local: `REDIS_HOST=localhost`, `REDIS_PORT=6379`
  - HOẶC dùng **External Redis URL** (nếu Render có cung cấp)

**Lỗi thường gặp**:
- ❌ `ENOTFOUND red-xxxxx`: Đang chạy **local** nhưng dùng **Internal URL** 
  - **Nguyên nhân**: Internal URL chỉ truy cập được từ bên trong Render network
  - **Giải pháp**: 
    1. Dùng Redis local: `REDIS_HOST=localhost`, `REDIS_PORT=6379`
    2. Hoặc kiểm tra xem Render có cung cấp **External Redis URL** không (một số plan có)
    3. Hoặc dùng SSH tunnel để forward Redis port từ Render về local

**Kiểm tra bạn đang chạy ở đâu**:
- Nếu terminal hiển thị `npm run start:dev` → Đang chạy **LOCAL**
- Nếu xem logs trên Render Dashboard → Đang chạy **RENDER**

**Khi nào dùng gì**:
- ✅ **Local development**: Dùng `localhost:6379` (Redis local)
- ✅ **Render production**: Dùng Internal URL (`redis://red-xxxxx:6379`)

### Elasticsearch

**⚠️ QUAN TRỌNG**: Dùng cùng các KEY (`ELASTIC_NODE`, `ELASTIC_USER`, `ELASTIC_PASS`) nhưng VALUE khác nhau cho local và production.

**Cho Local Development** (file `.env`):
```env
# Dòng 26-28 trong file .env
ELASTIC_NODE=http://localhost:9200
ELASTIC_USER=elastic
ELASTIC_PASS=your-local-password
ELASTIC_INDEX_POSTS=posts
```
- Local: Dùng Elasticsearch local (HTTP, có thể có hoặc không có security)
- Nếu Elasticsearch local không có security, có thể bỏ `ELASTIC_USER` và `ELASTIC_PASS`

**Cho Production (Render - Elastic Cloud)** (set trên Render Dashboard):

**Cách 1: Dùng API Key (Khuyến nghị - đơn giản hơn)**:
```
Key: ELASTIC_NODE
Value: https://xxxxx.ap-southeast-1.aws.cloud.es.io:9243

Key: ELASTIC_API_KEY
Value: your-api-key-from-elastic-cloud

Key: ELASTIC_INDEX_POSTS
Value: posts
```

**Cách 2: Dùng Username/Password** (nếu không có API Key):
```
Key: ELASTIC_NODE
Value: https://xxxxx.ap-southeast-1.aws.cloud.es.io:9243

Key: ELASTIC_USER
Value: elastic

Key: ELASTIC_PASS
Value: your-elastic-cloud-password

Key: ELASTIC_INDEX_POSTS
Value: posts
```

**Cách lấy thông tin từ Elastic Cloud**:
1. Vào Elastic Cloud Dashboard → Chọn **Deployment** đã tạo
2. Tab **Endpoints**:
   - Copy **Elasticsearch endpoint** (ví dụ: `https://xxxxx.ap-southeast-1.aws.cloud.es.io:9243`)
   - → Dùng làm `ELASTIC_NODE` trên Render
3. **Lấy API Key** (Cách 1 - Khuyến nghị):
   - Vào Tab **API Keys** hoặc **Security** → **API Keys**
   - Nếu đã tạo và lưu key trước đó, copy key đó
   - Nếu chưa có, tạo mới:
     - Click **Create API Key**
     - Set tên và quyền (privileges)
     - Copy key (chỉ hiển thị 1 lần, nên lưu lại)
   - → Dùng làm `ELASTIC_API_KEY` trên Render
4. **Lấy Username/Password** (Cách 2 - Nếu không dùng API Key):
   - Tab **Credentials**:
     - Copy **Username** (thường là `elastic`)
     - → Dùng làm `ELASTIC_USER` trên Render
     - Copy **Password** (hoặc reset password mới nếu cần)
     - → Dùng làm `ELASTIC_PASS` trên Render

**Lưu ý**: 
- ✅ Code tự động phát hiện HTTP (local) hay HTTPS (cloud) và cấu hình phù hợp
- ✅ Code hỗ trợ cả **API Key** và **Username/Password**:
  - Nếu có `ELASTIC_API_KEY` → dùng API Key (ưu tiên)
  - Nếu không có API Key nhưng có `ELASTIC_USER` và `ELASTIC_PASS` → dùng Username/Password
- ✅ Local: Dùng `http://localhost:9200` từ file `.env` (dòng 26-28), có thể dùng username/password hoặc không
- ✅ Production: Dùng `https://xxxxx.region.cloud.es.io:9243` từ Elastic Cloud (set trên Render Dashboard)
  - **Khuyến nghị**: Dùng `ELASTIC_API_KEY` (đơn giản và bảo mật hơn)
  - Hoặc dùng `ELASTIC_USER` + `ELASTIC_PASS` nếu không có API Key
- ✅ Cùng KEY (`ELASTIC_NODE`) nhưng VALUE khác nhau (local vs cloud)
- ✅ Không cần set `ELASTIC_URL` nếu đã set `ELASTIC_NODE`

### AWS S3
```
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
S3_BUCKET=your-s3-bucket-name
PUBLIC_BASE_URL=https://your-cloudfront-domain.cloudfront.net
```

### Email (Gmail)
```
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
FROM_NAME=Nhà Chung
FROM_EMAIL=your-email@gmail.com
```

### Frontend URL
```
FRONTEND_URL=https://your-frontend-domain.com
```

### AI/ML Services
```
GEMINI_API_KEY=your-google-gemini-api-key
```

### Map Services
```
MAPBOX_API_KEY=your-mapbox-api-key
```

### Payment (ZaloPay)
```
ZALOPAY_APP_ID=your-zalopay-app-id
ZALOPAY_APP_USER=your-zalopay-app-user
ZALOPAY_KEY1=your-zalopay-key1
ZALOPAY_KEY2=your-zalopay-key2
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
ZALOPAY_CALLBACK_URL=https://your-backend-url.onrender.com/api/payments/zalopay/callback
QR_CODE_SIZE=200
```

### Maintenance Fee (Optional)
```
MAINTENANCE_FEE_ENABLED=true
MAINTENANCE_FEE_AMOUNT=200000
```

### Monthly Invoice (Optional)
```
MONTHLY_INVOICE_ENABLED=false
MONTHLY_INVOICE_DUE_DAY=15
```

## Bước 5: Kiểm tra và Test

### 5.1. Kiểm tra Deploy

1. Vào **Backend service** → Tab **Logs**
2. Xem logs để đảm bảo:
   - ✅ Build thành công
   - ✅ App start thành công
   - ✅ Kết nối Redis thành công (sẽ thấy `✅ Connected to Redis`)
   - ✅ Kết nối MongoDB thành công
   - ✅ Kết nối Elasticsearch thành công

3. Nếu có lỗi, kiểm tra:
   - Environment variables đã set đầy đủ chưa
   - Redis service đã running chưa
   - MongoDB URI đúng chưa
   - Elasticsearch URL và credentials đúng chưa

### 5.2. Test API

1. **Lấy URL của Backend**:
   - Vào Backend service → Tab **Settings**
   - Copy **URL** (ví dụ: `https://nha-chung-backend.onrender.com`)

2. **Test các endpoint**:
   ```bash
   # Health check
   curl https://nha-chung-backend.onrender.com/api
   
   # Hoặc mở browser:
   https://nha-chung-backend.onrender.com/api
   ```

3. **Test với Postman hoặc Frontend**:
   - Base URL: `https://nha-chung-backend.onrender.com/api`
   - Test các API endpoints như bình thường

### 5.3. Workflow Development → Deploy

**Quy trình làm việc:**

1. **Local Development**:
   ```bash
   # Code trên máy, dùng file .env local
   npm run start:dev
   # Test trên localhost:3001
   ```

2. **Khi muốn deploy**:
   ```bash
   # Commit và push code lên GitHub
   git add .
   git commit -m "Update feature"
   git push origin main
   ```

3. **Render tự động deploy**:
   - Render tự động detect code mới trên GitHub
   - Tự động chạy build và deploy
   - Dùng environment variables đã set trên Dashboard

4. **Test trên Production**:
   - Test trên URL Render: `https://nha-chung-backend.onrender.com/api`
   - Kiểm tra logs nếu có lỗi

**Lưu ý quan trọng**:
- ✅ File `.env` chỉ dùng cho **local**, không push lên GitHub
- ✅ Environment variables trên Render set **một lần** trên Dashboard
- ✅ Mỗi lần push code mới, Render tự động deploy lại
- ✅ Không cần set lại env vars mỗi lần deploy (trừ khi thay đổi)

## Lưu ý quan trọng:

1. **Redis**: Nếu dùng Free plan, Redis sẽ sleep sau 30 phút không dùng. Cân nhắc upgrade lên Starter.
2. **Elasticsearch**: Khuyến nghị dùng Elastic Cloud (đã hướng dẫn ở Bước 2) thay vì tự host trên Render.
3. **MongoDB**: Có thể dùng MongoDB Atlas (free tier) hoặc Render MongoDB.
4. **Port**: Render tự động set PORT, nhưng có thể override bằng env var.
5. **Build time**: Lần đầu build có thể mất 5-10 phút.
6. **Cold start**: Free plan có cold start ~30s khi không dùng.

## Troubleshooting:

- Nếu build fail: Kiểm tra logs, đảm bảo tất cả dependencies đúng
- Nếu không kết nối được Redis: Kiểm tra REDIS_HOST và REDIS_PORT
- Nếu không kết nối được Elasticsearch: Kiểm tra ELASTIC_NODE và firewall
- Nếu app crash: Kiểm tra logs, đảm bảo tất cả env vars đã được set

