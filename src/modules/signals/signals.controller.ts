import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { SignalsService } from './signals.service';
import { ClickEventDto } from './dto/click-event.dto';

@Controller('events')
export class SignalsController {
  constructor(private readonly signals: SignalsService) {}

  @Post('click')
  @HttpCode(HttpStatus.ACCEPTED)
  async logClick(@Body() body: ClickEventDto) {
    // Basic validation: phải có userId và ít nhất một trong postId/roomId
    if (body == null || body.userId == null) {
      return { status: 'ignored', reason: 'missing userId' };
    }
    if (body.postId == null && body.roomId == null) {
      return { status: 'ignored', reason: 'missing postId or roomId' };
    }
    await this.signals.logClick(body);
    return { status: 'ok' };
  }
}
