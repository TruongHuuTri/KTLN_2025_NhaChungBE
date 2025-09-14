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

  // Create Post
  async createPost(userId: number, postData: CreatePostDto): Promise<Post> {
    const postId = await this.getNextPostId();
    
    // Get room info and validate
    const room = await this.roomModel.findOne({ roomId: postData.roomId }).exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    
    // Set category from room
    postData.category = room.category as 'chung-cu' | 'phong-tro' | 'nha-nguyen-can' | 'o-ghep';
    
    // Set room management info
    postData.isManaged = true;
    postData.buildingId = room.buildingId;
    postData.landlordId = room.landlordId;
    postData.source = 'room_management';

    const post = new this.postModel({
      postId,
      userId,
      ...postData,
    });
    return post.save();
  }

  // Get user's rooms for post creation
  async getUserRooms(userId: number): Promise<Room[]> {
    return this.roomModel.find({ landlordId: userId, isActive: true }).exec();
  }

  // Get post with room media info
  async getPostWithRoomMedia(postId: number): Promise<any> {
    const post = await this.getPostById(postId);
    if (!post.roomId) {
      return post;
    }

    const room = await this.roomModel.findOne({ roomId: post.roomId }).exec();
    if (!room) {
      return post;
    }

    // Merge media: Post media takes priority, fallback to Room media
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

  // Get Posts
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
    const validStatuses = ['pending', 'active', 'inactive', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    return this.updatePost(postId, { status });
  }

  // Helper methods
  private async getNextPostId(): Promise<number> {
    const lastPost = await this.postModel.findOne().sort({ postId: -1 }).exec();
    return lastPost ? lastPost.postId + 1 : 1;
  }
}
