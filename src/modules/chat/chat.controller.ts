import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Tạo hoặc lấy conversation
   */
  @Post('conversations')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getOrCreateConversation(@Body() dto: CreateConversationDto) {
    return this.chatService.getOrCreateConversation(dto);
  }

  /**
   * Lấy danh sách conversations của user
   */
  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  async getConversations(@Query('userId') userId: string) {
    return this.chatService.getConversations(Number(userId));
  }

  /**
   * Lấy thông tin conversation
   */
  @Get('conversations/:conversationId')
  @UseGuards(JwtAuthGuard)
  async getConversation(@Param('conversationId') conversationId: string, @Query('userId') userId: string) {
    return this.chatService.getConversation(Number(conversationId), Number(userId));
  }

  /**
   * Tạo tin nhắn mới (REST API - dùng khi không dùng socket)
   */
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createMessage(@Body() dto: CreateMessageDto) {
    return this.chatService.createMessage(dto);
  }

  /**
   * Lấy danh sách messages trong conversation
   */
  @Get('conversations/:conversationId/messages')
  @UseGuards(JwtAuthGuard)
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('userId') userId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.chatService.getMessages(
      Number(conversationId),
      Number(userId),
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 50,
    );
  }

  /**
   * Đánh dấu tin nhắn đã đọc
   */
  @Post('conversations/:conversationId/read')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async markAsRead(@Param('conversationId') conversationId: string, @Query('userId') userId: string) {
    await this.chatService.markAsRead(Number(conversationId), Number(userId));
    return { success: true };
  }

  /**
   * Xóa tin nhắn
   */
  @Delete('messages/:messageId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async deleteMessage(@Param('messageId') messageId: string, @Query('userId') userId: string) {
    await this.chatService.deleteMessage(Number(messageId), Number(userId));
    return { success: true };
  }
}

