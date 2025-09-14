import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class LandlordGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Chưa đăng nhập');
    }

    if (user.role !== 'landlord') {
      throw new ForbiddenException('Chỉ landlord mới có quyền truy cập');
    }

    return true;
  }
}
