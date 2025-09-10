import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, GetWardsByProvinceDto } from './dto/address.dto';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createAddressDto: CreateAddressDto) {
    return this.addressesService.create(createAddressDto);
  }

  @Get()
  findAll() {
    return this.addressesService.findAll();
  }

  @Get('provinces')
  getProvinces() {
    return this.addressesService.getProvinces();
  }

  @Get('wards')
  getWardsByProvince(@Query('provinceCode') provinceCode: string) {
    return this.addressesService.getWardsByProvince(provinceCode);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importFromCSV() {
    const filePath = 'c:\\Users\\MinhQuang\\Downloads\\dia-chi-moi-fixed.csv';
    return this.addressesService.importFromCSV(filePath);
  }

  @Post('clear')
  @HttpCode(HttpStatus.OK)
  clearAll() {
    return this.addressesService.clearAll();
  }
}
