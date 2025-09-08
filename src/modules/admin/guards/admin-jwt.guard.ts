import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Admin token không hợp lệ');
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
      });

      // Check if token is for admin
      if (payload.role !== 'admin' || payload.type !== 'admin') {
        throw new UnauthorizedException('Không phải admin token');
      }

      request.admin = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Admin token không hợp lệ hoặc đã hết hạn');
    }
  }
}
