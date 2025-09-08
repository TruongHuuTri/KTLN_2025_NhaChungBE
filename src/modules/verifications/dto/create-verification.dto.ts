import { 
  IsString, 
  IsNotEmpty, 
  IsDateString, 
  IsIn, 
  Matches,
  MinLength
} from 'class-validator';

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

  // Không nhận ảnh CCCD từ client - chỉ nhận thông tin đã extract từ OCR
  // frontImage và backImage chỉ xử lý client-side, không gửi lên server
}
