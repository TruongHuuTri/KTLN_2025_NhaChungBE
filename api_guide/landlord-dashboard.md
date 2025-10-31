## Dashboard chủ nhà - API tích hợp FE

Mục tiêu: FE hiển thị thống kê tổng hợp theo chủ nhà (hợp đồng, doanh thu, phòng, bài đăng) và hỗ trợ lọc theo khoảng thời gian.

### 1) Tổng quan dashboard
- Endpoint: GET `landlord/dashboard/summary`
- Auth: JWT (landlord)
- Query (optional):
  - `from`: ISO date string (ví dụ: `2025-01-01T00:00:00.000Z`)
  - `to`: ISO date string (ví dụ: `2025-12-31T23:59:59.999Z`)
  - Nếu không gửi, hệ thống mặc định phần “doanh thu theo tháng” lấy 12 tháng gần nhất; “tổng doanh thu” tính theo toàn bộ hóa đơn đã trả.

Request mẫu:
```http
GET /api/landlord/dashboard/summary?from=2025-01-01T00:00:00.000Z&to=2025-12-31T23:59:59.999Z
Authorization: Bearer <landlord_token>
```

Response mẫu:
```json
{
  "contracts": {
    "total": 12,
    "active": 10,
    "expired": 1,
    "expiringSoon": 2
  },
  "revenue": {
    "totalPaid": 128500000,
    "byMonth": [
      { "year": 2025, "month": 9, "amount": 10500000 },
      { "year": 2025, "month": 10, "amount": 11350000 }
    ]
  },
  "rooms": {
    "total": 18,
    "available": 5,
    "occupied": 13
  },
  "posts": {
    "total": 20,
    "byStatus": {
      "pending": 2,
      "active": 8,
      "inactive": 9,
      "rejected": 1,
      "approved": 0
    }
  }
}
```

Ghi chú:
- `revenue.totalPaid`: tổng tiền đã nhận (sum `invoices.amount` với `status = 'paid'`), áp dụng filter `paidDate` theo `from/to` nếu có.
- `revenue.byMonth`: gộp theo `paidDate` (năm/tháng), sắp xếp tăng dần.
- Hợp đồng “sắp hết hạn” = `endDate` trong 30 ngày tới.

### 2) Các API liên quan (tham khảo)
- Hợp đồng: `GET landlord/contracts`, `GET landlord/contracts/:id`
- Hoá đơn của chủ: `GET landlord/invoices`
- Bài đăng của chủ: `GET landlord/posts`
- Bài đăng chờ duyệt (admin): `GET admin/posts/pending`

### 3) Gợi ý hiển thị FE
- Thẻ (cards): Tổng hợp đồng, đang hiệu lực, sắp hết hạn, đã hết hạn.
- Doanh thu: Biểu đồ cột theo tháng (12 tháng gần nhất hoặc theo khoảng thời gian).
- Phòng: Donut `available/occupied` + bảng phòng có trạng thái.
- Bài đăng: Donut theo trạng thái; danh sách “pending” để chủ theo dõi trạng thái duyệt (nếu cần).


