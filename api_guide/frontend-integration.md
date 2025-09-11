# 🛠️ Frontend Integration Examples

## React/Next.js Example
```javascript
// API service
class ApiService {
  constructor() {
    this.baseURL = 'http://localhost:3001/api';
    this.token = localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  // Users
  async login(email, password) {
    const result = await this.request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = result.access_token;
    localStorage.setItem('token', this.token);
    return result;
  }

  // Admin
  async adminLogin(email, password) {
    const result = await this.request('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = result.access_token;
    localStorage.setItem('adminToken', this.token);
    return result;
  }

  async createAdmin(adminData) {
    return this.request('/admin/create', {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
  }

  async getAdmins() {
    return this.request('/admin');
  }

  async getUsers() {
    return this.request('/users');
  }

  async changePassword(userId, currentPassword, newPassword, confirmPassword) {
    return this.request(`/users/${userId}/change-password`, {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword
      }),
    });
  }

  // Rent Posts
  async getRentPosts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/rent-posts${queryString ? `?${queryString}` : ''}`);
  }

  async getRentPostsByCategory(category, userId = null) {
    const queryString = userId ? `?userId=${userId}` : '';
    return this.request(`/rent-posts/${category}${queryString}`);
  }

  async createRentPost(data) {
    return this.request('/rent-posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createPhongTro(data) {
    return this.request('/rent-posts/phong-tro', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createChungCu(data) {
    return this.request('/rent-posts/chung-cu', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createNhaNguyenCan(data) {
    return this.request('/rent-posts/nha-nguyen-can', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getRentPostById(id) {
    return this.request(`/rent-posts/${id}`);
  }

  async updateRentPost(id, data) {
    return this.request(`/rent-posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRentPost(id) {
    return this.request(`/rent-posts/${id}`, {
      method: 'DELETE',
    });
  }

  // Verifications
  async submitVerification(verificationData) {
    return this.request('/verifications', {
      method: 'POST',
      body: JSON.stringify(verificationData),
    });
  }

  async getMyVerificationStatus() {
    return this.request('/users/me/verification');
  }

  // Admin Verifications (require admin token)
  async getVerificationsAdmin(status = null, page = 1, limit = 10) {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    return this.request(`/verifications/admin?${params.toString()}`);
  }

  async updateVerificationStatus(verificationId, status, adminNote = '') {
    return this.request(`/verifications/admin/${verificationId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNote }),
    });
  }

  async getVerificationByUserId(userId) {
    return this.request(`/verifications/user/${userId}`);
  }

  // Favourites
  async getFavourites(userId) {
    return this.request(`/favourites?userId=${userId}`);
  }

  async addFavourite(userId, postType, postId) {
    return this.request('/favourites', {
      method: 'POST',
      body: JSON.stringify({ userId, postType, postId }),
    });
  }
}

// Usage
const api = new ApiService();

// User Login
const { user } = await api.login('user@example.com', 'password123');

// Admin Login  
const { admin } = await api.adminLogin('admin@nhachung.com', 'admin123456');

// Change password
await api.changePassword(
  user.userId, 
  'oldpassword123', 
  'newpassword456', 
  'newpassword456'
);

// Get all rent posts
const allRentPosts = await api.getRentPosts({ page: 1, limit: 10 });

// Get posts by category
const phongTroPosts = await api.getRentPostsByCategory('phong-tro');
const chungCuPosts = await api.getRentPostsByCategory('chung-cu');
const nhaNguyenCanPosts = await api.getRentPostsByCategory('nha-nguyen-can');

// Get user's posts by category
const userPhongTroPosts = await api.getRentPostsByCategory('phong-tro', user.userId);

// Create different types of posts
const phongTroData = {
  userId: user.userId.toString(),
  title: "Phòng trọ đẹp gần trường đại học",
  description: "Phòng trọ rộng rãi, thoáng mát",
  address: {
    street: "Đường ABC",
    ward: "Phường XYZ",
    district: "Quận 1",
    city: "TP.HCM"
  },
  area: 25,
  price: 3000000,
  furniture: "co-ban"
};

const chungCuData = {
  userId: user.userId.toString(),
  title: "Căn hộ chung cư cao cấp",
  description: "Căn hộ 2PN/2WC, view đẹp",
  address: {
    street: "Đường DEF",
    ward: "Phường GHI",
    district: "Quận 2",
    city: "TP.HCM"
  },
  buildingInfo: {
    buildingName: "Chung cư ABC",
    blockOrTower: "Block A",
    floorNumber: 15,
    unitCode: "A15-03"
  },
  area: 60,
  price: 8000000,
  bedrooms: 2,
  bathrooms: 2,
  furniture: "full",
  propertyType: "chung-cu"
};

// Create posts
const phongTroPost = await api.createPhongTro(phongTroData);
const chungCuPost = await api.createChungCu(chungCuData);

// Get specific post
const post = await api.getRentPostById(phongTroPost.rentPostId);

// Update post
await api.updateRentPost(phongTroPost.rentPostId, {
  title: "Phòng trọ đã cập nhật",
  basicInfo: {
    price: 3500000,
    area: 30
  }
});

// Delete post
await api.deleteRentPost(phongTroPost.rentPostId);

// Add to favourites
await api.addFavourite(user.userId, 'rent', phongTroPost.rentPostId);

// === ADMIN WORKFLOWS ===

// Create first admin (one-time)
const firstAdmin = await api.createAdmin({
  name: "Admin System",
  email: "admin@nhachung.com", 
  password: "admin123456",
  phone: "0999999999"
});

// Admin login and get token
const { admin } = await api.adminLogin('admin@nhachung.com', 'admin123456');

// Get all verifications (admin only)
const verifications = await api.getVerificationsAdmin('pending', 1, 10);

// Get verification by userId (admin only)
const userVerification = await api.getVerificationByUserId(11);

// Approve a verification (admin only) - dùng verificationId từ userVerification
await api.updateVerificationStatus(
  userVerification.verificationId,  // Numeric ID: 1, 2, 3...
  'approved', 
  'Hồ sơ hợp lệ'
);

// Reject a verification (admin only)
await api.updateVerificationStatus(
  2,  // verificationId 
  'rejected', 
  'Ảnh không rõ, vui lòng chụp lại'
);

// === USER VERIFICATION WORKFLOW ===

// User submit verification
const verificationData = {
  idNumber: "123456789012",
  fullName: "Nguyễn Văn A",
  dateOfBirth: "1990-01-01",
  gender: "male", 
  issueDate: "2015-01-01",
  issuePlace: "Cục Cảnh sát quản lý hành chính về trật tự xã hội"
};

await api.submitVerification(verificationData);

// Check my verification status
const myStatus = await api.getMyVerificationStatus();
console.log('Verified:', myStatus.isVerified);
console.log('Status:', myStatus.verification?.status);
```

## Vue.js Example
```javascript
// composables/useApi.js
import { ref } from 'vue';

export function useApi() {
  const baseURL = 'http://localhost:3001/api';
  const token = ref(localStorage.getItem('token'));

  const request = async (endpoint, options = {}) => {
    const url = `${baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token.value && { Authorization: `Bearer ${token.value}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    return response.json();
  };

  const login = async (email, password) => {
    const result = await request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    token.value = result.access_token;
    localStorage.setItem('token', token.value);
    return result;
  };

  return {
    request,
    login,
    // ... other methods
  };
}
```

## TypeScript Types
```typescript
// types/api.ts
export interface User {
  userId: number;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'landlord';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentPost {
  rentPostId: number;
  userId: number;
  title: string;
  description: string;
  images: string[];
  videos: string[];
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    specificAddress?: string;
    showSpecificAddress?: boolean;
  };
  category: 'phong-tro' | 'chung-cu' | 'nha-nguyen-can';
  basicInfo: {
    area: number;
    price: number;
    deposit?: number;
    furniture?: string;
    bedrooms?: number;
    bathrooms?: number;
    direction?: string;
    legalStatus?: string;
  };
  chungCuInfo?: {
    buildingName?: string;
    blockOrTower?: string;
    floorNumber?: number;
    unitCode?: string;
    propertyType?: string;
  };
  nhaNguyenCanInfo?: {
    khuLo?: string;
    unitCode?: string;
    propertyType?: string;
    totalFloors?: number;
    landArea?: number;
    usableArea?: number;
    width?: number;
    length?: number;
    features?: string[];
  };
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreatePhongTroDto {
  userId: string;
  title: string;
  description: string;
  images?: string[];
  videos?: string[];
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    specificAddress?: string;
    showSpecificAddress?: boolean;
  };
  area: number;
  price: number;
  deposit?: number;
  furniture?: string;
  status?: string;
}

export interface CreateChungCuDto {
  userId: string;
  title: string;
  description: string;
  images?: string[];
  videos?: string[];
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    specificAddress?: string;
    showSpecificAddress?: boolean;
  };
  buildingInfo?: {
    buildingName?: string;
    blockOrTower?: string;
    floorNumber?: number;
    unitCode?: string;
  };
  area: number;
  price: number;
  deposit?: number;
  furniture?: string;
  bedrooms?: number;
  bathrooms?: number;
  direction?: string;
  propertyType?: string;
  legalStatus?: string;
  status?: string;
}

export interface CreateNhaNguyenCanDto {
  userId: string;
  title: string;
  description: string;
  images?: string[];
  videos?: string[];
  address: {
    street: string;
    ward: string;
    district: string;
    city: string;
    specificAddress?: string;
    showSpecificAddress?: boolean;
  };
  propertyInfo?: {
    khuLo?: string;
    unitCode?: string;
    propertyType?: string;
    totalFloors?: number;
    features?: string[];
  };
  landArea: number;
  usableArea?: number;
  width?: number;
  length?: number;
  price: number;
  deposit?: number;
  furniture?: string;
  bedrooms?: number;
  bathrooms?: number;
  direction?: string;
  legalStatus?: string;
  status?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}
```
