import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { RentalContract, RentalContractDocument } from '../../modules/contracts/schemas/rental-contract.schema';
import { Invoice, InvoiceDocument } from '../../modules/contracts/schemas/invoice.schema';
import { PaymentOrder, PaymentOrderDocument } from '../../modules/contracts/schemas/payment-order.schema';

@Injectable()
export class MonthlyInvoiceService {
  private readonly logger = new Logger(MonthlyInvoiceService.name);

  constructor(
    @InjectModel(RentalContract.name) private contractModel: Model<RentalContractDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(PaymentOrder.name) private paymentOrderModel: Model<PaymentOrderDocument>,
    private configService: ConfigService,
  ) {}

  /**
   * Cron job chạy hàng tháng để tạo hóa đơn
   */
  @Cron('0 9 1 * *') // Chạy vào 9h sáng ngày 1 hàng tháng
  async generateMonthlyInvoices() {
    try {
      this.logger.log('Starting monthly invoice generation...');

      // Kiểm tra xem có bật tự động tạo hóa đơn không
      const isEnabled = this.configService.get<boolean>('MONTHLY_INVOICE_ENABLED', true);
      if (!isEnabled) {
        this.logger.log('Monthly invoice generation is disabled');
        return;
      }

      // Tìm tất cả hợp đồng đang hoạt động
      const activeContracts = await this.contractModel.find({
        status: 'active',
        endDate: { $gt: new Date() }
      }).exec();

      this.logger.log(`Found ${activeContracts.length} active contracts`);

      // Tạo hóa đơn cho từng hợp đồng
      for (const contract of activeContracts) {
        await this.createMonthlyInvoiceForContract(contract);
      }

      this.logger.log('Monthly invoice generation completed');
    } catch (error) {
      this.logger.error('Error in monthly invoice generation:', error);
    }
  }

  /**
   * Tạo hóa đơn hàng tháng cho một hợp đồng
   */
  private async createMonthlyInvoiceForContract(contract: RentalContract): Promise<void> {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // Kiểm tra xem đã tạo hóa đơn cho tháng này chưa
      const existingInvoice = await this.invoiceModel.findOne({
        contractId: contract.contractId,
        invoiceType: 'rent',
        createdAt: {
          $gte: new Date(currentYear, currentMonth - 1, 1),
          $lt: new Date(currentYear, currentMonth, 1)
        }
      }).exec();

      if (existingInvoice) {
        this.logger.log(`Invoice already exists for contract ${contract.contractId} in ${currentMonth}/${currentYear}`);
        return;
      }

      // Tạo hóa đơn cho từng người thuê
      for (const tenant of contract.tenants) {
        if (tenant.status === 'active') {
          await this.createInvoiceForTenant(contract, tenant, currentMonth, currentYear);
        }
      }
    } catch (error) {
      this.logger.error(`Error creating invoice for contract ${contract.contractId}:`, error);
    }
  }

  /**
   * Tạo hóa đơn cho một người thuê
   */
  private async createInvoiceForTenant(
    contract: RentalContract,
    tenant: any,
    month: number,
    year: number
  ): Promise<void> {
    try {
      // Tính ngày đến hạn
      const dueDay = this.configService.get<number>('MONTHLY_INVOICE_DUE_DAY', 15);
      const dueDate = new Date(year, month - 1, dueDay);

      // Tạo hóa đơn
      const invoiceId = await this.getNextInvoiceId();
      const invoice = new this.invoiceModel({
        invoiceId,
        tenantId: tenant.tenantId,
        landlordId: contract.landlordId,
        roomId: contract.roomId,
        contractId: contract.contractId,
        invoiceType: 'rent',
        amount: tenant.monthlyRent,
        dueDate,
        status: 'pending',
        description: `Tiền thuê phòng tháng ${month}/${year}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await invoice.save();

      this.logger.log(`Created invoice ${invoiceId} for tenant ${tenant.tenantId}`);
    } catch (error) {
      this.logger.error(`Error creating invoice for tenant ${tenant.tenantId}:`, error);
    }
  }

  /**
   * Tạo hóa đơn thanh toán tiền đầu
   */
  async createInitialPaymentInvoice(contract: RentalContract, tenant: any): Promise<Invoice> {
    try {
      const invoiceId = await this.getNextInvoiceId();
      const totalAmount = tenant.monthlyRent + tenant.deposit;

      const invoice = new this.invoiceModel({
        invoiceId,
        tenantId: tenant.tenantId,
        landlordId: contract.landlordId,
        roomId: contract.roomId,
        contractId: contract.contractId,
        invoiceType: 'initial_payment',
        amount: totalAmount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
        status: 'pending',
        description: `Thanh toán tiền đầu: tiền thuê + tiền cọc`,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return await invoice.save();
    } catch (error) {
      this.logger.error(`Error creating initial payment invoice:`, error);
      throw error;
    }
  }

  /**
   * Tạo hóa đơn tiền cọc
   */
  async createDepositInvoice(contract: RentalContract, tenant: any): Promise<Invoice> {
    try {
      const invoiceId = await this.getNextInvoiceId();

      const invoice = new this.invoiceModel({
        invoiceId,
        tenantId: tenant.tenantId,
        landlordId: contract.landlordId,
        roomId: contract.roomId,
        contractId: contract.contractId,
        invoiceType: 'deposit',
        amount: tenant.deposit,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
        status: 'pending',
        description: `Tiền cọc phòng`,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return await invoice.save();
    } catch (error) {
      this.logger.error(`Error creating deposit invoice:`, error);
      throw error;
    }
  }

  /**
   * Tạo hóa đơn tiền điện nước
   */
  async createUtilitiesInvoice(
    contract: RentalContract,
    tenant: any,
    amount: number,
    description: string
  ): Promise<Invoice> {
    try {
      const invoiceId = await this.getNextInvoiceId();

      const invoice = new this.invoiceModel({
        invoiceId,
        tenantId: tenant.tenantId,
        landlordId: contract.landlordId,
        roomId: contract.roomId,
        contractId: contract.contractId,
        invoiceType: 'utilities',
        amount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
        status: 'pending',
        description,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return await invoice.save();
    } catch (error) {
      this.logger.error(`Error creating utilities invoice:`, error);
      throw error;
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
   * Kiểm tra và tạo hóa đơn cho hợp đồng mới
   */
  async createInvoicesForNewContract(contract: RentalContract): Promise<void> {
    try {
      for (const tenant of contract.tenants) {
        if (tenant.status === 'active') {
          // Tạo hóa đơn thanh toán tiền đầu
          await this.createInitialPaymentInvoice(contract, tenant);
        }
      }
    } catch (error) {
      this.logger.error(`Error creating invoices for new contract:`, error);
      throw error;
    }
  }
}
