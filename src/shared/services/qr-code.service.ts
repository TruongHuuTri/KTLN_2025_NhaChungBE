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
    zaloPayOrderId?: string;
  }> {
    try {
      // Lấy cấu hình ZaloPay từ environment
      const appId = this.configService.get<string>('ZALOPAY_APP_ID');
      const appUser = this.configService.get<string>('ZALOPAY_APP_USER');
      const key1 = this.configService.get<string>('ZALOPAY_KEY1');
      const key2 = this.configService.get<string>('ZALOPAY_KEY2');
      const endpoint = this.configService.get<string>('ZALOPAY_ENDPOINT', 'https://sb-openapi.zalopay.vn/v2/create');
      const callbackUrl = this.configService.get<string>('ZALOPAY_CALLBACK_URL');

      if (!appId || !key1 || !key2) {
        throw new Error('ZaloPay configuration missing');
      }

      // Tạo app_trans_id đúng format YYMMDD_xxxxxx
      const now = new Date();
      const yy = now.getFullYear().toString().slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const timestamp = Date.now().toString().slice(-6);
      const app_trans_id = `${yy}${mm}${dd}_${timestamp}`;

      const app_time = Math.floor(Date.now()); // ms hợp lệ
      
      // item phải là JSON array
      const item = JSON.stringify([
        {
          itemid: 'INV' + paymentData.invoiceId,
          itemname: paymentData.description || 'Thanh toán hóa đơn',
          itemprice: Math.round(paymentData.amount),
          itemquantity: 1
        }
      ]);
      
      // Tạo dữ liệu request cho ZaloPay theo đúng format
      const orderData: any = {
        app_id: parseInt(appId),
        app_trans_id: app_trans_id,
        app_user: appUser || 'demo',
        app_time: app_time,
        amount: Math.round(paymentData.amount),
        description: paymentData.description || 'Thanh toán hóa đơn',
        callback_url: callbackUrl,
        item: item, // JSON array string
        embed_data: JSON.stringify({
          orderId: paymentData.orderId,
          invoiceId: paymentData.invoiceId
        }),
        bank_code: 'zalopayapp'
      };

      // Tạo chuỗi để ký MAC theo đúng format ZaloPay
      // Format: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
      const dataString = `${orderData.app_id}|${orderData.app_trans_id}|${orderData.app_user}|${orderData.amount}|${orderData.app_time}|${orderData.embed_data}|${orderData.item}`;
      orderData.mac = crypto.createHmac('sha256', key1).update(dataString).digest('hex');
      


      // Gọi API ZaloPay với Content-Type: application/x-www-form-urlencoded
      const urlEncodedData = new URLSearchParams();
      Object.keys(orderData).forEach(key => {
        urlEncodedData.append(key, orderData[key]);
      });
      
      const response = await axios.default.post(endpoint, urlEncodedData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const responseData = response.data as any;
      

      if (responseData.return_code !== 1) {
        console.error('❌ ZaloPay API Error:', {
          return_code: responseData.return_code,
          return_message: responseData.return_message,
          sub_return_code: responseData.sub_return_code,
          sub_return_message: responseData.sub_return_message
        });
        throw new Error(`ZaloPay API error: ${responseData.return_message}`);
      }

      // Tạo QR code từ ZaloPay order_url (không phải qr_code)
      const qrData = responseData.order_url;
      
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

      // Tạo QR code image
      const qrCodeUrl = await QRCode.toDataURL(qrData, qrOptions);

      // Tính thời gian hết hạn (ZaloPay QR thường hết hạn sau 15 phút)
      const expiryAt = new Date();
      expiryAt.setMinutes(expiryAt.getMinutes() + 15);

      return {
        qrCodeUrl,
        qrCodeData: qrData,
        expiryAt,
        zaloPayOrderId: app_trans_id // Sử dụng app_trans_id từ request, không phải từ response
      };
    } catch (error) {
      console.error('❌ ZaloPay API failed, creating fallback QR code:', error.message);
      
      // Fallback: Tạo QR code đơn giản với thông tin thanh toán
      const fallbackData = {
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        description: paymentData.description,
        timestamp: new Date().toISOString(),
        type: 'payment_request',
        note: 'Vui lòng chuyển khoản theo thông tin trên'
      };
      
      const qrData = JSON.stringify(fallbackData);
      
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
      expiryAt.setMinutes(expiryAt.getMinutes() + 15);


      return {
        qrCodeUrl,
        qrCodeData: qrData,
        expiryAt,
        zaloPayOrderId: paymentData.orderId // Fallback ID
      };
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
}