import { Body, Controller, Post } from '@nestjs/common';
import { S3Service } from './s3.service';
import { PresignDto } from './dto/presign.dto';

@Controller('files')
export class S3Controller {
  constructor(private readonly s3: S3Service) {}

  @Post('presign')
  presign(@Body() dto: PresignDto) {
    return this.s3.presignPut(dto.userId, dto.fileName, dto.contentType, dto.folder);
  }
}
