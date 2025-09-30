import { Controller, Get, Post, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeneratePaymentQRDto } from './dto/generate-payment-qr.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Tạo QR code thanh toán cho hóa đơn
   */
  @Post('generate-qr')
  async generatePaymentQR(@Body() generatePaymentQRDto: GeneratePaymentQRDto) {
    const { invoiceId } = generatePaymentQRDto;
    
    return await this.paymentsService.generatePaymentQR(invoiceId);
  }

  /**
   * Tạo QR code thanh toán ZaloPay cho hóa đơn
   */
  @Post('generate-zalopay-qr')
  async generateZaloPayQR(@Body() generatePaymentQRDto: GeneratePaymentQRDto) {
    const { invoiceId } = generatePaymentQRDto;
    
    return await this.paymentsService.generateZaloPayQR(invoiceId);
  }

  /**
   * Kiểm tra trạng thái thanh toán
   */
  @Get('status/:orderId')
  async checkPaymentStatus(@Param('orderId') orderId: string) {
    return await this.paymentsService.checkPaymentStatus(orderId);
  }

  /**
   * Xác nhận thanh toán thành công
   */
  @Put('confirm')
  async confirmPayment(@Body() confirmPaymentDto: ConfirmPaymentDto) {
    const { orderId, paymentMethod } = confirmPaymentDto;
    
    return await this.paymentsService.confirmPayment(orderId, paymentMethod);
  }

  /**
   * Lấy danh sách hóa đơn cần thanh toán của user
   */
  @Get('pending-invoices')
  async getPendingInvoices(@Request() req) {
    const tenantId = req.user.userId;
    return await this.paymentsService.getPendingInvoices(tenantId);
  }

  /**
   * Lấy danh sách hóa đơn đã thanh toán của user
   */
  @Get('paid-invoices')
  async getPaidInvoices(@Request() req) {
    const tenantId = req.user.userId;
    return await this.paymentsService.getPaidInvoices(tenantId);
  }

  /**
   * Lấy lịch sử thanh toán của user (tất cả hóa đơn)
   */
  @Get('payment-history')
  async getPaymentHistory(@Request() req) {
    const tenantId = req.user.userId;
    return await this.paymentsService.getPaymentHistory(tenantId);
  }

  /**
   * Kiểm tra trạng thái hóa đơn của phòng
   */
  @Get('room/:roomId/status')
  async getRoomPaymentStatus(@Request() req, @Param('roomId') roomId: string) {
    const tenantId = req.user.userId;
    return await this.paymentsService.getRoomPaymentStatus(tenantId, Number(roomId));
  }

  /**
   * Kiểm tra trạng thái hóa đơn của hợp đồng
   */
  @Get('contract/:contractId/status')
  async getContractPaymentStatus(@Request() req, @Param('contractId') contractId: string) {
    const tenantId = req.user.userId;
    return await this.paymentsService.getContractPaymentStatus(tenantId, Number(contractId));
  }

  /**
   * Lấy thông tin payment order
   */
  @Get('order/:orderId')
  async getPaymentOrder(@Param('orderId') orderId: string) {
    return await this.paymentsService.getPaymentOrder(orderId);
  }

  /**
   * Hủy payment order
   */
  @Put('cancel/:orderId')
  async cancelPaymentOrder(@Param('orderId') orderId: string) {
    return await this.paymentsService.cancelPaymentOrder(orderId);
  }

  /**
   * Kiểm tra QR code có hết hạn không
   */
  @Get('qr-expired/:orderId')
  async isQRCodeExpired(@Param('orderId') orderId: string) {
    const isExpired = await this.paymentsService.isQRCodeExpired(orderId);
    return { orderId, isExpired };
  }

  /**
   * Tạo QR code mới cho payment order hết hạn
   */
  @Post('regenerate-qr/:orderId')
  async regenerateQRCode(@Param('orderId') orderId: string) {
    return await this.paymentsService.regenerateQRCode(orderId);
  }

  /**
   * Debug: Xem tất cả payment orders
   */
  @Get('debug/orders')
  async getAllPaymentOrders() {
    return await this.paymentsService.getAllPaymentOrders();
  }
}
