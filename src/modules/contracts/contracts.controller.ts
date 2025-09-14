import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { LandlordGuard } from '../users/guards/landlord.guard';
import { AdminJwtGuard } from '../admin/guards/admin-jwt.guard';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateRentalRequestDto } from './dto/create-rental-request.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateRoommateApplicationDto } from './dto/create-roommate-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { SetCurrentRoomDto } from './dto/set-current-room.dto';

@Controller('landlord')
@UseGuards(JwtAuthGuard, LandlordGuard)
export class LandlordContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  // Contract Management
  @Post('contracts')
  async createContract(@Request() req, @Body() contractData: CreateContractDto) {
    const landlordId = req.user.userId;
    return this.contractsService.createContract({ ...contractData, landlordId });
  }

  @Get('contracts')
  async getContracts(@Request() req) {
    const landlordId = req.user.userId;
    return this.contractsService.getContractsByLandlord(landlordId);
  }

  @Get('contracts/:id')
  async getContractById(@Param('id') contractId: number) {
    return this.contractsService.getContractById(contractId);
  }

  @Put('contracts/:id')
  async updateContract(@Param('id') contractId: number, @Body() updateData: any) {
    return this.contractsService.updateContract(contractId, updateData);
  }

  @Post('contracts/:id/add-tenant')
  async addTenantToContract(@Param('id') contractId: number, @Body() tenantData: any) {
    return this.contractsService.addTenantToContract(contractId, tenantData);
  }

  @Post('contracts/:id/remove-tenant')
  async removeTenantFromContract(@Param('id') contractId: number, @Body() body: { tenantId: number }) {
    return this.contractsService.removeTenantFromContract(contractId, body.tenantId);
  }

  // Rental Requests
  @Get('rental-requests')
  async getRentalRequests(@Request() req) {
    const landlordId = req.user.userId;
    return this.contractsService.getRentalRequestsByLandlord(landlordId);
  }

  @Get('rental-requests/:id')
  async getRentalRequestById(@Param('id') requestId: number) {
    return this.contractsService.getRentalRequestById(requestId);
  }

  @Put('rental-requests/:id/approve')
  async approveRentalRequest(@Param('id') requestId: number, @Body() body: { landlordResponse?: string }) {
    return this.contractsService.updateRentalRequestStatus(requestId, 'approved', body.landlordResponse);
  }

  @Put('rental-requests/:id/reject')
  async rejectRentalRequest(@Param('id') requestId: number, @Body() body: { landlordResponse?: string }) {
    return this.contractsService.updateRentalRequestStatus(requestId, 'rejected', body.landlordResponse);
  }

  // Invoices
  @Get('invoices')
  async getInvoices(@Request() req) {
    const landlordId = req.user.userId;
    return this.contractsService.getInvoicesByLandlord(landlordId);
  }

  @Post('invoices')
  async createInvoice(@Request() req, @Body() invoiceData: CreateInvoiceDto) {
    const landlordId = req.user.userId;
    return this.contractsService.createInvoice({ ...invoiceData, landlordId });
  }

  @Get('invoices/:id')
  async getInvoiceById(@Param('id') invoiceId: number) {
    return this.contractsService.getInvoiceById(invoiceId);
  }

  @Put('invoices/:id')
  async updateInvoice(@Param('id') invoiceId: number, @Body() updateData: any) {
    return this.contractsService.updateInvoiceStatus(invoiceId, updateData.status, updateData.paymentMethod);
  }

  // Roommate Applications
  @Get('roommate-applications')
  async getRoommateApplications(@Request() req) {
    const landlordId = req.user.userId;
    return this.contractsService.getRoommateApplicationsByPoster(landlordId);
  }

  @Get('roommate-applications/:id')
  async getRoommateApplicationById(@Param('id') applicationId: number) {
    return this.contractsService.getRoommateApplicationById(applicationId);
  }

  @Put('roommate-applications/:id/approve')
  async approveRoommateApplication(@Param('id') applicationId: number, @Body() body: { responseMessage?: string }) {
    return this.contractsService.updateRoommateApplicationStatus(applicationId, 'approved', body.responseMessage);
  }

  @Put('roommate-applications/:id/reject')
  async rejectRoommateApplication(@Param('id') applicationId: number, @Body() body: { responseMessage?: string }) {
    return this.contractsService.updateRoommateApplicationStatus(applicationId, 'rejected', body.responseMessage);
  }
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  // User Current Room
  @Get('me/current-room')
  async getCurrentRoom(@Request() req) {
    const userId = req.user.userId;
    return this.contractsService.getUserCurrentRoom(userId);
  }

  @Post('me/current-room')
  async setCurrentRoom(@Request() req, @Body() roomData: SetCurrentRoomDto) {
    const userId = req.user.userId;
    return this.contractsService.setUserCurrentRoom(userId, roomData);
  }

  @Put('me/current-room')
  async updateCurrentRoom(@Request() req, @Body() updateData: any) {
    const userId = req.user.userId;
    return this.contractsService.updateUserCurrentRoom(userId, updateData);
  }

  // Rental Requests
  @Post('rental-requests')
  async createRentalRequest(@Request() req, @Body() requestData: CreateRentalRequestDto) {
    const tenantId = req.user.userId;
    return this.contractsService.createRentalRequest({ ...requestData, tenantId });
  }

  // Invoices
  @Get('me/invoices')
  async getMyInvoices(@Request() req) {
    const tenantId = req.user.userId;
    return this.contractsService.getInvoicesByTenant(tenantId);
  }

  @Put('me/invoices/:id/pay')
  async payInvoice(@Request() req, @Param('id') invoiceId: number, @Body() body: PayInvoiceDto) {
    return this.contractsService.updateInvoiceStatus(invoiceId, 'paid', body.paymentMethod);
  }

  // Roommate Applications
  @Get('me/roommate-applications')
  async getMyRoommateApplications(@Request() req) {
    const applicantId = req.user.userId;
    return this.contractsService.getRoommateApplicationsByApplicant(applicantId);
  }

  @Post('roommate-applications')
  async createRoommateApplication(@Request() req, @Body() applicationData: CreateRoommateApplicationDto) {
    const applicantId = req.user.userId;
    return this.contractsService.createRoommateApplication({ ...applicationData, applicantId });
  }

  @Put('roommate-applications/:id/cancel')
  async cancelRoommateApplication(@Request() req, @Param('id') applicationId: number) {
    return this.contractsService.updateRoommateApplicationStatus(applicationId, 'cancelled');
  }
}
