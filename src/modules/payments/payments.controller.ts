import { Controller, Get, Post, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeneratePaymentQRDto } from './dto/generate-payment-qr.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Controller('api/payments')
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
}
