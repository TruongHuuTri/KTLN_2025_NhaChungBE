import { 
  IsString, 
  IsNotEmpty, 
  IsDateString, 
  IsIn, 
  Matches,
  MinLength,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';

// Bỏ validation cho confidence - chỉ là thông tin bổ sung cho admin

export class FaceMatchResultDto {
  @IsBoolean({ message: 'Face match result phải là boolean' })
  match: boolean;

  @IsNumber({}, { message: 'Similarity phải là số' })
  @Min(0, { message: 'Similarity phải >= 0' })
  @Max(100, { message: 'Similarity phải <= 100' })
  similarity: number;

  // Confidence sẽ được Backend tự động tính dựa trên similarity
  confidence?: 'high' | 'low';
}

export class CreateVerificationDto {
  @IsNotEmpty({ message: 'Số CMND/CCCD không được để trống' })
  @IsString({ message: 'Số CMND/CCCD phải là chuỗi' })
  @Matches(/^(\d{9}|\d{12})$/, { message: 'Số CMND/CCCD phải có 9 hoặc 12 chữ số' })
  idNumber: string;

  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString({ message: 'Họ tên phải là chuỗi' })
  @MinLength(2, { message: 'Họ tên phải có ít nhất 2 ký tự' })
  fullName: string;

  @IsNotEmpty({ message: 'Ngày sinh không được để trống' })
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ (định dạng: YYYY-MM-DD)' })
  dateOfBirth: string;

  @IsNotEmpty({ message: 'Giới tính không được để trống' })
  @IsIn(['male', 'female'], { message: 'Giới tính phải là male hoặc female' })
  gender: string;

  @IsNotEmpty({ message: 'Ngày cấp không được để trống' })
  @IsDateString({}, { message: 'Ngày cấp không hợp lệ (định dạng: YYYY-MM-DD)' })
  issueDate: string;

  @IsNotEmpty({ message: 'Nơi cấp không được để trống' })
  @IsString({ message: 'Nơi cấp phải là chuỗi' })
  issuePlace: string;

  // Kết quả FaceMatch từ Frontend (optional)
  @IsOptional()
  @IsObject({ message: 'FaceMatchResult phải là object' })
  @ValidateNested()
  @Type(() => FaceMatchResultDto)
  faceMatchResult?: FaceMatchResultDto;

  // Ảnh CCCD và selfie (base64 hoặc URL)
  @IsOptional()
  @IsObject({ message: 'Images phải là object' })
  images?: {
    frontImage?: string;
    backImage?: string;
    faceImage?: string;
  };
}
