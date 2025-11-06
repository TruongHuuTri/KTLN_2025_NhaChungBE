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
            const parts = line.split(',');
            // Hỗ trợ 2 định dạng CSV:
            // 1) provinceCode, provinceName, wardCode, wardName
            // 2) provinceCode, provinceName, districtCode, districtName, wardCode, wardName
            if (parts.length >= 4) {
              const p0 = parts[0]?.trim();
              const p1 = parts[1]?.trim();
              if (parts.length >= 6) {
                const p2 = parts[2]?.trim();
                const p3 = parts[3]?.trim();
                const p4 = parts[4]?.trim();
                const p5 = parts[5]?.trim();
                if (p0 && p1 && p4 && p5) {
                  return {
                    provinceCode: p0,
                    provinceName: p1,
                    districtCode: p2 || undefined,
                    districtName: p3 || undefined,
                    wardCode: p4,
                    wardName: p5,
                  };
                }
              } else {
                const p2 = parts[2]?.trim();
                const p3 = parts[3]?.trim();
                if (p0 && p1 && p2 && p3) {
              return {
                    provinceCode: p0,
                    provinceName: p1,
                    wardCode: p2,
                    wardName: p3,
              };
                }
              }
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
