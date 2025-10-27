import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RentalContract, RentalContractDocument } from './schemas/rental-contract.schema';
import { RentalRequest, RentalRequestDocument } from './schemas/rental-request.schema';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { ContractUpdate, ContractUpdateDocument } from './schemas/contract-update.schema';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateRentalRequestDto } from './dto/create-rental-request.dto';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Room, RoomDocument } from '../rooms/schemas/room.schema';
import { Building, BuildingDocument } from '../rooms/schemas/building.schema';
import { UpdateStatusDto } from './dto/update-status.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { CreateRoomSharingRequestDto } from './dto/create-room-sharing-request.dto';
import { ApproveRoomSharingDto } from './dto/approve-room-sharing.dto';

@Injectable()
export class ContractsService {
  constructor(
    @InjectModel(RentalContract.name) private contractModel: Model<RentalContractDocument>,
    @InjectModel(RentalRequest.name) private rentalRequestModel: Model<RentalRequestDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(ContractUpdate.name) private contractUpdateModel: Model<ContractUpdateDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Building.name) private buildingModel: Model<BuildingDocument>,
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
    
    if (contract.roomInfo.currentOccupancy >= contract.roomInfo.maxOccupancy) {
      throw new BadRequestException('Room is full');
    }

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
        console.error('Error auto-creating contract/invoice:', error);
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
          maxOccupancy: room.maxOccupancy,
          currentOccupancy: 1
        }
      });

      await contract.save();
      
      // Cập nhật rental request với contractId (nếu schema có field này)
      await this.rentalRequestModel.findOneAndUpdate(
        { requestId: request.requestId },
        { $set: { contractId: contractId } }
      ).exec();

      return contractId;
    } catch (error) {
      // Log lỗi nhưng không throw để không ảnh hưởng đến việc approve request
      console.error('Error auto-creating contract:', error);
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
      console.error('Error auto-creating invoice:', error);
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
          $set: { 
            availableSpots: currentRoom.maxOccupancy - (currentRoom.currentOccupants + 1),
            updatedAt: new Date()
          }
        }
      ).exec();

    } catch (error) {
      // Log lỗi nhưng không throw để không ảnh hưởng đến việc approve request
      console.error('Error auto-adding tenant to room:', error);
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
      const includedInRent = utilities.includedInRent || {};

      // Phí điện (nếu không bao gồm trong tiền thuê)
      if (utilities.electricityPricePerKwh > 0 && !includedInRent.electricity) {
        items.push({
          description: `Phí điện tháng ${month}/${year}`,
          amount: utilities.electricityPricePerKwh,
          type: 'electricity'
        });
        totalAmount += utilities.electricityPricePerKwh;
      }

      // Phí nước (nếu không bao gồm trong tiền thuê)
      if (utilities.waterPrice > 0 && !includedInRent.water) {
        items.push({
          description: `Phí nước tháng ${month}/${year}`,
          amount: utilities.waterPrice,
          type: 'water'
        });
        totalAmount += utilities.waterPrice;
      }

      // Phí internet (nếu không bao gồm trong tiền thuê)
      if (utilities.internetFee > 0 && !includedInRent.internet) {
        items.push({
          description: `Phí internet tháng ${month}/${year}`,
          amount: utilities.internetFee,
          type: 'internet'
        });
        totalAmount += utilities.internetFee;
      }

      // Phí rác (nếu không bao gồm trong tiền thuê)
      if (utilities.garbageFee > 0 && !includedInRent.garbage) {
        items.push({
          description: `Phí rác tháng ${month}/${year}`,
          amount: utilities.garbageFee,
          type: 'garbage'
        });
        totalAmount += utilities.garbageFee;
      }

      // Phí vệ sinh (nếu không bao gồm trong tiền thuê)
      if (utilities.cleaningFee > 0 && !includedInRent.cleaning) {
        items.push({
          description: `Phí vệ sinh tháng ${month}/${year}`,
          amount: utilities.cleaningFee,
          type: 'cleaning'
        });
        totalAmount += utilities.cleaningFee;
      }

      // Phí gửi xe máy (nếu không bao gồm trong tiền thuê)
      if (utilities.parkingMotorbikeFee > 0 && !includedInRent.parkingMotorbike) {
        items.push({
          description: `Phí gửi xe máy tháng ${month}/${year}`,
          amount: utilities.parkingMotorbikeFee,
          type: 'parking_motorbike'
        });
        totalAmount += utilities.parkingMotorbikeFee;
      }

      // Phí gửi xe ô tô (nếu không bao gồm trong tiền thuê)
      if (utilities.parkingCarFee > 0 && !includedInRent.parkingCar) {
        items.push({
          description: `Phí gửi xe ô tô tháng ${month}/${year}`,
          amount: utilities.parkingCarFee,
          type: 'parking_car'
        });
        totalAmount += utilities.parkingCarFee;
      }

      // Phí quản lý (nếu không bao gồm trong tiền thuê)
      if (utilities.managementFee > 0 && !includedInRent.managementFee) {
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
          console.error(`Error creating monthly invoice for contract ${contract.contractId}:`, error.message);
          errors++;
        }
      }

      return { created, errors };

    } catch (error) {
      console.error('Error in createMonthlyInvoicesForAllContracts:', error);
      return { created, errors: errors + 1 };
    }
  }

  async getInvoicesByLandlord(landlordId: number): Promise<Invoice[]> {
    return this.invoiceModel.find({ landlordId }).sort({ createdAt: -1 }).exec();
  }

  async getInvoicesByTenant(tenantId: number): Promise<Invoice[]> {
    return this.invoiceModel.find({ tenantId }).sort({ createdAt: -1 }).exec();
  }

  async getInvoiceById(invoiceId: number): Promise<Invoice> {
    const invoice = await this.invoiceModel.findOne({ invoiceId }).exec();
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
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
    ).exec();
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
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

    // Kiểm tra phòng có ít nhất 1 tenant không
    if (room.currentOccupants < 1) {
      throw new BadRequestException('Room must have at least one tenant to allow sharing');
    }

    // Kiểm tra phòng chưa đầy
    if (room.currentOccupants >= room.maxOccupancy) {
      throw new BadRequestException('Room is already at maximum capacity');
    }

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

    // Kiểm tra phòng vẫn còn chỗ
    if (room.currentOccupants >= room.maxOccupancy) {
      throw new BadRequestException('Room is already at maximum capacity');
    }

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
        maxOccupancy: room.maxOccupancy,
        currentOccupancy: room.currentOccupants + 1
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
        $inc: { currentOccupants: 1 },
        $set: { 
          availableSpots: room.maxOccupancy - (room.currentOccupants + 1),
          updatedAt: new Date()
        }
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
}
