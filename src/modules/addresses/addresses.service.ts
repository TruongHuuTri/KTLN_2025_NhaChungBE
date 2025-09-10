import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Address, AddressDocument } from './schemas/address.schema';
import { CreateAddressDto } from './dto/address.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
  ) {}

  async create(createAddressDto: CreateAddressDto): Promise<Address> {
    const createdAddress = new this.addressModel(createAddressDto);
    return createdAddress.save();
  }

  async findAll(): Promise<Address[]> {
    return this.addressModel.find().exec();
  }

  async getProvinces(): Promise<{ provinceCode: string; provinceName: string }[]> {
    const provinces = await this.addressModel.aggregate([
      {
        $group: {
          _id: { provinceCode: '$provinceCode', provinceName: '$provinceName' },
        },
      },
      {
        $project: {
          _id: 0,
          provinceCode: '$_id.provinceCode',
          provinceName: '$_id.provinceName',
        },
      },
      {
        $sort: { provinceName: 1 },
      },
    ]);

    return provinces;
  }

  async getWardsByProvince(provinceCode: string): Promise<Address[]> {
    return this.addressModel
      .find({ provinceCode })
      .select('wardCode wardName')
      .sort({ wardName: 1 })
      .exec();
  }

  async importFromCSV(filePath: string): Promise<{ message: string; imported: number }> {
    try {
      // Đọc file CSV
      const csvContent = fs.readFileSync(filePath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());

      // Bỏ qua header (dòng đầu tiên)
      const dataLines = lines.slice(1);

      let imported = 0;
      const batchSize = 1000; // Import theo batch để tránh quá tải

      for (let i = 0; i < dataLines.length; i += batchSize) {
        const batch = dataLines.slice(i, i + batchSize);
        const addresses = batch
          .map(line => {
            const [provinceCode, provinceName, wardCode, wardName] = line.split(',');
            if (provinceCode && provinceName && wardCode && wardName) {
              return {
                provinceCode: provinceCode.trim(),
                provinceName: provinceName.trim(),
                wardCode: wardCode.trim(),
                wardName: wardName.trim(),
              };
            }
            return null;
          })
          .filter(address => address !== null);

        if (addresses.length > 0) {
          await this.addressModel.insertMany(addresses, { ordered: false });
          imported += addresses.length;
        }
      }

      return {
        message: `Import thành công ${imported} địa chỉ`,
        imported,
      };
    } catch (error) {
      throw new Error(`Lỗi khi import CSV: ${error.message}`);
    }
  }

  async clearAll(): Promise<{ message: string }> {
    await this.addressModel.deleteMany({});
    return { message: 'Đã xóa tất cả dữ liệu địa chỉ' };
  }
}
