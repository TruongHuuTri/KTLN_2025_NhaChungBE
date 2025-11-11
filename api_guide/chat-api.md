# 💬 Chat API - Hệ thống Chat giữa Người thuê và Chủ nhà

> **Base URL**: `http://localhost:3001/api/chat`  
> **Socket.IO Namespace**: `/chat`  
> **Content-Type**: `application/json`  
> **Authentication**: Bearer Token (JWT) cho REST API và Socket.IO  
> **Last Updated**: 2024-01-XX (Fixed type mismatch bug, Added lastMessage feature)

## 📋 Tổng quan

Hệ thống chat cho phép người thuê và chủ nhà trao đổi tin nhắn real-time thông qua Socket.IO. Hệ thống hỗ trợ:
- ✅ Chat text real-time
- ✅ **Gửi ảnh và video** (tự động upload lên S3)
- ✅ **Gửi file** (tự động upload lên S3)
- ✅ Tạo và quản lý conversations
- ✅ **Tự động gửi tin nhắn hệ thống** khi chat với người đăng (auto message với thông tin bài đăng)
- ✅ Đánh dấu tin nhắn đã đọc
- ✅ Typing indicator
- ✅ Lưu trữ lịch sử tin nhắn
- ✅ REST API fallback (khi không dùng Socket.IO)

## 🗄️ Cấu trúc Database

### **Conversation Schema**
```javascript
{
  conversationId: Number,        // Auto-increment (Date.now())
  tenantId: Number,              // userId của người thuê
  landlordId: Number,            // userId của chủ nhà
  postId: Number,                // Optional: ID của post liên quan
  roomId: Number,                // Optional: ID của room liên quan
  lastMessageAt: Date,           // Thời gian tin nhắn cuối cùng
  unreadCountTenant: Number,     // Số tin nhắn chưa đọc của tenant
  unreadCountLandlord: Number,   // Số tin nhắn chưa đọc của landlord
  isActive: Boolean,             // Cuộc trò chuyện còn hoạt động
  createdAt: Date,
  updatedAt: Date
}
```

### **Message Schema**
```javascript
{
  messageId: Number,             // Auto-increment (Date.now())
  conversationId: Number,       // ID của conversation
  senderId: Number | null,      // userId của người gửi (null cho system message)
  type: String,                 // 'text' | 'image' | 'video' | 'file' | 'system'
  content: String,              // Nội dung tin nhắn (text) hoặc S3 URL (image/video/file)
  metadata: {                   // Optional: Metadata cho system message
    postId: Number,
    postType: String,          // 'cho-thue' | 'tim-o-ghep'
    roomId: Number,
    postTitle: String,
    postPrice: Number,
    postAddress: String,
    postImage: String,
    postUrl: String,           // Format: /room_details/rent-{postId} hoặc /room_details/roommate-{postId}
    roomName: String
  },
  isRead: Boolean,              // Đã đọc chưa
  readAt: Date,                 // Thời gian đọc
  isDeleted: Boolean,           // Soft delete
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔌 Socket.IO Integration

### **1. Kết nối Socket.IO**

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/chat', {
  auth: {
    token: 'YOUR_JWT_TOKEN' // JWT token từ login
  },
  // Hoặc có thể dùng headers
  extraHeaders: {
    Authorization: 'Bearer YOUR_JWT_TOKEN'
  }
});

socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from chat server');
});
```

### **2. Events từ Client → Server**

#### **send_message** - Gửi tin nhắn
```javascript
// Gửi tin nhắn text
socket.emit('send_message', {
  conversationId: 1234567890,
  senderId: 1, // Phải khớp với userId từ JWT token (number)
  type: 'text', // Optional, mặc định 'text'
  content: 'Xin chào, tôi muốn thuê phòng này'
});

// Gửi ảnh (base64 data URL)
socket.emit('send_message', {
  conversationId: 1234567890,
  senderId: 1,
  type: 'image',
  content: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...' // Base64 data URL
});

// Gửi video (base64 data URL)
socket.emit('send_message', {
  conversationId: 1234567890,
  senderId: 1,
  type: 'video',
  content: 'data:video/mp4;base64,AAAAIGZ0eXBpc29t...' // Base64 data URL
});

// Gửi file (base64 data URL)
socket.emit('send_message', {
  conversationId: 1234567890,
  senderId: 1,
  type: 'file',
  content: 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MK...' // Base64 data URL
});
```

**⚠️ Lưu ý quan trọng về Type:**
- Backend sẽ tự động convert `senderId` và `userId` từ JWT token sang number để so sánh
- JWT token có thể có `sub: '1'` (string) hoặc `userId: 1` (number)
- Backend sẽ convert cả hai về number trước khi so sánh để tránh type mismatch
- Nếu `senderId` không khớp với `userId` từ JWT token, sẽ trả về lỗi: `"Sender ID không khớp với user hiện tại"`

**📸 Upload Ảnh/Video/File:**
- ✅ Frontend gửi `content` là **base64 data URL** (ví dụ: `data:image/jpeg;base64,...`)
- ✅ Backend tự động upload lên **S3** và lưu **S3 URL** vào database
- ✅ Response trả về message với `content` là **S3 URL** (ví dụ: `https://dxxxx.cloudfront.net/uploads/1/chat/1234567890-abc123.jpg`)
- ✅ Hỗ trợ các format: JPEG, PNG, WebP, GIF (ảnh); MP4, WebM, QuickTime, AVI (video); PDF, DOC, DOCX, XLS, XLSX (file)
- ✅ File được lưu trong folder `uploads/{userId}/chat/` trên S3

// Response
socket.on('message_sent', (message) => {
  console.log('Message sent:', message);
  // {
  //   messageId: 1234567891,
  //   conversationId: 1234567890,
  //   senderId: 1,
  //   senderName: 'Nguyễn Văn A',
  //   senderAvatar: 'https://...',
  //   type: 'text',
  //   content: 'Xin chào, tôi muốn thuê phòng này',
  //   isRead: false,
  //   readAt: null,
  //   createdAt: '2024-01-01T10:00:00.000Z',
  //   updatedAt: '2024-01-01T10:00:00.000Z'
  // }
});
```

#### **mark_read** - Đánh dấu đã đọc
```javascript
socket.emit('mark_read', {
  conversationId: 1234567890
});

// Response
socket.on('messages_read', (data) => {
  console.log('Messages marked as read:', data);
  // { conversationId: 1234567890, readBy: 1 }
});
```

#### **typing** - Typing indicator
```javascript
// Bắt đầu typing
socket.emit('typing', {
  conversationId: 1234567890,
  isTyping: true
});

// Dừng typing
socket.emit('typing', {
  conversationId: 1234567890,
  isTyping: false
});
```

### **3. Events từ Server → Client**

#### **new_message** - Tin nhắn mới từ người khác
```javascript
socket.on('new_message', (message) => {
  console.log('New message received:', message);
  // Format giống như message_sent
});
```

#### **conversation_updated** - Cập nhật conversation
```javascript
socket.on('conversation_updated', (update) => {
  console.log('Conversation updated:', update);
  // {
  //   conversationId: 1234567890,
  //   lastMessageAt: '2024-01-01T10:00:00.000Z',
  //   lastMessage: {
  //     content: 'Xin chào, tôi muốn thuê phòng này',
  //     type: 'text'
  //   }
  // }
  
  // Frontend có thể cập nhật conversation list với lastMessage mới
  updateConversationInList(update.conversationId, {
    lastMessageAt: update.lastMessageAt,
    lastMessage: update.lastMessage
  });
});
```

**Lưu ý:** Event này được emit mỗi khi có tin nhắn mới, giúp frontend cập nhật `lastMessage` trong conversation list real-time.

#### **user_typing** - Người khác đang gõ
```javascript
socket.on('user_typing', (data) => {
  console.log('User typing:', data);
  // {
  //   conversationId: 1234567890,
  //   userId: 2,
  //   isTyping: true
  // }
});
```

## 📡 REST API Endpoints

### **1. Tạo hoặc lấy Conversation**

**POST** `/api/chat/conversations`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "tenantId": 1,
  "landlordId": 2,
  "postId": 123,      // Optional
  "roomId": 456       // Optional
}
```

**Response:**
```json
{
  "conversationId": 1234567890,
  "tenantId": 1,
  "landlordId": 2,
  "postId": 123,
  "roomId": 456,
  "isNew": true,                // ✅ Flag để biết conversation mới hay cũ
  "systemMessage": {            // ✅ Tin nhắn hệ thống đã được tạo (nếu có postId và chưa có tin nhắn về postId này)
    "messageId": 1234567891,
    "conversationId": 1234567890,
    "senderId": null,
    "senderName": "Hệ thống",
    "senderAvatar": null,
    "type": "system",
    "content": "📋 Tôi quan tâm đến bài đăng này:\n\n🏠 **Phòng trọ giá rẻ tại Quận 1**\n\n💰 Giá: 5.000.000 VNĐ/tháng\n📍 Địa chỉ: 123 Đường ABC, Quận 1, TP. Hồ Chí Minh\n🛏️ Phòng: Phòng 201\n\n🔗 Xem chi tiết: http://localhost:3000/room_details/rent-123",
    "metadata": {
      "postId": 123,
      "postType": "cho-thue",
      "roomId": 456,
      "postTitle": "Phòng trọ giá rẻ tại Quận 1",
      "postPrice": 5000000,
      "postAddress": "123 Đường ABC, Quận 1, TP. Hồ Chí Minh",
      "postImage": "https://...",
      "postUrl": "http://localhost:3000/room_details/rent-123",
      "roomName": "Phòng 201"
    },
    "isRead": false,
    "readAt": null,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  },
  "lastMessageAt": "2024-01-01T10:00:00.000Z",
  "unreadCountTenant": 0,
  "unreadCountLandlord": 1,     // Tăng lên 1 nếu có system message mới
  "isActive": true,
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}
```

**Lưu ý về Auto Message:**
- ✅ Nếu có `postId` trong request và chưa có tin nhắn về `postId` này trong conversation, backend sẽ **tự động tạo system message** chứa thông tin bài đăng
- ✅ System message có `type: 'system'`, `senderId: null`, `senderName: 'Hệ thống'`
- ✅ System message chứa `metadata` với thông tin bài đăng (postId, postTitle, postPrice, postAddress, postImage, postUrl, roomName)
- ✅ Nếu đã có tin nhắn về `postId` này rồi, `systemMessage` sẽ là `null` (tránh duplicate)
- ✅ `isNew: true` nếu conversation vừa được tạo, `isNew: false` nếu conversation đã tồn tại

---

### **2. Lấy danh sách Conversations**

**GET** `/api/chat/conversations?userId=1`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
[
  {
    "conversationId": 1234567890,
    "tenantId": 1,
    "tenantName": "Nguyễn Văn A",
    "tenantAvatar": "https://...",
    "landlordId": 2,
    "landlordName": "Trần Thị B",
    "landlordAvatar": "https://...",
    "postId": 123,
    "roomId": 456,
    "lastMessageAt": "2024-01-01T10:00:00.000Z",
    "lastMessage": {
      "content": "Xin chào, tôi muốn thuê phòng này",
      "type": "text"
    },
    "unreadCount": 2,
    "isActive": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
]
```

**Lưu ý về lastMessage:**
- ✅ `lastMessage` chứa tin nhắn cuối cùng trong conversation (content và type)
- ✅ `lastMessage` là `null` nếu conversation chưa có tin nhắn nào
- ✅ `lastMessage.type` có thể là `'text'`, `'image'`, `'file'`, hoặc `'system'`
- ✅ `lastMessage.content` là nội dung text của tin nhắn cuối cùng
- ✅ Backend tự động cập nhật `lastMessage` khi có tin nhắn mới (qua Socket.IO hoặc REST API)

---

### **3. Lấy thông tin Conversation**

**GET** `/api/chat/conversations/:conversationId?userId=1`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "conversationId": 1234567890,
  "tenantId": 1,
  "tenantName": "Nguyễn Văn A",
  "tenantAvatar": "https://...",
  "landlordId": 2,
  "landlordName": "Trần Thị B",
  "landlordAvatar": "https://...",
  "postId": 123,
  "roomId": 456,
  "lastMessageAt": "2024-01-01T10:00:00.000Z",
  "unreadCount": 2,
  "isActive": true,
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}
```

---

### **4. Tạo tin nhắn (REST API - Fallback)**

**POST** `/api/chat/messages`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
// Gửi tin nhắn text
{
  "conversationId": 1234567890,
  "senderId": 1,
  "type": "text",
  "content": "Xin chào, tôi muốn thuê phòng này"
}

// Gửi ảnh (base64 data URL)
{
  "conversationId": 1234567890,
  "senderId": 1,
  "type": "image",
  "content": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
}

// Gửi video (base64 data URL)
{
  "conversationId": 1234567890,
  "senderId": 1,
  "type": "video",
  "content": "data:video/mp4;base64,AAAAIGZ0eXBpc29t..."
}

// Gửi file (base64 data URL)
{
  "conversationId": 1234567890,
  "senderId": 1,
  "type": "file",
  "content": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MK..."
}
```

**Response:**
```json
// Response cho text message
{
  "messageId": 1234567891,
  "conversationId": 1234567890,
  "senderId": 1,
  "type": "text",
  "content": "Xin chào, tôi muốn thuê phòng này",
  "isRead": false,
  "readAt": null,
  "isDeleted": false,
  "deletedAt": null,
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}

// Response cho image/video/file message (content là S3 URL)
{
  "messageId": 1234567892,
  "conversationId": 1234567890,
  "senderId": 1,
  "type": "image",
  "content": "https://dxxxx.cloudfront.net/uploads/1/chat/1234567890-abc123.jpg",
  "isRead": false,
  "readAt": null,
  "isDeleted": false,
  "deletedAt": null,
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}
```

**📸 Lưu ý về Upload:**
- ✅ Frontend gửi `content` là **base64 data URL** trong request body
- ✅ Backend tự động upload lên **S3** và trả về **S3 URL** trong response
- ✅ `content` trong response sẽ là **S3 URL** thay vì base64

---

### **5. Lấy danh sách Messages**

**GET** `/api/chat/conversations/:conversationId/messages?userId=1&page=1&pageSize=50`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `userId` (required): ID của user hiện tại
- `page` (optional): Số trang (mặc định: 1)
- `pageSize` (optional): Số tin nhắn mỗi trang (mặc định: 50, tối đa: 100)

**Response:**
```json
{
  "items": [
    {
      "messageId": 1234567891,
      "conversationId": 1234567890,
      "senderId": null,
      "senderName": "Hệ thống",
      "senderAvatar": null,
      "type": "system",
      "content": "📋 Tôi quan tâm đến bài đăng này:\n\n🏠 **Phòng trọ giá rẻ tại Quận 1**\n\n💰 Giá: 5.000.000 VNĐ/tháng\n📍 Địa chỉ: 123 Đường ABC, Quận 1, TP. Hồ Chí Minh\n🛏️ Phòng: Phòng 201\n\n🔗 Xem chi tiết: http://localhost:3000/room_details/rent-123",
      "metadata": {
        "postId": 123,
        "roomId": 456,
        "postTitle": "Phòng trọ giá rẻ tại Quận 1",
        "postPrice": 5000000,
        "postAddress": "123 Đường ABC, Quận 1, TP. Hồ Chí Minh",
        "postImage": "https://...",
        "postUrl": "http://localhost:3000/room_details/rent-123",
        "roomName": "Phòng 201"
      },
      "isRead": false,
      "readAt": null,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    {
      "messageId": 1234567892,
      "conversationId": 1234567890,
      "senderId": 1,
      "senderName": "Nguyễn Văn A",
      "senderAvatar": "https://...",
      "type": "text",
      "content": "Xin chào, tôi muốn thuê phòng này",
      "metadata": null,
      "isRead": true,
      "readAt": "2024-01-01T10:05:00.000Z",
      "createdAt": "2024-01-01T10:01:00.000Z",
      "updatedAt": "2024-01-01T10:01:00.000Z"
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 50
}
```

**Lưu ý:** Messages được sắp xếp theo thời gian tăng dần (tin nhắn cũ nhất ở đầu).

---

### **6. Đánh dấu tin nhắn đã đọc**

**POST** `/api/chat/conversations/:conversationId/read?userId=1`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true
}
```

---

### **7. Xóa tin nhắn**

**DELETE** `/api/chat/messages/:messageId?userId=1`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true
}
```

**Lưu ý:** Chỉ có thể xóa tin nhắn của chính mình.

---

## 🎯 Flow tích hợp cho Frontend

### **1. Khởi tạo kết nối Socket.IO**

```javascript
// utils/socket.js
import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io('http://localhost:3001/chat', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✅ Connected to chat server');
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from chat server');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

### **2. Component Chat**

```javascript
// components/Chat.jsx
import { useEffect, useState } from 'react';
import { initSocket, getSocket } from '../utils/socket';
import { getConversations, getMessages, createConversation } from '../api/chat';

const Chat = ({ userId, token }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Khởi tạo socket
    const socketInstance = initSocket(token);
    setSocket(socketInstance);

    // Load conversations
    loadConversations();

    // Listen for new messages
    socketInstance.on('new_message', (message) => {
      if (message.conversationId === currentConversation?.conversationId) {
        setMessages(prev => [...prev, message]);
      }
      // Update conversation list
      loadConversations();
    });

    // Listen for conversation updates
    socketInstance.on('conversation_updated', (update) => {
      loadConversations();
    });

    // Listen for typing indicator
    socketInstance.on('user_typing', (data) => {
      // Handle typing indicator UI
      console.log('User typing:', data);
    });

    return () => {
      socketInstance.off('new_message');
      socketInstance.off('conversation_updated');
      socketInstance.off('user_typing');
    };
  }, [token]);

  const loadConversations = async () => {
    try {
      const data = await getConversations(userId);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const data = await getMessages(conversationId, userId);
      setMessages(data.items);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = (content) => {
    if (!socket || !currentConversation) return;

    socket.emit('send_message', {
      conversationId: currentConversation.conversationId,
      senderId: userId,
      type: 'text',
      content,
    });
  };

  const markAsRead = (conversationId) => {
    if (!socket) return;
    socket.emit('mark_read', { conversationId });
  };

  return (
    <div className="chat-container">
      {/* Conversation list */}
      <div className="conversations">
        {conversations.map(conv => (
          <div
            key={conv.conversationId}
            onClick={() => {
              setCurrentConversation(conv);
              loadMessages(conv.conversationId);
              markAsRead(conv.conversationId);
            }}
          >
            <h3>{conv.tenantId === userId ? conv.landlordName : conv.tenantName}</h3>
            {conv.unreadCount > 0 && <span>{conv.unreadCount}</span>}
          </div>
        ))}
      </div>

      {/* Messages */}
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.messageId} className={msg.senderId === userId ? 'sent' : 'received'}>
            <p>{msg.content}</p>
            <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <input
        type="text"
        onKeyPress={(e) => {
          if (e.key === 'Enter' && e.target.value.trim()) {
            sendMessage(e.target.value);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
};

export default Chat;
```

### **3. API Service**

```javascript
// api/chat.js
const API_BASE = 'http://localhost:3001/api/chat';

export const getConversations = async (userId) => {
  const response = await fetch(`${API_BASE}/conversations?userId=${userId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.json();
};

export const getConversation = async (conversationId, userId) => {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}?userId=${userId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.json();
};

export const createConversation = async (data) => {
  const response = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const getMessages = async (conversationId, userId, page = 1, pageSize = 50) => {
  const response = await fetch(
    `${API_BASE}/conversations/${conversationId}/messages?userId=${userId}&page=${page}&pageSize=${pageSize}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    }
  );
  return response.json();
};

export const markAsRead = async (conversationId, userId) => {
  const response = await fetch(
    `${API_BASE}/conversations/${conversationId}/read?userId=${userId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    }
  );
  return response.json();
};
```

---

## ⚠️ Lưu ý quan trọng

1. **Authentication**: 
   - Socket.IO yêu cầu JWT token trong `auth.token` hoặc `Authorization` header
   - Token được verify khi kết nối, nếu không hợp lệ sẽ bị disconnect

2. **senderId Validation**:
   - Khi gửi tin nhắn qua Socket.IO, `senderId` phải khớp với `userId` từ JWT token
   - **Backend tự động convert cả hai về number** để so sánh (tránh type mismatch)
   - JWT token có thể có `sub: '1'` (string) hoặc `userId: 1` (number) - backend sẽ convert sang number
   - Server sẽ kiểm tra và từ chối nếu không khớp
   - **Lưu ý:** Backend sử dụng `userId` từ JWT token (đã verified) để tạo message, không dùng `senderId` từ payload để đảm bảo security

3. **Conversation Access**:
   - User chỉ có thể xem conversation mà họ là tenant hoặc landlord
   - Server sẽ kiểm tra quyền truy cập trước khi trả về dữ liệu

4. **Message Ordering**:
   - Messages trong REST API được sắp xếp theo thời gian tăng dần (cũ nhất ở đầu)
   - Frontend nên reverse nếu muốn hiển thị mới nhất ở cuối

5. **Real-time Updates**:
   - Nên sử dụng Socket.IO cho real-time chat
   - REST API chỉ dùng để load lịch sử và fallback

6. **Error Handling**:
   - Luôn xử lý lỗi khi kết nối Socket.IO
   - Implement reconnection logic
   - Hiển thị thông báo khi mất kết nối

---

## 🚀 Cài đặt Dependencies

Backend đã được cấu hình sẵn. Nếu cần cài đặt lại:

```bash
npm install socket.io @nestjs/websockets @nestjs/platform-socket.io
```

---

## 📝 Ví dụ sử dụng

### **Tạo conversation từ trang post**

```javascript
// Khi user click "Liên hệ chủ nhà" trên post
const handleContactLandlord = async (postId, landlordId) => {
  const conversation = await createConversation({
    tenantId: currentUser.userId,
    landlordId: landlordId,
    postId: postId,
  });

  // Navigate to chat với conversation này
  navigate(`/chat/${conversation.conversationId}`);
};
```

### **Typing Indicator**

```javascript
let typingTimeout;

const handleInputChange = (value) => {
  if (!socket || !currentConversation) return;

  // Gửi typing = true
  socket.emit('typing', {
    conversationId: currentConversation.conversationId,
    isTyping: true,
  });

  // Clear timeout cũ
  clearTimeout(typingTimeout);

  // Sau 3 giây không gõ, gửi typing = false
  typingTimeout = setTimeout(() => {
    socket.emit('typing', {
      conversationId: currentConversation.conversationId,
      isTyping: false,
    });
  }, 3000);
};
```

---

## 🔒 Security

- Tất cả endpoints đều yêu cầu JWT authentication
- Socket.IO connection được authenticate bằng JWT token
- User chỉ có thể truy cập conversations của chính họ
- User chỉ có thể xóa tin nhắn của chính mình
- Server validate `senderId` phải khớp với JWT token (với type conversion tự động)
- **Backend sử dụng `userId` từ JWT token để tạo message**, không tin tưởng `senderId` từ payload để tránh spoofing

---

## 🐛 Bug Fixes & Updates

### ✅ Fixed: Type Mismatch trong send_message (2024-01-XX)

**Vấn đề:**
- JWT token có `sub: '1'` (string) nhưng frontend gửi `senderId: 1` (number)
- Backend so sánh trực tiếp `'1' === 1` → false → lỗi "Sender ID không khớp với user hiện tại"

**Giải pháp đã implement:**
- ✅ Backend tự động convert cả `userId` từ JWT token và `senderId` từ payload sang number trước khi so sánh
- ✅ Backend sử dụng `userId` từ JWT token (đã verified) để tạo message, không dùng `senderId` từ payload
- ✅ Đảm bảo type consistency trong toàn bộ flow

**Kết quả:**
- ✅ Frontend có thể gửi `senderId` là number hoặc string, backend sẽ tự động convert
- ✅ JWT token có thể có `sub: '1'` (string) hoặc `userId: 1` (number), backend xử lý cả hai
- ✅ Không còn lỗi type mismatch
- ✅ Tăng cường security bằng cách sử dụng userId từ JWT token thay vì từ payload

**Frontend không cần thay đổi code**, backend đã xử lý tự động.

---

### ✅ Added: LastMessage trong Conversation List (2024-01-XX)

**Tính năng:**
- ✅ Backend trả về `lastMessage` trong response của `GET /api/chat/conversations`
- ✅ `lastMessage` chứa `content` và `type` của tin nhắn cuối cùng
- ✅ `lastMessage` là `null` nếu conversation chưa có tin nhắn
- ✅ Tự động cập nhật khi có tin nhắn mới (qua Socket.IO hoặc REST API)

**Response format:**
```json
{
  "conversationId": 1234567890,
  "lastMessageAt": "2024-01-01T10:00:00.000Z",
  "lastMessage": {
    "content": "Xin chào, tôi muốn thuê phòng này",
    "type": "text"
  }
}
```

**Frontend có thể sử dụng `lastMessage` để:**
- Hiển thị preview tin nhắn cuối cùng trong conversation list
- Format message preview (ví dụ: truncate nếu quá dài)
- Hiển thị icon khác nhau tùy theo `type` (text, image, video, file, system)

---

### ✅ Added: Upload Ảnh/Video/File lên S3 (2024-01-XX)

**Tính năng:**
- ✅ Hỗ trợ gửi ảnh, video, và file trong chat
- ✅ Tự động upload lên S3 khi frontend gửi base64 data URL
- ✅ Lưu S3 URL vào database thay vì base64 (tiết kiệm storage)
- ✅ Hỗ trợ các format: JPEG, PNG, WebP, GIF (ảnh); MP4, WebM, QuickTime, AVI (video); PDF, DOC, DOCX, XLS, XLSX (file)

**Cách sử dụng:**
1. Frontend convert file thành base64 data URL
2. Gửi qua Socket.IO hoặc REST API với `type: 'image'`, `'video'`, hoặc `'file'`
3. Backend tự động upload lên S3 và trả về S3 URL trong response

**Ví dụ:**
```javascript
// Frontend: Convert file to base64
const file = event.target.files[0];
const reader = new FileReader();
reader.onload = (e) => {
  const base64 = e.target.result; // data:image/jpeg;base64,...
  
  // Gửi qua Socket.IO
  socket.emit('send_message', {
    conversationId: 1234567890,
    senderId: 1,
    type: 'image',
    content: base64
  });
};
reader.readAsDataURL(file);

// Response: content là S3 URL
{
  "type": "image",
  "content": "https://dxxxx.cloudfront.net/uploads/1/chat/1234567890-abc123.jpg"
}
```

**S3 Structure:**
```
uploads/
└── {userId}/
    └── chat/
        ├── 1234567890-{uuid}.jpg  (ảnh)
        ├── 1234567891-{uuid}.mp4  (video)
        └── 1234567892-{uuid}.pdf  (file)
```

---

## 🤖 Tính năng Auto Message (Tự động gửi tin nhắn hệ thống)

### **Mô tả**

Khi người thuê bấm "Chat với người đăng" từ trang chi tiết bài đăng, backend sẽ **tự động tạo system message** chứa thông tin bài đăng để chủ nhà biết người thuê quan tâm đến bài đăng nào.

### **Cách hoạt động**

1. **Frontend gọi API:**
   ```javascript
   POST /api/chat/conversations
   {
     "tenantId": 1,
     "landlordId": 2,
     "postId": 123,  // ✅ Có postId
     "roomId": 456
   }
   ```

2. **Backend xử lý:**
   - Tạo hoặc lấy conversation giữa tenant và landlord
   - Kiểm tra xem đã có tin nhắn về `postId` này chưa (dựa trên `metadata.postId` hoặc content chứa link)
   - Nếu chưa có, tự động tạo system message với thông tin bài đăng
   - Trả về conversation kèm `isNew` và `systemMessage`

3. **Response:**
   ```json
   {
     "conversationId": 1234567890,
     "isNew": true,
     "systemMessage": {
       "type": "system",
       "senderId": null,
       "senderName": "Hệ thống",
       "content": "📋 Tôi quan tâm đến bài đăng này:...",
       "metadata": {
         "postId": 123,
         "postTitle": "...",
         "postPrice": 5000000,
         "postAddress": "...",
         "postUrl": "..."
       }
     }
   }
   ```

### **Đặc điểm**

- ✅ **Tự động:** Backend tự động tạo, không cần frontend gửi tin nhắn
- ✅ **Tránh duplicate:** Chỉ tạo nếu chưa có tin nhắn về `postId` này (kiểm tra `metadata.postId` hoặc content chứa link)
- ✅ **Rich metadata:** Chứa đầy đủ thông tin bài đăng trong `metadata`
- ✅ **System message:** Có `type: 'system'`, `senderId: null`, `senderName: 'Hệ thống'`
- ✅ **Hỗ trợ nhiều bài đăng:** Có thể chat về nhiều bài đăng khác nhau trong cùng conversation
- ✅ **Cập nhật postId:** Nếu conversation đã tồn tại nhưng có `postId` khác, backend sẽ cập nhật `postId` và tạo system message mới

### **Format tin nhắn hệ thống**

**Text content:**
```
📋 Tôi quan tâm đến bài đăng này:

🏠 **Phòng trọ giá rẻ tại Quận 1**

💰 Giá: 5.000.000 VNĐ/tháng
📍 Địa chỉ: 123 Đường ABC, Quận 1, TP. Hồ Chí Minh
🛏️ Phòng: Phòng 201

🔗 Xem chi tiết: http://localhost:3000/room_details/rent-123
```

**Metadata:**
```json
{
  "postId": 123,
  "roomId": 456,
  "postTitle": "Phòng trọ giá rẻ tại Quận 1",
  "postPrice": 5000000,
  "postAddress": "123 Đường ABC, Quận 1, TP. Hồ Chí Minh",
  "postImage": "https://...",
  "postType": "cho-thue",
  "postUrl": "http://localhost:3000/room_details/rent-123",
  "roomName": "Phòng 201"
}
```

### **Frontend Integration**

Frontend có thể:
- Hiển thị system message đặc biệt (với UI khác user message)
- Sử dụng `metadata` để hiển thị rich card với ảnh, link, etc.
- Kiểm tra `isNew` để biết conversation mới hay cũ
- Sử dụng `systemMessage` để hiển thị ngay khi tạo conversation

**Ví dụ:**
```typescript
const conversation = await createConversation({
  tenantId: currentUserId,
  landlordId: landlordId,
  postId: postData.postId,
  roomId: postData.roomId,
});

// Nếu có system message, hiển thị ngay
if (conversation.systemMessage) {
  addMessageToChat(conversation.systemMessage);
}
```

### **Environment Variable**

Backend cần config `FRONTEND_URL` trong `.env` để tạo link đến bài đăng:
```env
FRONTEND_URL=http://localhost:3000
```

Nếu không có, mặc định sẽ dùng `http://localhost:3000`.

---

## 📞 Support

Nếu có vấn đề khi tích hợp, vui lòng liên hệ backend team.

