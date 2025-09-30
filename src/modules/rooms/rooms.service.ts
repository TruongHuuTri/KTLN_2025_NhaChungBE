import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument } from './schemas/room.schema';
import { Building, BuildingDocument } from './schemas/building.schema';
import { CreateBuildingDto } from './dto/create-building.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { AddTenantDto } from './dto/add-tenant.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
    @InjectModel(Building.name) private buildingModel: Model<BuildingDocument>,
  ) {}

  // Building Management
  async createBuilding(landlordId: number, buildingData: CreateBuildingDto): Promise<Building> {
    const buildingId = await this.getNextBuildingId();
    const building = new this.buildingModel({
      buildingId,
      landlordId,
      ...buildingData,
    });
    return building.save();
  }

  async getBuildingsByLandlord(landlordId: number): Promise<Building[]> {
    return this.buildingModel.find({ landlordId, isActive: true }).exec();
  }

  async getBuildingById(buildingId: number): Promise<Building> {
    const building = await this.buildingModel.findOne({ buildingId }).exec();
    if (!building) {
      throw new NotFoundException('Building not found');
    }
    return building;
  }

  async updateBuilding(buildingId: number, updateData: any): Promise<Building> {
    const building = await this.buildingModel.findOneAndUpdate(
      { buildingId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).exec();
    if (!building) {
      throw new NotFoundException('Building not found');
    }
    return building;
  }

  async deleteBuilding(buildingId: number): Promise<void> {
    const result = await this.buildingModel.findOneAndUpdate(
      { buildingId },
      { isActive: false, updatedAt: new Date() }
    ).exec();
    if (!result) {
      throw new NotFoundException('Building not found');
    }
  }

  // Room Management
  async createRoom(landlordId: number, roomData: CreateRoomDto): Promise<Room> {
    // Lấy buildingType từ building để set category cho room
    const building = await this.buildingModel.findOne({ buildingId: roomData.buildingId }).exec();
    if (!building) {
      throw new NotFoundException('Building not found');
    }
    
    const roomId = await this.getNextRoomId();
    const room = new this.roomModel({
      roomId,
      landlordId,
      ...roomData,
      category: building.buildingType, // Lấy category từ buildingType
      canShare: (roomData.currentOccupants || 0) > 0, // canShare = true nếu đã có tenant
      availableSpots: roomData.maxOccupancy - (roomData.currentOccupants || 0),
    });
    return room.save();
  }

  async getRoomsByLandlord(landlordId: number): Promise<Room[]> {
    return this.roomModel.find({ landlordId, isActive: true }).exec();
  }

  async getRoomsByBuilding(buildingId: number, landlordId?: number): Promise<Room[]> {
    const query: any = { buildingId, isActive: true };
    if (landlordId) {
      query.landlordId = landlordId;
    }
    return this.roomModel.find(query).exec();
  }

  async getRoomById(roomId: number, landlordId?: number): Promise<Room> {
    const query: any = { roomId };
    if (landlordId) {
      query.landlordId = landlordId;
    }
    
    const room = await this.roomModel.findOne(query).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async updateRoom(roomId: number, updateData: UpdateRoomDto, landlordId?: number): Promise<Room> {
    // Recalculate availableSpots if maxOccupancy or currentOccupants changed
    if (updateData.maxOccupancy !== undefined || updateData.currentOccupants !== undefined) {
      const currentRoom = await this.getRoomById(roomId, landlordId);
      const maxOccupancy = updateData.maxOccupancy ?? currentRoom.maxOccupancy;
      const currentOccupants = updateData.currentOccupants ?? currentRoom.currentOccupants;
      updateData.availableSpots = maxOccupancy - currentOccupants;
    }

    const query: any = { roomId };
    if (landlordId) {
      query.landlordId = landlordId;
    }

    const room = await this.roomModel.findOneAndUpdate(
      query,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async deleteRoom(roomId: number, landlordId?: number): Promise<void> {
    const query: any = { roomId };
    if (landlordId) {
      query.landlordId = landlordId;
    }

    const result = await this.roomModel.findOneAndUpdate(
      query,
      { isActive: false, updatedAt: new Date() }
    ).exec();
    if (!result) {
      throw new NotFoundException('Room not found');
    }
  }

  // Roommate Management
  async addTenantToRoom(roomId: number, tenantData: AddTenantDto, landlordId?: number): Promise<Room> {
    const room = await this.getRoomById(roomId, landlordId);
    
    if (room.currentOccupants >= room.maxOccupancy) {
      throw new BadRequestException('Room is full');
    }

    const query: any = { roomId };
    if (landlordId) {
      query.landlordId = landlordId;
    }

    const updatedRoom = await this.roomModel.findOneAndUpdate(
      query,
      {
        $push: { currentTenants: tenantData },
        $inc: { currentOccupants: 1 },
        $set: { 
          availableSpots: room.maxOccupancy - (room.currentOccupants + 1),
          updatedAt: new Date()
        }
      },
      { new: true }
    ).exec();

    return updatedRoom as Room;
  }

  async removeTenantFromRoom(roomId: number, userId: number, landlordId?: number): Promise<Room> {
    const room = await this.getRoomById(roomId, landlordId);
    
    const tenantIndex = room.currentTenants.findIndex(tenant => tenant.userId === userId);
    if (tenantIndex === -1) {
      throw new NotFoundException('Tenant not found in this room');
    }

    const query: any = { roomId };
    if (landlordId) {
      query.landlordId = landlordId;
    }

    const updatedRoom = await this.roomModel.findOneAndUpdate(
      query,
      {
        $pull: { currentTenants: { userId } },
        $inc: { currentOccupants: -1 },
        $set: { 
          availableSpots: room.maxOccupancy - (room.currentOccupants - 1),
          updatedAt: new Date()
        }
      },
      { new: true }
    ).exec();

    return updatedRoom as Room;
  }

  async getRoomTenants(roomId: number, landlordId?: number): Promise<any[]> {
    const room = await this.getRoomById(roomId, landlordId);
    return room.currentTenants || [];
  }

  // Search and Filter
  async searchRooms(filters: any): Promise<Room[]> {
    const query: any = { isActive: true, status: 'available' };

    if (filters.landlordId) {
      query.landlordId = filters.landlordId;
    }

    if (filters.buildingId) {
      query.buildingId = filters.buildingId;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = filters.minPrice;
      if (filters.maxPrice) query.price.$lte = filters.maxPrice;
    }

    if (filters.minArea || filters.maxArea) {
      query.area = {};
      if (filters.minArea) query.area.$gte = filters.minArea;
      if (filters.maxArea) query.area.$lte = filters.maxArea;
    }

    if (filters.canShare !== undefined) {
      query.canShare = filters.canShare;
    }

    if (filters.availableSpots) {
      query.availableSpots = { $gte: filters.availableSpots };
    }

    return this.roomModel.find(query).exec();
  }

  private async getNextBuildingId(): Promise<number> {
    const lastBuilding = await this.buildingModel.findOne().sort({ buildingId: -1 }).exec();
    return lastBuilding ? lastBuilding.buildingId + 1 : 1;
  }

  private async getNextRoomId(): Promise<number> {
    const lastRoom = await this.roomModel.findOne().sort({ roomId: -1 }).exec();
    return lastRoom ? lastRoom.roomId + 1 : 1;
  }
}
