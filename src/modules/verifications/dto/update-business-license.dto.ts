import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateBusinessLicenseDto {
  @IsNotEmpty({ message: 'Giấy phép kinh doanh không được để trống' })
  @IsString({ message: 'Giấy phép kinh doanh phải là chuỗi Base64' })
  businessLicense: string;
}

