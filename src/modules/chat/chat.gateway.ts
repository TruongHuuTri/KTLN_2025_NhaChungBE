import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';

// Extend Socket interface để thêm userId
interface AuthenticatedSocket extends Socket {
  userId?: number;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Có thể config cụ thể hơn trong production
    credentials: true,
  },
  namespace: '/chat',
  maxHttpBufferSize: 50 * 1024 * 1024, // 50MB để hỗ trợ video base64 lớn
  pingTimeout: 60000, // 60s timeout
  pingInterval: 25000, // 25s ping interval
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<number, string>(); // userId -> socketId

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Xác thực JWT token khi client kết nối
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
      });

      const userId = payload.userId ?? payload.sub;
      if (!userId) {
        client.disconnect();
        return;
      }

      // Convert userId sang number để đảm bảo type consistency
      const userIdNumber = Number(userId);
      if (isNaN(userIdNumber)) {
        client.disconnect();
        return;
      }

      // Lưu userId vào socket (luôn là number)
      client.userId = userIdNumber;
      this.connectedUsers.set(userIdNumber, client.id);

      // Join room theo userId để dễ dàng gửi tin nhắn
      client.join(`user_${userIdNumber}`);

      console.log(`User ${userIdNumber} connected with socket ${client.id}`);
    } catch (error) {
      console.error('Socket authentication error:', error);
      client.disconnect();
    }
  }

  /**
   * Xử lý khi client ngắt kết nối
   */
  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      console.log(`User ${client.userId} disconnected`);
    }
  }

  /**
   * Gửi tin nhắn mới
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(@MessageBody() dto: CreateMessageDto, @ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (!client.userId) {
        return { error: 'Unauthorized' };
      }

      // Kiểm tra senderId phải khớp với userId từ token (convert cả hai về number để tránh type mismatch)
      const senderIdNumber = Number(dto.senderId);
      const userIdFromToken = Number(client.userId);
      
      if (isNaN(senderIdNumber) || senderIdNumber !== userIdFromToken) {
        return { error: 'Sender ID không khớp với user hiện tại' };
      }
      
      // Sử dụng userId từ JWT token (đã verified) thay vì từ payload để đảm bảo security
      const verifiedSenderId = userIdFromToken;

      // Tạo message với senderId từ JWT token (đã verified) thay vì từ payload
      const messageDto = {
        ...dto,
        senderId: verifiedSenderId, // Dùng userId từ JWT, không dùng từ payload
      };
      const message = await this.chatService.createMessage(messageDto);

      // Lấy conversation để biết người nhận và lấy thông tin sender
      const conversation = await this.chatService.getConversation(dto.conversationId, client.userId);
      const recipientId = conversation.tenantId === client.userId ? conversation.landlordId : conversation.tenantId;

      // Format message response với thông tin từ conversation
      const isTenant = conversation.tenantId === client.userId;
      const messageResponse = {
        messageId: message.messageId,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: isTenant ? conversation.tenantName : conversation.landlordName,
        senderAvatar: isTenant ? conversation.tenantAvatar : conversation.landlordAvatar,
        type: message.type,
        content: message.content,
        isRead: message.isRead,
        readAt: message.readAt,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      };

      // Gửi tin nhắn cho người gửi (xác nhận)
      client.emit('message_sent', messageResponse);

      // Gửi tin nhắn cho người nhận (nếu đang online)
      const recipientSocketId = this.connectedUsers.get(recipientId);
      if (recipientSocketId) {
        this.server.to(`user_${recipientId}`).emit('new_message', messageResponse);
      }

      // Gửi thông báo cập nhật conversation cho cả 2 người (có lastMessage)
      const conversationUpdate = {
        conversationId: conversation.conversationId,
        lastMessageAt: message.createdAt,
        lastMessage: {
          content: message.content,
          type: message.type,
        },
      };

      client.emit('conversation_updated', conversationUpdate);
      if (recipientSocketId) {
        this.server.to(`user_${recipientId}`).emit('conversation_updated', conversationUpdate);
      }

      return { success: true, message: messageResponse };
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      return { error: error.message || 'Lỗi khi gửi tin nhắn' };
    }
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() data: { conversationId: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        return { error: 'Unauthorized' };
      }

      await this.chatService.markAsRead(data.conversationId, client.userId);

      // Thông báo cho người gửi (nếu đang online)
      const conversation = await this.chatService.getConversation(data.conversationId, client.userId);
      const otherUserId = conversation.tenantId === client.userId ? conversation.landlordId : conversation.tenantId;

      const otherUserSocketId = this.connectedUsers.get(otherUserId);
      if (otherUserSocketId) {
        this.server.to(`user_${otherUserId}`).emit('messages_read', {
          conversationId: data.conversationId,
          readBy: client.userId,
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error marking as read:', error);
      return { error: error.message || 'Lỗi khi đánh dấu đã đọc' };
    }
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { conversationId: number; isTyping: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        return;
      }

      const conversation = await this.chatService.getConversation(data.conversationId, client.userId);
      const recipientId = conversation.tenantId === client.userId ? conversation.landlordId : conversation.tenantId;

      // Gửi typing indicator cho người nhận
      const recipientSocketId = this.connectedUsers.get(recipientId);
      if (recipientSocketId) {
        this.server.to(`user_${recipientId}`).emit('user_typing', {
          conversationId: data.conversationId,
          userId: client.userId,
          isTyping: data.isTyping,
        });
      }
    } catch (error) {
      console.error('Error handling typing:', error);
    }
  }
}

