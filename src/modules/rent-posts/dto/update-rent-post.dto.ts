import { PartialType } from '@nestjs/mapped-types';
import { CreateRentPostDto, CreateAddressDto, CreateBasicInfoDto, CreateChungCuInfoDto, CreateNhaNguyenCanInfoDto } from './create-rent-post.dto';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
export class UpdateBasicInfoDto extends PartialType(CreateBasicInfoDto) {}
export class UpdateChungCuInfoDto extends PartialType(CreateChungCuInfoDto) {}
export class UpdateNhaNguyenCanInfoDto extends PartialType(CreateNhaNguyenCanInfoDto) {}

export class UpdateRentPostDto extends PartialType(CreateRentPostDto) {}
