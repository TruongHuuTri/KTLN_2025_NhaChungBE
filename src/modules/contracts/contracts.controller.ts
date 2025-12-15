import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { LandlordGuard } from '../users/guards/landlord.guard';
import { AdminJwtGuard } from '../admin/guards/admin-jwt.guard';
import { ContractsService } from './contracts.service';
import { PdfService } from '../../shared/services/pdf.service';
import { MaintenanceFeeService } from '../../shared/services/maintenance-fee.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateRentalRequestDto } from './dto/create-rental-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { PayInvoiceDto } from './dto/pay-invoice.dto';
import { CreateRoomSharingRequestDto } from './dto/create-room-sharing-request.dto';
import { ApproveRoomSharingDto } from './dto/approve-room-sharing.dto';
import { CreateManualInvoiceDto } from './dto/create-manual-invoice.dto';
import { TerminateContractDto } from './dto/terminate-contract.dto';
import { Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller('landlord')
@UseGuards(JwtAuthGuard, LandlordGuard)
export class LandlordContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly pdfService: PdfService,
    private readonly maintenanceFeeService: MaintenanceFeeService
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
  async getContractById(@Request() req, @Param('id') contractId: number) {
    const landlordId = req.user.userId;
    return this.contractsService.getLandlordContract(landlordId, contractId);
  }

  @Get('contracts/:id/download-pdf')
  async downloadContractPDF(@Request() req, @Param('id') contractIdParam: string, @Res() res: Response) {
    try {
      const landlordId = req.user.userId;
      const contractId = Number(contractIdParam);
      
      // Lấy thông tin hợp đồng đầy đủ (kiểm tra quyền sở hữu)
      const enrichedContract = await this.contractsService.getLandlordContract(landlordId, contractId);
      
      // Tạo PDF
      const { filePath, fileName } = await this.pdfService.generateContractPDF(enrichedContract);
      
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

  /**
   * Lịch sử phòng đã cho thuê (chủ trọ)
   */
  @Get('rental-history')
  async getLandlordRentalHistory(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string
  ) {
    const landlordId = req.user.userId;
    return this.contractsService.getLandlordRentalHistory(landlordId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
      sortBy,
      sortOrder
    });
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

  // Termination Requests - Yêu cầu huỷ hợp đồng từ người thuê
  
  /**
   * Lấy danh sách yêu cầu huỷ hợp đồng cho chủ duyệt
   */
  @Get('termination-requests')
  async getTerminationRequests(@Request() req) {
    const landlordId = req.user.userId;
    return this.contractsService.getLandlordTerminationRequests(landlordId);
  }

  /**
   * Duyệt yêu cầu huỷ hợp đồng
   */
  @Put('termination-requests/:id/approve')
  async approveTerminationRequest(
    @Request() req, 
    @Param('id') requestId: string,
    @Body() body: { response?: string }
  ) {
    const landlordId = req.user.userId;
    const result = await this.contractsService.approveTerminationRequest(
      Number(requestId), 
      landlordId, 
      body.response
    );
    
    return {
      message: 'Đã duyệt yêu cầu huỷ hợp đồng',
      request: {
        requestId: result.request.requestId,
        status: result.request.status,
        respondedAt: result.request.respondedAt,
      },
      contract: {
        contractId: result.contract.contractId,
        status: result.contract.status,
        terminatedAt: result.contract.terminatedAt,
      },
      affectedPosts: {
        count: result.affectedPostsCount,
        message: `Đã active lại ${result.affectedPostsCount} bài đăng`
      }
    };
  }

  /**
   * Từ chối yêu cầu huỷ hợp đồng
   */
  @Put('termination-requests/:id/reject')
  async rejectTerminationRequest(
    @Request() req, 
    @Param('id') requestId: string,
    @Body() body: { response?: string }
  ) {
    const landlordId = req.user.userId;
    const result = await this.contractsService.rejectTerminationRequest(
      Number(requestId), 
      landlordId, 
      body.response
    );
    
    return {
      message: 'Đã từ chối yêu cầu huỷ hợp đồng',
      request: {
        requestId: result.requestId,
        status: result.status,
        landlordResponse: result.landlordResponse,
        respondedAt: result.respondedAt,
      }
    };
  }

  // Test endpoint để tạo hóa đơn phí duy trì cho tất cả landlords
  @Post('test/generate-maintenance-fee')
  async generateMaintenanceFee() {
    return this.maintenanceFeeService.manualGenerateMaintenanceInvoices();
  }

  // Test endpoint để tự động expire contracts hết hạn
  @Post('test/expire-contracts')
  async expireContracts() {
    return this.contractsService.expireContracts();
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
      
      // Lấy thông tin hợp đồng đầy đủ (bao gồm room, tenant details, verification)
      const enrichedContract = await this.contractsService.getEnrichedContractData(userId, contractId);
      
      // Tạo PDF
      const { filePath, fileName } = await this.pdfService.generateContractPDF(enrichedContract);
      
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

  // Termination Request APIs
  
  /**
   * Yêu cầu huỷ hợp đồng (cần chủ duyệt)
   * Nếu huỷ trước thời hạn, sẽ trả về cảnh báo mất tiền cọc
   */
  @Put('me/contracts/:contractId/request-termination')
  async requestTermination(
    @Request() req, 
    @Param('contractId') contractId: string,
    @Body() terminateData: TerminateContractDto
  ) {
    const userId = req.user.userId;
    const result = await this.contractsService.requestTermination(
      Number(contractId), 
      userId, 
      terminateData
    );
    
    return {
      message: 'Yêu cầu huỷ hợp đồng đã được gửi, đang chờ chủ nhà duyệt',
      request: {
        requestId: result.request.requestId,
        contractId: result.request.contractId,
        status: result.request.status,
        requestedTerminationDate: result.request.requestedTerminationDate,
        isEarlyTermination: result.request.isEarlyTermination,
        willLoseDeposit: result.request.willLoseDeposit,
        depositAmount: result.request.depositAmount,
      },
      warning: result.warning || null
    };
  }

  /**
   * Lấy danh sách yêu cầu huỷ của người thuê
   */
  @Get('me/termination-requests')
  async getMyTerminationRequests(@Request() req) {
    const userId = req.user.userId;
    return this.contractsService.getMyTerminationRequests(userId);
  }

  /**
   * Huỷ yêu cầu huỷ hợp đồng (trước khi chủ duyệt)
   */
  @Delete('me/termination-requests/:requestId')
  async cancelTerminationRequest(
    @Request() req,
    @Param('requestId') requestId: string
  ) {
    const userId = req.user.userId;
    await this.contractsService.cancelTerminationRequest(Number(requestId), userId);
    return {
      message: 'Đã huỷ yêu cầu huỷ hợp đồng'
    };
  }

  // Rental History APIs

  @Get('me/rental-history')
  async getRentalHistory(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string
  ) {
    const userId = req.user.userId;
    return this.contractsService.getRentalHistory(userId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
      sortBy,
      sortOrder
    });
  }

  @Get('me/rental-history/:contractId')
  async getRentalHistoryDetail(
    @Request() req,
    @Param('contractId') contractId: string
  ) {
    const userId = req.user.userId;
    return this.contractsService.getRentalHistoryDetail(userId, Number(contractId));
  }
}
