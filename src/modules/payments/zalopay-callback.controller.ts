import { Controller, Post, Get, Body, Headers, Query, Res, Logger, HttpCode } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Controller('payments/zalopay')
export class ZaloPayCallbackController {
  private readonly logger = new Logger(ZaloPayCallbackController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService
  ) {}

  /**
   * GET endpoint để handle redirect từ ZaloPay app (sau khi user thanh toán)
   */
  @Get('return')
  async handleZaloPayReturn(@Query() queryParams: any, @Res() res: any) {
    this.logger.log('ZaloPay redirect received:', queryParams);
    
    // Bypass ngrok warning và hiển thị trang thành công
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Thanh toán thành công</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .success { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            .icon { font-size: 60px; color: #4CAF50; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            .info { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .btn { background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="success">
            <div class="icon">✅</div>
            <h1>Thanh toán thành công!</h1>
            <div class="info">
                <p><strong>Giao dịch:</strong> ${queryParams.app_trans_id || 'N/A'}</p>
                <p><strong>Số tiền:</strong> ${queryParams.amount ? (queryParams.amount / 100).toLocaleString() + ' VND' : 'N/A'}</p>
                <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
            </div>
            <p>Cảm ơn bạn đã sử dụng dịch vụ!</p>
            <a href="javascript:window.close()" class="btn">Đóng trang</a>
        </div>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  /**
   * POST endpoint để nhận callback từ ZaloPay
   */
  @Post('callback')
  @HttpCode(200)
  async handleZaloPayCallback(
    @Body() callbackData: any,
    @Headers() headers: any
  ) {
    try {
      this.logger.log('Received ZaloPay callback:', callbackData);
      this.logger.log('Headers:', headers);

      // Verify MAC bằng key2 trước khi parse data
      const key2 = this.configService.get<string>('ZALOPAY_KEY2');
      
      if (!key2) {
        this.logger.error('ZALOPAY_KEY2 not configured');
        return { return_code: -1, return_message: 'Configuration error' };
      }
      
      // ✅ Verify MAC đúng cách: HMAC(key2, data)
      const dataStr = callbackData.data; // Giữ nguyên string, không parse
      const reqMac = callbackData.mac;
      
      const calcMac = crypto
        .createHmac('sha256', key2)
        .update(dataStr)
        .digest('hex');
      
      this.logger.log('MAC verification:', {
        dataStr: dataStr.substring(0, 100) + '...', // Log một phần để debug
        calculatedMac: calcMac,
        receivedMac: reqMac
      });
      
      if (reqMac !== calcMac) {
        this.logger.warn('MAC not equal! Rejecting callback');
        return { return_code: -1, return_message: 'mac not equal' };
      }
      
      // Parse data sau khi verify MAC thành công
      const paymentData = JSON.parse(dataStr);
      this.logger.log('Parsed payment data:', paymentData);
      
      // Extract thông tin thanh toán
      const app_trans_id = paymentData.app_trans_id;
      const amount = paymentData.amount;
      const status = Number(callbackData.type); // status từ callbackData.type
      
      if (status === 1) {
        // Thanh toán thành công
        this.logger.log(`✅ Payment successful for order: ${app_trans_id}, amount: ${amount} VND`);
        
        try {
          // Lấy orderId từ embed_data
          const embedData = JSON.parse(paymentData.embed_data);
          const orderId = embedData.orderId;
          const invoiceId = embedData.invoiceId;
          
          this.logger.log(`🔍 Processing payment for orderId: ${orderId}, invoiceId: ${invoiceId}`);
          
          // Tìm payment order theo orderId
          let paymentOrder = await this.paymentsService.findPaymentOrderByZaloPayId(app_trans_id);
          
          if (!paymentOrder) {
            // Nếu không tìm thấy theo zalopayOrderId, tìm theo orderId
            const allOrders = await this.paymentsService.getAllPaymentOrders();
            paymentOrder = allOrders.find(order => order.orderId === orderId);
            
            if (paymentOrder) {
              // Cập nhật zalopayOrderId cho payment order
              await this.paymentsService.updatePaymentOrderZaloPayId(paymentOrder.orderId, app_trans_id);
              this.logger.log(`✅ Updated payment order ${paymentOrder.orderId} with ZaloPay ID: ${app_trans_id}`);
            }
          }
          
          if (paymentOrder) {
            // Xác nhận thanh toán thành công
            await this.paymentsService.confirmPayment(paymentOrder.orderId, 'zalopay');
            this.logger.log(`✅ Payment order ${paymentOrder.orderId} confirmed successfully`);
          } else {
            this.logger.error(`❌ No payment order found for orderId: ${orderId} or ZaloPay ID: ${app_trans_id}`);
          }
        } catch (error) {
          this.logger.error(`❌ Error processing successful payment for ${app_trans_id}:`, error);
        }
        
        return {
          return_code: 1,
          return_message: 'OK'
        };
      } else {
        // Thanh toán thất bại
        this.logger.warn(`❌ Payment failed/pending for order: ${app_trans_id}, status: ${status}`);
        
        try {
          // Cập nhật trạng thái thất bại nếu cần
          const paymentOrder = await this.paymentsService.findPaymentOrderByZaloPayId(app_trans_id);
          if (paymentOrder) {
            await this.paymentsService.updatePaymentOrderStatus(paymentOrder.orderId, 'failed');
            this.logger.log(`❌ Payment order ${paymentOrder.orderId} marked as failed`);
          }
        } catch (error) {
          this.logger.error(`❌ Error processing failed payment for ${app_trans_id}:`, error);
        }
        
        return {
          return_code: 1,
          return_message: 'OK'
        };
      }

    } catch (error) {
      this.logger.error('Error processing ZaloPay callback:', error);
      
      return {
        return_code: 0,
        return_message: 'error'
      };
    }
  }

  /**
   * Test endpoint để kiểm tra callback
   */
  @Post('test-callback')
  async testCallback(@Body() testData: any) {
    this.logger.log('Test callback received:', testData);
    
    return {
      success: true,
      message: 'Test callback received successfully',
      receivedData: testData,
      timestamp: new Date().toISOString()
    };
  }
}
