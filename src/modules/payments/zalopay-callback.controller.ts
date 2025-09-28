import { Controller, Post, Get, Body, Headers, Query, Res, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments/zalopay')
export class ZaloPayCallbackController {
  private readonly logger = new Logger(ZaloPayCallbackController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

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
  async handleZaloPayCallback(
    @Body() callbackData: any,
    @Headers() headers: any
  ) {
    try {
      this.logger.log('Received ZaloPay callback:', callbackData);
      this.logger.log('Headers:', headers);

      // Parse callback data - ZaloPay gửi data trong field "data" dưới dạng string
      let paymentData = callbackData;
      if (callbackData.data && typeof callbackData.data === 'string') {
        paymentData = JSON.parse(callbackData.data);
      }

      const {
        app_id,
        app_trans_id,
        zp_trans_id,
        amount,
        discount_amount
      } = paymentData;

      // Kiểm tra status thanh toán từ callbackData.type (1 = thành công, 2 = thất bại)
      const paymentStatus = callbackData.type;
      
      if (paymentStatus === 1) {
        // Thanh toán thành công
        this.logger.log(`✅ Payment successful for order: ${app_trans_id}, amount: ${amount} VND`);
        
        // TODO: Tìm payment order theo app_trans_id
        // TODO: Cập nhật trạng thái thanh toán thành công
        // TODO: Có thể gửi email thông báo, cập nhật database, etc.
        
        return {
          return_code: 1,
          return_message: 'OK'
        };
      } else {
        // Thanh toán thất bại
        this.logger.warn(`❌ Payment failed for order: ${app_trans_id}, status: ${paymentStatus}`);
        
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
