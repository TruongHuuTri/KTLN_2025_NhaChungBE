import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ConflictException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Verification, VerificationDocument } from './schemas/verification.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { UpdateVerificationDto } from './dto/update-verification.dto';

@Injectable()
export class VerificationsService {
  constructor(
    @InjectModel(Verification.name) private verificationModel: Model<VerificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(userId: string, createVerificationDto: CreateVerificationDto): Promise<Verification> {
    console.log('UserId from JWT:', userId);
    
    if (!userId) {
      throw new BadRequestException('Không có thông tin user từ JWT token');
    }

    // Try to find user by userId (number) first since our JWT uses userId number
    const userByUserId = await this.userModel.findOne({ userId: parseInt(userId) }).exec();
    console.log('Found user by userId:', userByUserId ? 'Yes' : 'No');
    
    if (userByUserId) {
      // Use the userId number for verification
      const verification = await this.createVerificationForUserId(parseInt(userId), createVerificationDto);
      return verification;
    }

    // Fallback: try to find by ObjectId
    try {
      const userObjectId = new Types.ObjectId(userId);
      console.log('UserObjectId:', userObjectId);

      const user = await this.userModel.findById(userObjectId).exec();
      console.log('Found user by ObjectId:', user ? 'Yes' : 'No');
      
      if (user) {
        const verification = await this.createVerificationForUserId((user as any).userId, createVerificationDto);
        return verification;
      }
    } catch (error) {
      console.log('Invalid ObjectId format');
    }
    
    throw new NotFoundException(`Không tìm thấy user với ID: ${userId}`);
  }

  async findByUserId(userId: string): Promise<Verification | null> {
    return this.verificationModel.findOne({ userId: parseInt(userId) }).exec();
  }

  async findAll(
    status?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ verifications: Verification[]; total: number; page: number; totalPages: number }> {
    const filter = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [verifications, total] = await Promise.all([
      this.verificationModel
        .find(filter)
        .populate('userId', 'name email')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.verificationModel.countDocuments(filter).exec(),
    ]);

    return {
      verifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateStatus(
    verificationId: string,
    adminId: string,
    updateVerificationDto: UpdateVerificationDto
  ): Promise<Verification> {
    const verification = await this.verificationModel.findOne({ verificationId: parseInt(verificationId) }).exec();
    if (!verification) {
      throw new NotFoundException('Không tìm thấy hồ sơ xác thực');
    }

    if (verification.status !== 'pending') {
      throw new BadRequestException('Chỉ có thể cập nhật hồ sơ đang chờ duyệt');
    }

    // If rejecting, admin note is required
    if (updateVerificationDto.status === 'rejected' && !updateVerificationDto.adminNote) {
      throw new BadRequestException('Ghi chú admin là bắt buộc khi từ chối');
    }

    // Update verification
    const updatedVerification = await this.verificationModel.findOneAndUpdate(
      { verificationId: parseInt(verificationId) },
      {
        status: updateVerificationDto.status,
        reviewedAt: new Date(),
        reviewedBy: parseInt(adminId), // adminId từ JWT payload
        adminNote: updateVerificationDto.adminNote,
      },
      { new: true }
    ).exec();

    // Update user's isVerified status if approved
    if (updateVerificationDto.status === 'approved') {
      await this.userModel.findOneAndUpdate(
        { userId: verification.userId }, // Tìm bằng userId number
        { isVerified: true }
      ).exec();
    }

    return updatedVerification!;
  }

  private async createVerificationForUserId(userId: number, createVerificationDto: CreateVerificationDto): Promise<Verification> {
    
    // Check if user already has pending or approved verification
    const existingVerification = await this.verificationModel.findOne({
      userId: userId,
      status: { $in: ['pending', 'approved'] }
    }).exec();

    if (existingVerification) {
      if (existingVerification.status === 'approved') {
        throw new ConflictException('Tài khoản đã được xác thực');
      }
      if (existingVerification.status === 'pending') {
        throw new ConflictException('Đã có hồ sơ xác thực đang chờ duyệt');
      }
    }

    // Convert string dates to Date objects
    const birthDate = new Date(createVerificationDto.dateOfBirth);
    const issueDate = new Date(createVerificationDto.issueDate);
    const today = new Date();

    // Validate age (must be >= 16 years old)
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (age < 16 || (age === 16 && monthDiff < 0) || 
        (age === 16 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      throw new BadRequestException('Phải từ 16 tuổi trở lên');
    }

    // Validate issue date not in future
    if (issueDate > today) {
      throw new BadRequestException('Ngày cấp không được ở tương lai');
    }

    // Validate full name (at least 2 words)
    const nameWords = createVerificationDto.fullName.trim().split(/\s+/);
    if (nameWords.length < 2) {
      throw new BadRequestException('Họ tên phải có ít nhất 2 từ');
    }

        // Get next verificationId
        const nextVerificationId = await this.getNextVerificationId();

        // Create verification
        const verification = new this.verificationModel({
          verificationId: nextVerificationId,
          userId: userId,
          idNumber: createVerificationDto.idNumber,
          fullName: createVerificationDto.fullName,
          dateOfBirth: birthDate,
          gender: createVerificationDto.gender,
          issueDate: issueDate,
          issuePlace: createVerificationDto.issuePlace,
          status: 'pending',
          submittedAt: new Date(),
        });

    const savedVerification = await verification.save();

    // Update user's verificationId using userId number
    await this.userModel.findOneAndUpdate(
      { userId: userId },
      { verificationId: savedVerification.verificationId } // Lưu số tự tăng
    ).exec();

    return savedVerification;
  }

  private async getNextVerificationId(): Promise<number> {
    const lastVerification = await this.verificationModel.findOne().sort({ verificationId: -1 }).exec();
    return lastVerification ? lastVerification.verificationId + 1 : 1;
  }
}
