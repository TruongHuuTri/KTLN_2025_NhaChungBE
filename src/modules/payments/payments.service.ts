import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { PaymentOrder, PaymentOrderDocument } from '../contracts/schemas/payment-order.schema';
import { Invoice, InvoiceDocument } from '../contracts/schemas/invoice.schema';
import { RentalRequest, RentalRequestDocument } from '../contracts/schemas/rental-request.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Room, RoomDocument } from '../rooms/schemas/room.schema';
import { Building, BuildingDocument } from '../rooms/schemas/building.schema';
import { QrCodeService } from '../../shared/services/qr-code.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(PaymentOrder.name) private paymentOrderModel: Model<PaymentOrderDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(RentalRequest.name) private rentalRequestModel: Model<RentalRequestDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Building.name) private buildingModel: Model<BuildingDocument>,
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
    isZaloPayQR?: boolean;
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
        paymentMethod: 'zalopay',
        zalopayOrderId: qrResult.zaloPayOrderId, // Lưu ZaloPay order ID
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
        isZaloPayQR: !!qrResult.zaloPayOrderId && qrResult.zaloPayOrderId.startsWith('ZP')
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
    const paymentOrder = await this.paymentOrderModel.findOne({ orderId }).exec();
    if (!paymentOrder) {
      throw new NotFoundException(`Payment order with ID ${orderId} not found`);
    }

    return {
      orderId: paymentOrder.orderId,
      status: paymentOrder.status,
      paidAt: paymentOrder.paidAt,
      paymentMethod: paymentOrder.paymentMethod
    };
  }

  /**
   * Debug: Lấy tất cả payment orders
   */
  async getAllPaymentOrders(): Promise<any[]> {
    return await this.paymentOrderModel.find({}).sort({ createdAt: -1 }).exec();
  }

  /**
   * Tìm payment order theo ZaloPay order ID
   */
  async findPaymentOrderByZaloPayId(zaloPayOrderId: string): Promise<any> {
    // Tìm theo zalopayOrderId
    let paymentOrder = await this.paymentOrderModel.findOne({ zalopayOrderId: zaloPayOrderId }).exec();
    
    if (paymentOrder) {
      return paymentOrder;
    }
    
    // Nếu không tìm thấy, tìm theo pattern orderId (vì payment orders cũ có thể không có zalopayOrderId)
    // ZaloPay app_trans_id format: YYMMDD_xxxxxx
    // Order ID format: ORD_timestamp_invoiceId
    // Tìm payment order được tạo gần đây nhất (trong 1 giờ qua)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    paymentOrder = await this.paymentOrderModel
      .findOne({ 
        createdAt: { $gte: oneHourAgo },
        status: 'pending'
      })
      .sort({ createdAt: -1 })
      .exec();
    
    if (paymentOrder) {
      return paymentOrder;
    }
    
    return null;
  }

  /**
   * Cập nhật trạng thái payment order
   */
  async updatePaymentOrderStatus(orderId: string, status: string): Promise<any> {
    return await this.paymentOrderModel.findOneAndUpdate(
      { orderId },
      { status, updatedAt: new Date() },
      { new: true }
    ).exec();
  }

  /**
   * Tìm payment order gần đây nhất (pending)
   */
  async findRecentPendingOrder(): Promise<any> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return await this.paymentOrderModel
      .findOne({ 
        status: 'pending',
        createdAt: { $gte: oneHourAgo }
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Cập nhật zalopayOrderId cho payment order
   */
  async updatePaymentOrderZaloPayId(orderId: string, zalopayOrderId: string): Promise<any> {
    return await this.paymentOrderModel.findOneAndUpdate(
      { orderId },
      { zalopayOrderId, updatedAt: new Date() },
      { new: true }
    ).exec();
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

      // Nếu là thanh toán đặt cọc hoặc tiền thuê đầu tiên, thêm tenant vào room
      if (paymentOrder.orderType === 'initial_payment' || paymentOrder.orderType === 'deposit') {
        await this.autoAddTenantToRoomAfterPayment(paymentOrder);
      }

      return {
        success: true,
        message: 'Payment confirmed successfully'
      };
    } catch (error) {
      throw new Error(`Failed to confirm payment: ${error.message}`);
    }
  }

  /**
   * Tự động thêm tenant vào room sau khi thanh toán thành công
   */
  private async autoAddTenantToRoomAfterPayment(paymentOrder: PaymentOrder): Promise<void> {
    try {
      // Tìm rental request từ invoice
      const invoice = await this.invoiceModel.findOne({ invoiceId: paymentOrder.invoiceId }).exec();
      if (!invoice) {
        console.error('Invoice not found for payment order:', paymentOrder.orderId);
        return;
      }

      // Tìm rental request từ contractId trong invoice
      const rentalRequest = await this.rentalRequestModel.findOne({ contractId: invoice.contractId }).exec();
      if (!rentalRequest) {
        console.error('Rental request not found for contract:', invoice.contractId);
        return;
      }

      // Kiểm tra xem tenant đã được thêm vào room chưa
      const room = await this.roomModel.findOne({ roomId: rentalRequest.roomId }).exec();
      if (!room) {
        console.error('Room not found:', rentalRequest.roomId);
        return;
      }

      const existingTenant = room.currentTenants.find(t => t.userId === rentalRequest.tenantId);
      if (existingTenant) {
        return;
      }

      // Lấy thông tin user
      const user = await this.userModel.findOne({ userId: rentalRequest.tenantId }).exec();
      if (!user) {
        console.error('User not found:', rentalRequest.tenantId);
        return;
      }

      // Tạo tenant data cho room
      const tenantData = {
        userId: rentalRequest.tenantId,
        fullName: user.name,
        dateOfBirth: new Date(), // Có thể cần lấy từ user profile
        gender: 'unknown', // Có thể cần lấy từ user profile
        occupation: 'unknown', // Có thể cần lấy từ user profile
        moveInDate: rentalRequest.requestedMoveInDate,
        lifestyle: 'unknown', // Có thể cần lấy từ user profile
        cleanliness: 'unknown' // Có thể cần lấy từ user profile
      };

      // Cập nhật room occupancy
      await this.roomModel.findOneAndUpdate(
        { roomId: rentalRequest.roomId },
        {
          $push: { currentTenants: tenantData },
          $inc: { currentOccupants: 1 },
          $set: { 
            availableSpots: room.maxOccupancy - (room.currentOccupants + 1),
            canShare: true, // Cho phép ở ghép khi có tenant
            updatedAt: new Date()
          }
        }
      ).exec();

    } catch (error) {
      console.error('Error auto-adding tenant to room after payment:', error);
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

        // Lấy thông tin phòng - xử lý cả ObjectId và number
        let room;
        try {
          // Thử tìm với ObjectId trước
          room = await this.roomModel.findById(invoice.roomId).exec();
        } catch (error) {
          // Nếu lỗi ObjectId, thử tìm với roomNumber
          room = await this.roomModel.findOne({ roomNumber: invoice.roomId.toString() }).exec();
        }
        
        if (!room) {
          // Fallback: tìm với roomNumber nếu vẫn không tìm thấy
          room = await this.roomModel.findOne({ roomNumber: invoice.roomId.toString() }).exec();
        }
        
        const building = room ? await this.buildingModel.findById(room.buildingId).exec() : null;

        result.push({
          invoiceId: invoice.invoiceId,
          amount: invoice.amount,
          dueDate: invoice.dueDate,
          invoiceType: invoice.invoiceType,
          roomNumber: room ? `${building?.name || 'Building'} - Phòng ${room.roomNumber}` : 'N/A',
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
   * Lấy danh sách hóa đơn đã thanh toán của user
   */
  async getPaidInvoices(tenantId: number): Promise<{
    invoiceId: number;
    amount: number;
    paidDate: Date;
    invoiceType: string;
    roomNumber: string;
    paymentMethod: string;
    description: string;
    items: any[];
  }[]> {
    try {
      const invoices = await this.invoiceModel.find({
        tenantId,
        status: 'paid'
      }).sort({ paidDate: -1 }).exec();

      const result: any[] = [];
      for (const invoice of invoices) {
        // Lấy thông tin phòng - xử lý cả ObjectId và number
        let room;
        try {
          // Thử tìm với ObjectId trước
          room = await this.roomModel.findById(invoice.roomId).exec();
        } catch (error) {
          // Nếu lỗi ObjectId, thử tìm với roomNumber
          room = await this.roomModel.findOne({ roomNumber: invoice.roomId.toString() }).exec();
        }
        
        if (!room) {
          // Fallback: tìm với roomNumber nếu vẫn không tìm thấy
          room = await this.roomModel.findOne({ roomNumber: invoice.roomId.toString() }).exec();
        }
        
        const building = room ? await this.buildingModel.findById(room.buildingId).exec() : null;
        
        result.push({
          invoiceId: invoice.invoiceId,
          amount: invoice.amount,
          paidDate: invoice.paidDate,
          invoiceType: invoice.invoiceType,
          roomNumber: room ? `${building?.name || 'Building'} - Phòng ${room.roomNumber}` : 'N/A',
          paymentMethod: invoice.paymentMethod || 'unknown',
          description: invoice.description,
          items: invoice.items || []
        });
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to get paid invoices: ${error.message}`);
    }
  }

  /**
   * Lấy lịch sử thanh toán của user (tất cả hóa đơn)
   */
  async getPaymentHistory(tenantId: number): Promise<{
    invoiceId: number;
    amount: number;
    status: string;
    dueDate: Date;
    paidDate?: Date;
    invoiceType: string;
    roomNumber: string;
    paymentMethod?: string;
    description: string;
    items: any[];
    canPay: boolean;
  }[]> {
    try {
      const invoices = await this.invoiceModel.find({
        tenantId
      }).sort({ createdAt: -1 }).exec();

      const result: any[] = [];
      for (const invoice of invoices) {
        // Lấy thông tin phòng - xử lý cả ObjectId và number
        let room;
        try {
          // Thử tìm với ObjectId trước
          room = await this.roomModel.findById(invoice.roomId).exec();
        } catch (error) {
          // Nếu lỗi ObjectId, thử tìm với roomNumber
          room = await this.roomModel.findOne({ roomNumber: invoice.roomId.toString() }).exec();
        }
        
        if (!room) {
          // Fallback: tìm với roomNumber nếu vẫn không tìm thấy
          room = await this.roomModel.findOne({ roomNumber: invoice.roomId.toString() }).exec();
        }
        
        const building = room ? await this.buildingModel.findById(room.buildingId).exec() : null;
        
        // Kiểm tra xem có thể thanh toán không
        const canPay = invoice.status === 'pending' && new Date() <= new Date(invoice.dueDate);
        
        result.push({
          invoiceId: invoice.invoiceId,
          amount: invoice.amount,
          status: invoice.status,
          dueDate: invoice.dueDate,
          paidDate: invoice.paidDate,
          invoiceType: invoice.invoiceType,
          roomNumber: room ? `${building?.name || 'Building'} - Phòng ${room.roomNumber}` : 'N/A',
          paymentMethod: invoice.paymentMethod,
          description: invoice.description,
          items: invoice.items || [],
          canPay
        });
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to get payment history: ${error.message}`);
    }
  }

  /**
   * Kiểm tra trạng thái hóa đơn của phòng
   */
  async getRoomPaymentStatus(tenantId: number, roomId: number): Promise<{
    roomId: number;
    roomNumber: string;
    buildingName: string;
    totalInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    paymentStatus: 'fully_paid' | 'partial_paid' | 'not_paid' | 'overdue';
    latestInvoice?: {
      invoiceId: number;
      amount: number;
      status: string;
      dueDate: Date;
      paidDate?: Date;
      invoiceType: string;
    };
  }> {
    try {
      // Lấy thông tin phòng
      let room;
      try {
        room = await this.roomModel.findById(roomId).exec();
      } catch (error) {
        room = await this.roomModel.findOne({ roomNumber: roomId.toString() }).exec();
      }
      
      const building = room ? await this.buildingModel.findById(room.buildingId).exec() : null;
      
      // Lấy tất cả hóa đơn của user cho phòng này
      const invoices = await this.invoiceModel.find({
        tenantId,
        roomId: roomId
      }).sort({ dueDate: -1 }).exec();

      // Thống kê
      const totalInvoices = invoices.length;
      const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
      const pendingInvoices = invoices.filter(inv => inv.status === 'pending' && new Date() <= new Date(inv.dueDate)).length;
      const overdueInvoices = invoices.filter(inv => inv.status === 'pending' && new Date() > new Date(inv.dueDate)).length;

      // Tính tổng tiền
      const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
      const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
      const pendingAmount = invoices.filter(inv => inv.status === 'pending' && new Date() <= new Date(inv.dueDate)).reduce((sum, inv) => sum + inv.amount, 0);
      const overdueAmount = invoices.filter(inv => inv.status === 'pending' && new Date() > new Date(inv.dueDate)).reduce((sum, inv) => sum + inv.amount, 0);

      // Xác định trạng thái thanh toán
      let paymentStatus: 'fully_paid' | 'partial_paid' | 'not_paid' | 'overdue';
      if (overdueInvoices > 0) {
        paymentStatus = 'overdue';
      } else if (paidInvoices === totalInvoices && totalInvoices > 0) {
        paymentStatus = 'fully_paid';
      } else if (paidInvoices > 0) {
        paymentStatus = 'partial_paid';
      } else {
        paymentStatus = 'not_paid';
      }

      // Hóa đơn mới nhất
      const latestInvoice = invoices.length > 0 ? {
        invoiceId: invoices[0].invoiceId,
        amount: invoices[0].amount,
        status: invoices[0].status,
        dueDate: invoices[0].dueDate,
        paidDate: invoices[0].paidDate,
        invoiceType: invoices[0].invoiceType
      } : undefined;

      return {
        roomId: roomId,
        roomNumber: room ? room.roomNumber : 'N/A',
        buildingName: building ? building.name : 'N/A',
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        paymentStatus,
        latestInvoice
      };
    } catch (error) {
      throw new Error(`Failed to get room payment status: ${error.message}`);
    }
  }

  /**
   * Kiểm tra trạng thái hóa đơn của hợp đồng
   */
  async getContractPaymentStatus(tenantId: number, contractId: number): Promise<{
    contractId: number;
    totalInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    paymentStatus: 'fully_paid' | 'partial_paid' | 'not_paid' | 'overdue';
    latestInvoice?: {
      invoiceId: number;
      amount: number;
      status: string;
      dueDate: Date;
      paidDate?: Date;
      invoiceType: string;
    };
    allInvoices: Array<{
      invoiceId: number;
      amount: number;
      status: string;
      dueDate: Date;
      paidDate?: Date;
      invoiceType: string;
      description: string;
    }>;
  }> {
    try {
      // Lấy tất cả hóa đơn của hợp đồng này
      const invoices = await this.invoiceModel.find({
        tenantId,
        contractId: contractId
      }).sort({ dueDate: -1 }).exec();

      // Thống kê
      const totalInvoices = invoices.length;
      const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
      const pendingInvoices = invoices.filter(inv => inv.status === 'pending' && new Date() <= new Date(inv.dueDate)).length;
      const overdueInvoices = invoices.filter(inv => inv.status === 'pending' && new Date() > new Date(inv.dueDate)).length;

      // Tính tổng tiền
      const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
      const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
      const pendingAmount = invoices.filter(inv => inv.status === 'pending' && new Date() <= new Date(inv.dueDate)).reduce((sum, inv) => sum + inv.amount, 0);
      const overdueAmount = invoices.filter(inv => inv.status === 'pending' && new Date() > new Date(inv.dueDate)).reduce((sum, inv) => sum + inv.amount, 0);

      // Xác định trạng thái thanh toán
      let paymentStatus: 'fully_paid' | 'partial_paid' | 'not_paid' | 'overdue';
      if (overdueInvoices > 0) {
        paymentStatus = 'overdue';
      } else if (paidInvoices === totalInvoices && totalInvoices > 0) {
        paymentStatus = 'fully_paid';
      } else if (paidInvoices > 0) {
        paymentStatus = 'partial_paid';
      } else {
        paymentStatus = 'not_paid';
      }

      // Hóa đơn mới nhất
      const latestInvoice = invoices.length > 0 ? {
        invoiceId: invoices[0].invoiceId,
        amount: invoices[0].amount,
        status: invoices[0].status,
        dueDate: invoices[0].dueDate,
        paidDate: invoices[0].paidDate,
        invoiceType: invoices[0].invoiceType
      } : undefined;

      // Tất cả hóa đơn
      const allInvoices = invoices.map(inv => ({
        invoiceId: inv.invoiceId,
        amount: inv.amount,
        status: inv.status,
        dueDate: inv.dueDate,
        paidDate: inv.paidDate,
        invoiceType: inv.invoiceType,
        description: inv.description
      }));

      return {
        contractId: contractId,
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalAmount,
        paidAmount,
        pendingAmount,
        overdueAmount,
        paymentStatus,
        latestInvoice,
        allInvoices
      };
    } catch (error) {
      throw new Error(`Failed to get contract payment status: ${error.message}`);
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

      const qrResult = await this.qrCodeService.generatePaymentQR({
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
    isZaloPayQR?: boolean;
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
        paymentMethod: 'zalopay',
        zalopayOrderId: qrResult.zaloPayOrderId, // Lưu ZaloPay order ID
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
        isZaloPayQR: !!qrResult.zaloPayOrderId
      };
    } catch (error) {
      throw new Error(`Failed to generate ZaloPay QR: ${error.message}`);
    }
  }
}
