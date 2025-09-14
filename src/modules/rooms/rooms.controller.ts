import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { LandlordGuard } from '../users/guards/landlord.guard';
import { AdminJwtGuard } from '../admin/guards/admin-jwt.guard';
import { RoomsService } from './rooms.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { AddTenantDto } from './dto/add-tenant.dto';

@Controller('landlord')
@UseGuards(JwtAuthGuard, LandlordGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

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
      return this.roomsService.getRoomsByBuilding(buildingId);
    }
    return this.roomsService.getRoomsByLandlord(landlordId);
  }

  @Get('rooms/:id')
  async getRoomById(@Param('id') roomId: number) {
    return this.roomsService.getRoomById(roomId);
  }

  @Put('rooms/:id')
  async updateRoom(@Param('id') roomId: number, @Body() updateData: UpdateRoomDto) {
    return this.roomsService.updateRoom(roomId, updateData);
  }

  @Delete('rooms/:id')
  async deleteRoom(@Param('id') roomId: number) {
    return this.roomsService.deleteRoom(roomId);
  }

  // Roommate Management
  @Get('rooms/:id/tenants')
  async getRoomTenants(@Param('id') roomId: number) {
    return this.roomsService.getRoomTenants(roomId);
  }

  @Post('rooms/:id/tenants')
  async addTenantToRoom(@Param('id') roomId: number, @Body() tenantData: AddTenantDto) {
    return this.roomsService.addTenantToRoom(roomId, tenantData);
  }

  @Delete('rooms/:id/tenants/:userId')
  async removeTenantFromRoom(@Param('id') roomId: number, @Param('userId') userId: number) {
    return this.roomsService.removeTenantFromRoom(roomId, userId);
  }

  // Search Rooms
  @Get('rooms/search')
  async searchRooms(@Query() filters: any) {
    return this.roomsService.searchRooms(filters);
  }
}

@Controller('rooms')
export class PublicRoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('search')
  async searchRooms(@Query() filters: any) {
    return this.roomsService.searchRooms(filters);
  }

  @Get(':id')
  async getRoomById(@Param('id') roomId: number) {
    return this.roomsService.getRoomById(roomId);
  }
}
