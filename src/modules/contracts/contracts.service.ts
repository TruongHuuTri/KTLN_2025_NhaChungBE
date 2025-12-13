import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RentalContract, RentalContractDocument } from './schemas/rental-contract.schema';
import { RentalRequest, RentalRequestDocument } from './schemas/rental-request.schema';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { ContractUpdate, ContractUpdateDocument } from './schemas/contract-update.schema';
import { RentalHistory, RentalHistoryDocument } from './schemas/rental-history.schema';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateRentalRequestDto } from './dto/create-rental-request.dto';
import { TerminateContractDto } from './dto/terminate-contract.dto';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Room, RoomDocument } from '../rooms/schemas/room.schema';
import { Building, BuildingDocument } from '../rooms/schemas/building.schema';
import { UpdateStatusDto } from './dto/update-status.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { CreateRoomSharingRequestDto } from './dto/create-room-sharing-request.dto';
import { ApproveRoomSharingDto } from './dto/approve-room-sharing.dto';
import { RoommatePreference, RoommatePreferenceDocument } from '../roommate-preferences/schemas/roommate-preference.schema';
import { Verification, VerificationDocument } from '../verifications/schemas/verification.schema';

@Injectable()
export class ContractsService {
  constructor(
    @InjectModel(RentalContract.name) private contractModel: Model<RentalContractDocument>,
    @InjectModel(RentalRequest.name) private rentalRequestModel: Model<RentalRequestDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(ContractUpdate.name) private contractUpdateModel: Model<ContractUpdateDocument>,
    @InjectModel(RentalHistory.name) private rentalHistoryModel: Model<RentalHistoryDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Building.name) private buildingModel: Model<BuildingDocument>,
    @InjectModel(RoommatePreference.name) private preferenceModel: Model<RoommatePreferenceDocument>,
    @InjectModel(Verification.name) private verificationModel: Model<VerificationDocument>,
  ) {}

  // Rental Contract Management
  async createContract(contractData: CreateContractDto & { landlordId: number }): Promise<RentalContract> {
    const contractId = await this.getNextContractId();
    const contract = new this.contractModel({
      contractId,
      ...contractData,
    });
    return contract.save();
  }

  async getContractsByLandlord(landlordId: number): Promise<RentalContract[]> {
    return this.contractModel.find({ landlordId }).sort({ createdAt: -1 }).exec();
  }

  async getContractById(contractId: number): Promise<RentalContract> {
    const contract = await this.contractModel.findOne({ contractId }).exec();
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    return contract as RentalContract;
  }

  async getUserContract(userId: number, contractId: number): Promise<RentalContract> {
    const contract = await this.contractModel.findOne({ contractId }).exec();
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    
    // Check if user is a tenant in this contract
    const isTenant = contract.tenants.some(tenant => {
      // Convert both to numbers to handle string/number mismatch
      const tenantIdNum = Number(tenant.tenantId);
      const userIdNum = Number(userId);
      return tenantIdNum === userIdNum;
    });
    
    if (!isTenant) {
      throw new BadRequestException('User is not authorized to view this contract');
    }
    
    return contract as RentalContract;
  }

  /**
   * Lấy thông tin hợp đồng đầy đủ để tạo PDF (bao gồm room, tenant details, verification)
   */
  async getEnrichedContractData(userId: number, contractId: number): Promise<any> {
    const contract = await this.getUserContract(userId, contractId);
    
    // Lấy thông tin phòng
    const room = await this.roomModel.findOne({ roomId: contract.roomId }).lean().exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Lấy thông tin building
    const building = room.buildingId ? await this.buildingModel.findOne({ buildingId: room.buildingId }).lean().exec() : null;

    // Lấy thông tin chi tiết của từng tenant (bao gồm verification)
    const tenantDetails = await Promise.all(
      contract.tenants.map(async (tenant: any) => {
        const user = await this.userModel.findOne({ userId: tenant.tenantId }).lean().exec();
        const verification = user?.verificationId 
          ? await this.verificationModel.findOne({ verificationId: user.verificationId }).lean().exec()
          : null;

        return {
          tenantId: tenant.tenantId,
          fullName: user?.name || 'N/A',
          phone: user?.phone || 'N/A',
          email: user?.email || 'N/A',
          cccd: verification?.idNumber || 'N/A',
          moveInDate: tenant.moveInDate,
          status: tenant.status,
        };
      })
    );

    // Tính tổng số tháng
    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);
    const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());

    // Convert contract to plain object if it's a Mongoose document
    const contractObj = contract && typeof contract === 'object' && 'toObject' in contract 
      ? (contract as any).toObject() 
      : contract;

    return {
      ...contractObj,
      room: {
        category: room.category,
        chungCuInfo: room.chungCuInfo,
        nhaNguyenCanInfo: room.nhaNguyenCanInfo,
        floor: (room as any).floor,
        furniture: room.furniture,
        utilities: room.utilities,
        roomNumber: room.roomNumber,
        area: room.area,
        buildingName: building?.name,
        building: building ? {
          id: building.buildingId,
          name: building.name,
          buildingType: building.buildingType,
        } : null,
      },
      tenantDetails,
      totalMonths: monthsDiff,
    };
  }

  async updateContract(contractId: number, updateData: any): Promise<RentalContract> {
    const contract = await this.contractModel.findOneAndUpdate(
      { contractId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).exec();
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    return contract as RentalContract;
  }

  async addTenantToContract(contractId: number, tenantData: any): Promise<RentalContract> {
    const contract = await this.getContractById(contractId);
    
    // Không giới hạn sức chứa: bỏ kiểm tra maxOccupancy

    const updatedContract = await this.contractModel.findOneAndUpdate(
      { contractId },
      {
        $push: { tenants: { ...tenantData, status: 'active' } },
        $inc: { 'roomInfo.currentOccupancy': 1 },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    ).exec();

    if (!updatedContract) {
      throw new NotFoundException('Contract not found');
    }

    // Log contract update
    await this.logContractUpdate(contractId, 'add_tenant', tenantData, contract.landlordId);

    return updatedContract as RentalContract;
  }

  async removeTenantFromContract(contractId: number, tenantId: number): Promise<RentalContract> {
    const contract = await this.getContractById(contractId);
    
    const tenant = contract.tenants.find(t => t.tenantId === tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found in contract');
    }

    const updatedContract = await this.contractModel.findOneAndUpdate(
      { contractId },
      {
        $pull: { tenants: { tenantId } },
        $inc: { 'roomInfo.currentOccupancy': -1 },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    ).exec();

    if (!updatedContract) {
      throw new NotFoundException('Contract not found');
    }

    // Log contract update
    await this.logContractUpdate(contractId, 'remove_tenant', { tenantId }, contract.landlordId);

    return updatedContract as RentalContract;
  }


  // Rental Request Management
  async createRentalRequest(requestData: CreateRentalRequestDto & { tenantId: number }): Promise<RentalRequest> {
    // Lấy thông tin post để tự động lấy landlordId và roomId
    const post = await this.postModel.findOne({ postId: requestData.postId }).exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    
    const requestId = await this.getNextRequestId();
    const request = new this.rentalRequestModel({
      requestId,
      tenantId: requestData.tenantId,
      landlordId: post.landlordId,
      roomId: post.roomId,
      postId: requestData.postId,
      requestedMoveInDate: requestData.requestedMoveInDate,
      requestedDuration: requestData.requestedDuration,
      message: requestData.message,
    });
    return request.save();
  }

  async getRentalRequestsByLandlord(landlordId: number): Promise<any[]> {
    const requests = await this.rentalRequestModel.find({ landlordId }).sort({ createdAt: -1 }).exec();
    
    // Populate tenant and room info for each request
    const populatedRequests = await Promise.all(
      requests.map(async (request) => {
        const tenant = await this.userModel.findOne({ userId: request.tenantId }).exec();
        const room = await this.roomModel.findOne({ roomId: request.roomId }).exec();
        const building = room ? await this.buildingModel.findOne({ buildingId: room.buildingId }).exec() : null;

        return {
          ...request.toObject(),
          tenantInfo: tenant ? {
            fullName: tenant.name,
            email: tenant.email,
            phone: tenant.phone
          } : null,
          roomInfo: room ? {
            roomType: room.category,
            roomNumber: room.roomNumber,
            buildingName: building?.name || 'Unknown',
            address: building ? `${building.address.street}, ${building.address.wardName}, ${building.address.provinceName}` : 'Unknown'
          } : null
        };
      })
    );

    return populatedRequests;
  }

  async getRentalRequestsByTenant(tenantId: number): Promise<RentalRequest[]> {
    return this.rentalRequestModel.find({ tenantId }).sort({ createdAt: -1 }).exec();
  }


  async getRentalRequestById(requestId: number): Promise<RentalRequest> {
    const request = await this.rentalRequestModel.findOne({ requestId }).exec();
    if (!request) {
      throw new NotFoundException('Rental request not found');
    }
    return request;
  }

  async updateRentalRequestStatus(requestId: number, status: string, landlordResponse?: string): Promise<RentalRequest> {
    const updateData: any = { status, updatedAt: new Date() };
    if (landlordResponse) {
      updateData.landlordResponse = landlordResponse;
      updateData.respondedAt = new Date();
    }

    const request = await this.rentalRequestModel.findOneAndUpdate(
      { requestId },
      updateData,
      { new: true }
    ).exec();
    if (!request) {
      throw new NotFoundException('Rental request not found');
    }

    // Tự động tạo hợp đồng và hóa đơn khi chủ nhà duyệt yêu cầu thuê
    // Tenant sẽ được thêm vào room sau khi thanh toán thành công
    if (status === 'approved') {
      try {
        const contractId = await this.autoCreateContractFromRequest(request);
        await this.autoCreateInvoiceFromRequest(request, contractId);
      } catch (error) {
        // Log lỗi nhưng vẫn cập nhật status của rental request
      }
    }

    return request;
  }

  private async autoCreateContractFromRequest(request: RentalRequest): Promise<number> {
    try {
      // Lấy thông tin phòng từ post
      const post = await this.postModel.findOne({ postId: request.postId }).exec();
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Lấy thông tin phòng từ room
      const room = await this.roomModel.findOne({ roomId: request.roomId }).exec();
      if (!room) {
        throw new NotFoundException('Room not found');
      }

      // Tạo hợp đồng tự động
      const contractId = await this.getNextContractId();
      const startDate = new Date(request.requestedMoveInDate);
      const endDate = new Date(startDate.getTime() + (request.requestedDuration * 30 * 24 * 60 * 60 * 1000));

      const contract = new this.contractModel({
        contractId,
        landlordId: request.landlordId,
        roomId: request.roomId,
        contractType: 'single', // Mặc định là single
        status: 'active', // Tự động active khi approve
        startDate,
        endDate,
        monthlyRent: post.roomInfo?.basicInfo?.price || room.price || 0,
        deposit: post.roomInfo?.basicInfo?.deposit || room.deposit || 0,
        tenants: [{
          tenantId: request.tenantId,
          moveInDate: startDate,
          monthlyRent: post.roomInfo?.basicInfo?.price || room.price || 0,
          deposit: post.roomInfo?.basicInfo?.deposit || room.deposit || 0,
          status: 'active'
        }],
        roomInfo: {
          roomNumber: room.roomNumber,
          area: room.area,
          currentOccupancy: 1
        }
      });

      await contract.save();
      
      // Thêm tenant vào room.currentTenants ngay khi tạo hợp đồng
      const tenant = await this.userModel.findOne({ userId: request.tenantId }).exec();
      if (tenant) {
        const existingTenant = room.currentTenants?.find(t => t.userId === request.tenantId);
        if (!existingTenant) {
          const tenantData = {
            userId: request.tenantId,
            fullName: tenant.name,
            dateOfBirth: new Date(),
            gender: 'unknown',
            occupation: 'unknown',
            moveInDate: startDate,
            lifestyle: 'unknown',
            cleanliness: 'unknown'
          };

          await this.roomModel.findOneAndUpdate(
            { roomId: request.roomId },
            {
              $push: { currentTenants: tenantData },
              status: 'occupied',
              updatedAt: new Date()
            }
          ).exec();
        } else {
          // Tenant đã tồn tại, chỉ cập nhật status
          await this.roomModel.findOneAndUpdate(
            { roomId: request.roomId },
            { status: 'occupied', updatedAt: new Date() }
          ).exec();
        }
      } else {
        // Nếu không tìm thấy user, vẫn cập nhật status
        await this.roomModel.findOneAndUpdate(
          { roomId: request.roomId },
          { status: 'occupied', updatedAt: new Date() }
        ).exec();
      }
      
      // Cập nhật rental request với contractId (nếu schema có field này)
      await this.rentalRequestModel.findOneAndUpdate(
        { requestId: request.requestId },
        { $set: { contractId: contractId } }
      ).exec();

      return contractId;
    } catch (error) {
      // Log lỗi nhưng không throw để không ảnh hưởng đến việc approve request
      throw error; // Throw để updateRentalRequestStatus biết có lỗi
    }
  }

  private async autoCreateInvoiceFromRequest(request: RentalRequest, contractId?: number): Promise<void> {
    try {
      const contractIdToUse = contractId || request.contractId;
      const contract = await this.contractModel.findOne({ contractId: contractIdToUse }).exec();
      if (!contract) {
        throw new NotFoundException('Contract not found');
      }

      const invoiceId = await this.getNextInvoiceId();
      const dueDate = new Date(request.requestedMoveInDate);
      
      // Tạo hóa đơn tiền cọc và tiền thuê tháng đầu
      const invoice = new this.invoiceModel({
        invoiceId,
        contractId: contractIdToUse,
        roomId: request.roomId,
        tenantId: request.tenantId,
        landlordId: request.landlordId,
        invoiceType: 'initial_payment',
        amount: contract.deposit + contract.monthlyRent, // Tiền cọc + tiền thuê tháng đầu
        status: 'pending',
        dueDate,
        description: `Tiền cọc và tiền thuê tháng đầu - Phòng ${contract.roomInfo.roomNumber}`,
        items: [
          {
            description: 'Tiền cọc',
            amount: contract.deposit,
            type: 'deposit'
          },
          {
            description: 'Tiền thuê tháng đầu',
            amount: contract.monthlyRent,
            type: 'rent'
          }
        ]
      });

      await invoice.save();

    } catch (error) {
      // Error handling
    }
  }

  private async autoAddTenantToRoom(request: RentalRequest): Promise<void> {
    try {
      // Lấy thông tin user
      const user = await this.userModel.findOne({ userId: request.tenantId }).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Tạo tenant data cho room
      const tenantData = {
        userId: request.tenantId,
        fullName: user.name,
        dateOfBirth: new Date(), // Có thể cần lấy từ user profile
        gender: 'unknown', // Có thể cần lấy từ user profile
        occupation: 'unknown', // Có thể cần lấy từ user profile
        moveInDate: request.requestedMoveInDate,
        lifestyle: 'unknown', // Có thể cần lấy từ user profile
        cleanliness: 'unknown' // Có thể cần lấy từ user profile
      };

      // Lấy thông tin room hiện tại để tính availableSpots
      const currentRoom = await this.roomModel.findOne({ roomId: request.roomId }).exec();
      if (!currentRoom) {
        throw new NotFoundException('Room not found');
      }

      // Cập nhật room occupancy
      await this.roomModel.findOneAndUpdate(
        { roomId: request.roomId },
        {
          $push: { currentTenants: tenantData },
          $inc: { currentOccupants: 1 },
          $set: { updatedAt: new Date() }
        }
      ).exec();

    } catch (error) {
      // Log lỗi nhưng không throw để không ảnh hưởng đến việc approve request
    }
  }

  // Invoice Management - Removed manual invoice creation

  /**
   * Tự động tạo hóa đơn hàng tháng cho hợp đồng (bao gồm tiền thuê + các phí)
   */
  async createMonthlyRentInvoice(contractId: number, month: number, year: number): Promise<Invoice> {
    const contract = await this.contractModel.findOne({ contractId }).exec();
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Lấy thông tin phòng để tính các phí
    const room = await this.roomModel.findOne({ roomId: contract.roomId }).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Kiểm tra xem hóa đơn tháng này đã tồn tại chưa
    const existingInvoice = await this.invoiceModel.findOne({
      contractId,
      invoiceType: 'monthly_rent',
      'items.type': 'rent',
      createdAt: {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1)
      }
    }).exec();

    if (existingInvoice) {
      throw new BadRequestException('Monthly rent invoice already exists for this month');
    }

    const invoiceId = await this.getNextInvoiceId();
    const dueDate = new Date(year, month - 1, 1); // Ngày 1 của tháng
    
    // Tính tổng số tiền và tạo danh sách items
    const items: Array<{
      description: string;
      amount: number;
      type: string;
    }> = [];
    let totalAmount = 0;

    // 1. Tiền thuê phòng
    items.push({
      description: `Tiền thuê tháng ${month}/${year}`,
      amount: contract.monthlyRent,
      type: 'rent'
    });
    totalAmount += contract.monthlyRent;

    // 2. Các phí tiện ích (chỉ tính những phí KHÔNG được bao gồm trong tiền thuê)
    if (room.utilities) {
      const utilities = room.utilities;

      // Phí điện
      if (utilities.electricityPricePerKwh > 0) {
        items.push({
          description: `Phí điện tháng ${month}/${year}`,
          amount: utilities.electricityPricePerKwh,
          type: 'electricity'
        });
        totalAmount += utilities.electricityPricePerKwh;
      }

      // Phí nước
      if (utilities.waterPrice > 0) {
        items.push({
          description: `Phí nước tháng ${month}/${year}`,
          amount: utilities.waterPrice,
          type: 'water'
        });
        totalAmount += utilities.waterPrice;
      }

      // Phí internet
      if (utilities.internetFee > 0) {
        items.push({
          description: `Phí internet tháng ${month}/${year}`,
          amount: utilities.internetFee,
          type: 'internet'
        });
        totalAmount += utilities.internetFee;
      }

      // Phí rác
      if (utilities.garbageFee > 0) {
        items.push({
          description: `Phí rác tháng ${month}/${year}`,
          amount: utilities.garbageFee,
          type: 'garbage'
        });
        totalAmount += utilities.garbageFee;
      }

      // Phí vệ sinh
      if (utilities.cleaningFee > 0) {
        items.push({
          description: `Phí vệ sinh tháng ${month}/${year}`,
          amount: utilities.cleaningFee,
          type: 'cleaning'
        });
        totalAmount += utilities.cleaningFee;
      }

      // Phí gửi xe
      if (utilities.parkingFee > 0) {
        items.push({
          description: `Phí gửi xe tháng ${month}/${year}`,
          amount: utilities.parkingFee,
          type: 'parking'
        });
        totalAmount += utilities.parkingFee;
      }

      // Phí quản lý
      if (utilities.managementFee > 0) {
        items.push({
          description: `Phí quản lý tháng ${month}/${year}`,
          amount: utilities.managementFee,
          type: 'management'
        });
        totalAmount += utilities.managementFee;
      }
    }

    // Tạo description động dựa trên các items
    const itemDescriptions = items.map(item => item.description).join(', ');
    
    const invoice = new this.invoiceModel({
      invoiceId,
      contractId,
      roomId: contract.roomId,
      tenantId: contract.tenants[0].tenantId, // Lấy tenant đầu tiên
      landlordId: contract.landlordId,
      invoiceType: 'monthly_rent',
      amount: totalAmount,
      status: 'pending',
      dueDate,
      description: `Hóa đơn tháng ${month}/${year} - Phòng ${contract.roomInfo.roomNumber}: ${itemDescriptions}`,
      items
    });

    await invoice.save();
    
    return invoice;
  }

  /**
   * Tạo hoá đơn thủ công theo số liệu chủ nhà nhập (điện/nước/phí khác) cho tháng/năm
   */
  async createManualMonthlyInvoice(
    landlordId: number,
    data: import('./dto/create-manual-invoice.dto').CreateManualInvoiceDto
  ): Promise<Invoice> {
    const { month, year } = data;
    // Nới lỏng: chấp nhận nhiều key để tránh sai sót từ FE
    const rawBody: any = data as any;
    const contractIdRaw = rawBody.contractId ?? rawBody.contractID ?? rawBody.id ?? rawBody.contract_id;
    const candidates: Array<number | string> = [];
    if (contractIdRaw !== undefined && contractIdRaw !== null) {
      const asNum = Number(contractIdRaw);
      if (Number.isFinite(asNum)) candidates.push(asNum);
      const asStr = String(contractIdRaw);
      if (asStr.length > 0) candidates.push(asStr);
    }
    if (candidates.length === 0) {
      throw new BadRequestException('Invalid contractId');
    }

    // Tìm hợp đồng theo contractId (chấp nhận cả number và string) và đúng landlord
    const contract = await this.contractModel.findOne({
      $and: [
        { landlordId: Number(landlordId) },
        { $or: candidates.map((v) => ({ contractId: v })) }
      ]
    }).exec();
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    // landlord đã được ràng buộc trong truy vấn

    const room = await this.roomModel.findOne({ roomId: contract.roomId }).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const invoiceId = await this.getNextInvoiceId();

    const dueDate = data.dueDate
      ? new Date(data.dueDate)
      : new Date(year, month - 1, 15);

    const items: Array<{ description: string; amount: number; type: string }>= [];
    let totalAmount = 0;

    // Rent
    const includeRent = data.includeRent !== false;
    if (includeRent) {
      const rentAmount = typeof data.rentAmountOverride === 'number' ? data.rentAmountOverride : (contract.monthlyRent || 0);
      if (rentAmount > 0) {
        items.push({ description: `Tiền thuê tháng ${month}/${year}`, amount: rentAmount, type: 'rent' });
        totalAmount += rentAmount;
      }
    }

    // Electricity
    const hasElectricityNumbers = typeof data.electricityStart === 'number' && typeof data.electricityEnd === 'number';
    if (hasElectricityNumbers) {
      const kwh = Math.max(0, (data.electricityEnd as number) - (data.electricityStart as number));
      const unitPrice = typeof data.electricityUnitPrice === 'number' && data.electricityUnitPrice! >= 0
        ? data.electricityUnitPrice as number
        : (room.utilities?.electricityPricePerKwh || 0);
      const amount = kwh * unitPrice;
      if (amount > 0) {
        items.push({ description: `Điện: ${kwh} kWh x ${unitPrice.toLocaleString()}đ`, amount, type: 'electricity' });
        totalAmount += amount;
      }
    }

    // Water
    const hasWaterNumbers = typeof data.waterStart === 'number' && typeof data.waterEnd === 'number';
    if (hasWaterNumbers) {
      const m3 = Math.max(0, (data.waterEnd as number) - (data.waterStart as number));
      const unitPrice = typeof data.waterUnitPrice === 'number' && data.waterUnitPrice! >= 0
        ? data.waterUnitPrice as number
        : (room.utilities?.waterPrice || 0);
      const amount = m3 * unitPrice;
      if (amount > 0) {
        items.push({ description: `Nước: ${m3} m³ x ${unitPrice.toLocaleString()}đ`, amount, type: 'water' });
        totalAmount += amount;
      }
    }

    // Other items
    if (Array.isArray(data.otherItems)) {
      for (const it of data.otherItems) {
        if (!it || typeof it.amount !== 'number' || it.amount <= 0) continue;
        items.push({ description: it.description || 'Khoản phí khác', amount: it.amount, type: it.type || 'other' });
        totalAmount += it.amount;
      }
    }

    if (items.length === 0 || totalAmount <= 0) {
      throw new BadRequestException('Invoice has no payable items');
    }

    const tenantId = contract.tenants && contract.tenants.length > 0
      ? Number(contract.tenants[0].tenantId)
      : undefined;
    if (!tenantId) {
      throw new BadRequestException('Contract has no tenant to bill');
    }

    const descriptionParts = items.map(i => i.description);
    if (data.note) descriptionParts.push(data.note);

    const invoice = new this.invoiceModel({
      invoiceId,
      contractId: Number(contract.contractId),
      roomId: contract.roomId,
      tenantId,
      landlordId: contract.landlordId,
      invoiceType: 'monthly_rent',
      amount: totalAmount,
      status: 'pending',
      dueDate,
      description: `Hóa đơn tháng ${month}/${year} - ${descriptionParts.join('; ')}`,
      items
    });

    await invoice.save();
    return invoice;
  }

  /**
   * Tạo hóa đơn hàng tháng cho tất cả hợp đồng active
   */
  async createMonthlyInvoicesForAllContracts(): Promise<{ created: number; errors: number }> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    let created = 0;
    let errors = 0;

    try {
      // Lấy tất cả hợp đồng active
      const activeContracts = await this.contractModel.find({ 
        status: 'active',
        endDate: { $gte: now } // Chưa hết hạn
      }).exec();

      for (const contract of activeContracts) {
        try {
          await this.createMonthlyRentInvoice(contract.contractId, currentMonth, currentYear);
          created++;
        } catch (error) {
          errors++;
        }
      }

      return { created, errors };

    } catch (error) {
      return { created, errors: errors + 1 };
    }
  }

  async getInvoicesByLandlord(landlordId: number): Promise<Invoice[]> {
    const invoices = await this.invoiceModel.find({ landlordId }).sort({ createdAt: -1 }).lean().exec();
    // Đảm bảo response luôn có roomId và contractId
    return invoices.map(invoice => ({
      ...invoice,
      roomId: invoice.roomId ?? null,
      contractId: invoice.contractId ?? null,
    })) as Invoice[];
  }

  async getInvoicesByTenant(tenantId: number): Promise<Invoice[]> {
    const invoices = await this.invoiceModel.find({ tenantId }).sort({ createdAt: -1 }).lean().exec();
    // Đảm bảo response luôn có roomId và contractId
    return invoices.map(invoice => ({
      ...invoice,
      roomId: invoice.roomId ?? null,
      contractId: invoice.contractId ?? null,
    })) as Invoice[];
  }

  async getInvoiceById(invoiceId: number): Promise<Invoice> {
    const invoice = await this.invoiceModel.findOne({ invoiceId }).lean().exec();
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    // Đảm bảo response luôn có roomId và contractId
    return {
      ...invoice,
      roomId: invoice.roomId ?? null,
      contractId: invoice.contractId ?? null,
    } as Invoice;
  }

  async updateInvoiceStatus(invoiceId: number, status: string, paymentMethod?: string): Promise<Invoice> {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'paid') {
      updateData.paidDate = new Date();
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }
    }

    const invoice = await this.invoiceModel.findOneAndUpdate(
      { invoiceId },
      updateData,
      { new: true }
    ).lean().exec();
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    // Đảm bảo response luôn có roomId và contractId
    return {
      ...invoice,
      roomId: invoice.roomId ?? null,
      contractId: invoice.contractId ?? null,
    } as Invoice;
  }

  /**
   * Dashboard summary for landlord: contracts, revenue, rooms, posts
   */
  async getLandlordDashboardSummary(landlordId: number, from?: string, to?: string): Promise<any> {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Contracts
    const totalContracts = await this.contractModel.countDocuments({ landlordId }).exec();
    const activeContracts = await this.contractModel.countDocuments({ landlordId, status: 'active' }).exec();
    const expiredContracts = await this.contractModel.countDocuments({ landlordId, endDate: { $lt: now } }).exec();
    const expiringSoonContracts = await this.contractModel.countDocuments({ landlordId, endDate: { $gte: now, $lte: in30Days } }).exec();

    // Revenue (sum of paid invoices amount)
    const paidMatch: any = { landlordId: Number(landlordId), status: 'paid' };
    if (from) {
      paidMatch.paidDate = paidMatch.paidDate || {};
      paidMatch.paidDate.$gte = new Date(from);
    }
    if (to) {
      paidMatch.paidDate = paidMatch.paidDate || {};
      paidMatch.paidDate.$lte = new Date(to);
    }
    const paidInvoices = await this.invoiceModel.aggregate([
      { $match: paidMatch },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).exec();
    const revenueTotal = paidInvoices?.[0]?.total || 0;

    // Revenue by month (last 12 months or from/to)
    const rangeStart = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const rangeEnd = to ? new Date(to) : now;
    const revenueByMonthAgg = await this.invoiceModel.aggregate([
      { $match: { landlordId: Number(landlordId), status: 'paid', paidDate: { $gte: rangeStart, $lte: rangeEnd } } },
      { $group: { _id: { y: { $year: '$paidDate' }, m: { $month: '$paidDate' } }, amount: { $sum: '$amount' } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ]).exec();
    const revenueByMonth = revenueByMonthAgg.map((r: any) => ({ year: r._id.y, month: r._id.m, amount: r.amount }));

    // Rooms (available/occupied)
    const totalRooms = await this.roomModel.countDocuments({ landlordId }).exec();
    const availableRooms = await this.roomModel.countDocuments({ landlordId, status: 'available' }).exec();
    const occupiedRooms = await this.roomModel.countDocuments({ landlordId, status: 'occupied' }).exec();

    // Posts by status for landlord
    const postStatuses = ['pending', 'active', 'inactive', 'rejected', 'approved'];
    const postsByStatus: Record<string, number> = {};
    await Promise.all(postStatuses.map(async (s) => {
      postsByStatus[s] = await this.postModel.countDocuments({ landlordId, status: s }).exec();
    }));
    const postsTotal = await this.postModel.countDocuments({ landlordId }).exec();

    return {
      contracts: {
        total: totalContracts,
        active: activeContracts,
        expired: expiredContracts,
        expiringSoon: expiringSoonContracts
      },
      revenue: {
        totalPaid: revenueTotal,
        byMonth: revenueByMonth
      },
      rooms: {
        total: totalRooms,
        available: availableRooms,
        occupied: occupiedRooms
      },
      posts: {
        total: postsTotal,
        byStatus: postsByStatus
      }
    };
  }


  // Helper methods
  private async getNextContractId(): Promise<number> {
    const lastContract = await this.contractModel.findOne().sort({ contractId: -1 }).exec();
    return lastContract ? lastContract.contractId + 1 : 1;
  }

  private async getNextRequestId(): Promise<number> {
    const lastRequest = await this.rentalRequestModel.findOne().sort({ requestId: -1 }).exec();
    return lastRequest ? lastRequest.requestId + 1 : 1;
  }

  private async getNextInvoiceId(): Promise<number> {
    const lastInvoice = await this.invoiceModel.findOne().sort({ invoiceId: -1 }).exec();
    return lastInvoice ? lastInvoice.invoiceId + 1 : 1;
  }


  private async logContractUpdate(contractId: number, updateType: string, updateData: any, updatedBy: number): Promise<void> {
    const contractUpdate = new this.contractUpdateModel({
      contractId,
      updateType,
      updateData,
      updatedBy,
    });
    await contractUpdate.save();
  }

  // Room Sharing Management
  async createRoomSharingRequest(roomId: number, requestData: CreateRoomSharingRequestDto & { tenantId: number }): Promise<RentalRequest> {
    // Lấy thông tin post để lấy posterId
    const post = await this.postModel.findOne({ postId: requestData.postId }).exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Lấy thông tin phòng
    const room = await this.roomModel.findOne({ roomId }).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Bỏ kiểm tra số lượng người ở (không giới hạn sức chứa)

    // Kiểm tra user chưa đăng ký ở ghép phòng này
    const existingRequest = await this.rentalRequestModel.findOne({
      tenantId: requestData.tenantId,
      roomId,
      requestType: 'room_sharing',
      status: { $in: ['pending', 'pending_user_approval', 'pending_landlord_approval'] }
    }).exec();

    if (existingRequest) {
      throw new BadRequestException('You have already requested to share this room');
    }

    const requestId = await this.getNextRequestId();
    const request = new this.rentalRequestModel({
      requestId,
      tenantId: requestData.tenantId,
      landlordId: room.landlordId,
      roomId,
      postId: requestData.postId,
      requestType: 'room_sharing',
      status: 'pending_user_approval',
      message: requestData.message,
      requestedMoveInDate: new Date(requestData.requestedMoveInDate),
      requestedDuration: requestData.requestedDuration,
      posterId: post.userId, // Người đăng bài (tạo post)
    });
    return request.save();
  }

  async approveRoomSharingByUser(requestId: number, userId: number): Promise<RentalRequest> {
    const request = await this.rentalRequestModel.findOne({ requestId }).exec();
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Kiểm tra quyền duyệt
    if (Number(request.posterId) !== Number(userId)) {
      throw new BadRequestException('You are not authorized to approve this request');
    }

    // Kiểm tra status
    if (request.status !== 'pending_user_approval') {
      throw new BadRequestException('Request is not in pending user approval status');
    }

    // Cập nhật status
    const updatedRequest = await this.rentalRequestModel.findOneAndUpdate(
      { requestId },
      { 
        status: 'pending_landlord_approval',
        updatedAt: new Date()
      },
      { new: true }
    ).exec();

    if (!updatedRequest) {
      throw new NotFoundException('Request not found');
    }

    return updatedRequest;
  }

  async rejectRoomSharingByUser(requestId: number, userId: number): Promise<RentalRequest> {
    const request = await this.rentalRequestModel.findOne({ requestId }).exec();
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Kiểm tra quyền từ chối
    if (Number(request.posterId) !== Number(userId)) {
      throw new BadRequestException('You are not authorized to reject this request');
    }

    // Kiểm tra status
    if (request.status !== 'pending_user_approval') {
      throw new BadRequestException('Request is not in pending user approval status');
    }

    // Cập nhật status
    const updatedRequest = await this.rentalRequestModel.findOneAndUpdate(
      { requestId },
      { 
        status: 'rejected',
        respondedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    ).exec();

    if (!updatedRequest) {
      throw new NotFoundException('Request not found');
    }

    return updatedRequest;
  }

  async approveRoomSharingByLandlord(requestId: number, landlordId: number): Promise<{ request: RentalRequest; contract: RentalContract }> {
    const request = await this.rentalRequestModel.findOne({ requestId }).exec();
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Kiểm tra quyền duyệt
    if (Number(request.landlordId) !== Number(landlordId)) {
      throw new BadRequestException('You are not authorized to approve this request');
    }

    // Kiểm tra status
    if (request.status !== 'pending_landlord_approval') {
      throw new BadRequestException('Request is not in pending landlord approval status');
    }

    // Lấy thông tin phòng
    const room = await this.roomModel.findOne({ roomId: request.roomId }).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Không giới hạn sức chứa

    // Tạo contract cho room sharing
    const contractId = await this.getNextContractId();
    const startDate = new Date(request.requestedMoveInDate);
    const endDate = new Date(startDate.getTime() + (request.requestedDuration * 30 * 24 * 60 * 60 * 1000));

    const contract = new this.contractModel({
      contractId,
      landlordId: request.landlordId,
      roomId: request.roomId,
      contractType: 'shared',
      status: 'active',
      startDate,
      endDate,
      monthlyRent: 0, // User B không thanh toán hóa đơn
      deposit: 0, // User B không đóng cọc
      tenants: [{
        tenantId: request.tenantId,
        moveInDate: startDate,
        monthlyRent: 0,
        deposit: 0,
        status: 'active',
        isPrimaryTenant: false
      }],
      roomInfo: {
        roomNumber: room.roomNumber,
        area: room.area,
        currentOccupancy: (room.currentTenants?.length || 0) + 1
      }
    });

    await contract.save();

    // Cập nhật room - thêm tenant mới
    const user = await this.userModel.findOne({ userId: request.tenantId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tenantData = {
      userId: request.tenantId,
      fullName: user.name,
      dateOfBirth: new Date(),
      gender: 'unknown',
      occupation: 'unknown',
      moveInDate: startDate,
      lifestyle: 'unknown',
      cleanliness: 'unknown'
    };

    await this.roomModel.findOneAndUpdate(
      { roomId: request.roomId },
      {
        $push: { currentTenants: tenantData },
        $set: { updatedAt: new Date() }
      }
    ).exec();

    // Cập nhật request status
    const updatedRequest = await this.rentalRequestModel.findOneAndUpdate(
      { requestId },
      { 
        status: 'approved',
        contractId,
        respondedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    ).exec();

    if (!updatedRequest) {
      throw new NotFoundException('Request not found');
    }

    return { request: updatedRequest, contract };
  }

  async rejectRoomSharingByLandlord(requestId: number, landlordId: number): Promise<RentalRequest> {
    const request = await this.rentalRequestModel.findOne({ requestId }).exec();
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Kiểm tra quyền từ chối
    if (Number(request.landlordId) !== Number(landlordId)) {
      throw new BadRequestException('You are not authorized to reject this request');
    }

    // Kiểm tra status
    if (request.status !== 'pending_landlord_approval') {
      throw new BadRequestException('Request is not in pending landlord approval status');
    }

    // Cập nhật status
    const updatedRequest = await this.rentalRequestModel.findOneAndUpdate(
      { requestId },
      { 
        status: 'rejected',
        respondedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    ).exec();

    if (!updatedRequest) {
      throw new NotFoundException('Request not found');
    }

    return updatedRequest;
  }

  async getRoomSharingRequestsToApprove(userId: number): Promise<RentalRequest[]> {
    return this.rentalRequestModel.find({
      posterId: userId,
      requestType: 'room_sharing',
      status: 'pending_user_approval'
    }).sort({ createdAt: -1 }).exec();
  }

  // Lấy tất cả yêu cầu ở ghép mà User A đã xử lý (duyệt/từ chối)
  async getMyRoomSharingRequestHistory(userId: number): Promise<RentalRequest[]> {
    return this.rentalRequestModel.find({
      posterId: userId,
      requestType: 'room_sharing',
      status: { $in: ['pending_landlord_approval', 'approved', 'rejected'] }
    }).sort({ createdAt: -1 }).exec();
  }

  async getLandlordRoomSharingRequests(landlordId: number): Promise<RentalRequest[]> {
    return this.rentalRequestModel.find({
      landlordId,
      requestType: 'room_sharing',
      status: 'pending_landlord_approval'
    }).sort({ createdAt: -1 }).exec();
  }

  async getMyRoomSharingRequests(tenantId: number): Promise<RentalRequest[]> {
    return this.rentalRequestModel.find({
      tenantId,
      requestType: 'room_sharing'
    }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Get current tenant info for a landlord's room
   * Returns null if no active contract exists
   */
  async getCurrentTenantForRoom(
    landlordId: number,
    roomId: number
  ): Promise<{
    roomId: number;
    contractId: number;
    contractStatus: string;
    tenant: {
      userId: number;
      fullName: string;
      phone?: string;
      email?: string;
      avatarUrl?: string;
    };
    period: { startDate: Date; endDate: Date };
    monthlyRent: number;
    deposit: number;
  } | null> {
    // Verify room ownership
    const room = await this.roomModel.findOne({ roomId: Number(roomId), landlordId: Number(landlordId) }).lean().exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const now = new Date();
    // Find active contract by period and status, newest by startDate
    const contract = await this.contractModel
      .findOne({
        roomId: Number(roomId),
        landlordId: Number(landlordId),
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now }
      })
      .sort({ startDate: -1 })
      .lean()
      .exec();

    if (!contract) {
      return null;
    }

    // Choose an active tenant in the contract (fallback to first)
    const activeTenant =
      (contract.tenants || []).find((t: any) => t?.status === 'active') ||
      (contract.tenants || [])[0];

    if (!activeTenant) {
      return null;
    }

    // Load user info
    const user = await this.userModel.findOne({ userId: Number(activeTenant.tenantId) }).lean().exec();

    return {
      roomId: Number(roomId),
      contractId: Number(contract.contractId),
      contractStatus: contract.status,
      tenant: {
        userId: Number(activeTenant.tenantId),
        fullName: user?.name || '',
        phone: user?.phone || '',
        email: user?.email || '',
        avatarUrl: user?.avatar || ''
      },
      period: {
        startDate: contract.startDate,
        endDate: contract.endDate
      },
      monthlyRent: Number(contract.monthlyRent) || 0,
      deposit: Number(contract.deposit) || 0
    };
  }

  // Rental History Management
  /**
   * Terminate contract - Hủy hợp đồng
   */
  async terminateContract(
    contractId: number,
    userId: number,
    terminateData: TerminateContractDto
  ): Promise<{ contract: RentalContract; affectedPostsCount: number }> {
    // 1. Kiểm tra quyền và trạng thái
    const contract = await this.contractModel.findOne({ contractId }).exec();
    if (!contract) {
      throw new NotFoundException('Không tìm thấy hợp đồng');
    }

    // Check if user is a tenant in this contract
    const isTenant = contract.tenants.some(tenant => Number(tenant.tenantId) === Number(userId));
    if (!isTenant) {
      throw new BadRequestException('Bạn không có quyền hủy hợp đồng này');
    }

    // Check if contract is active
    if (contract.status !== 'active') {
      throw new BadRequestException('Contract đã hết hạn hoặc đã bị hủy trước đó');
    }

    // 2. Update contract
    const terminationDate = terminateData.terminationDate 
      ? new Date(terminateData.terminationDate) 
      : new Date();

    contract.status = 'terminated';
    contract.terminatedAt = new Date();
    contract.terminationReason = terminateData.reason || undefined;
    contract.actualEndDate = terminationDate;
    contract.updatedAt = new Date();
    await contract.save();

    // 3. Update room - giảm occupancy và remove tenant
    const room = await this.roomModel.findOne({ roomId: contract.roomId }).exec();
    if (room) {
      // Remove all tenants from this contract from the room
      const tenantIds = contract.tenants.map(t => t.tenantId);
      await this.roomModel.findOneAndUpdate(
        { roomId: contract.roomId },
        {
          $pull: { currentTenants: { userId: { $in: tenantIds } } },
          $set: { updatedAt: new Date() }
        }
      ).exec();

      // Update room status if no more tenants
      const updatedRoom = await this.roomModel.findOne({ roomId: contract.roomId }).exec();
      if (updatedRoom && (!updatedRoom.currentTenants || updatedRoom.currentTenants.length === 0)) {
        updatedRoom.status = 'available';
        await updatedRoom.save();
      }
    }

    // 4. Tìm và active lại TẤT CẢ bài đăng liên quan
    const updateResult = await this.postModel.updateMany(
      {
        roomId: contract.roomId,
        status: { $in: ['inactive', 'pending'] }
      },
      {
        $set: {
          status: 'active',
          updatedAt: new Date()
        }
      }
    ).exec();

    const affectedPostsCount = updateResult.modifiedCount || 0;

    // 5. Tạo rental history
    await this.createRentalHistoryFromContract(contract, userId);

    return { 
      contract, 
      affectedPostsCount 
    };
  }

  /**
   * Get rental history - Lấy lịch sử thuê
   */
  async getRentalHistory(
    userId: number,
    query: {
      page?: number;
      limit?: number;
      status?: string;
      sortBy?: string;
      sortOrder?: string;
    }
  ): Promise<any> {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      sortBy = 'actualEndDate', 
      sortOrder = 'desc' 
    } = query;
    
    // Build filter
    const filter: any = { userId };
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      filter.contractStatus = { $in: statuses };
    }

    // Execute query with populate
    const history = await this.rentalHistoryModel
      .find(filter)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    const total = await this.rentalHistoryModel.countDocuments(filter).exec();

    // Populate with room, building, landlord info, and active post
    const populatedHistory = await Promise.all(
      history.map(async (item: any) => {
        const room = await this.roomModel.findOne({ roomId: item.roomId }).lean().exec();
        const building = await this.buildingModel.findOne({ buildingId: item.buildingId }).lean().exec();
        const landlord = await this.userModel.findOne({ userId: item.landlordId }).lean().exec();

        // Tìm bài đăng active hiện tại của phòng (để FE có thể link)
        const activePost = await this.postModel
          .findOne({
            roomId: item.roomId,
            status: 'active'
          })
          .sort({ createdAt: -1 })
          .select('postId')
          .lean()
          .exec();

        // Kiểm tra xem phòng có thể thuê lại không
        // Điều kiện: phòng có status là 'available' và có bài đăng active
        const roomStatus = room?.status || 'unknown';
        const hasActivePost = !!activePost?.postId;
        const canRentAgain = roomStatus === 'available' && hasActivePost && room?.isActive !== false;

        return {
          contractId: item.contractId,
          roomId: item.roomId,
          roomNumber: room?.roomNumber || 'N/A',
          buildingName: building?.name || 'N/A',
          buildingId: item.buildingId,
          address: building 
            ? `${building.address?.street || ''}, ${building.address?.wardName || ''}, ${building.address?.provinceName || ''}`.trim()
            : 'N/A',
          activePostId: activePost?.postId || null, // FE dùng để link đến bài đăng
          roomStatus: roomStatus, // Trạng thái phòng: 'available', 'occupied', 'unknown'
          canRentAgain: canRentAgain, // Có thể thuê lại không: true nếu phòng available và có post active
          contractStatus: item.contractStatus,
          startDate: item.startDate,
          endDate: item.endDate,
          actualEndDate: item.actualEndDate,
          monthlyRent: item.monthlyRent,
          deposit: item.deposit,
          area: room?.area || 0,
          images: room?.images || [],
          landlordInfo: landlord ? {
            landlordId: landlord.userId,
            name: landlord.name,
            phone: landlord.phone,
            email: landlord.email
          } : null,
          terminationReason: item.terminationReason,
          terminatedAt: item.terminatedAt,
          totalMonthsRented: item.totalMonthsRented,
          totalAmountPaid: item.totalAmountPaid
        };
      })
    );

    return {
      history: populatedHistory,
      pagination: {
        total,
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get rental history detail - Lấy chi tiết lịch sử thuê
   */
  async getRentalHistoryDetail(userId: number, contractId: number): Promise<any> {
    const historyItem = await this.rentalHistoryModel.findOne({ 
      userId, 
      contractId 
    }).lean().exec();

    if (!historyItem) {
      throw new NotFoundException('Không tìm thấy lịch sử thuê');
    }

    // Populate with room, building, and landlord info
    const room = await this.roomModel.findOne({ roomId: historyItem.roomId }).lean().exec();
    const building = await this.buildingModel.findOne({ buildingId: historyItem.buildingId }).lean().exec();
    const landlord = await this.userModel.findOne({ userId: historyItem.landlordId }).lean().exec();

    // Tìm bài đăng active hiện tại của phòng (để FE có thể link)
    const activePost = await this.postModel
      .findOne({
        roomId: historyItem.roomId,
        status: 'active'
      })
      .sort({ createdAt: -1 })
      .select('postId')
      .lean()
      .exec();

    // Kiểm tra xem phòng có thể thuê lại không
    // Điều kiện: phòng có status là 'available' và có bài đăng active
    const roomStatus = room?.status || 'unknown';
    const hasActivePost = !!activePost?.postId;
    const canRentAgain = roomStatus === 'available' && hasActivePost && room?.isActive !== false;

    // Get invoices for this contract
    const invoices = await this.invoiceModel
      .find({ contractId })
      .sort({ dueDate: 1 })
      .lean()
      .exec();

    const invoiceList = invoices.map((inv: any) => ({
      invoiceId: inv.invoiceId,
      month: inv.dueDate ? new Date(inv.dueDate).toISOString().substring(0, 7) : 'N/A',
      amount: inv.amount,
      status: inv.status,
      paidAt: inv.paidDate
    }));

    return {
      contractId: historyItem.contractId,
      roomId: historyItem.roomId,
      roomNumber: room?.roomNumber || 'N/A',
      buildingName: building?.name || 'N/A',
      address: building 
        ? `${building.address?.street || ''}, ${building.address?.wardName || ''}, ${building.address?.provinceName || ''}`.trim()
        : 'N/A',
      activePostId: activePost?.postId || null, // FE dùng để link đến bài đăng
      roomStatus: roomStatus, // Trạng thái phòng: 'available', 'occupied', 'unknown'
      canRentAgain: canRentAgain, // Có thể thuê lại không: true nếu phòng available và có post active
      contractStatus: historyItem.contractStatus,
      startDate: historyItem.startDate,
      endDate: historyItem.endDate,
      actualEndDate: historyItem.actualEndDate,
      monthlyRent: historyItem.monthlyRent,
      deposit: historyItem.deposit,
      area: room?.area || 0,
      images: room?.images || [],
      landlordInfo: landlord ? {
        landlordId: landlord.userId,
        name: landlord.name,
        phone: landlord.phone,
        email: landlord.email
      } : null,
      terminationReason: historyItem.terminationReason,
      invoices: invoiceList,
      totalMonthsRented: historyItem.totalMonthsRented,
      totalAmountPaid: historyItem.totalAmountPaid
    };
  }

  /**
   * Helper: Create rental history from contract
   */
  private async createRentalHistoryFromContract(
    contract: RentalContract,
    userId: number
  ): Promise<void> {
    try {
      // Get room to get buildingId
      const room = await this.roomModel.findOne({ roomId: contract.roomId }).lean().exec();
      if (!room) {
        return;
      }

      // Calculate total months rented and total amount paid
      const startDate = new Date(contract.startDate);
      const endDate = contract.actualEndDate ? new Date(contract.actualEndDate) : new Date(contract.endDate);
      const monthsRented = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));

      // Get paid invoices for this contract
      const paidInvoices = await this.invoiceModel
        .find({ contractId: contract.contractId, status: 'paid' })
        .lean()
        .exec();
      const totalAmountPaid = paidInvoices.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0);

      // Create rental history
      await this.rentalHistoryModel.create({
        userId,
        contractId: contract.contractId,
        roomId: contract.roomId,
        buildingId: room.buildingId,
        landlordId: contract.landlordId,
        startDate: contract.startDate,
        endDate: contract.endDate,
        actualEndDate: contract.actualEndDate || contract.endDate,
        monthlyRent: contract.monthlyRent,
        deposit: contract.deposit,
        contractStatus: contract.status === 'terminated' ? 'terminated' : 'expired',
        terminationReason: contract.terminationReason,
        terminatedAt: contract.terminatedAt,
        totalMonthsRented: monthsRented,
        totalAmountPaid
      });
    } catch (error) {
      // Error handling
    }
  }

  /**
   * Auto expire contracts - Chạy bằng cron job
   */
  async expireContracts(): Promise<{ expired: number; errors: number }> {
    let expired = 0;
    let errors = 0;

    try {
      const now = new Date();
      const expiredContracts = await this.contractModel.find({
        status: 'active',
        endDate: { $lt: now }
      }).exec();

      for (const contract of expiredContracts) {
        try {
          // 1. Update status
          contract.status = 'expired';
          contract.actualEndDate = contract.endDate;
          await contract.save();

          // 2. Update room - remove tenants
          const tenantIds = contract.tenants.map(t => t.tenantId);
          await this.roomModel.findOneAndUpdate(
            { roomId: contract.roomId },
            {
              $pull: { currentTenants: { userId: { $in: tenantIds } } },
              $set: { updatedAt: new Date() }
            }
          ).exec();

          // Update room status if no more tenants
          const updatedRoom = await this.roomModel.findOne({ roomId: contract.roomId }).exec();
          if (updatedRoom && (!updatedRoom.currentTenants || updatedRoom.currentTenants.length === 0)) {
            updatedRoom.status = 'available';
            await updatedRoom.save();
          }

          // 3. Ẩn tất cả bài đăng "tìm ở ghép" của phòng khi contract kết thúc
          // Chỉ ẩn bài đăng "tìm ở ghép", không ẩn bài đăng "cho thuê"
          await this.postModel.updateMany(
            {
              roomId: contract.roomId,
              postType: 'tim-o-ghep',
              status: { $in: ['active', 'pending'] }
            },
            {
              $set: {
                status: 'inactive',
                updatedAt: new Date()
              }
            }
          ).exec();
          
          // 4. Cập nhật preferences: disable tất cả roommate preferences của phòng
          try {
            // Disable tất cả preferences của phòng
            await this.preferenceModel.updateMany(
              { roomId: contract.roomId, enabled: true },
              {
                $set: {
                  enabled: false,
                  updatedAt: new Date()
                }
              }
            ).exec();
          } catch (error) {
            // Error handling
          }

          // 5. Tạo rental history cho tất cả tenants
          for (const tenant of contract.tenants) {
            await this.createRentalHistoryFromContract(contract, tenant.tenantId);
          }

          expired++;
        } catch (error) {
          errors++;
        }
      }

      return { expired, errors };
    } catch (error) {
      return { expired, errors: errors + 1 };
    }
  }
}
