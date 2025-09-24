import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { ConfigService } from '@nestjs/config';

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
  }> {
    try {
      // Tạo dữ liệu QR code cho ZaloPay
      const qrData = JSON.stringify({
        orderId: paymentData.orderId,
        zalopayOrderId: paymentData.zalopayOrderId,
        amount: paymentData.amount,
        description: paymentData.description,
        timestamp: new Date().toISOString(),
        type: 'zalopay_payment',
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

      // Tính thời gian hết hạn
      const expiryAt = new Date();
      expiryAt.setHours(expiryAt.getHours() + 24);

      return {
        qrCodeUrl,
        qrCodeData: qrData,
        expiryAt
      };
    } catch (error) {
      throw new Error(`Failed to generate ZaloPay QR code: ${error.message}`);
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
