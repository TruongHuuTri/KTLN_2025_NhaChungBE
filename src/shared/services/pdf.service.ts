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
    const createdAtDate = new Date(contract.createdAt);
    const createdAt = createdAtDate.toLocaleString('vi-VN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Helper function để render thông tin phòng theo category
    const renderRoomInfo = () => {
      const room = contract.room || {};
      const category = room.category || 'phong-tro';
      let html = '';

      if (category === 'chung-cu' && room.chungCuInfo) {
        const info = room.chungCuInfo;
        const buildingName = room.building?.name || room.buildingName || 'N/A';
        html += `
          <div class="info-row">
            <span class="info-label">Mã căn hộ:</span>
            <span class="info-value highlight">${info.unitCode || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Loại căn hộ:</span>
            <span class="info-value">${this.getChungCuPropertyTypeText(info.propertyType) || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tòa nhà:</span>
            <span class="info-value">${buildingName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Block/Tower:</span>
            <span class="info-value">${info.blockOrTower || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tầng:</span>
            <span class="info-value">${info.floorNumber || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Diện tích:</span>
            <span class="info-value">${room.area || 0} m²</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phòng ngủ:</span>
            <span class="info-value">${info.bedrooms || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phòng tắm:</span>
            <span class="info-value">${info.bathrooms || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Nội thất:</span>
            <span class="info-value">${this.getFurnitureText(room.furniture)}</span>
          </div>
        `;
      } else if (category === 'nha-nguyen-can' && room.nhaNguyenCanInfo) {
        const info = room.nhaNguyenCanInfo;
        const buildingName = room.building?.name || room.buildingName || 'N/A';
        html += `
          <div class="info-row">
            <span class="info-label">Mã nhà:</span>
            <span class="info-value highlight">${info.unitCode || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Loại nhà:</span>
            <span class="info-value">${this.getPropertyTypeText(info.propertyType) || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tòa nhà:</span>
            <span class="info-value">${buildingName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Khu/Lô:</span>
            <span class="info-value">${info.khuLo || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Diện tích:</span>
            <span class="info-value">${room.area || 0} m²</span>
          </div>
          ${info.usableArea && info.usableArea > 0 ? `
          <div class="info-row">
            <span class="info-label">Diện tích sử dụng:</span>
            <span class="info-value">${info.usableArea} m²</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="info-label">Phòng ngủ:</span>
            <span class="info-value">${info.bedrooms || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phòng tắm:</span>
            <span class="info-value">${info.bathrooms || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Số tầng:</span>
            <span class="info-value">${info.totalFloors || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Nội thất:</span>
            <span class="info-value">${this.getFurnitureText(room.furniture)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tình trạng pháp lý:</span>
            <span class="info-value">${this.getLegalStatusText(info.legalStatus) || 'N/A'}</span>
          </div>
        `;
      } else {
        // Phòng trọ
        const buildingName = room.building?.name || room.buildingName || 'N/A';
        html += `
          <div class="info-row">
            <span class="info-label">Mã phòng:</span>
            <span class="info-value highlight">${room.roomNumber || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Loại phòng:</span>
            <span class="info-value">Phòng trọ</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tòa nhà:</span>
            <span class="info-value">${buildingName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Diện tích:</span>
            <span class="info-value">${room.area || 0} m²</span>
          </div>
          <div class="info-row">
            <span class="info-label">Nội thất:</span>
            <span class="info-value">${this.getFurnitureText(room.furniture)}</span>
          </div>
        `;
      }

      return html;
    };

    // Helper function để render các loại phí (chỉ hiển thị các phí có giá trị > 0)
    const renderUtilities = () => {
      const utilities = contract.room?.utilities || {};
      let html = '';

      const formatPrice = (price: number) => price ? price.toLocaleString('vi-VN') : '0';
      const getIncludedNote = (included: boolean) => included ? ' (đã bao trong tiền thuê)' : '';
      const hasValue = (value: any) => value !== null && value !== undefined && Number(value) > 0;

      if (hasValue(utilities.electricityPricePerKwh)) {
        html += `
          <div class="info-row">
            <span class="info-label">Giá điện:</span>
            <span class="info-value">${formatPrice(utilities.electricityPricePerKwh)} VND/kWh${getIncludedNote(utilities.electricityIncluded || false)}</span>
          </div>
        `;
      }
      if (hasValue(utilities.waterPrice)) {
        html += `
          <div class="info-row">
            <span class="info-label">Giá nước:</span>
            <span class="info-value">${formatPrice(utilities.waterPrice)} VND/khối${getIncludedNote(utilities.waterIncluded || false)}</span>
          </div>
        `;
      }
      if (hasValue(utilities.internetFee)) {
        html += `
          <div class="info-row">
            <span class="info-label">Phí internet:</span>
            <span class="info-value">${formatPrice(utilities.internetFee)} VND/tháng${getIncludedNote(utilities.internetIncluded || false)}</span>
          </div>
        `;
      }
      if (hasValue(utilities.garbageFee)) {
        html += `
          <div class="info-row">
            <span class="info-label">Phí rác:</span>
            <span class="info-value">${formatPrice(utilities.garbageFee)} VND/tháng${getIncludedNote(utilities.garbageIncluded || false)}</span>
          </div>
        `;
      }
      if (hasValue(utilities.cleaningFee)) {
        html += `
          <div class="info-row">
            <span class="info-label">Phí vệ sinh:</span>
            <span class="info-value">${formatPrice(utilities.cleaningFee)} VND/tháng${getIncludedNote(utilities.cleaningIncluded || false)}</span>
          </div>
        `;
      }
      if (hasValue(utilities.managementFee)) {
        html += `
          <div class="info-row">
            <span class="info-label">Phí quản lý:</span>
            <span class="info-value">${formatPrice(utilities.managementFee)} VND/tháng${getIncludedNote(utilities.managementIncluded || false)}</span>
          </div>
        `;
      }
      if (hasValue(utilities.motorbikeParkingFee)) {
        html += `
          <div class="info-row">
            <span class="info-label">Phí gửi xe máy:</span>
            <span class="info-value">${formatPrice(utilities.motorbikeParkingFee)} VND/tháng${getIncludedNote(utilities.motorbikeParkingIncluded || false)}</span>
          </div>
        `;
      }
      if (hasValue(utilities.carParkingFee)) {
        html += `
          <div class="info-row">
            <span class="info-label">Phí gửi xe ô tô:</span>
            <span class="info-value">${formatPrice(utilities.carParkingFee)} VND/tháng${getIncludedNote(utilities.carParkingIncluded || false)}</span>
          </div>
        `;
      }

      return html || '<div class="info-row"><span class="info-value">Không có thông tin</span></div>';
    };

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
            
            
            .highlight {
                background-color: #f0f0f0;
                padding: 2px 4px;
                border-radius: 3px;
            }
            
            .tenant-info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .tenant-item {
                margin-bottom: 8px;
            }
            
            .contract-info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .contract-info-item {
                margin-bottom: 8px;
            }
            
            .note-box {
                background-color: #fff3cd;
                border: 1px solid #ffc107;
                padding: 10px;
                margin: 20px 0;
                border-radius: 4px;
            }
            
            .footer {
                margin-top: 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #ccc;
                padding-top: 15px;
            }
            
            .footer-left {
                text-align: left;
            }
            
            .footer-right {
                text-align: right;
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
            <h3>Thông tin hợp đồng (${contract.totalMonths || 0} tháng)</h3>
            <div class="contract-info-grid">
                <div class="contract-info-item">
                    <span class="info-label">Loại hợp đồng:</span>
                    <span class="info-value">${contract.contractType === 'single' ? 'Thuê riêng' : contract.contractType === 'shared' ? 'Thuê chung' : 'Thuê chung'}</span>
                </div>
                <div class="contract-info-item">
                    <span class="info-label">Ngày bắt đầu:</span>
                    <span class="info-value">${startDate}</span>
                </div>
                ${contract.tenants && contract.tenants.length > 0 ? `
                <div class="contract-info-item">
                    <span class="info-label">Ngày chuyển vào:</span>
                    <span class="info-value">${new Date(contract.tenants[0].moveInDate).toLocaleDateString('vi-VN')}</span>
                </div>
                ` : '<div class="contract-info-item"></div>'}
                <div class="contract-info-item">
                    <span class="info-label">Ngày kết thúc:</span>
                    <span class="info-value">${endDate}</span>
                </div>
                <div class="contract-info-item">
                    <span class="info-label">Trạng thái:</span>
                    <span class="info-value">${contract.status === 'active' ? 'Đang hoạt động' : contract.status === 'expired' ? 'Đã hết hạn' : contract.status === 'terminated' ? 'Đã chấm dứt' : contract.status}</span>
                </div>
            </div>
        </div>

        <div class="contract-info">
            <h3>Thông tin phòng</h3>
            ${renderRoomInfo()}
        </div>

        <div class="contract-info">
            <h3>Thông tin tài chính</h3>
            <div class="info-row">
                <span class="info-label">Giá thuê hàng tháng:</span>
                <span class="info-value highlight">${(contract.monthlyRent || 0).toLocaleString('vi-VN')} VND</span>
            </div>
            <div class="info-row">
                <span class="info-label">Tiền cọc:</span>
                <span class="info-value highlight">${(contract.deposit || 0).toLocaleString('vi-VN')} VND</span>
            </div>
            ${renderUtilities()}
        </div>

        <div class="contract-info">
            <h3>Thông tin người thuê</h3>
            ${(contract.tenantDetails || []).map((tenant: any) => `
                <div class="tenant-info-grid">
                    <div class="tenant-item">
                        <span class="info-label">Họ tên:</span>
                        <span class="info-value">${tenant.fullName || 'N/A'}</span>
                    </div>
                    <div class="tenant-item">
                        <span class="info-label">Số điện thoại:</span>
                        <span class="info-value">${tenant.phone || 'N/A'}</span>
                    </div>
                    <div class="tenant-item">
                        <span class="info-label">Email:</span>
                        <span class="info-value">${tenant.email || 'N/A'}</span>
                    </div>
                    <div class="tenant-item">
                        <span class="info-label">Số CCCD:</span>
                        <span class="info-value">${tenant.cccd || 'N/A'}</span>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="terms-section">
            <h3>Điều khoản và điều kiện</h3>
            <ol class="terms-list">
                <li>Bên thuê cam kết thanh toán đúng hạn tiền thuê hàng tháng trước ngày 5 hàng tháng.</li>
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

        <div class="note-box">
            <p><strong>Lưu ý:</strong> Nếu bạn hủy hợp đồng trước thời hạn thì sẽ không được nhận lại tiền cọc.</p>
        </div>

        <div class="footer">
            <div class="footer-left">
                <p>Hợp đồng này được tạo tự động bởi hệ thống quản lý nhà trọ</p>
            </div>
            <div class="footer-right">
                <p>Ngày tạo: ${createdAt}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Chuyển đổi mã nội thất thành text (việt hóa)
   */
  private getFurnitureText(furniture: string): string {
    if (!furniture) return 'N/A';
    
    const furnitureMap: { [key: string]: string } = {
      'co-ban': 'Cơ bản',
      'day-du': 'Đầy đủ',
      'cao-cap': 'Cao cấp',
      'khong': 'Không có',
      'trong': 'Trống',
      'ngoai': 'Ngoài',
      'ban-giao': 'Bàn giao',
    };
    
    // Kiểm tra trong map trước
    const lowerFurniture = furniture.toLowerCase().trim();
    if (furnitureMap[lowerFurniture]) {
      return furnitureMap[lowerFurniture];
    }
    
    // Nếu không có trong map, viết hoa chữ cái đầu
    return furniture.charAt(0).toUpperCase() + furniture.slice(1).toLowerCase();
  }

  /**
   * Chuyển đổi loại căn hộ (chung cư) thành text (việt hóa)
   */
  private getChungCuPropertyTypeText(propertyType: string): string {
    if (!propertyType) return 'N/A';
    
    const propertyTypeMap: { [key: string]: string } = {
      'chung-cu': 'Chung cư',
      'can-ho-dv': 'Căn hộ dịch vụ',
      'officetel': 'Officetel',
      'studio': 'Studio',
    };
    
    const lowerType = propertyType.toLowerCase().trim();
    return propertyTypeMap[lowerType] || propertyType;
  }

  /**
   * Chuyển đổi loại nhà thành text (việt hóa)
   */
  private getPropertyTypeText(propertyType: string): string {
    if (!propertyType) return 'N/A';
    
    const propertyTypeMap: { [key: string]: string } = {
      'nha-pho': 'Nhà phố',
      'biet-thu': 'Biệt thự',
      'nha-hem': 'Nhà hẻm',
      'nha-cap4': 'Nhà cấp 4',
    };
    
    const lowerType = propertyType.toLowerCase().trim();
    return propertyTypeMap[lowerType] || propertyType;
  }

  /**
   * Chuyển đổi tình trạng pháp lý thành text (việt hóa)
   */
  private getLegalStatusText(legalStatus: string): string {
    if (!legalStatus) return 'N/A';
    
    const legalStatusMap: { [key: string]: string } = {
      'co-so-hong': 'Có sổ hồng',
      'cho-so': 'Chờ sổ',
    };
    
    const lowerStatus = legalStatus.toLowerCase().trim();
    return legalStatusMap[lowerStatus] || legalStatus;
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