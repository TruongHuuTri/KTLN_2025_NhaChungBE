import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Invoice, InvoiceDocument } from '../../modules/contracts/schemas/invoice.schema';
import { User, UserDocument } from '../../modules/users/schemas/user.schema';

@Injectable()
export class MaintenanceFeeService {
  private readonly logger = new Logger(MaintenanceFeeService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {}

  /**
   * Cron job chạy vào ngày 1 hàng tháng lúc 0h00 để tạo hóa đơn phí duy trì
   */
  @Cron('0 0 1 * *') // Chạy vào 0h sáng ngày 1 hàng tháng
  async generateMonthlyMaintenanceInvoices() {
    try {
      this.logger.log('Starting monthly maintenance fee generation...');

      // Kiểm tra xem có bật tự động tạo hóa đơn không
      const isEnabled = this.configService.get<boolean>('MAINTENANCE_FEE_ENABLED', true);
      if (!isEnabled) {
        this.logger.log('Maintenance fee generation is disabled');
        return;
      }

      // Phí duy trì hàng tháng (200,000 VNĐ)
      const maintenanceFeeAmount = this.configService.get<number>('MAINTENANCE_FEE_AMOUNT', 200000);

      // Tìm tất cả landlord đang hoạt động
      const landlords = await this.userModel.find({
        role: 'landlord',
        isActive: true,
      }).exec();

      this.logger.log(`Found ${landlords.length} active landlords`);

      // Tạo hóa đơn cho từng landlord
      for (const landlord of landlords) {
        await this.createMaintenanceInvoiceForLandlord(landlord, maintenanceFeeAmount);
      }

      this.logger.log('Monthly maintenance fee generation completed');
    } catch (error) {
      this.logger.error('Error in monthly maintenance fee generation:', error);
    }
  }

  /**
   * Tạo hóa đơn phí duy trì cho một landlord
   */
  private async createMaintenanceInvoiceForLandlord(landlord: User, amount: number): Promise<void> {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Kiểm tra xem đã tạo hóa đơn cho tháng này chưa
      const existingInvoice = await this.invoiceModel.findOne({
        landlordId: landlord.userId,
        invoiceType: 'maintenance_fee',
        createdAt: {
          $gte: new Date(currentYear, currentMonth - 1, 1),
          $lt: new Date(currentYear, currentMonth, 1),
        },
      }).exec();

      if (existingInvoice) {
        this.logger.log(`Maintenance fee invoice already exists for landlord ${landlord.userId} in ${currentMonth}/${currentYear}`);
        return;
      }

      // Tạo hóa đơn phí duy trì
      const invoiceId = await this.getNextInvoiceId();
      const dueDate = new Date(currentYear, currentMonth - 1, 5); // Ngày 5 của tháng hiện tại

      const invoice = new this.invoiceModel({
        invoiceId,
        landlordId: landlord.userId,
        // Không có tenantId, roomId, contractId cho phí duy trì
        invoiceType: 'maintenance_fee',
        amount,
        dueDate,
        status: 'pending',
        description: `Phí duy trì tháng ${currentMonth}/${currentYear} - Phí sử dụng hệ thống`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await invoice.save();
      this.logger.log(`Created maintenance fee invoice ${invoiceId} for landlord ${landlord.userId}`);
    } catch (error) {
      this.logger.error(`Error creating maintenance fee invoice for landlord ${landlord.userId}:`, error);
    }
  }

  /**
   * Lấy ID hóa đơn tiếp theo
   */
  private async getNextInvoiceId(): Promise<number> {
    const lastInvoice = await this.invoiceModel.findOne().sort({ invoiceId: -1 }).exec();
    return lastInvoice ? lastInvoice.invoiceId + 1 : 1;
  }

  /**
   * Manual trigger để tạo hóa đơn phí duy trì (cho testing hoặc admin)
   */
  async manualGenerateMaintenanceInvoices(): Promise<{ message: string; count: number }> {
    this.logger.log('Manual maintenance fee generation triggered');

    const isEnabled = this.configService.get<boolean>('MAINTENANCE_FEE_ENABLED', true);
    if (!isEnabled) {
      throw new Error('Maintenance fee generation is disabled');
    }

    const maintenanceFeeAmount = this.configService.get<number>('MAINTENANCE_FEE_AMOUNT', 200000);
    const landlords = await this.userModel.find({
      role: 'landlord',
      isActive: true,
    }).exec();

    let count = 0;
    for (const landlord of landlords) {
      await this.createMaintenanceInvoiceForLandlord(landlord, maintenanceFeeAmount);
      count++;
    }

    return {
      message: `Generated ${count} maintenance fee invoices`,
      count,
    };
  }
}
