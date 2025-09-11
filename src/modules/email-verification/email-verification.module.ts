import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailVerification, EmailVerificationSchema } from './schemas/email-verification.schema';
import { EmailVerificationService } from './email-verification.service';
import { EmailService } from '../../shared/services/email.service';
import { OTPService } from '../../shared/services/otp.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailVerification.name, schema: EmailVerificationSchema },
    ]),
  ],
  providers: [EmailVerificationService, EmailService, OTPService],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}
