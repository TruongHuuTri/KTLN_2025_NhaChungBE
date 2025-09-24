import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { RentalContract, RentalContractDocument } from '../../modules/contracts/schemas/rental-contract.schema';
import { Invoice, InvoiceDocument } from '../../modules/contracts/schemas/invoice.schema';
import { PaymentOrder, PaymentOrderDocument } from '../../modules/contracts/schemas/payment-order.schema';
import { UtilityType, UTILITY_LABELS } from '../types/utilities.types';

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
   * Tạo hóa đơn tiền điện nước dựa trên thông tin phòng
   */
  async createUtilitiesInvoice(
    contract: RentalContract,
    tenant: any,
    roomInfo: any,
    usageData?: {
      electricityKwh?: number;
      waterM3?: number;
      waterPersons?: number;
    }
  ): Promise<Invoice> {
    try {
      const invoiceId = await this.getNextInvoiceId();
      let totalAmount = 0;
      let description = '';

      // Tính phí điện
      if (roomInfo.utilities?.electricityPricePerKwh > 0 && usageData?.electricityKwh) {
        const electricityFee = roomInfo.utilities.electricityPricePerKwh * usageData.electricityKwh;
        totalAmount += electricityFee;
        description += `Điện: ${usageData.electricityKwh}kWh x ${roomInfo.utilities.electricityPricePerKwh} = ${electricityFee.toLocaleString()} VNĐ\n`;
      }

      // Tính phí nước
      if (roomInfo.utilities?.waterPrice > 0) {
        let waterFee = 0;
        if (roomInfo.utilities.waterBillingType === 'per_m3' && usageData?.waterM3) {
          waterFee = roomInfo.utilities.waterPrice * usageData.waterM3;
          description += `Nước: ${usageData.waterM3}m³ x ${roomInfo.utilities.waterPrice} = ${waterFee.toLocaleString()} VNĐ\n`;
        } else if (roomInfo.utilities.waterBillingType === 'per_person' && usageData?.waterPersons) {
          waterFee = roomInfo.utilities.waterPrice * usageData.waterPersons;
          description += `Nước: ${usageData.waterPersons} người x ${roomInfo.utilities.waterPrice} = ${waterFee.toLocaleString()} VNĐ\n`;
        }
        totalAmount += waterFee;
      }

      // Tính phí internet
      if (roomInfo.utilities?.internetFee > 0 && !roomInfo.utilities.includedInRent?.internet) {
        totalAmount += roomInfo.utilities.internetFee;
        description += `Internet: ${roomInfo.utilities.internetFee.toLocaleString()} VNĐ\n`;
      }

      // Tính phí rác
      if (roomInfo.utilities?.garbageFee > 0 && !roomInfo.utilities.includedInRent?.garbage) {
        totalAmount += roomInfo.utilities.garbageFee;
        description += `Rác: ${roomInfo.utilities.garbageFee.toLocaleString()} VNĐ\n`;
      }

      // Tính phí dọn dẹp
      if (roomInfo.utilities?.cleaningFee > 0 && !roomInfo.utilities.includedInRent?.cleaning) {
        totalAmount += roomInfo.utilities.cleaningFee;
        description += `Dọn dẹp: ${roomInfo.utilities.cleaningFee.toLocaleString()} VNĐ\n`;
      }

      // Tính phí gửi xe máy
      if (roomInfo.utilities?.parkingMotorbikeFee > 0 && !roomInfo.utilities.includedInRent?.parkingMotorbike) {
        totalAmount += roomInfo.utilities.parkingMotorbikeFee;
        description += `Gửi xe máy: ${roomInfo.utilities.parkingMotorbikeFee.toLocaleString()} VNĐ\n`;
      }

      // Tính phí gửi xe ô tô
      if (roomInfo.utilities?.parkingCarFee > 0 && !roomInfo.utilities.includedInRent?.parkingCar) {
        totalAmount += roomInfo.utilities.parkingCarFee;
        description += `Gửi xe ô tô: ${roomInfo.utilities.parkingCarFee.toLocaleString()} VNĐ\n`;
      }

      // Tính phí quản lý
      if (roomInfo.utilities?.managementFee > 0 && !roomInfo.utilities.includedInRent?.managementFee) {
        let managementFee = roomInfo.utilities.managementFee;
        if (roomInfo.utilities.managementFeeUnit === 'per_m2_per_month') {
          managementFee = roomInfo.utilities.managementFee * roomInfo.area;
        }
        totalAmount += managementFee;
        description += `Quản lý: ${managementFee.toLocaleString()} VNĐ\n`;
      }

      const invoice = new this.invoiceModel({
        invoiceId,
        tenantId: tenant.tenantId,
        landlordId: contract.landlordId,
        roomId: contract.roomId,
        contractId: contract.contractId,
        invoiceType: 'utilities',
        amount: totalAmount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
        status: 'pending',
        description: description.trim(),
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
   * Tạo hóa đơn tiện ích hàng tháng dựa trên thông tin phòng
   */
  async createMonthlyUtilitiesInvoice(
    contract: RentalContract,
    tenant: any,
    roomInfo: any,
    usageData?: {
      electricityKwh?: number;
      waterM3?: number;
      waterPersons?: number;
    }
  ): Promise<Invoice | null> {
    try {
      // Kiểm tra xem có phí tiện ích nào cần tính không
      const hasUtilities = roomInfo.utilities && (
        (roomInfo.utilities.electricityPricePerKwh > 0 && usageData?.electricityKwh) ||
        (roomInfo.utilities.waterPrice > 0 && (usageData?.waterM3 || usageData?.waterPersons)) ||
        (roomInfo.utilities.internetFee > 0 && !roomInfo.utilities.includedInRent?.internet) ||
        (roomInfo.utilities.garbageFee > 0 && !roomInfo.utilities.includedInRent?.garbage) ||
        (roomInfo.utilities.cleaningFee > 0 && !roomInfo.utilities.includedInRent?.cleaning) ||
        (roomInfo.utilities.parkingMotorbikeFee > 0 && !roomInfo.utilities.includedInRent?.parkingMotorbike) ||
        (roomInfo.utilities.parkingCarFee > 0 && !roomInfo.utilities.includedInRent?.parkingCar) ||
        (roomInfo.utilities.managementFee > 0 && !roomInfo.utilities.includedInRent?.managementFee)
      );

      if (!hasUtilities) {
        this.logger.log(`No utilities fees for tenant ${tenant.tenantId}`);
        return null;
      }

      return await this.createUtilitiesInvoice(contract, tenant, roomInfo, usageData);
    } catch (error) {
      this.logger.error(`Error creating monthly utilities invoice:`, error);
      throw error;
    }
  }

  /**
   * Tạo hóa đơn tiện ích ước tính (khi không có dữ liệu sử dụng)
   */
  async createEstimatedUtilitiesInvoice(
    contract: RentalContract,
    tenant: any,
    roomInfo: any
  ): Promise<Invoice | null> {
    try {
      // Sử dụng ước tính từ phòng
      const estimatedAmount = roomInfo.estimatedMonthlyUtilities || 0;
      
      if (estimatedAmount <= 0) {
        this.logger.log(`No estimated utilities for tenant ${tenant.tenantId}`);
        return null;
      }

      const invoiceId = await this.getNextInvoiceId();
      const invoice = new this.invoiceModel({
        invoiceId,
        tenantId: tenant.tenantId,
        landlordId: contract.landlordId,
        roomId: contract.roomId,
        contractId: contract.contractId,
        invoiceType: 'utilities',
        amount: estimatedAmount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
        status: 'pending',
        description: `Tiện ích ước tính tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return await invoice.save();
    } catch (error) {
      this.logger.error(`Error creating estimated utilities invoice:`, error);
      throw error;
    }
  }

  /**
   * Tạo hóa đơn tiện ích dựa trên mảng availableUtilities
   */
  async createUtilitiesInvoiceFromAvailable(
    contract: RentalContract,
    tenant: any,
    roomInfo: any,
    usageData?: {
      electricityKwh?: number;
      waterM3?: number;
      waterPersons?: number;
    }
  ): Promise<Invoice | null> {
    try {
      if (!roomInfo.availableUtilities || roomInfo.availableUtilities.length === 0) {
        this.logger.log(`No available utilities for tenant ${tenant.tenantId}`);
        return null;
      }

      const invoiceId = await this.getNextInvoiceId();
      let totalAmount = 0;
      let description = '';

      // Tính phí cho từng tiện ích có sẵn
      for (const utility of roomInfo.availableUtilities) {
        let utilityFee = 0;
        let utilityDescription = '';

        switch (utility) {
          case UtilityType.ELECTRICITY:
            if (roomInfo.utilities?.electricityPricePerKwh > 0 && usageData?.electricityKwh) {
              utilityFee = roomInfo.utilities.electricityPricePerKwh * usageData.electricityKwh;
              utilityDescription = `Điện: ${usageData.electricityKwh}kWh x ${roomInfo.utilities.electricityPricePerKwh} = ${utilityFee.toLocaleString()} VNĐ`;
            }
            break;

          case UtilityType.WATER:
            if (roomInfo.utilities?.waterPrice > 0) {
              if (roomInfo.utilities.waterBillingType === 'per_m3' && usageData?.waterM3) {
                utilityFee = roomInfo.utilities.waterPrice * usageData.waterM3;
                utilityDescription = `Nước: ${usageData.waterM3}m³ x ${roomInfo.utilities.waterPrice} = ${utilityFee.toLocaleString()} VNĐ`;
              } else if (roomInfo.utilities.waterBillingType === 'per_person' && usageData?.waterPersons) {
                utilityFee = roomInfo.utilities.waterPrice * usageData.waterPersons;
                utilityDescription = `Nước: ${usageData.waterPersons} người x ${roomInfo.utilities.waterPrice} = ${utilityFee.toLocaleString()} VNĐ`;
              }
            }
            break;

          case UtilityType.INTERNET:
            if (roomInfo.utilities?.internetFee > 0 && !roomInfo.utilities.includedInRent?.internet) {
              utilityFee = roomInfo.utilities.internetFee;
              utilityDescription = `Internet: ${utilityFee.toLocaleString()} VNĐ`;
            }
            break;

          case UtilityType.GARBAGE:
            if (roomInfo.utilities?.garbageFee > 0 && !roomInfo.utilities.includedInRent?.garbage) {
              utilityFee = roomInfo.utilities.garbageFee;
              utilityDescription = `Rác: ${utilityFee.toLocaleString()} VNĐ`;
            }
            break;

          case UtilityType.CLEANING:
            if (roomInfo.utilities?.cleaningFee > 0 && !roomInfo.utilities.includedInRent?.cleaning) {
              utilityFee = roomInfo.utilities.cleaningFee;
              utilityDescription = `Dọn dẹp: ${utilityFee.toLocaleString()} VNĐ`;
            }
            break;

          case UtilityType.PARKING_MOTORBIKE:
            if (roomInfo.utilities?.parkingMotorbikeFee > 0 && !roomInfo.utilities.includedInRent?.parkingMotorbike) {
              utilityFee = roomInfo.utilities.parkingMotorbikeFee;
              utilityDescription = `Gửi xe máy: ${utilityFee.toLocaleString()} VNĐ`;
            }
            break;

          case UtilityType.PARKING_CAR:
            if (roomInfo.utilities?.parkingCarFee > 0 && !roomInfo.utilities.includedInRent?.parkingCar) {
              utilityFee = roomInfo.utilities.parkingCarFee;
              utilityDescription = `Gửi xe ô tô: ${utilityFee.toLocaleString()} VNĐ`;
            }
            break;

          case UtilityType.MANAGEMENT:
            if (roomInfo.utilities?.managementFee > 0 && !roomInfo.utilities.includedInRent?.managementFee) {
              utilityFee = roomInfo.utilities.managementFee;
              if (roomInfo.utilities.managementFeeUnit === 'per_m2_per_month') {
                utilityFee = roomInfo.utilities.managementFee * roomInfo.area;
              }
              utilityDescription = `Quản lý: ${utilityFee.toLocaleString()} VNĐ`;
            }
            break;

          default:
            // Các tiện ích khác có thể có giá cố định
            utilityDescription = `${UTILITY_LABELS[utility]}: Miễn phí`;
            break;
        }

        if (utilityFee > 0) {
          totalAmount += utilityFee;
          description += `${utilityDescription}\n`;
        }
      }

      if (totalAmount <= 0) {
        this.logger.log(`No utilities fees for tenant ${tenant.tenantId}`);
        return null;
      }

      const invoice = new this.invoiceModel({
        invoiceId,
        tenantId: tenant.tenantId,
        landlordId: contract.landlordId,
        roomId: contract.roomId,
        contractId: contract.contractId,
        invoiceType: 'utilities',
        amount: totalAmount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
        status: 'pending',
        description: description.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return await invoice.save();
    } catch (error) {
      this.logger.error(`Error creating utilities invoice from available:`, error);
      throw error;
    }
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
