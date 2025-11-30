# Hướng Dẫn Tích Hợp - Luồng Đăng Ký Chủ Nhà

## 📋 Tổng Quan

Tài liệu này hướng dẫn Frontend tích hợp với Backend API cho luồng đăng ký chủ nhà, đặc biệt là xử lý việc upload giấy phép kinh doanh và quản lý token trong quá trình đăng ký.

## 🎯 Vấn Đề Đã Được Giải Quyết

1. ✅ **Token bị mất giữa các bước** - Có endpoint refresh token
2. ✅ **Phải submit lại toàn bộ verification data** - Có endpoint riêng để update business license
3. ✅ **Token hết hạn** - Có cơ chế refresh token tự động

---

## 🔑 API Endpoints Mới

### 1. Cập Nhật Giấy Phép Kinh Doanh (Khuyến nghị sử dụng)

**Endpoint:** `PATCH /api/verifications/me/business-license`

**Mô tả:** Cập nhật giấy phép kinh doanh cho verification đã tồn tại. Không cần submit lại toàn bộ verification data.

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "businessLicense": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MK..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cập nhật giấy phép kinh doanh thành công",
  "verification": {
    "verificationId": 1,
    "userId": 123,
    "status": "pending",
    "businessLicense": "https://s3.../business-license.pdf",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**

- **401 Unauthorized:** Token không hợp lệ hoặc hết hạn
- **404 Not Found:** Chưa có hồ sơ xác thực (cần submit verification trước)

**Ví dụ Frontend:**
```typescript
// services/verification.service.ts
export const updateBusinessLicense = async (
  token: string,
  businessLicense: string
) => {
  const response = await fetch('/api/verifications/me/business-license', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ businessLicense }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Cập nhật giấy phép kinh doanh thất bại');
  }

  return response.json();
};
```

---

### 2. Lấy Verification Của User Hiện Tại

**Endpoint:** `GET /api/verifications/me`

**Mô tả:** Lấy thông tin verification của user hiện tại (để kiểm tra đã có verification chưa, status, business license, etc.)

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "verification": {
    "verificationId": 1,
    "userId": 123,
    "status": "pending",
    "submittedAt": "2024-01-01T00:00:00Z",
    "businessLicense": "https://s3.../business-license.pdf",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Response (200 OK - Chưa có verification):**
```json
{
  "message": "Chưa có hồ sơ xác thực",
  "verification": null
}
```

**Ví dụ Frontend:**
```typescript
export const getMyVerification = async (token: string) => {
  const response = await fetch('/api/verifications/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.json();
};
```

---

### 3. Refresh Registration Token

**Endpoint:** `POST /api/auth/refresh-registration-token`

**Mô tả:** Lấy lại token nếu bị mất trong quá trình đăng ký (sau khi đã verify OTP). Không cần đăng nhập lại.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 86400,
  "user": {
    "userId": 123,
    "email": "user@example.com",
    "name": "Nguyễn Văn A",
    "role": "landlord"
  }
}
```

**Error Responses:**

- **404 Not Found:** Không tìm thấy tài khoản với email này
- **401 Unauthorized:** User chưa verify email

**Ví dụ Frontend:**
```typescript
export const refreshRegistrationToken = async (email: string) => {
  const response = await fetch('/api/auth/refresh-registration-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Lấy lại token thất bại');
  }

  const data = await response.json();
  // Lưu token vào localStorage
  localStorage.setItem('access_token', data.access_token);
  
  return data;
};
```

---

## 🔄 Luồng Tích Hợp Đề Xuất

### Luồng 1: Upload Business License Sau Khi Submit Verification (Khuyến nghị)

```typescript
// components/LandlordVerification.tsx
import { useState, useEffect } from 'react';

const LandlordVerification = () => {
  const [token, setToken] = useState<string | null>(null);
  const [verification, setVerification] = useState<any>(null);
  const [businessLicense, setBusinessLicense] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Lấy token từ localStorage
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
      // Kiểm tra verification hiện tại
      checkVerification(storedToken);
    }
  }, []);

  const checkVerification = async (token: string) => {
    try {
      const data = await getMyVerification(token);
      if (data.verification) {
        setVerification(data.verification);
        // Nếu đã có business license, hiển thị
        if (data.verification.businessLicense) {
          setBusinessLicense(data.verification.businessLicense);
        }
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra verification:', error);
    }
  };

  const handleSubmitVerification = async (verificationData: any) => {
    setLoading(true);
    try {
      // Kiểm tra token trước
      if (!token) {
        throw new Error('Không có token. Vui lòng đăng nhập lại.');
      }

      // Submit verification (không bao gồm business license)
      const response = await fetch('/api/verifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token hết hạn, thử refresh
          await handleTokenRefresh();
          // Retry
          return handleSubmitVerification(verificationData);
        }
        throw new Error('Submit verification thất bại');
      }

      const data = await response.json();
      setVerification(data.verification);
      
      // Nếu có business license, upload ngay
      if (businessLicense) {
        await handleUploadBusinessLicense(businessLicense);
      }
    } catch (error) {
      console.error('Lỗi khi submit verification:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadBusinessLicense = async (licenseBase64: string) => {
    setLoading(true);
    try {
      // Kiểm tra token
      if (!token) {
        throw new Error('Không có token');
      }

      // Kiểm tra đã có verification chưa
      if (!verification) {
        throw new Error('Vui lòng submit verification trước');
      }

      // Upload business license
      const response = await updateBusinessLicense(token, licenseBase64);
      setVerification(response.verification);
      setBusinessLicense(response.verification.businessLicense);
      
      alert('Cập nhật giấy phép kinh doanh thành công!');
    } catch (error) {
      console.error('Lỗi khi upload business license:', error);
      
      // Nếu token hết hạn, thử refresh
      if (error.message.includes('token') || error.message.includes('401')) {
        await handleTokenRefresh();
        // Retry
        return handleUploadBusinessLicense(licenseBase64);
      }
      
      alert(error.message || 'Upload giấy phép kinh doanh thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenRefresh = async () => {
    try {
      // Lấy email từ user info hoặc localStorage
      const userEmail = localStorage.getItem('user_email');
      if (!userEmail) {
        throw new Error('Không tìm thấy email. Vui lòng đăng nhập lại.');
      }

      const data = await refreshRegistrationToken(userEmail);
      setToken(data.access_token);
      localStorage.setItem('access_token', data.access_token);
      
      return data.access_token;
    } catch (error) {
      console.error('Lỗi khi refresh token:', error);
      // Redirect về trang đăng nhập
      window.location.href = '/login';
      throw error;
    }
  };

  return (
    <div>
      {/* Form verification */}
      <VerificationForm 
        onSubmit={handleSubmitVerification}
        initialData={verification}
      />
      
      {/* Upload business license */}
      <BusinessLicenseUpload
        onUpload={handleUploadBusinessLicense}
        currentLicense={businessLicense}
        disabled={!verification}
      />
    </div>
  );
};
```

---

### Luồng 2: Xử Lý Token Mất/Hết Hạn

```typescript
// utils/tokenManager.ts
export class TokenManager {
  private static readonly TOKEN_KEY = 'access_token';
  private static readonly EMAIL_KEY = 'user_email';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static setEmail(email: string): void {
    localStorage.setItem(this.EMAIL_KEY, email);
  }

  static getEmail(): string | null {
    return localStorage.getItem(this.EMAIL_KEY);
  }

  static clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.EMAIL_KEY);
  }

  static async refreshTokenIfNeeded(): Promise<string | null> {
    const email = this.getEmail();
    if (!email) {
      return null;
    }

    try {
      const data = await refreshRegistrationToken(email);
      this.setToken(data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Refresh token failed:', error);
      this.clearToken();
      return null;
    }
  }

  static async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    let token = this.getToken();
    
    if (!token) {
      // Thử refresh token
      token = await this.refreshTokenIfNeeded();
      if (!token) {
        throw new Error('Không có token. Vui lòng đăng nhập lại.');
      }
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Nếu token hết hạn, thử refresh và retry
    if (response.status === 401) {
      const newToken = await this.refreshTokenIfNeeded();
      if (newToken) {
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    }

    return response;
  }
}
```

**Sử dụng:**
```typescript
// Thay vì fetch thông thường
const response = await TokenManager.makeAuthenticatedRequest(
  '/api/verifications/me/business-license',
  {
    method: 'PATCH',
    body: JSON.stringify({ businessLicense }),
  }
);
```

---

## 📝 Checklist Tích Hợp

### Bước 1: Cập Nhật Verification Flow
- [ ] Tách riêng việc submit verification và upload business license
- [ ] Submit verification không bao gồm business license
- [ ] Upload business license sau khi đã có verification

### Bước 2: Xử Lý Token
- [ ] Lưu email vào localStorage khi verify OTP thành công
- [ ] Implement token refresh mechanism
- [ ] Retry logic khi token hết hạn

### Bước 3: Error Handling
- [ ] Xử lý trường hợp chưa có verification khi upload business license
- [ ] Xử lý token hết hạn/mất
- [ ] Hiển thị thông báo lỗi rõ ràng cho user

### Bước 4: UI/UX
- [ ] Hiển thị trạng thái verification (pending/approved/rejected)
- [ ] Cho phép upload business license sau khi đã submit verification
- [ ] Loading state khi đang upload
- [ ] Success/Error notifications

---

## 🧪 Testing

### Test Cases

1. **Submit verification thành công, sau đó upload business license**
   - Submit verification (không có business license)
   - Upload business license sau
   - Kiểm tra verification được cập nhật

2. **Token hết hạn giữa các bước**
   - Submit verification
   - Đợi token hết hạn (hoặc xóa token)
   - Upload business license → Tự động refresh token

3. **Refresh page giữa các bước**
   - Submit verification
   - Refresh page
   - Lấy lại verification từ API
   - Upload business license

4. **Upload business license khi chưa có verification**
   - Thử upload business license trước khi submit verification
   - Kiểm tra error message

---

## 🔗 API Endpoints Liên Quan

### Submit Verification (Đã có sẵn)
```http
POST /api/verifications
Authorization: Bearer <token>
```

### Get My Verification (Mới)
```http
GET /api/verifications/me
Authorization: Bearer <token>
```

### Update Business License (Mới)
```http
PATCH /api/verifications/me/business-license
Authorization: Bearer <token>
```

### Refresh Registration Token (Mới)
```http
POST /api/auth/refresh-registration-token
```

---

## 📚 Tài Liệu Tham Khảo

- [Verification API](./verification.md) - API verification chi tiết
- [Registration System](./registration-system.md) - Luồng đăng ký
- [Error Handling](./error-handling.md) - Xử lý lỗi

---

## 💡 Best Practices

1. **Luôn kiểm tra token trước khi gọi API**
   ```typescript
   if (!token) {
     await handleTokenRefresh();
   }
   ```

2. **Implement retry logic với token refresh**
   ```typescript
   try {
     await apiCall();
   } catch (error) {
     if (error.status === 401) {
       await refreshToken();
       await apiCall(); // Retry
     }
   }
   ```

3. **Lưu email khi verify OTP thành công**
   ```typescript
   // Sau khi verify OTP
   localStorage.setItem('user_email', user.email);
   localStorage.setItem('access_token', access_token);
   ```

4. **Kiểm tra verification trước khi upload business license**
   ```typescript
   const verification = await getMyVerification(token);
   if (!verification) {
     // Yêu cầu submit verification trước
   }
   ```

---

## ❓ FAQ

**Q: Có thể submit verification và business license cùng lúc không?**
A: Có, endpoint `POST /api/verifications` vẫn hỗ trợ `businessLicense` là optional field. Tuy nhiên, khuyến nghị sử dụng endpoint riêng để linh hoạt hơn.

**Q: Token hết hạn sau bao lâu?**
A: Token có thời hạn 24 giờ (86400 giây).

**Q: Có thể refresh token nhiều lần không?**
A: Có, miễn là user đã verify email và tồn tại trong hệ thống.

**Q: Nếu mất cả token và email thì sao?**
A: User cần đăng nhập lại hoặc đăng ký lại từ đầu.

---

## 📞 Hỗ Trợ

Nếu có vấn đề khi tích hợp, vui lòng liên hệ Backend team hoặc tạo issue trên repository.

