import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { PaymentOrder, PaymentOrderDocument } from '../contracts/schemas/payment-order.schema';
import { Invoice, InvoiceDocument } from '../contracts/schemas/invoice.schema';
import { QrCodeService } from '../../shared/services/qr-code.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(PaymentOrder.name) private paymentOrderModel: Model<PaymentOrderDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    private qrCodeService: QrCodeService,
    private configService: ConfigService,
  ) {}

  /**
   * Tạo QR code thanh toán cho hóa đơn (generic)
   */
  async generatePaymentQR(invoiceId: number): Promise<{
    orderId: string;
    qrCodeUrl: string;
    qrCodeData: string;
    expiryAt: Date;
    amount: number;
  }> {
    try {
      // Lấy thông tin hóa đơn
      const invoice = await this.invoiceModel.findOne({ invoiceId }).exec();
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.status === 'paid') {
        throw new BadRequestException('Invoice already paid');
      }

      // Tạo order ID
      const orderId = `ORD_${Date.now()}_${invoiceId}`;

      // Tạo dữ liệu QR code
      const paymentData = {
        orderId,
        amount: invoice.amount,
        description: invoice.description,
        invoiceId: invoice.invoiceId,
        tenantId: invoice.tenantId,
        landlordId: invoice.landlordId
      };

      // Tạo QR code generic
      const qrResult = await this.qrCodeService.generatePaymentQR(paymentData);

      // Tạo payment order
      const paymentOrder = new this.paymentOrderModel({
        orderId,
        invoiceId: invoice.invoiceId,
        tenantId: invoice.tenantId,
        landlordId: invoice.landlordId,
        amount: invoice.amount,
        orderType: invoice.invoiceType,
        status: 'pending',
        qrCodeUrl: qrResult.qrCodeUrl,
        qrCodeData: qrResult.qrCodeData,
        expiryAt: qrResult.expiryAt,
        isQrGenerated: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await paymentOrder.save();

      return {
        orderId,
        qrCodeUrl: qrResult.qrCodeUrl,
        qrCodeData: qrResult.qrCodeData,
        expiryAt: qrResult.expiryAt,
        amount: invoice.amount
      };
    } catch (error) {
      throw new Error(`Failed to generate payment QR: ${error.message}`);
    }
  }

  /**
   * Kiểm tra trạng thái thanh toán
   */
  async checkPaymentStatus(orderId: string): Promise<{
    orderId: string;
    status: string;
    paidAt?: Date;
    paymentMethod?: string;
  }> {
    try {
      const paymentOrder = await this.paymentOrderModel.findOne({ orderId }).exec();
      if (!paymentOrder) {
        throw new NotFoundException('Payment order not found');
      }

      return {
        orderId: paymentOrder.orderId,
        status: paymentOrder.status,
        paidAt: paymentOrder.paidAt,
        paymentMethod: paymentOrder.paymentMethod
      };
    } catch (error) {
      throw new Error(`Failed to check payment status: ${error.message}`);
    }
  }

  /**
   * Xác nhận thanh toán thành công
   */
  async confirmPayment(orderId: string, paymentMethod: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const paymentOrder = await this.paymentOrderModel.findOne({ orderId }).exec();
      if (!paymentOrder) {
        throw new NotFoundException('Payment order not found');
      }

      if (paymentOrder.status === 'paid') {
        return {
          success: true,
          message: 'Payment already confirmed'
        };
      }

      // Cập nhật trạng thái payment order
      await this.paymentOrderModel.findOneAndUpdate(
        { orderId },
        {
          status: 'paid',
          paymentMethod,
          paidAt: new Date(),
          updatedAt: new Date()
        }
      ).exec();

      // Cập nhật trạng thái hóa đơn
      await this.invoiceModel.findOneAndUpdate(
        { invoiceId: paymentOrder.invoiceId },
        {
          status: 'paid',
          paymentMethod,
          paidDate: new Date(),
          updatedAt: new Date()
        }
      ).exec();

      return {
        success: true,
        message: 'Payment confirmed successfully'
      };
    } catch (error) {
      throw new Error(`Failed to confirm payment: ${error.message}`);
    }
  }

  /**
   * Lấy danh sách hóa đơn cần thanh toán của user
   */
  async getPendingInvoices(tenantId: number): Promise<{
    invoiceId: number;
    amount: number;
    dueDate: Date;
    invoiceType: string;
    roomNumber: string;
    isQrGenerated: boolean;
    canPay: boolean;
  }[]> {
    try {
      const invoices = await this.invoiceModel.find({
        tenantId,
        status: 'pending'
      }).exec();

      const result: any[] = [];
      for (const invoice of invoices) {
        // Kiểm tra xem đã có QR code chưa
        const existingOrder = await this.paymentOrderModel.findOne({
          invoiceId: invoice.invoiceId,
          status: 'pending'
        }).exec();

        result.push({
          invoiceId: invoice.invoiceId,
          amount: invoice.amount,
          dueDate: invoice.dueDate,
          invoiceType: invoice.invoiceType,
          roomNumber: 'A101', // TODO: Lấy từ room info
          isQrGenerated: !!existingOrder,
          canPay: true
        });
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to get pending invoices: ${error.message}`);
    }
  }

  /**
   * Lấy thông tin payment order
   */
  async getPaymentOrder(orderId: string): Promise<PaymentOrder> {
    try {
      const paymentOrder = await this.paymentOrderModel.findOne({ orderId }).exec();
      if (!paymentOrder) {
        throw new NotFoundException('Payment order not found');
      }
      return paymentOrder;
    } catch (error) {
      throw new Error(`Failed to get payment order: ${error.message}`);
    }
  }

  /**
   * Hủy payment order
   */
  async cancelPaymentOrder(orderId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const paymentOrder = await this.paymentOrderModel.findOne({ orderId }).exec();
      if (!paymentOrder) {
        throw new NotFoundException('Payment order not found');
      }

      if (paymentOrder.status === 'paid') {
        throw new BadRequestException('Cannot cancel paid order');
      }

      await this.paymentOrderModel.findOneAndUpdate(
        { orderId },
        {
          status: 'cancelled',
          updatedAt: new Date()
        }
      ).exec();

      return {
        success: true,
        message: 'Payment order cancelled successfully'
      };
    } catch (error) {
      throw new Error(`Failed to cancel payment order: ${error.message}`);
    }
  }

  /**
   * Kiểm tra QR code có hết hạn không
   */
  async isQRCodeExpired(orderId: string): Promise<boolean> {
    try {
      const paymentOrder = await this.paymentOrderModel.findOne({ orderId }).exec();
      if (!paymentOrder) {
        return true;
      }

      return this.qrCodeService.isQRCodeExpired(paymentOrder.expiryAt || new Date());
    } catch (error) {
      throw new Error(`Failed to check QR code expiry: ${error.message}`);
    }
  }

  /**
   * Tạo QR code mới cho payment order hết hạn
   */
  async regenerateQRCode(orderId: string): Promise<{
    qrCodeUrl: string;
    qrCodeData: string;
    expiryAt: Date;
  }> {
    try {
      const paymentOrder = await this.paymentOrderModel.findOne({ orderId }).exec();
      if (!paymentOrder) {
        throw new NotFoundException('Payment order not found');
      }

      if (paymentOrder.status === 'paid') {
        throw new BadRequestException('Cannot regenerate QR for paid order');
      }

      // Tạo QR code mới
      const paymentData = {
        orderId: paymentOrder.orderId,
        amount: paymentOrder.amount,
        description: `Thanh toán hóa đơn #${paymentOrder.invoiceId}`,
        invoiceId: paymentOrder.invoiceId,
        tenantId: paymentOrder.tenantId,
        landlordId: paymentOrder.landlordId
      };

      const qrResult = await this.qrCodeService.generateZaloPayQR({
        ...paymentData,
        zalopayOrderId: `ZP_${Date.now()}`
      });

      // Cập nhật payment order
      await this.paymentOrderModel.findOneAndUpdate(
        { orderId },
        {
          qrCodeUrl: qrResult.qrCodeUrl,
          qrCodeData: qrResult.qrCodeData,
          expiryAt: qrResult.expiryAt,
          updatedAt: new Date()
        }
      ).exec();

      return {
        qrCodeUrl: qrResult.qrCodeUrl,
        qrCodeData: qrResult.qrCodeData,
        expiryAt: qrResult.expiryAt
      };
    } catch (error) {
      throw new Error(`Failed to regenerate QR code: ${error.message}`);
    }
  }

  /**
   * Tạo QR code thanh toán ZaloPay cho hóa đơn
   */
  async generateZaloPayQR(invoiceId: number): Promise<{
    orderId: string;
    qrCodeUrl: string;
    qrCodeData: string;
    expiryAt: Date;
    amount: number;
    zalopayResponse?: any;
  }> {
    try {
      // Lấy thông tin hóa đơn
      const invoice = await this.invoiceModel.findOne({ invoiceId }).exec();
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.status === 'paid') {
        throw new BadRequestException('Invoice already paid');
      }

      // Tạo order ID
      const orderId = `ORD_${Date.now()}_${invoiceId}`;

      // Tạo dữ liệu QR code ZaloPay
      const paymentData = {
        orderId,
        amount: invoice.amount,
        description: `Thanh toán hóa đơn #${invoice.invoiceId}`,
        zalopayOrderId: `ZP_${Date.now()}`
      };

      // Tạo QR code ZaloPay
      const qrResult = await this.qrCodeService.generateZaloPayQR(paymentData);

      // Tạo payment order
      const paymentOrder = new this.paymentOrderModel({
        orderId,
        invoiceId: invoice.invoiceId,
        tenantId: invoice.tenantId,
        landlordId: invoice.landlordId,
        amount: invoice.amount,
        orderType: invoice.invoiceType,
        status: 'pending',
        qrCodeUrl: qrResult.qrCodeUrl,
        qrCodeData: qrResult.qrCodeData,
        expiryAt: qrResult.expiryAt,
        isQrGenerated: true,
        paymentMethod: 'zalopay',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await paymentOrder.save();

      return {
        orderId,
        qrCodeUrl: qrResult.qrCodeUrl,
        qrCodeData: qrResult.qrCodeData,
        expiryAt: qrResult.expiryAt,
        amount: invoice.amount,
        zalopayResponse: qrResult.zalopayResponse
      };
    } catch (error) {
      throw new Error(`Failed to generate ZaloPay QR: ${error.message}`);
    }
  }
}
