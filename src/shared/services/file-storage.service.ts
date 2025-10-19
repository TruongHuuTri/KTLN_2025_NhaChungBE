import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileStorageService {
  private readonly uploadPath = 'uploads/verifications';

  constructor() {
    this.ensureUploadDirectoryExists();
  }

  private ensureUploadDirectoryExists() {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * Lưu ảnh từ base64 vào file system
   */
  async saveImageFromBase64(base64String: string, filename: string): Promise<string> {
    try {
      // Tạo thư mục theo ngày
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      
      const datePath = path.join(this.uploadPath, `${year}/${month}/${day}`);
      
      // Tạo thư mục nếu chưa tồn tại
      if (!fs.existsSync(datePath)) {
        fs.mkdirSync(datePath, { recursive: true });
      }

      // Extract base64 data
      const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Tạo tên file unique
      const timestamp = Date.now();
      const extension = this.getImageExtension(base64String);
      const uniqueFilename = `${filename}_${timestamp}${extension}`;
      
      const filePath = path.join(datePath, uniqueFilename);

      // Lưu file
      fs.writeFileSync(filePath, buffer);

      // Trả về relative path từ uploads/
      return `verifications/${year}/${month}/${day}/${uniqueFilename}`;
    } catch (error) {
      throw new Error(`Failed to save image: ${error.message}`);
    }
  }

  /**
   * Lấy extension từ base64 string
   */
  private getImageExtension(base64String: string): string {
    if (base64String.includes('data:image/jpeg')) return '.jpg';
    if (base64String.includes('data:image/png')) return '.png';
    if (base64String.includes('data:image/gif')) return '.gif';
    if (base64String.includes('data:image/webp')) return '.webp';
    return '.jpg'; // default
  }

  /**
   * Đọc file ảnh
   */
  async getImage(filePath: string): Promise<Buffer> {
    try {
      const fullPath = path.join('uploads', filePath);
      if (!fs.existsSync(fullPath)) {
        throw new Error('File not found');
      }
      return fs.readFileSync(fullPath);
    } catch (error) {
      throw new Error(`Failed to read image: ${error.message}`);
    }
  }

  /**
   * Xóa file ảnh
   */
  async deleteImage(filePath: string): Promise<void> {
    try {
      const fullPath = path.join('uploads', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Kiểm tra file có tồn tại không
   */
  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = path.join('uploads', filePath);
    return fs.existsSync(fullPath);
  }

  /**
   * Lấy URL để serve ảnh
   */
  getImageUrl(filePath: string): string {
    return `/uploads/${filePath}`;
  }

  /**
   * Xóa ảnh cũ theo thời gian (30 ngày)
   */
  async cleanupOldImages(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      let deletedCount = 0;

      const cleanupDirectory = (dirPath: string): void => {
        if (!fs.existsSync(dirPath)) return;

        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            cleanupDirectory(itemPath);
            // Xóa thư mục rỗng
            try {
              fs.rmdirSync(itemPath);
            } catch {
              // Thư mục không rỗng, bỏ qua
            }
          } else if (stats.isFile()) {
            // Xóa file cũ hơn 30 ngày
            if (stats.mtime < thirtyDaysAgo) {
              fs.unlinkSync(itemPath);
              deletedCount++;
              console.log(`Deleted old image: ${itemPath}`);
            }
          }
        }
      };

      cleanupDirectory(this.uploadPath);
      console.log(`Cleanup completed. Deleted ${deletedCount} files.`);
    } catch (error) {
      console.error('Error during image cleanup:', error);
      throw error;
    }
  }

  /**
   * Xóa ảnh của verification cụ thể
   */
  async deleteVerificationImages(verificationId: number): Promise<void> {
    try {
      const findAndDeleteImages = (dirPath: string): void => {
        if (!fs.existsSync(dirPath)) return;

        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            findAndDeleteImages(itemPath);
          } else if (stats.isFile() && item.includes(`verification_${verificationId}_`)) {
            fs.unlinkSync(itemPath);
            console.log(`Deleted verification image: ${itemPath}`);
          }
        }
      };

      findAndDeleteImages(this.uploadPath);
    } catch (error) {
      console.error('Error deleting verification images:', error);
      throw error;
    }
  }
}
