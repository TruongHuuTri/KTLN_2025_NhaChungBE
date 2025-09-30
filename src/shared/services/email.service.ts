import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  /**
   * Gửi OTP email
   */
  async sendOTPEmail(email: string, otp: string, userName: string): Promise<void> {
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'Nhà Chung'} <${process.env.FROM_EMAIL || process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Mã OTP xác thực - Nhà Chung',
      html: this.getOTPEmailTemplate(userName, otp),
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending OTP email:', error);
      throw new Error('Không thể gửi email OTP');
    }
  }

  /**
   * Gửi email thông báo đổi role thành công
   */
  async sendRoleChangeNotification(email: string, userName: string, newRole: string): Promise<void> {
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'Nhà Chung'} <${process.env.FROM_EMAIL || process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Thay đổi vai trò thành công - Nhà Chung',
      html: this.getRoleChangeEmailTemplate(userName, newRole),
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending role change notification:', error);
      // Không throw error vì đây chỉ là thông báo
    }
  }

  /**
   * Template email OTP
   */
  private getOTPEmailTemplate(userName: string, otp: string): string {
    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác thực OTP - Nhà Chung</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .otp-code {
            background: #fff;
            border: 2px dashed #667eea;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
            border-radius: 8px;
          }
          .otp-code h2 {
            color: #667eea;
            font-size: 32px;
            margin: 0;
            letter-spacing: 5px;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏠 Nhà Chung</h1>
          <p>Nền tảng tìm kiếm nhà ở hàng đầu Việt Nam</p>
        </div>
        
        <div class="content">
          <h2>Xin chào ${userName}!</h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Nhà Chung</strong>.</p>
          
          <p>Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã OTP bên dưới:</p>
          
          <div class="otp-code">
            <h2>${otp}</h2>
          </div>
          
          <div class="warning">
            <strong>⚠️ Lưu ý quan trọng:</strong>
            <ul>
              <li>Mã OTP có hiệu lực trong <strong>5 phút</strong></li>
              <li>Mã chỉ có thể sử dụng <strong>1 lần duy nhất</strong></li>
              <li>Không chia sẻ mã này với bất kỳ ai</li>
            </ul>
          </div>
          
          <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
          
          <p>Trân trọng,<br>
          <strong>Đội ngũ Nhà Chung</strong></p>
        </div>
        
        <div class="footer">
          <p>📧 Email này được gửi tự động, vui lòng không trả lời</p>
          <p>🏠 Nhà Chung - Kết nối người tìm nhà và chủ trọ</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Template email thông báo đổi role
   */
  private getRoleChangeEmailTemplate(userName: string, newRole: string): string {
    const roleText = newRole === 'landlord' ? 'Chủ trọ' : 'Người dùng';
    
    return `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thay đổi vai trò - Nhà Chung</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .success-box {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏠 Nhà Chung</h1>
          <p>Thông báo thay đổi vai trò</p>
        </div>
        
        <div class="content">
          <h2>Xin chào ${userName}!</h2>
          
          <div class="success-box">
            <h3>✅ Thay đổi vai trò thành công!</h3>
            <p>Vai trò của bạn đã được cập nhật thành: <strong>${roleText}</strong></p>
          </div>
          
          ${newRole === 'landlord' ? `
            <p><strong>🎉 Chúc mừng bạn đã trở thành Chủ trọ!</strong></p>
            <p>Bây giờ bạn có thể:</p>
            <ul>
              <li>📝 Đăng bài cho thuê phòng trọ</li>
              <li>🏠 Đăng bài cho thuê chung cư</li>
              <li>🏘️ Đăng bài cho thuê nhà nguyên căn</li>
              <li>📊 Quản lý các bài đăng của mình</li>
              <li>💬 Liên hệ với người tìm nhà</li>
            </ul>
          ` : ''}
          
          <p>Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.</p>
          
          <p>Trân trọng,<br>
          <strong>Đội ngũ Nhà Chung</strong></p>
        </div>
        
        <div class="footer">
          <p>📧 Email này được gửi tự động, vui lòng không trả lời</p>
          <p>🏠 Nhà Chung - Kết nối người tìm nhà và chủ trọ</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Test kết nối email
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}
