import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';
import * as axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class QrCodeService {
  constructor(private configService: ConfigService) {}

  /**
   * Tạo QR code cho thanh toán ZaloPay
   */
  async generatePaymentQR(paymentData: any): Promise<{
    qrCodeUrl: string;
    qrCodeData: string;
    expiryAt: Date;
  }> {
    try {
      // Tạo dữ liệu QR code
      const qrData = JSON.stringify({
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        description: paymentData.description,
        timestamp: new Date().toISOString(),
        type: 'zalopay_payment'
      });

      // Cấu hình QR code
      const qrOptions = {
        width: this.configService.get<number>('QR_CODE_SIZE', 200),
        margin: 4,
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      // Tạo QR code
      const qrCodeUrl = await QRCode.toDataURL(qrData, qrOptions);

      // Tính thời gian hết hạn
      const expiryAt = new Date();
      expiryAt.setHours(expiryAt.getHours() + 24); // 24 giờ

      return {
        qrCodeUrl,
        qrCodeData: qrData,
        expiryAt
      };
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Tạo QR code đơn giản cho text
   */
  async generateSimpleQR(text: string): Promise<string> {
    try {
      const qrOptions = {
        width: this.configService.get<number>('QR_CODE_SIZE', 200),
        margin: 4,
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92
      };

      return await QRCode.toDataURL(text, qrOptions);
    } catch (error) {
      throw new Error(`Failed to generate simple QR code: ${error.message}`);
    }
  }

  /**
   * Kiểm tra QR code có hết hạn không
   */
  isQRCodeExpired(expiryAt: Date): boolean {
    return new Date() > expiryAt;
  }

  /**
   * Tạo QR code cho ZaloPay payment
   */
  async generateZaloPayQR(paymentData: {
    orderId: string;
    amount: number;
    description: string;
    zalopayOrderId: string;
  }): Promise<{
    qrCodeUrl: string;
    qrCodeData: string;
    expiryAt: Date;
    zalopayResponse?: any;
  }> {
    try {
      // Lấy cấu hình ZaloPay từ environment
      const appId = this.configService.get<string>('ZALOPAY_APP_ID');
      const key1 = this.configService.get<string>('ZALOPAY_KEY1');
      const key2 = this.configService.get<string>('ZALOPAY_KEY2');
      const zalopayApiUrl = this.configService.get<string>('ZALOPAY_ENDPOINT', 'https://sb-openapi.zalopay.vn/v2/create');

      if (!appId || !key1 || !key2) {
        throw new Error('ZaloPay configuration is missing. Please check ZALOPAY_APP_ID, ZALOPAY_KEY1, ZALOPAY_KEY2');
      }

      // Tạo dữ liệu request cho ZaloPay theo đúng format
      const app_time = Date.now();
      
      // Validate amount (phải là số nguyên và >= 1000 VND)
      if (paymentData.amount < 1000) {
        throw new Error('Amount must be at least 1000 VND');
      }

      // Tạo app_trans_id đúng format YYMMDD_xxxxxx
      const now = new Date();
      const yy = now.getFullYear().toString().slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const timestamp = Date.now().toString().slice(-6);
      const app_trans_id = `${yy}${mm}${dd}_${timestamp}`;

      const orderInfo = {
        app_id: parseInt(appId),
        app_trans_id: app_trans_id,
        app_user: paymentData.orderId.split('_')[1] || 'test_user',
        app_time: app_time,
        amount: paymentData.amount,
        item: JSON.stringify([paymentData.description.substring(0, 100)]),
        embed_data: JSON.stringify({
          orderId: paymentData.orderId,
          type: 'invoice_payment',
          redirecturl: this.configService.get<string>('ZALOPAY_REDIRECT_URL', 'https://intercoracoid-nontheosophically-robbi.ngrok-free.dev/api/payments/zalopay/return')
        })
      };

      // Tạo chuỗi để tạo checksum theo format ZaloPay chính xác
      // Format: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
      const dataString = `${orderInfo.app_id}|${orderInfo.app_trans_id}|${orderInfo.app_user}|${orderInfo.amount}|${orderInfo.app_time}|${orderInfo.embed_data}|${orderInfo.item}`;
      const checksum = crypto.createHmac('sha256', key1).update(dataString).digest('hex');

      const requestData = {
        app_id: orderInfo.app_id,
        app_trans_id: orderInfo.app_trans_id,
        app_user: orderInfo.app_user,
        app_time: orderInfo.app_time,
        amount: orderInfo.amount,
        description: `Thanh toán hóa đơn: ${paymentData.description}`.substring(0, 255),
        callback_url: this.configService.get<string>('ZALOPAY_CALLBACK_URL', 'https://intercoracoid-nontheosophically-robbi.ngrok-free.dev/api/payments/zalopay/callback'),
        item: orderInfo.item,
        embed_data: orderInfo.embed_data,
        bank_code: 'zalopayapp',
        mac: checksum
      };

      // Log request data để debug
      console.log('ZaloPay Request Data:', {
        url: zalopayApiUrl,
        appId,
        key1Length: key1.length,
        key2Length: key2.length,
        requestData
      });

      // Gọi API ZaloPay
      const zalopayResponse = await axios.default.post(zalopayApiUrl, requestData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('ZaloPay Response:', zalopayResponse.data);

      const responseData = zalopayResponse.data as any;
      if (responseData.return_code !== 1) {
        throw new Error(`ZaloPay API error: ${responseData.return_message}`);
      }

      // Tạo QR code từ ZaloPay order_url (deep link)
      const qrCodeData = responseData.order_url;

      const qrOptions = {
        width: this.configService.get<number>('QR_CODE_SIZE', 200),
        margin: 4,
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      const qrCodeUrl = await QRCode.toDataURL(qrCodeData, qrOptions);

      // Tính thời gian hết hạn (15 phút theo ZaloPay)
      const expiryAt = new Date();
      expiryAt.setMinutes(expiryAt.getMinutes() + 15);

      return {
        qrCodeUrl,
        qrCodeData,
        expiryAt,
        zalopayResponse: responseData
      };
    } catch (error) {
      // Fallback: tạo QR code đơn giản nếu ZaloPay API lỗi
      console.warn('ZaloPay API failed, using fallback QR code:', error.message);
      
      const qrData = JSON.stringify({
        orderId: paymentData.orderId,
        zalopayOrderId: paymentData.zalopayOrderId,
        amount: paymentData.amount,
        description: paymentData.description,
        timestamp: new Date().toISOString(),
        type: 'zalopay_payment_fallback',
        action: 'pay'
      });

      const qrOptions = {
        width: this.configService.get<number>('QR_CODE_SIZE', 200),
        margin: 4,
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      const qrCodeUrl = await QRCode.toDataURL(qrData, qrOptions);

      const expiryAt = new Date();
      expiryAt.setHours(expiryAt.getHours() + 24);

      return {
        qrCodeUrl,
        qrCodeData: qrData,
        expiryAt,
        zalopayResponse: { error: error.message }
      };
    }
  }

  /**
   * Tạo QR code cho thanh toán nhanh
   */
  async generateQuickPaymentQR(paymentData: {
    orderId: string;
    amount: number;
    description: string;
  }): Promise<{
    qrCodeUrl: string;
    qrCodeData: string;
    expiryAt: Date;
  }> {
    try {
      const qrData = JSON.stringify({
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        description: paymentData.description,
        timestamp: new Date().toISOString(),
        type: 'quick_payment',
        action: 'pay'
      });

      const qrOptions = {
        width: this.configService.get<number>('QR_CODE_SIZE', 200),
        margin: 4,
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92
      };

      const qrCodeUrl = await QRCode.toDataURL(qrData, qrOptions);

      const expiryAt = new Date();
      expiryAt.setHours(expiryAt.getHours() + 24);

      return {
        qrCodeUrl,
        qrCodeData: qrData,
        expiryAt
      };
    } catch (error) {
      throw new Error(`Failed to generate quick payment QR code: ${error.message}`);
    }
  }
}
