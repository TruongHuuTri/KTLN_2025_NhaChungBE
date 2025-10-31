import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { LandlordGuard } from '../users/guards/landlord.guard';
import { AdminJwtGuard } from '../admin/guards/admin-jwt.guard';
import { ContractsService } from './contracts.service';
import { PdfService } from '../../shared/services/pdf.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateRentalRequestDto } from './dto/create-rental-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { CreateRoomSharingRequestDto } from './dto/create-room-sharing-request.dto';
import { ApproveRoomSharingDto } from './dto/approve-room-sharing.dto';
import { CreateManualInvoiceDto } from './dto/create-manual-invoice.dto';
import { Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller('landlord')
@UseGuards(JwtAuthGuard, LandlordGuard)
export class LandlordContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly pdfService: PdfService
  ) {}

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


  @Post('invoices/monthly-rent')
  async createMonthlyRentInvoice(@Request() req, @Body() data: { contractId: number; month: number; year: number }) {
    const landlordId = req.user.userId;
    
    // Kiểm tra quyền sở hữu hợp đồng
    const contract = await this.contractsService.getContractById(data.contractId);
    if (contract.landlordId !== landlordId) {
      throw new BadRequestException('You do not own this contract');
    }
    
    return this.contractsService.createMonthlyRentInvoice(data.contractId, data.month, data.year);
  }

  @Post('invoices/manual')
  async createManualInvoice(@Request() req, @Body() body: CreateManualInvoiceDto, @Query() query: any) {
    const landlordId = req.user.userId;
    // Log và chuẩn hoá contractId tại controller (tăng độ chắc chắn)
    const raw: any = body as any;
    const normalizedContractId = raw?.contractId ?? raw?.contractID ?? raw?.contract_id ?? raw?.id ?? query?.contractId ?? query?.id;
    const normalizedNumber = Number(normalizedContractId);
    if (!Number.isFinite(normalizedNumber)) {
      throw new BadRequestException('Invalid contractId');
    }
    const normalizedBody: any = { ...raw, ...query, contractId: normalizedNumber };
    return this.contractsService.createManualMonthlyInvoice(landlordId, normalizedBody);
  }

  @Post('invoices/generate-monthly')
  async generateMonthlyInvoices(@Request() req) {
    throw new BadRequestException('Tự động tạo hoá đơn đã bị vô hiệu hoá. Vui lòng tạo thủ công.');
  }

  @Get('invoices/:id')
  async getInvoiceById(@Param('id') invoiceId: number) {
    return this.contractsService.getInvoiceById(invoiceId);
  }

  @Put('invoices/:id')
  async updateInvoice(@Param('id') invoiceId: number, @Body() updateData: any) {
    return this.contractsService.updateInvoiceStatus(invoiceId, updateData.status, updateData.paymentMethod);
  }

  // Dashboard summary for landlord
  @Get('dashboard/summary')
  async getDashboardSummary(@Request() req, @Query('from') from?: string, @Query('to') to?: string) {
    const landlordId = req.user.userId;
    return this.contractsService.getLandlordDashboardSummary(landlordId, from, to);
  }


  // Room Sharing Requests
  @Get('room-sharing-requests')
  async getRoomSharingRequests(@Request() req) {
    const landlordId = req.user.userId;
    return this.contractsService.getLandlordRoomSharingRequests(landlordId);
  }

  @Put('room-sharing-requests/:id/approve')
  async approveRoomSharingRequest(@Request() req, @Param('id') requestId: number) {
    const landlordId = req.user.userId;
    return this.contractsService.approveRoomSharingByLandlord(requestId, landlordId);
  }

  @Put('room-sharing-requests/:id/reject')
  async rejectRoomSharingRequest(@Request() req, @Param('id') requestId: number) {
    const landlordId = req.user.userId;
    return this.contractsService.rejectRoomSharingByLandlord(requestId, landlordId);
  }
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly pdfService: PdfService
  ) {}


  // Rental Requests
  @Post('rental-requests')
  async createRentalRequest(@Request() req, @Body() requestData: CreateRentalRequestDto) {
    const tenantId = req.user.userId;
    return this.contractsService.createRentalRequest({ ...requestData, tenantId });
  }

  // Use /me/rental-requests to avoid conflicts with users/:id
  @Get('me/rental-requests')
  async getMyRentalRequests(@Request() req) {
    const tenantId = req.user.userId;
    return this.contractsService.getRentalRequestsByTenant(tenantId);
  }

  // Keep original endpoint for backward compatibility
  @Get('rental-requests')
  async getMyRentalRequestsOriginal(@Request() req) {
    const tenantId = req.user.userId;
    return this.contractsService.getRentalRequestsByTenant(tenantId);
  }



  @Get('contracts/:id')
  async getMyContract(@Request() req, @Param('id') contractIdParam: string) {
    const contractId = Number(contractIdParam);
    const userId = req.user.userId;
    return this.contractsService.getUserContract(userId, contractId);
  }

  @Get('contracts/:id/download-pdf')
  async downloadContractPDF(@Request() req, @Param('id') contractIdParam: string, @Res() res: Response) {
    try {
      const userId = req.user.userId;
      const contractId = Number(contractIdParam);
      
      // Lấy thông tin hợp đồng
      const contract = await this.contractsService.getUserContract(userId, contractId);
      
      // Tạo PDF
      const { filePath, fileName } = await this.pdfService.generateContractPDF(contract);
      
      // Trả về file PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.sendFile(filePath);
      
      // Xóa file tạm sau 5 giây
      setTimeout(() => {
        this.pdfService.deletePDF(filePath);
      }, 5000);
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Không thể tạo file PDF: ' + error.message
      });
    }
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


  // Room Sharing Requests
  @Get('me/sharing-requests-to-approve')
  async getRoomSharingRequestsToApprove(@Request() req) {
    const userId = req.user.userId;
    return this.contractsService.getRoomSharingRequestsToApprove(userId);
  }

  // Lấy lịch sử yêu cầu ở ghép mà User A đã xử lý
  @Get('me/sharing-requests-history')
  async getMyRoomSharingRequestHistory(@Request() req) {
    const userId = req.user.userId;
    return this.contractsService.getMyRoomSharingRequestHistory(userId);
  }

  @Get('my-room-sharing-requests')
  async getMyRoomSharingRequests(@Request() req) {
    const tenantId = req.user.userId;
    return this.contractsService.getMyRoomSharingRequests(tenantId);
  }

  // Alias for FE compatibility
  @Get('me/room-sharing-requests')
  async getMyRoomSharingRequestsMe(@Request() req) {
    const tenantId = req.user.userId;
    return this.contractsService.getMyRoomSharingRequests(tenantId);
  }

  @Put('rental-requests/:id/approve-by-user')
  async approveRoomSharingByUser(@Request() req, @Param('id') requestId: number) {
    const userId = req.user.userId;
    return this.contractsService.approveRoomSharingByUser(requestId, userId);
  }

  @Put('rental-requests/:id/reject-by-user')
  async rejectRoomSharingByUser(@Request() req, @Param('id') requestId: number) {
    const userId = req.user.userId;
    return this.contractsService.rejectRoomSharingByUser(requestId, userId);
  }
}
