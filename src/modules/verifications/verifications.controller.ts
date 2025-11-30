import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
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
import { UpdateBusinessLicenseDto } from './dto/update-business-license.dto';
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
        faceMatchResult: savedVerification.faceMatchResult,  // Thêm faceMatchResult vào response
      },
    };
  }

  @Get('admin')
  @UseGuards(AdminJwtGuard)
  async findAll(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);

    return this.verificationsService.findAll(status, pageNum, limitNum);
  }

  /**
   * Lấy verification của user hiện tại
   * Phải đứng trước route có parameter để tránh routing conflict
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyVerification(@Request() req: any) {
    const userId = req.user.sub;
    const verification = await this.verificationsService.getMyVerification(userId);
    
    if (!verification) {
      return {
        message: 'Chưa có hồ sơ xác thực',
        verification: null,
      };
    }

    const verificationData = verification as any;
    return {
      verification: {
        verificationId: verificationData.verificationId,
        userId: verificationData.userId,
        status: verificationData.status,
        submittedAt: verificationData.submittedAt,
        businessLicense: verificationData.businessLicense,
        updatedAt: verificationData.updatedAt,
      },
    };
  }

  @Get('user/:userId')
  @UseGuards(AdminJwtGuard)
  findByUserId(@Param('userId') userId: string) {
    return this.verificationsService.findByUserId(userId);
  }

  @Get('admin/:id')
  @UseGuards(AdminJwtGuard)
  async getVerificationById(@Param('id') verificationId: string) {
    return this.verificationsService.getVerificationById(parseInt(verificationId));
  }

  @Get('admin/:id/images')
  @UseGuards(AdminJwtGuard)
  async getVerificationImages(@Param('id') verificationId: string) {
    return this.verificationsService.getVerificationImages(parseInt(verificationId));
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
        faceMatchResult: updatedVerification.faceMatchResult,  // Thêm faceMatchResult vào admin response
      },
    };
  }

  /**
   * Cập nhật giấy phép kinh doanh cho verification của user hiện tại
   */
  @Patch('me/business-license')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateBusinessLicense(
    @Request() req: any,
    @Body() updateBusinessLicenseDto: UpdateBusinessLicenseDto,
  ) {
    const userId = req.user.sub; // userId from JWT token
    const verification = await this.verificationsService.updateBusinessLicense(
      userId,
      updateBusinessLicenseDto.businessLicense,
    );

    const updatedVerification = verification as any;
    return {
      success: true,
      message: 'Cập nhật giấy phép kinh doanh thành công',
      verification: {
        verificationId: updatedVerification.verificationId,
        userId: updatedVerification.userId,
        status: updatedVerification.status,
        businessLicense: updatedVerification.businessLicense,
        updatedAt: updatedVerification.updatedAt,
      },
    };
  }
}
