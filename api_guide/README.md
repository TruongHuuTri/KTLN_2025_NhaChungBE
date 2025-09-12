# 📚 API Documentation - Nhà Chung Backend

> **Base URL**: `http://localhost:3001/api`  
> **Content-Type**: `application/json`  
> **Authentication**: Bearer Token (JWT)

## 🚀 Quick Start

### 1. Cài đặt và chạy Backend
```bash
# Clone repository
git clone <repository-url>
cd nha_chung_be

# Cài đặt dependencies
npm install

# Chạy server
npm run start:dev
```

### 2. Test API
```bash
# Test server
curl http://localhost:3001/api

# Test users endpoint
curl http://localhost:3001/api/users
```

---

## 📖 Tài liệu API

### 🔐 [Authentication](./authentication.md)
- Login Flow
- Token Usage
- JWT Authentication

### 📝 [Registration System](./registration-system.md)
- User Registration with OTP
- Role Management (User ↔ Landlord)
- Email Verification
- Role Upgrade Flow

### 👤 [User Profiles](./user-profiles.md)
- Profile Management
- Completion Tracking
- Role-based Information
- Smart Recommendations

### 👥 [Users API](./users.md)
- Get All Users
- Create User
- Login
- Get User by ID
- Update User
- Change Password
- Delete User

### 👨‍💼 [Admin API](./admin.md)
- Admin System Overview
- Create Admin
- Admin Login
- Admin Management
- AdminJwtGuard Security

### ✅ [Verification API](./verification.md)
- Submit Verification
- Get Verification Status
- Admin Verification Management
- Approve/Reject Verification
- 🤖 **FaceMatch Integration** - Auto-approval based on AI similarity

### 🏠 [Rent Posts API](./rent-posts.md)
- Get All Rent Posts
- Create Rent Posts (Phòng trọ, Chung cư, Nhà nguyên căn)
- Get Rent Post by ID
- Update/Delete Rent Posts
- Upload Files (S3 Presigned URL)
- Data Structure

### 🤝 [Roommate Posts API](./roommate-posts.md)
- Get All Roommate Posts
- Create Roommate Post
- Update Roommate Post
- Field Descriptions

### 🏘️ [Addresses API](./addresses.md)
- Get All Addresses
- Get Provinces/Wards
- Create Address
- Import from CSV
- Address Management

### ❤️ [Favourites API](./favourites.md)
- Get All Favourites
- Add to Favourites
- Remove from Favourites

### 🛠️ [Frontend Integration](./frontend-integration.md)
- React/Next.js Examples
- Vue.js Examples
- API Service Classes
- TypeScript Types

### 📝 [Error Handling](./error-handling.md)
- Common Error Responses
- Frontend Error Handling
- Status Codes

### 🔧 [Development Tips](./development-tips.md)
- Environment Variables
- TypeScript Types
- Change Password Component
- Pagination

### 🚀 [Deployment](./deployment.md)
- Production Environment
- CORS Configuration
- Environment Variables

---

## 📞 Support

- **Backend Issues**: Check server logs and database connection
- **API Questions**: Refer to this documentation
- **Frontend Integration**: Use the provided examples as starting points

**Happy Coding! 🎉**
