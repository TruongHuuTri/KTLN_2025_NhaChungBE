import { IsIn } from 'class-validator';

export class ChangeRoleDto {
  @IsIn(['user', 'landlord'], { message: 'Role phải là user hoặc landlord' })
  role: 'user' | 'landlord';
}
