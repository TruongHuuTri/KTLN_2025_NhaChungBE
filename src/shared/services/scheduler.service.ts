import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FileStorageService } from './file-storage.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly fileStorageService: FileStorageService) {}

  /**
   * Tự động xóa ảnh cũ mỗi ngày lúc 2:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldImages() {
    this.logger.log('Starting cleanup of old verification images...');
    
    try {
      await this.fileStorageService.cleanupOldImages();
      this.logger.log('Cleanup completed successfully');
    } catch (error) {
      this.logger.error('Error during image cleanup:', error);
    }
  }

  /**
   * Manual cleanup - có thể gọi từ admin
   */
  async manualCleanup(): Promise<{ message: string }> {
    this.logger.log('Manual cleanup triggered');
    
    try {
      await this.fileStorageService.cleanupOldImages();
      return { message: 'Cleanup completed successfully' };
    } catch (error) {
      this.logger.error('Error during manual cleanup:', error);
      throw error;
    }
  }
}
