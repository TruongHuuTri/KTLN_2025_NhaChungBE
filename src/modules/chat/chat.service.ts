import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { Room, RoomDocument } from '../rooms/schemas/room.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { S3Service } from '../../s3/s3.service';
import { UploadFolder } from '../../s3/dto/presign.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name) private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Tạo hoặc lấy conversation giữa tenant và landlord
   * Tự động tạo system message nếu có postId và chưa có tin nhắn về postId này
   */
  async getOrCreateConversation(dto: CreateConversationDto): Promise<any> {
    // Kiểm tra conversation đã tồn tại chưa
    let conversation = await this.conversationModel.findOne({
      tenantId: dto.tenantId,
      landlordId: dto.landlordId,
      isActive: true,
    });

    let isNew = false;
    let systemMessage: MessageDocument | null = null;

    if (!conversation) {
      // Tạo conversation mới
      const conversationId = Date.now();
      conversation = new this.conversationModel({
        conversationId,
        tenantId: dto.tenantId,
        landlordId: dto.landlordId,
        postId: dto.postId,
        roomId: dto.roomId,
        lastMessageAt: new Date(),
        unreadCountTenant: 0,
        unreadCountLandlord: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await conversation.save();
      isNew = true;
    } else {
      // Nếu conversation đã tồn tại, cập nhật postId nếu khác
      if (dto.postId && conversation.postId !== dto.postId) {
        conversation.postId = dto.postId;
        conversation.roomId = dto.roomId;
        conversation.updatedAt = new Date();
        await conversation.save();
      }
    }

    // Kiểm tra và tạo system message nếu có postId
    if (dto.postId) {
      const hasPostMessage = await this.hasPostMessage(conversation.conversationId, dto.postId);
      
      if (!hasPostMessage) {
        systemMessage = await this.createSystemPostMessage(conversation.conversationId, dto.postId, dto.roomId);
        
        // Cập nhật conversation
        if (systemMessage) {
          conversation.lastMessageAt = systemMessage.createdAt;
          conversation.unreadCountLandlord = (conversation.unreadCountLandlord || 0) + 1;
          conversation.updatedAt = new Date();
          await conversation.save();
        }
      }
    }

    return {
      ...conversation.toObject(),
      isNew,
      systemMessage: systemMessage ? this.formatMessageResponse(systemMessage) : null,
    };
  }

  /**
   * Kiểm tra xem đã có tin nhắn về postId này chưa
   */
  private async hasPostMessage(conversationId: number, postId: number): Promise<boolean> {
    const messages = await this.messageModel
      .find({
        conversationId,
        isDeleted: false,
        $or: [
          { 'metadata.postId': postId },
          { content: { $regex: `room_details.*${postId}`, $options: 'i' } },
        ],
      })
      .limit(1)
      .lean();

    return messages.length > 0;
  }

  /**
   * Tạo system message về bài đăng
   */
  private async createSystemPostMessage(conversationId: number, postId: number, roomId?: number): Promise<MessageDocument> {
    // Lấy thông tin bài đăng
    const post = await this.postModel.findOne({ postId }).lean();
    if (!post) {
      throw new NotFoundException('Bài đăng không tồn tại');
    }

    // Lấy thông tin phòng nếu có
    let room: any = null;
    if (roomId) {
      room = await this.roomModel.findOne({ roomId }).lean();
    } else if (post.roomId) {
      room = await this.roomModel.findOne({ roomId: post.roomId }).lean();
    }

    // Format tin nhắn
    const { content, metadata } = this.formatPostInfoMessage(post, room);

    // Tạo system message
    const messageId = Date.now();
    const message = new this.messageModel({
      messageId,
      conversationId,
      senderId: undefined, // System message không có senderId
      type: 'system',
      content,
      metadata,
      isRead: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await message.save();

    return message;
  }

  /**
   * Format tin nhắn hệ thống với thông tin bài đăng
   */
  private formatPostInfoMessage(post: any, room: any): { content: string; metadata: any } {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    
    // Lấy postType từ post và convert sang format URL
    const postType = post.postType || 'cho-thue';
    let urlPostType = 'rent'; // Default
    if (postType === 'cho-thue') {
      urlPostType = 'rent';
    } else if (postType === 'tim-o-ghep') {
      urlPostType = 'roommate';
    }
    
    const postUrl = `${frontendUrl}/room_details/${urlPostType}-${post.postId}`;

    // Lấy giá
    const price = post.roomInfo?.basicInfo?.price || room?.price || post.price || null;

    // Lấy địa chỉ
    let address = 'Chưa cập nhật';
    if (post.roomInfo?.address) {
      const addr = post.roomInfo.address;
      address = [addr.street, addr.wardName, addr.city].filter(Boolean).join(', ');
    } else if (room?.address) {
      const addr = room.address;
      address = [addr.street, addr.wardName, addr.city].filter(Boolean).join(', ');
    } else if (post.address?.fullAddress) {
      address = post.address.fullAddress;
    }

    // Lấy ảnh
    const image = post.images?.[0] || room?.images?.[0] || null;

    // Lấy tên phòng
    const roomName = room?.roomNumber || room?.roomName || null;

    // Format content
    let content = `📋 Tôi quan tâm đến bài đăng này:\n\n`;
    content += `🏠 **${post.title || 'Bài đăng'}**\n\n`;
    
    if (price) {
      content += `💰 Giá: ${this.formatPrice(price)} VNĐ/tháng\n`;
    }
    
    if (address && address !== 'Chưa cập nhật') {
      content += `📍 Địa chỉ: ${address}\n`;
    }
    
    if (roomName) {
      content += `🛏️ Phòng: ${roomName}\n`;
    }
    
    content += `\n🔗 Xem chi tiết: ${postUrl}`;

    // Metadata
    const metadata = {
      postId: post.postId,
      postType: postType, // Thêm postType vào metadata
      roomId: room?.roomId || post.roomId || null,
      postTitle: post.title,
      postPrice: price,
      postAddress: address,
      postImage: image,
      postUrl, // URL với format đúng (rent-{postId} hoặc roommate-{postId})
      roomName,
    };

    return { content, metadata };
  }

  /**
   * Format giá tiền
   */
  private formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price);
  }

  /**
   * Format message response với thông tin sender
   */
  private formatMessageResponse(message: MessageDocument | any): any {
    return {
      messageId: message.messageId,
      conversationId: message.conversationId,
      senderId: message.senderId || null,
      senderName: message.senderId ? 'Unknown' : 'Hệ thống',
      senderAvatar: null,
      type: message.type,
      content: message.content,
      metadata: message.metadata || null,
      isRead: message.isRead,
      readAt: message.readAt || null,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * Tạo tin nhắn mới
   */
  async createMessage(dto: CreateMessageDto): Promise<MessageDocument> {
    // Kiểm tra conversation tồn tại
    const conversation = await this.conversationModel.findOne({
      conversationId: dto.conversationId,
      isActive: true,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    // Kiểm tra sender có phải tenant hoặc landlord không (bỏ qua cho system message)
    if (dto.senderId !== undefined && dto.senderId !== null) {
      if (dto.senderId !== conversation.tenantId && dto.senderId !== conversation.landlordId) {
        throw new BadRequestException('Bạn không có quyền gửi tin nhắn trong conversation này');
      }
    }

    // Validate content length theo type
    const messageType = dto.type || 'text';
    if (messageType === 'text') {
      if (dto.content.length > 5000) {
        throw new BadRequestException('Tin nhắn text không được vượt quá 5000 ký tự');
      }
    } else if (messageType === 'image' || messageType === 'video' || messageType === 'file') {
      // Kiểm tra nếu là base64 data URL
      if (dto.content.startsWith('data:')) {
        // Validate base64 data URL format
        if (!dto.content.includes(';base64,')) {
          throw new BadRequestException('Format base64 không hợp lệ');
        }
        // Validate file size (10MB limit như FE)
        // Base64 string length ≈ original size * 1.33
        // Tính size từ base64 string length để tránh decode tốn memory
        const base64Data = dto.content.split(',')[1] || '';
        const base64Length = base64Data.length;
        // Base64 size = (base64Length * 3) / 4 (xấp xỉ)
        const estimatedSize = (base64Length * 3) / 4;
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (estimatedSize > maxSize) {
          const sizeMB = (estimatedSize / 1024 / 1024).toFixed(2);
          throw new BadRequestException(`File quá lớn. Tối đa 10MB. File hiện tại: ${sizeMB}MB`);
        }
      }
    }

    // Xử lý upload file nếu là image, video hoặc file
    let finalContent = dto.content;
    if (dto.type === 'image' || dto.type === 'video' || dto.type === 'file') {
      // Kiểm tra nếu content là base64 data URL
      if (dto.content.startsWith('data:')) {
        try {
          // Upload lên S3 và lấy URL
          let fileName = 'file';
          if (dto.type === 'image') {
            fileName = 'image.jpg';
          } else if (dto.type === 'video') {
            fileName = 'video.mp4';
          }
          
          const s3Url = await this.s3Service.uploadFileToS3(
            dto.content,
            fileName,
            dto.senderId || 0, // Fallback nếu không có senderId (system message)
            UploadFolder.chat,
          );
          finalContent = s3Url; // Lưu S3 URL thay vì base64
        } catch (error) {
          throw new BadRequestException(`Lỗi khi upload file lên S3: ${error.message}`);
        }
      }
      // Nếu content đã là URL (từ S3 hoặc external), giữ nguyên
    }

    // Tạo message
    const messageId = Date.now();
    const message = new this.messageModel({
      messageId,
      conversationId: dto.conversationId,
      senderId: dto.senderId,
      type: dto.type || 'text',
      content: finalContent, // S3 URL cho image/file, text cho text message
      isRead: false,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await message.save();

    // Cập nhật conversation
    const isTenantSender = dto.senderId === conversation.tenantId;
    if (isTenantSender) {
      conversation.unreadCountLandlord += 1;
    } else {
      conversation.unreadCountTenant += 1;
    }
    conversation.lastMessageAt = new Date();
    conversation.updatedAt = new Date();
    await conversation.save();

    return message;
  }

  /**
   * Lấy danh sách conversations của user
   */
  async getConversations(userId: number): Promise<any[]> {
    const conversations = await this.conversationModel
      .find({
        $or: [{ tenantId: userId }, { landlordId: userId }],
        isActive: true,
      })
      .sort({ lastMessageAt: -1 })
      .lean();

    // Populate thông tin user
    const userIds = new Set<number>();
    conversations.forEach((conv: any) => {
      userIds.add(conv.tenantId);
      userIds.add(conv.landlordId);
    });

    const users = await this.userModel.find({ userId: { $in: Array.from(userIds) } }).lean();
    const userMap = new Map(users.map(u => [u.userId, u]));

    // Lấy tin nhắn cuối cùng cho mỗi conversation
    const conversationIds = conversations.map((conv: any) => conv.conversationId);
    const lastMessages = await this.messageModel
      .aggregate([
        {
          $match: {
            conversationId: { $in: conversationIds },
            isDeleted: false,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $group: {
            _id: '$conversationId',
            lastMessage: { $first: '$$ROOT' },
          },
        },
      ])
      .exec();

    const lastMessageMap = new Map(
      lastMessages.map((item: any) => [item._id, item.lastMessage]),
    );

    // Format response
    return conversations.map((conv: any) => {
      const tenant = userMap.get(conv.tenantId);
      const landlord = userMap.get(conv.landlordId);
      const isTenant = conv.tenantId === userId;

      // Lấy tin nhắn cuối cùng
      const lastMessageDoc = lastMessageMap.get(conv.conversationId);
      const lastMessage = lastMessageDoc
        ? {
            content: lastMessageDoc.content,
            type: lastMessageDoc.type,
          }
        : null;

      return {
        conversationId: conv.conversationId,
        tenantId: conv.tenantId,
        tenantName: tenant?.name || 'Unknown',
        tenantAvatar: tenant?.avatar || null,
        landlordId: conv.landlordId,
        landlordName: landlord?.name || 'Unknown',
        landlordAvatar: landlord?.avatar || null,
        postId: conv.postId,
        roomId: conv.roomId,
        lastMessageAt: conv.lastMessageAt,
        lastMessage, // ✅ Thêm lastMessage
        unreadCount: isTenant ? conv.unreadCountTenant : conv.unreadCountLandlord,
        isActive: conv.isActive,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      };
    });
  }

  /**
   * Lấy danh sách messages trong conversation
   */
  async getMessages(conversationId: number, userId: number, page: number = 1, pageSize: number = 50): Promise<any> {
    // Kiểm tra conversation và quyền truy cập
    const conversation = await this.conversationModel.findOne({
      conversationId,
      isActive: true,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    if (conversation.tenantId !== userId && conversation.landlordId !== userId) {
      throw new BadRequestException('Bạn không có quyền xem conversation này');
    }

    // Lấy messages
    const skip = (page - 1) * pageSize;
    const messages = await this.messageModel
      .find({
        conversationId,
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    // Populate thông tin sender (chỉ cho user messages, không phải system message)
    const senderIds = new Set<number>();
    messages.forEach((msg: any) => {
      if (msg.senderId) {
        senderIds.add(msg.senderId);
      }
    });

    const users = await this.userModel.find({ userId: { $in: Array.from(senderIds) } }).lean();
    const userMap = new Map(users.map(u => [u.userId, u]));

    // Format response (đảo ngược để tin nhắn cũ nhất ở đầu)
    const formattedMessages = messages
      .reverse()
      .map((msg: any) => {
        // System message không có senderId
        if (!msg.senderId || msg.type === 'system') {
          return {
            messageId: msg.messageId,
            conversationId: msg.conversationId,
            senderId: null,
            senderName: 'Hệ thống',
            senderAvatar: null,
            type: msg.type,
            content: msg.content,
            metadata: msg.metadata || null,
            isRead: msg.isRead,
            readAt: msg.readAt,
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt,
          };
        }

        // User message
        const sender = userMap.get(msg.senderId);
        return {
          messageId: msg.messageId,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          senderName: sender?.name || 'Unknown',
          senderAvatar: sender?.avatar || null,
          type: msg.type,
          content: msg.content,
          metadata: msg.metadata || null,
          isRead: msg.isRead,
          readAt: msg.readAt,
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt,
        };
      });

    const total = await this.messageModel.countDocuments({
      conversationId,
      isDeleted: false,
    });

    return {
      items: formattedMessages,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  async markAsRead(conversationId: number, userId: number): Promise<void> {
    const conversation = await this.conversationModel.findOne({
      conversationId,
      isActive: true,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    if (conversation.tenantId !== userId && conversation.landlordId !== userId) {
      throw new BadRequestException('Bạn không có quyền truy cập conversation này');
    }

    // Đánh dấu tất cả tin nhắn chưa đọc là đã đọc
    await this.messageModel.updateMany(
      {
        conversationId,
        senderId: { $ne: userId }, // Tin nhắn không phải của user
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );

    // Reset unread count
    const isTenant = conversation.tenantId === userId;
    if (isTenant) {
      conversation.unreadCountTenant = 0;
    } else {
      conversation.unreadCountLandlord = 0;
    }
    conversation.updatedAt = new Date();
    await conversation.save();
  }

  /**
   * Xóa tin nhắn (soft delete)
   */
  async deleteMessage(messageId: number, userId: number): Promise<void> {
    const message = await this.messageModel.findOne({ messageId });

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    if (message.senderId !== userId) {
      throw new BadRequestException('Bạn chỉ có thể xóa tin nhắn của chính mình');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.updatedAt = new Date();
    await message.save();
  }

  /**
   * Lấy thông tin conversation
   */
  async getConversation(conversationId: number, userId: number): Promise<any> {
    const conversation = await this.conversationModel.findOne({
      conversationId,
      isActive: true,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation không tồn tại');
    }

    if (conversation.tenantId !== userId && conversation.landlordId !== userId) {
      throw new BadRequestException('Bạn không có quyền xem conversation này');
    }

    // Populate user info
    const [tenant, landlord] = await Promise.all([
      this.userModel.findOne({ userId: conversation.tenantId }).lean(),
      this.userModel.findOne({ userId: conversation.landlordId }).lean(),
    ]);

    const isTenant = conversation.tenantId === userId;

    return {
      conversationId: conversation.conversationId,
      tenantId: conversation.tenantId,
      tenantName: tenant?.name || 'Unknown',
      tenantAvatar: tenant?.avatar || null,
      landlordId: conversation.landlordId,
      landlordName: landlord?.name || 'Unknown',
      landlordAvatar: landlord?.avatar || null,
      postId: conversation.postId,
      roomId: conversation.roomId,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: isTenant ? conversation.unreadCountTenant : conversation.unreadCountLandlord,
      isActive: conversation.isActive,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}

