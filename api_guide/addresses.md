# 🏘️ Addresses API

> **Lưu ý**: API quản lý địa chỉ Việt Nam, bao gồm tỉnh/thành phố và phường/xã. Hỗ trợ import dữ liệu từ CSV và tìm kiếm phường/xã theo tỉnh.

## 📋 Get All Addresses
```http
GET /api/addresses
```

**Response:**
```json
[
  {
    "provinceCode": "01",
    "provinceName": "Thành phố Hà Nội",
    "wardCode": "10105001",
    "wardName": "Phường Hoàn Kiếm",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

## 🏙️ Get All Provinces
```http
GET /api/addresses/provinces
```

**Response:**
```json
[
  {
    "provinceCode": "01",
    "provinceName": "Thành phố Hà Nội"
  },
  {
    "provinceCode": "79",
    "provinceName": "Thành phố Hồ Chí Minh"
  }
]
```

## 🏘️ Get Wards by Province
```http
GET /api/addresses/wards?provinceCode=01
```

**Query Parameters:**
- `provinceCode`: Mã tỉnh/thành phố (bắt buộc)

**Response:**
```json
[
  {
    "wardCode": "10105001",
    "wardName": "Phường Hoàn Kiếm"
  },
  {
    "wardCode": "10105002",
    "wardName": "Phường Cửa Nam"
  }
]
```

## ➕ Create Address
```http
POST /api/addresses
```

**Request Body:**
```json
{
  "provinceCode": "01",
  "provinceName": "Thành phố Hà Nội",
  "wardCode": "10105001",
  "wardName": "Phường Hoàn Kiếm"
}
```

## 📥 Import from CSV
```http
POST /api/addresses/import
```

**Description:** Import dữ liệu địa chỉ từ file CSV đã được xử lý.

**Response:**
```json
{
  "message": "Import thành công 3322 địa chỉ",
  "imported": 3322
}
```

## 🗑️ Clear All Addresses
```http
POST /api/addresses/clear
```

**Description:** Xóa tất cả dữ liệu địa chỉ (chỉ dùng khi cần reset).

**Response:**
```json
{
  "message": "Đã xóa tất cả dữ liệu địa chỉ"
}
```

## 📝 Field Descriptions

### Address Object
- `provinceCode`: Mã tỉnh/thành phố (bắt buộc)
- `provinceName`: Tên tỉnh/thành phố (bắt buộc)
- `wardCode`: Mã phường/xã (bắt buộc)
- `wardName`: Tên phường/xã (bắt buộc)
- `createdAt`: Thời gian tạo
- `updatedAt`: Thời gian cập nhật

## 🔄 Usage Flow

1. **Import dữ liệu:** `POST /api/addresses/import`
2. **Lấy danh sách tỉnh:** `GET /api/addresses/provinces`
3. **Chọn tỉnh và lấy phường/xã:** `GET /api/addresses/wards?provinceCode=01`

## 📍 Address Fields Description

### Cấu trúc địa chỉ mới
Tất cả các API liên quan đến địa chỉ đã được cập nhật để hỗ trợ cấu trúc địa chỉ chi tiết hơn với các trường mới:

#### Các trường cơ bản:
- `street`: Tên đường (optional) - có thể để trống
- `ward`: Tên phường/xã (required)
- `city`: Tên thành phố/tỉnh (required)
- `specificAddress`: Địa chỉ cụ thể (optional) - có thể nhập cả số lẫn chữ
- `showSpecificAddress`: Hiển thị địa chỉ cụ thể (optional)

#### Các trường mới từ API địa chỉ:
- `provinceCode`: Mã tỉnh/thành phố (required)
- `provinceName`: Tên tỉnh/thành phố (required)
- `wardCode`: Mã phường/xã (required)
- `wardName`: Tên phường/xã (required)
- `additionalInfo`: Thông tin bổ sung về địa chỉ (optional)

**Lưu ý**: 
- Cấu trúc địa chỉ mới không bao gồm `district` (quận/huyện) vì dữ liệu địa chỉ mới chỉ có tỉnh/thành phố và phường/xã.
- `street` là optional để linh hoạt hơn trong việc nhập địa chỉ.
- `specificAddress` thay thế cho `houseNumber` để có thể nhập địa chỉ cụ thể bao gồm cả số và chữ.

### Ví dụ sử dụng:
```json
{
  "address": {
    "street": "Đường Nguyễn Huệ",
    "ward": "Phường Bến Nghé",
    "city": "Thành phố Hồ Chí Minh",
    "specificAddress": "123/45A",
    "showSpecificAddress": true,
    "provinceCode": "79",
    "provinceName": "Thành phố Hồ Chí Minh",
    "wardCode": "26701",
    "wardName": "Phường Bến Nghé",
    "additionalInfo": "Gần trung tâm thành phố, tiện đi lại"
  }
}
```

### Lợi ích:
- **Chuẩn hóa dữ liệu**: Sử dụng mã địa chỉ chính thức từ Bộ Nội vụ
- **Tìm kiếm chính xác**: Có thể tìm kiếm theo mã tỉnh/phường
- **Tích hợp API địa chỉ**: Dễ dàng tích hợp với API địa chỉ Việt Nam
- **Thông tin bổ sung**: Có thể thêm mô tả chi tiết về vị trí
