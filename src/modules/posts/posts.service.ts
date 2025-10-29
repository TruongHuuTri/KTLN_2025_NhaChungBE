import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { SearchPostsDto } from './dto/search-posts.dto';
import { Room, RoomDocument } from '../rooms/schemas/room.schema';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
  ) {}

  async createPost(userId: number, postData: CreatePostDto): Promise<Post> {
    const postId = await this.getNextPostId();
    const room = await this.validateAndGetRoom(postData.roomId);
    
    // Bỏ kiểm tra phòng trống theo occupancy; chỉ kiểm tra isActive/status bên dưới nếu cần
    
    const enrichedPostData = this.enrichPostData(postData, room);
    
    const post = new this.postModel({
      postId,
      userId,
      ...enrichedPostData,
      status: 'active', // Tự động duyệt luôn
    });
    
    return post.save();
  }

  private async validateAndGetRoom(roomId: number): Promise<Room> {
    const room = await this.roomModel.findOne({ roomId }).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  private validateRoomAvailability(room: Room, postType: string): void {
    if (!room.isActive || room.status !== 'available') {
      throw new BadRequestException('Room is not available for posting');
    }
  }

  private enrichPostData(postData: CreatePostDto, room: Room): CreatePostDto {
    return {
      ...postData,
      category: room.category as 'chung-cu' | 'phong-tro' | 'nha-nguyen-can' | 'o-ghep',
      isManaged: true,
      buildingId: room.buildingId,
      landlordId: room.landlordId,
      source: 'room_management',
    };
  }

  async getUserRooms(userId: number, postType?: string): Promise<Room[]> {
    // Landlord đăng cho thuê: phòng thuộc landlord và còn available
    if (postType === 'cho-thue') {
      return this.roomModel.find({
        landlordId: userId,
        isActive: true,
        status: 'available'
      }).exec();
    }

    // Tenant đăng tìm ở ghép: phòng mà user đang ở (currentTenants)
    if (postType === 'tim-o-ghep') {
      return this.roomModel.find({
        isActive: true,
        $or: [
          { 'currentTenants.userId': userId },
          { 'currentTenants.userId': Number(userId) }
        ]
      }).exec();
    }

    // Mặc định: kết hợp cả hai trường hợp
    return this.roomModel.find({
      isActive: true,
      $or: [
        { landlordId: userId, status: 'available' },
        { 'currentTenants.userId': userId },
        { 'currentTenants.userId': Number(userId) }
      ]
    }).exec();
  }

  async getPostWithRoomMedia(postId: number): Promise<any> {
    const post = await this.getPostById(postId);
    
    if (!post.roomId) {
      return post;
    }
    
    const room = await this.roomModel.findOne({ roomId: post.roomId }).exec();
    if (!room) {
      return post;
    }
    
    return this.mergePostWithRoomMedia(post, room);
  }

  private mergePostWithRoomMedia(post: any, room: Room): any {
    return {
      ...post,
      images: post.images?.length > 0 ? post.images : room.images || [],
      videos: post.videos?.length > 0 ? post.videos : room.videos || [],
      roomMedia: {
        images: room.images || [],
        videos: room.videos || []
      }
    };
  }

  async getPosts(filters: SearchPostsDto = {}): Promise<Post[]> {
    const query: any = { status: 'active' };

    if (filters.postType) {
      query.postType = filters.postType;
    }

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.landlordId) {
      query.landlordId = filters.landlordId;
    }

    if (filters.roomId) {
      query.roomId = filters.roomId;
    }

    if (filters.isManaged !== undefined) {
      query.isManaged = filters.isManaged;
    }

    if (filters.source) {
      query.source = filters.source;
    }

    return this.postModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async getPostById(postId: number): Promise<Post> {
    const post = await this.postModel.findOne({ postId }).exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async getPostsByUser(userId: number): Promise<Post[]> {
    return this.postModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async getPostsByLandlord(landlordId: number): Promise<Post[]> {
    return this.postModel.find({ landlordId }).sort({ createdAt: -1 }).exec();
  }

  async getPostsByRoom(roomId: number): Promise<Post[]> {
    return this.postModel.find({ roomId }).sort({ createdAt: -1 }).exec();
  }

  // Update Post
  async updatePost(postId: number, updateData: UpdatePostDto): Promise<Post> {
    const post = await this.postModel.findOneAndUpdate(
      { postId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  // Delete Post
  async deletePost(postId: number): Promise<void> {
    const result = await this.postModel.findOneAndUpdate(
      { postId },
      { status: 'inactive', updatedAt: new Date() }
    ).exec();
    if (!result) {
      throw new NotFoundException('Post not found');
    }
  }

  // Search Posts
  async searchPosts(searchFilters: SearchPostsDto): Promise<Post[]> {
    const query: any = { status: 'active' };

    if (searchFilters.postType) {
      query.postType = searchFilters.postType;
    }

    if (searchFilters.keyword) {
      query.$or = [
        { title: { $regex: searchFilters.keyword, $options: 'i' } },
        { description: { $regex: searchFilters.keyword, $options: 'i' } }
      ];
    }

    if (searchFilters.minPrice || searchFilters.maxPrice) {
      if (searchFilters.postType === 'rent') {
        // For rent posts, search in roomInfo.basicInfo.price
        query['roomInfo.basicInfo.price'] = {};
        if (searchFilters.minPrice) query['roomInfo.basicInfo.price'].$gte = searchFilters.minPrice;
        if (searchFilters.maxPrice) query['roomInfo.basicInfo.price'].$lte = searchFilters.maxPrice;
      } else if (searchFilters.postType === 'roommate') {
        // For roommate posts, search in requirements.maxPrice
        query['requirements.maxPrice'] = {};
        if (searchFilters.minPrice) query['requirements.maxPrice'].$gte = searchFilters.minPrice;
        if (searchFilters.maxPrice) query['requirements.maxPrice'].$lte = searchFilters.maxPrice;
      }
    }

    if (searchFilters.gender) {
      if (searchFilters.postType === 'roommate') {
        query['requirements.gender'] = searchFilters.gender;
      }
    }

    if (searchFilters.ageRange) {
      if (searchFilters.postType === 'roommate') {
        query['requirements.ageRange'] = {
          $gte: searchFilters.ageRange[0],
          $lte: searchFilters.ageRange[1]
        };
      }
    }

    if (searchFilters.location) {
      query.$or = [
        { 'roomInfo.address.city': { $regex: searchFilters.location, $options: 'i' } },
        { 'roomInfo.address.ward': { $regex: searchFilters.location, $options: 'i' } }
      ];
    }

    return this.postModel.find(query).sort({ createdAt: -1 }).exec();
  }

  // Get Post with Room Info (for managed posts)
  async getPostWithRoomInfo(postId: number): Promise<any> {
    const post = await this.getPostById(postId);
    
    if (post.isManaged && post.roomId) {
      const room = await this.roomModel.findOne({ roomId: post.roomId }).exec();
      if (room) {
        return {
          ...post,
          roomInfo: room,
          // Merge media: Post media takes priority, fallback to Room media
          images: post.images?.length > 0 ? post.images : room.images || [],
          videos: post.videos?.length > 0 ? post.videos : room.videos || [],
          roomMedia: {
            images: room.images || [],
            videos: room.videos || []
          }
        };
      }
    }

    return post;
  }

  // Approve/Reject Post
  async updatePostStatus(postId: number, status: string): Promise<Post> {
    const validStatuses = ['pending', 'approved', 'active', 'inactive', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    return this.updatePost(postId, { status });
  }

  // Admin methods
  async getAllPostsForAdmin(filters: any = {}): Promise<Post[]> {
    const query: any = {};
    
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.postType) {
      query.postType = filters.postType;
    }
    if (filters.userId) {
      query.userId = parseInt(filters.userId);
    }

    return this.postModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async getPendingPosts(): Promise<Post[]> {
    return this.postModel.find({ status: 'pending' }).sort({ createdAt: -1 }).exec();
  }

  async rejectPost(postId: number, reason?: string): Promise<Post> {
    const post = await this.postModel.findOne({ postId }).exec();
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const updateData: any = { status: 'rejected' };
    if (reason) {
      updateData.rejectionReason = reason;
    }

    const updatedPost = await this.postModel.findOneAndUpdate(
      { postId },
      updateData,
      { new: true }
    ).exec();

    if (!updatedPost) {
      throw new NotFoundException('Post not found');
    }

    return updatedPost;
  }


  // Helper methods
  private async getNextPostId(): Promise<number> {
    const lastPost = await this.postModel.findOne().sort({ postId: -1 }).exec();
    return lastPost ? lastPost.postId + 1 : 1;
  }
}
