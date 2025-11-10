import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContractsService } from '../../modules/contracts/contracts.service';

@Injectable()
export class ContractExpiryService {
  private readonly logger = new Logger(ContractExpiryService.name);

  constructor(private readonly contractsService: ContractsService) {}

  /**
   * Chạy hàng ngày lúc 00:00 để kiểm tra và expire các hợp đồng hết hạn
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleContractExpiry() {
    this.logger.log('Starting contract expiry check...');
    
    try {
      const result = await this.contractsService.expireContracts();
      
      this.logger.log(
        `Contract expiry check completed: ${result.expired} contracts expired, ${result.errors} errors`
      );
      
      if (result.errors > 0) {
        this.logger.warn(`There were ${result.errors} errors during contract expiry`);
      }
    } catch (error) {
      this.logger.error('Error in handleContractExpiry:', error);
    }
  }

  /**
   * Manual trigger for testing or admin use
   */
  async manualExpireContracts(): Promise<{ expired: number; errors: number }> {
    this.logger.log('Manual contract expiry triggered');
    return this.contractsService.expireContracts();
  }
}

