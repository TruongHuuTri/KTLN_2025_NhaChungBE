import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { VerificationsService } from './verifications.service';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { UpdateVerificationDto } from './dto/update-verification.dto';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { AdminJwtGuard } from '../admin/guards/admin-jwt.guard';

@Controller('verifications')
export class VerificationsController {
  constructor(private readonly verificationsService: VerificationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: any, @Body() createVerificationDto: CreateVerificationDto) {
    const userId = req.user.sub; // userId from JWT token
    const verification = await this.verificationsService.create(userId, createVerificationDto);
    
    const savedVerification = verification as any;
    return {
      message: 'Nộp hồ sơ xác thực thành công',
      verification: {
        verificationId: savedVerification.verificationId,
        userId: savedVerification.userId,
        status: savedVerification.status,
        submittedAt: savedVerification.submittedAt,
        idNumber: savedVerification.idNumber,
        fullName: savedVerification.fullName,
      },
    };
  }

  @Get('admin')
  @UseGuards(AdminJwtGuard)
  async findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);

    return this.verificationsService.findAll(status, pageNum, limitNum);
  }


  @Get('user/:userId')
  @UseGuards(AdminJwtGuard)
  findByUserId(@Param('userId') userId: string) {
    return this.verificationsService.findByUserId(userId);
  }

  @Put('admin/:id')
  @UseGuards(AdminJwtGuard)
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateVerificationDto: UpdateVerificationDto,
  ) {
    const adminId = req.admin.sub;
    const verification = await this.verificationsService.updateStatus(
      id,
      adminId,
      updateVerificationDto,
    );

    const updatedVerification = verification as any;
    return {
      message: 'Cập nhật trạng thái xác thực thành công',
      verification: {
        verificationId: updatedVerification.verificationId,
        status: updatedVerification.status,
        reviewedAt: updatedVerification.reviewedAt,
        reviewedBy: updatedVerification.reviewedBy,
        adminNote: updatedVerification.adminNote,
      },
    };
  }
}
