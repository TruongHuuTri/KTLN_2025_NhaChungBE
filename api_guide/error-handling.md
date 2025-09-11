# 📝 Error Handling

## Common Error Responses
```json
// Validation Error (400)
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "email must be an email"
  ],
  "error": "Bad Request"
}

// Unauthorized (401)
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}

// Not Found (404)
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}

// Internal Server Error (500)
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

## Frontend Error Handling
```javascript
try {
  const data = await api.getUsers();
  // Handle success
} catch (error) {
  if (error.status === 401) {
    // Redirect to login
    router.push('/login');
  } else if (error.status === 400) {
    // Show validation errors
    setErrors(error.message);
  } else {
    // Show generic error
    showNotification('Có lỗi xảy ra, vui lòng thử lại');
  }
}
```

## Change Password Error Handling
```javascript
// Change Password Component (React)
import React, { useState } from 'react';
import { useApi } from './hooks/useApi';

const ChangePasswordForm = ({ userId, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const api = useApi();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Mật khẩu hiện tại không được để trống';
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'Mật khẩu mới không được để trống';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu không được để trống';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu mới và xác nhận mật khẩu không khớp';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await api.changePassword(
        userId,
        formData.currentPassword,
        formData.newPassword,
        formData.confirmPassword
      );
      
      // Success
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      onSuccess?.('Đổi mật khẩu thành công!');
      
    } catch (error) {
      if (error.status === 401) {
        setErrors({ currentPassword: 'Mật khẩu hiện tại không đúng' });
      } else if (error.status === 400) {
        if (error.message.includes('không khớp')) {
          setErrors({ confirmPassword: error.message });
        } else if (error.message.includes('khác mật khẩu hiện tại')) {
          setErrors({ newPassword: error.message });
        } else {
          setErrors({ general: error.message });
        }
      } else {
        setErrors({ general: 'Có lỗi xảy ra, vui lòng thử lại' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="change-password-form">
      <h3>Đổi mật khẩu</h3>
      
      {errors.general && (
        <div className="error-message">{errors.general}</div>
      )}
      
      <div className="form-group">
        <label>Mật khẩu hiện tại:</label>
        <input
          type="password"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          className={errors.currentPassword ? 'error' : ''}
        />
        {errors.currentPassword && (
          <span className="error-text">{errors.currentPassword}</span>
        )}
      </div>
      
      <div className="form-group">
        <label>Mật khẩu mới:</label>
        <input
          type="password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          className={errors.newPassword ? 'error' : ''}
        />
        {errors.newPassword && (
          <span className="error-text">{errors.newPassword}</span>
        )}
      </div>
      
      <div className="form-group">
        <label>Xác nhận mật khẩu mới:</label>
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className={errors.confirmPassword ? 'error' : ''}
        />
        {errors.confirmPassword && (
          <span className="error-text">{errors.confirmPassword}</span>
        )}
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
      </button>
    </form>
  );
};

export default ChangePasswordForm;
```

## Specific Error Cases

### Change Password Errors
```json
// Current password incorrect (401)
{
  "statusCode": 401,
  "message": "Mật khẩu hiện tại không đúng",
  "error": "Unauthorized"
}

// Passwords don't match (400)
{
  "statusCode": 400,
  "message": "Mật khẩu mới và xác nhận mật khẩu không khớp",
  "error": "Bad Request"
}

// Same password (400)
{
  "statusCode": 400,
  "message": "Mật khẩu mới phải khác mật khẩu hiện tại",
  "error": "Bad Request"
}
```

### Verification Errors
```json
// Already has pending verification (409)
{
  "statusCode": 409,
  "message": "Đã có hồ sơ xác thực đang chờ duyệt",
  "error": "Conflict"
}

// Already verified (409)
{
  "statusCode": 409,
  "message": "Tài khoản đã được xác thực",
  "error": "Conflict"
}

// Under 16 years old (400)
{
  "statusCode": 400,
  "message": "Phải từ 16 tuổi trở lên",
  "error": "Bad Request"
}
```

### Admin Errors
```json
// Admin already exists (400)
{
  "statusCode": 400,
  "message": "Admin đã tồn tại",
  "error": "Bad Request"
}

// User token accessing admin endpoint (401)
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

## Error Handling Best Practices

### 1. Centralized Error Handler
```javascript
// utils/errorHandler.js
export const handleApiError = (error, setErrors) => {
  if (error.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.status === 400) {
    // Handle validation errors
    if (Array.isArray(error.message)) {
      const validationErrors = {};
      error.message.forEach(msg => {
        const field = extractFieldFromMessage(msg);
        validationErrors[field] = msg;
      });
      setErrors(validationErrors);
    } else {
      setErrors({ general: error.message });
    }
  } else if (error.status === 409) {
    // Handle conflict errors
    setErrors({ general: error.message });
  } else {
    // Generic error
    setErrors({ general: 'Có lỗi xảy ra, vui lòng thử lại' });
  }
};

const extractFieldFromMessage = (message) => {
  // Extract field name from validation message
  // e.g., "name should not be empty" -> "name"
  const match = message.match(/^(\w+)\s/);
  return match ? match[1] : 'general';
};
```

### 2. Retry Logic
```javascript
// utils/retry.js
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Only retry on network errors or 5xx errors
      if (error.status >= 500 || !error.status) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        continue;
      }
      
      throw error;
    }
  }
};
```

### 3. Loading States
```javascript
// hooks/useApi.js
import { useState, useCallback } from 'react';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(endpoint, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
};
```
