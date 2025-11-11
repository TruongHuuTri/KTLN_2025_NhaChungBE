import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { LandlordGuard } from '../users/guards/landlord.guard';
import { AdminJwtGuard } from '../admin/guards/admin-jwt.guard';
import { RoomsService } from './rooms.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { AddTenantDto } from './dto/add-tenant.dto';
import { CreateRoomSharingRequestDto } from '../contracts/dto/create-room-sharing-request.dto';
import type { Response } from 'express';
import { ContractsService } from '../contracts/contracts.service';

@Controller('landlord')
@UseGuards(JwtAuthGuard, LandlordGuard)
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly contractsService: ContractsService
  ) {}

  // Building Management
  @Post('buildings')
  async createBuilding(@Request() req, @Body() buildingData: CreateBuildingDto) {
    const landlordId = req.user.userId;
    return this.roomsService.createBuilding(landlordId, buildingData);
  }

  @Get('buildings')
  async getBuildings(@Request() req) {
    const landlordId = req.user.userId;
    return this.roomsService.getBuildingsByLandlord(landlordId);
  }

  @Get('buildings/:id')
  async getBuildingById(@Param('id') buildingId: number) {
    return this.roomsService.getBuildingById(buildingId);
  }

  @Put('buildings/:id')
  async updateBuilding(@Param('id') buildingId: number, @Body() updateData: any) {
    return this.roomsService.updateBuilding(buildingId, updateData);
  }

  @Delete('buildings/:id')
  async deleteBuilding(@Param('id') buildingId: number) {
    return this.roomsService.deleteBuilding(buildingId);
  }

  // Room Management
  @Post('rooms')
  async createRoom(@Request() req, @Body() roomData: CreateRoomDto) {
    const landlordId = req.user.userId;
    return this.roomsService.createRoom(landlordId, roomData);
  }

  @Get('rooms')
  async getRooms(@Request() req, @Query('buildingId') buildingId?: number) {
    const landlordId = req.user.userId;
    if (buildingId) {
      return this.roomsService.getRoomsByBuilding(buildingId, landlordId);
    }
    return this.roomsService.getRoomsByLandlord(landlordId);
  }

  @Get('rooms/:id')
  async getRoomById(@Request() req, @Param('id') roomId: number) {
    const landlordId = req.user.userId;
    return this.roomsService.getRoomById(roomId, landlordId);
  }

  @Put('rooms/:id')
  async updateRoom(@Request() req, @Param('id') roomId: number, @Body() updateData: UpdateRoomDto) {
    const landlordId = req.user.userId;
    return this.roomsService.updateRoom(roomId, updateData, landlordId);
  }

  @Delete('rooms/:id')
  async deleteRoom(@Request() req, @Param('id') roomId: number) {
    const landlordId = req.user.userId;
    return this.roomsService.deleteRoom(roomId, landlordId);
  }

  // Current tenant info for a room (active contract)
  @Get('rooms/:id/tenant')
  async getCurrentTenantForRoom(
    @Request() req,
    @Param('id') roomId: number,
    @Res() res: Response
  ) {
    const landlordId = req.user.userId;
    const data = await this.contractsService.getCurrentTenantForRoom(landlordId, Number(roomId));
    if (!data) {
      return res.status(204).send();
    }
    return res.json(data);
  }
  // Roommate Management
  @Get('rooms/:id/tenants')
  async getRoomTenants(@Request() req, @Param('id') roomId: number) {
    const landlordId = req.user.userId;
    return this.roomsService.getRoomTenants(roomId, landlordId);
  }

  @Post('rooms/:id/tenants')
  async addTenantToRoom(@Request() req, @Param('id') roomId: number, @Body() tenantData: AddTenantDto) {
    const landlordId = req.user.userId;
    return this.roomsService.addTenantToRoom(roomId, tenantData, landlordId);
  }

  @Delete('rooms/:id/tenants/:userId')
  async removeTenantFromRoom(@Request() req, @Param('id') roomId: number, @Param('userId') userId: number) {
    const landlordId = req.user.userId;
    return this.roomsService.removeTenantFromRoom(roomId, userId, landlordId);
  }

  // Search Rooms
  @Get('rooms/search')
  async searchRooms(@Request() req, @Query() filters: any) {
    const landlordId = req.user.userId;
    return this.roomsService.searchRooms({ ...filters, landlordId });
  }
}

@Controller('rooms')
export class PublicRoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly contractsService: ContractsService
  ) {}

  @Get('search')
  async searchRooms(@Query() filters: any) {
    return this.roomsService.searchRooms(filters);
  }

  @Get(':id')
  async getRoomById(@Param('id') roomId: number) {
    return this.roomsService.getRoomById(roomId);
  }

  // Room Sharing Request
  @Post(':id/sharing-request')
  @UseGuards(JwtAuthGuard)
  async createRoomSharingRequest(
    @Request() req,
    @Param('id') roomId: number,
    @Body() requestData: CreateRoomSharingRequestDto
  ) {
    const tenantId = req.user.userId;
    return this.contractsService.createRoomSharingRequest(roomId, { ...requestData, tenantId });
  }
}
