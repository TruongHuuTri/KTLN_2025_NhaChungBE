# 🔐 Authentication

## Login Flow
```javascript
// 1. Đăng nhập
const loginResponse = await fetch('http://localhost:3001/api/users/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: '123456'
  })
});

const { access_token, user } = await loginResponse.json();

// 2. Lưu token
localStorage.setItem('token', access_token);

// 3. Sử dụng token cho các request tiếp theo
const headers = {
  'Authorization': `Bearer ${access_token}`,
  'Content-Type': 'application/json'
};
```

## Token Usage
```javascript
// Axios interceptor example
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## JWT Token Structure

### User Token payload:
```json
{
  "email": "user@example.com",
  "sub": "11",           // userId number  
  "name": "User Name",
  "role": "user",
  "type": undefined      // Không có type
}
```

### Admin Token payload:
```json
{
  "email": "admin@nhachung.com", 
  "sub": "1",            // adminId number
  "name": "Admin System",
  "role": "admin",
  "type": "admin"        // Có type để phân biệt
}
```

## Security Notes

- **User tokens** không có `type` field
- **Admin tokens** có `type: "admin"` để phân biệt
- AdminJwtGuard kiểm tra cả `role === 'admin'` và `type === 'admin'`
- User không thể truy cập Admin APIs với user token
