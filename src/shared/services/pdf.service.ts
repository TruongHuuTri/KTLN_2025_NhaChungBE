import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'contracts');

  constructor() {
    // Tạo thư mục uploads nếu chưa có
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Tạo PDF hợp đồng thuê phòng
   */
  async generateContractPDF(contractData: any): Promise<{ filePath: string; fileName: string }> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Tạo HTML content cho hợp đồng
      const htmlContent = this.generateContractHTML(contractData);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Tạo tên file PDF
      const fileName = `hop-dong-thue-${contractData.contractId}-${Date.now()}.pdf`;
      const filePath = path.join(this.uploadsDir, fileName);
      
      // Tạo PDF
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      return { filePath, fileName };
    } finally {
      await browser.close();
    }
  }

  /**
   * Tạo HTML template cho hợp đồng
   */
  private generateContractHTML(contract: any): string {
    const startDate = new Date(contract.startDate).toLocaleDateString('vi-VN');
    const endDate = new Date(contract.endDate).toLocaleDateString('vi-VN');
    const createdAt = new Date(contract.createdAt).toLocaleDateString('vi-VN');

    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hợp đồng thuê phòng</title>
        <style>
            body {
                font-family: 'Times New Roman', serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                color: #333;
                background: white;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
            }
            
            .header h1 {
                font-size: 24px;
                font-weight: bold;
                margin: 0;
                text-transform: uppercase;
            }
            
            .header h2 {
                font-size: 18px;
                margin: 10px 0 0 0;
                font-weight: normal;
            }
            
            .contract-info {
                margin-bottom: 25px;
            }
            
            .contract-info h3 {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 10px;
                text-decoration: underline;
            }
            
            .info-row {
                display: flex;
                margin-bottom: 8px;
            }
            
            .info-label {
                font-weight: bold;
                min-width: 150px;
            }
            
            .info-value {
                flex: 1;
            }
            
            .terms-section {
                margin: 25px 0;
            }
            
            .terms-section h3 {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 15px;
                text-decoration: underline;
            }
            
            .terms-list {
                margin-left: 20px;
            }
            
            .terms-list li {
                margin-bottom: 8px;
            }
            
            .signature-section {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
            }
            
            .signature-box {
                text-align: center;
                width: 45%;
            }
            
            .signature-box h4 {
                margin-bottom: 60px;
                font-weight: bold;
            }
            
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #ccc;
                padding-top: 15px;
            }
            
            .highlight {
                background-color: #f0f0f0;
                padding: 2px 4px;
                border-radius: 3px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Cộng hòa xã hội chủ nghĩa Việt Nam</h1>
            <h2>Độc lập - Tự do - Hạnh phúc</h2>
            <h1>HỢP ĐỒNG THUÊ PHÒNG TRỌ</h1>
        </div>

        <div class="contract-info">
            <h3>Thông tin hợp đồng</h3>
            <div class="info-row">
                <span class="info-label">Mã hợp đồng:</span>
                <span class="info-value highlight">HD-${contract.contractId}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Ngày tạo:</span>
                <span class="info-value">${createdAt}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Loại hợp đồng:</span>
                <span class="info-value">${contract.contractType === 'single' ? 'Thuê riêng' : 'Thuê chung'}</span>
            </div>
        </div>

        <div class="contract-info">
            <h3>Thông tin phòng trọ</h3>
            <div class="info-row">
                <span class="info-label">Số phòng:</span>
                <span class="info-value highlight">${contract.roomInfo.roomNumber}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Diện tích:</span>
                <span class="info-value">${contract.roomInfo.area} m²</span>
            </div>
            <div class="info-row">
                <span class="info-label">Sức chứa tối đa:</span>
                <span class="info-value">${contract.roomInfo.maxOccupancy} người</span>
            </div>
        </div>

        <div class="contract-info">
            <h3>Thông tin tài chính</h3>
            <div class="info-row">
                <span class="info-label">Giá thuê hàng tháng:</span>
                <span class="info-value highlight">${contract.monthlyRent.toLocaleString('vi-VN')} VND</span>
            </div>
            <div class="info-row">
                <span class="info-label">Tiền cọc:</span>
                <span class="info-value highlight">${contract.deposit.toLocaleString('vi-VN')} VND</span>
            </div>
            <div class="info-row">
                <span class="info-label">Thời hạn hợp đồng:</span>
                <span class="info-value">Từ ${startDate} đến ${endDate}</span>
            </div>
        </div>

        <div class="contract-info">
            <h3>Thông tin người thuê</h3>
            ${contract.tenants.map(tenant => `
                <div class="info-row">
                    <span class="info-label">Mã người thuê:</span>
                    <span class="info-value">${tenant.tenantId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Ngày chuyển vào:</span>
                    <span class="info-value">${new Date(tenant.moveInDate).toLocaleDateString('vi-VN')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Trạng thái:</span>
                    <span class="info-value">${tenant.status === 'active' ? 'Đang thuê' : 'Đã chuyển đi'}</span>
                </div>
            `).join('')}
        </div>

        <div class="terms-section">
            <h3>Điều khoản và điều kiện</h3>
            <ol class="terms-list">
                <li>Bên thuê cam kết thanh toán đúng hạn tiền thuê hàng tháng trước ngày ${new Date().getDate()} hàng tháng.</li>
                <li>Bên thuê không được chuyển nhượng quyền sử dụng phòng cho người khác mà không có sự đồng ý của bên cho thuê.</li>
                <li>Bên thuê có trách nhiệm giữ gìn vệ sinh chung và không làm ảnh hưởng đến các phòng khác.</li>
                <li>Bên cho thuê có trách nhiệm đảm bảo các tiện ích cơ bản như điện, nước hoạt động bình thường.</li>
                <li>Hợp đồng có hiệu lực từ ngày ký và có thể gia hạn theo thỏa thuận của hai bên.</li>
                <li>Mọi tranh chấp sẽ được giải quyết thông qua thương lượng, nếu không thành công sẽ đưa ra tòa án có thẩm quyền.</li>
            </ol>
        </div>

        <div class="signature-section">
            <div class="signature-box">
                <h4>BÊN CHO THUÊ</h4>
                <p>(Ký tên và đóng dấu)</p>
            </div>
            <div class="signature-box">
                <h4>BÊN THUÊ</h4>
                <p>(Ký tên)</p>
            </div>
        </div>

        <div class="footer">
            <p>Hợp đồng này được tạo tự động bởi hệ thống quản lý nhà trọ</p>
            <p>Ngày tạo: ${new Date().toLocaleString('vi-VN')}</p>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Xóa file PDF cũ
   */
  async deletePDF(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error deleting PDF file:', error);
    }
  }

  /**
   * Lấy đường dẫn file PDF
   */
  getPDFPath(fileName: string): string {
    return path.join(this.uploadsDir, fileName);
  }
}