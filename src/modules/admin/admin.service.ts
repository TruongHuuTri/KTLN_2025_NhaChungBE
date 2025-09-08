import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Admin, AdminDocument } from './schemas/admin.schema';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private jwtService: JwtService,
  ) {}

  async create(createAdminDto: CreateAdminDto): Promise<Admin> {
    // Check if admin already exists
    const existingAdmin = await this.adminModel.findOne({
      email: createAdminDto.email
    });

    if (existingAdmin) {
      throw new ConflictException('Email admin đã tồn tại');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createAdminDto.password, saltRounds);

    // Get next adminId
    const nextAdminId = await this.getNextAdminId();

    const createdAdmin = new this.adminModel({
      ...createAdminDto,
      password: hashedPassword,
      adminId: nextAdminId,
      role: 'admin',
    });

    return createdAdmin.save();
  }

  async login(adminLoginDto: AdminLoginDto) {
    // Find admin by email
    const admin = await this.adminModel.findOne({ email: adminLoginDto.email }).exec();
    if (!admin) {
      throw new UnauthorizedException('Email hoặc mật khẩu admin không đúng');
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw new UnauthorizedException('Tài khoản admin đã bị vô hiệu hóa');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(adminLoginDto.password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu admin không đúng');
    }

    // Update last login
    await this.adminModel.findByIdAndUpdate(admin._id, { lastLogin: new Date() });

    // Generate JWT token with admin prefix
    const payload = { 
      email: admin.email, 
      sub: admin.adminId.toString(),
      name: admin.name,
      role: 'admin',
      type: 'admin' // Để phân biệt với user token
    };
    
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      admin: {
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
        phone: admin.phone,
        lastLogin: admin.lastLogin,
      }
    };
  }

  async findAll(): Promise<Admin[]> {
    return this.adminModel.find().select('-password').exec();
  }

  async findOne(id: string): Promise<Admin> {
    const admin = await this.adminModel.findOne({ adminId: parseInt(id) }).select('-password').exec();
    if (!admin) {
      throw new NotFoundException('Không tìm thấy admin');
    }
    return admin;
  }

  async adminExists(): Promise<boolean> {
    const admin = await this.adminModel.findOne().exec();
    return !!admin;
  }

  private async getNextAdminId(): Promise<number> {
    const lastAdmin = await this.adminModel.findOne().sort({ adminId: -1 }).exec();
    return lastAdmin ? lastAdmin.adminId + 1 : 1;
  }
}
