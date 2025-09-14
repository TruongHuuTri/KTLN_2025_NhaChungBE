import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RentalContract, RentalContractDocument } from './schemas/rental-contract.schema';
import { UserCurrentRoom, UserCurrentRoomDocument } from './schemas/user-current-room.schema';
import { RentalRequest, RentalRequestDocument } from './schemas/rental-request.schema';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { ContractUpdate, ContractUpdateDocument } from './schemas/contract-update.schema';
import { RoommateApplication, RoommateApplicationDocument } from './schemas/roommate-application.schema';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateRentalRequestDto } from './dto/create-rental-request.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateRoommateApplicationDto } from './dto/create-roommate-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { SetCurrentRoomDto } from './dto/set-current-room.dto';

@Injectable()
export class ContractsService {
  constructor(
    @InjectModel(RentalContract.name) private contractModel: Model<RentalContractDocument>,
    @InjectModel(UserCurrentRoom.name) private userCurrentRoomModel: Model<UserCurrentRoomDocument>,
    @InjectModel(RentalRequest.name) private rentalRequestModel: Model<RentalRequestDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(ContractUpdate.name) private contractUpdateModel: Model<ContractUpdateDocument>,
    @InjectModel(RoommateApplication.name) private roommateApplicationModel: Model<RoommateApplicationDocument>,
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

  // User Current Room Management
  async setUserCurrentRoom(userId: number, roomData: SetCurrentRoomDto): Promise<UserCurrentRoom> {
    // Remove existing current room if any
    await this.userCurrentRoomModel.findOneAndUpdate(
      { userId },
      { status: 'terminated', updatedAt: new Date() }
    ).exec();

    const userCurrentRoom = new this.userCurrentRoomModel({
      userId,
      ...roomData,
    });
    return userCurrentRoom.save();
  }

  async getUserCurrentRoom(userId: number): Promise<UserCurrentRoom> {
    const userCurrentRoom = await this.userCurrentRoomModel.findOne({ 
      userId, 
      status: 'active' 
    }).exec();
    if (!userCurrentRoom) {
      throw new NotFoundException('User has no current room');
    }
    return userCurrentRoom;
  }

  async updateUserCurrentRoom(userId: number, updateData: any): Promise<UserCurrentRoom> {
    const userCurrentRoom = await this.userCurrentRoomModel.findOneAndUpdate(
      { userId, status: 'active' },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).exec();
    if (!userCurrentRoom) {
      throw new NotFoundException('User current room not found');
    }
    return userCurrentRoom;
  }

  // Rental Request Management
  async createRentalRequest(requestData: CreateRentalRequestDto & { tenantId: number }): Promise<RentalRequest> {
    const requestId = await this.getNextRequestId();
    const request = new this.rentalRequestModel({
      requestId,
      ...requestData,
    });
    return request.save();
  }

  async getRentalRequestsByLandlord(landlordId: number): Promise<RentalRequest[]> {
    return this.rentalRequestModel.find({ landlordId }).sort({ createdAt: -1 }).exec();
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
    return request;
  }

  // Invoice Management
  async createInvoice(invoiceData: CreateInvoiceDto & { landlordId: number }): Promise<Invoice> {
    const invoiceId = await this.getNextInvoiceId();
    const invoice = new this.invoiceModel({
      invoiceId,
      ...invoiceData,
    });
    return invoice.save();
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

  // Roommate Application Management
  async createRoommateApplication(applicationData: CreateRoommateApplicationDto & { applicantId: number }): Promise<RoommateApplication> {
    const applicationId = await this.getNextApplicationId();
    const application = new this.roommateApplicationModel({
      applicationId,
      ...applicationData,
    });
    return application.save();
  }

  async getRoommateApplicationsByPoster(posterId: number): Promise<RoommateApplication[]> {
    return this.roommateApplicationModel.find({ posterId }).sort({ createdAt: -1 }).exec();
  }

  async getRoommateApplicationsByApplicant(applicantId: number): Promise<RoommateApplication[]> {
    return this.roommateApplicationModel.find({ applicantId }).sort({ createdAt: -1 }).exec();
  }

  async getRoommateApplicationById(applicationId: number): Promise<RoommateApplication> {
    const application = await this.roommateApplicationModel.findOne({ applicationId }).exec();
    if (!application) {
      throw new NotFoundException('Roommate application not found');
    }
    return application;
  }

  async updateRoommateApplicationStatus(applicationId: number, status: string, responseMessage?: string): Promise<RoommateApplication> {
    const updateData: any = { status, updatedAt: new Date() };
    if (responseMessage) {
      updateData.responseMessage = responseMessage;
      updateData.respondedAt = new Date();
    }

    const application = await this.roommateApplicationModel.findOneAndUpdate(
      { applicationId },
      updateData,
      { new: true }
    ).exec();
    if (!application) {
      throw new NotFoundException('Roommate application not found');
    }
    return application;
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

  private async getNextApplicationId(): Promise<number> {
    const lastApplication = await this.roommateApplicationModel.findOne().sort({ applicationId: -1 }).exec();
    return lastApplication ? lastApplication.applicationId + 1 : 1;
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
}
