# 🔧 Development Tips

## 1. Environment Variables
```javascript
// .env.local (Frontend)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Nhà Chung
```

## 2. TypeScript Types
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

## 3. Pagination
```javascript
// Backend pagination
const getRentPosts = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return api.request(`/rent-posts?page=${page}&limit=${limit}`);
};

// Frontend pagination state
const [posts, setPosts] = useState([]);
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);

const loadPosts = async (page) => {
  const data = await getRentPosts(page, 10);
  setPosts(data);
  setCurrentPage(page);
  setTotalPages(Math.ceil(data.total / 10));
};
```

## 4. File Upload Best Practices

### S3 Presigned URL Flow
```javascript
// 1. Get presigned URL
const getPresignedUrl = async (fileName, contentType, folder) => {
  const response = await api.request('/files/presign', {
    method: 'POST',
    body: JSON.stringify({
      userId: currentUser.userId.toString(),
      fileName,
      contentType,
      folder
    })
  });
  return response;
};

// 2. Upload file to S3
const uploadToS3 = async (file, presignedData) => {
  const response = await fetch(presignedData.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });
  
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  
  return presignedData.publicUrl;
};

// 3. Complete upload flow
const uploadFile = async (file, folder = 'images') => {
  try {
    // Get presigned URL
    const presignedData = await getPresignedUrl(
      file.name,
      file.type,
      folder
    );
    
    // Upload to S3
    const publicUrl = await uploadToS3(file, presignedData);
    
    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
```

## 5. Form Validation

### React Hook Form Example
```javascript
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({
  title: yup.string().required('Tiêu đề là bắt buộc'),
  description: yup.string().required('Mô tả là bắt buộc'),
  area: yup.number().positive('Diện tích phải lớn hơn 0').required('Diện tích là bắt buộc'),
  price: yup.number().positive('Giá phải lớn hơn 0').required('Giá là bắt buộc'),
  address: yup.object({
    ward: yup.string().required('Phường là bắt buộc'),
    city: yup.string().required('Thành phố là bắt buộc'),
  })
});

const RentPostForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data) => {
    try {
      await api.createRentPost(data);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}
      
      <textarea {...register('description')} />
      {errors.description && <span>{errors.description.message}</span>}
      
      <input type="number" {...register('area')} />
      {errors.area && <span>{errors.area.message}</span>}
      
      <input type="number" {...register('price')} />
      {errors.price && <span>{errors.price.message}</span>}
      
      <input {...register('address.ward')} />
      {errors.address?.ward && <span>{errors.address.ward.message}</span>}
      
      <input {...register('address.city')} />
      {errors.address?.city && <span>{errors.address.city.message}</span>}
      
      <button type="submit">Tạo bài đăng</button>
    </form>
  );
};
```

## 6. State Management

### Context API Example
```javascript
// contexts/AuthContext.js
import { createContext, useContext, useReducer } from 'react';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
  });

  const login = async (email, password) => {
    try {
      const response = await api.login(email, password);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response,
      });
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

## 7. API Caching

### React Query Example
```javascript
import { useQuery, useMutation, useQueryClient } from 'react-query';

// Get rent posts with caching
const useRentPosts = (params = {}) => {
  return useQuery(
    ['rent-posts', params],
    () => api.getRentPosts(params),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};

// Create rent post with cache invalidation
const useCreateRentPost = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (data) => api.createRentPost(data),
    {
      onSuccess: () => {
        // Invalidate and refetch rent posts
        queryClient.invalidateQueries('rent-posts');
      },
    }
  );
};

// Usage in component
const RentPostsList = () => {
  const { data: posts, isLoading, error } = useRentPosts({ page: 1, limit: 10 });
  const createPost = useCreateRentPost();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {posts.map(post => (
        <div key={post.rentPostId}>{post.title}</div>
      ))}
    </div>
  );
};
```

## 8. Performance Optimization

### Lazy Loading
```javascript
// Lazy load components
const RentPostForm = lazy(() => import('./RentPostForm'));
const UserProfile = lazy(() => import('./UserProfile'));

// Usage with Suspense
<Suspense fallback={<div>Loading...</div>}>
  <RentPostForm />
</Suspense>
```

### Memoization
```javascript
// Memoize expensive calculations
const ExpensiveComponent = ({ data }) => {
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      processed: expensiveCalculation(item)
    }));
  }, [data]);

  return <div>{/* Render processed data */}</div>;
};

// Memoize callbacks
const ParentComponent = () => {
  const [count, setCount] = useState(0);
  
  const handleClick = useCallback(() => {
    setCount(prev => prev + 1);
  }, []);

  return <ChildComponent onClick={handleClick} />;
};
```

## 9. Testing

### API Testing with Jest
```javascript
// __tests__/api.test.js
import { api } from '../utils/api';

describe('API Tests', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should login user successfully', async () => {
    const mockResponse = {
      access_token: 'mock-token',
      user: { userId: 1, name: 'Test User' }
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await api.login('test@example.com', 'password');
    
    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/users/login',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password'
        })
      })
    );
  });
});
```

## 10. Security Best Practices

### Token Management
```javascript
// Secure token storage
const tokenManager = {
  setToken: (token) => {
    localStorage.setItem('token', token);
  },
  
  getToken: () => {
    return localStorage.getItem('token');
  },
  
  removeToken: () => {
    localStorage.removeItem('token');
  },
  
  isTokenExpired: (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
};

// Auto-refresh token
const useTokenRefresh = () => {
  const { token } = useAuth();
  
  useEffect(() => {
    if (token && tokenManager.isTokenExpired(token)) {
      // Redirect to login or refresh token
      logout();
    }
  }, [token]);
};
```

### Input Sanitization
```javascript
// Sanitize user input
const sanitizeInput = (input) => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
};

// Validate file uploads
const validateFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  
  return true;
};
```
