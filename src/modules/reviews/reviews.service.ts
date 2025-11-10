import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Room, RoomDocument } from '../rooms/schemas/room.schema';
import { Building, BuildingDocument } from '../rooms/schemas/building.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    @InjectModel(Building.name) private readonly buildingModel: Model<BuildingDocument>,
  ) {}

  async create(dto: CreateReviewDto) {
    // Ràng buộc 1 review duy nhất theo writer + target (+ contract nếu có)
    const existing = await this.reviewModel.findOne({
      writerId: dto.writerId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      ...(dto.contractId ? { contractId: dto.contractId } : {}),
      deletedAt: { $exists: false },
    });
    if (existing) {
      throw new BadRequestException('Bạn đã đánh giá đối tượng này');
    }

    const nowId = Date.now();
    const created = new this.reviewModel({
      reviewId: nowId,
      writerId: dto.writerId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      contractId: dto.contractId,
      rating: dto.rating,
      content: dto.content,
      media: dto.media || [],
      isAnonymous: dto.isAnonymous || false,
      isEdited: false,
      votesHelpful: 0,
      votesUnhelpful: 0,
      votes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await created.save();
    return created;
  }

  async listByTarget(query: {
    targetType: 'USER' | 'ROOM' | 'BUILDING' | 'POST';
    targetId: number;
    rating?: number;
    hasMedia?: boolean;
    sort?: 'recent' | 'top';
    page?: number;
    pageSize?: number;
    userId?: number; // User hiện tại (optional, để check myVote)
  }) {
    const filter: any = {
      targetType: query.targetType,
      targetId: query.targetId,
      deletedAt: { $exists: false },
    };
    if (query.rating) filter.rating = query.rating;
    if (query.hasMedia) filter.media = { $exists: true, $ne: [] };

    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 10));
    const skip = (page - 1) * pageSize;

    const sort: any = query.sort === 'top'
      ? { votesHelpful: -1, createdAt: -1 }
      : { createdAt: -1 };

    const [items, total] = await Promise.all([
      this.reviewModel.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
      this.reviewModel.countDocuments(filter),
    ]);

    // Collect all userIds from replies to batch query
    const allUserIds = new Set<number>();
    items.forEach((item: any) => {
      if (item.replies?.length > 0) {
        item.replies.forEach((r: any) => allUserIds.add(r.userId));
      }
    });

    // Batch query users
    const users = await this.userModel.find({ userId: { $in: Array.from(allUserIds) } }).lean().exec();
    const userMap = new Map(users.map(u => [u.userId, u]));

    // Batch query targets to calculate isAuthor for reviews
    const targetsByType: { [key: string]: Set<number> } = {};
    items.forEach((item: any) => {
      if (!targetsByType[item.targetType]) {
        targetsByType[item.targetType] = new Set();
      }
      targetsByType[item.targetType].add(item.targetId);
    });

    const targetOwnerMap = new Map<string, number>(); // key: "TYPE:ID", value: ownerId

    // Fetch posts
    if (targetsByType['POST']) {
      const posts = await this.postModel.find({ postId: { $in: Array.from(targetsByType['POST']) } }).lean().exec();
      posts.forEach(p => targetOwnerMap.set(`POST:${p.postId}`, p.userId));
    }

    // Fetch rooms
    if (targetsByType['ROOM']) {
      const rooms = await this.roomModel.find({ roomId: { $in: Array.from(targetsByType['ROOM']) } }).lean().exec();
      rooms.forEach(r => targetOwnerMap.set(`ROOM:${r.roomId}`, r.landlordId));
    }

    // Fetch buildings
    if (targetsByType['BUILDING']) {
      const buildings = await this.buildingModel.find({ buildingId: { $in: Array.from(targetsByType['BUILDING']) } }).lean().exec();
      buildings.forEach(b => targetOwnerMap.set(`BUILDING:${b.buildingId}`, b.landlordId));
    }

    // Thêm myVote, isAuthor và populate replies với user info
    const itemsWithMyVote = items.map((item: any) => {
      let myVote: 'helpful' | 'unhelpful' | null = null;
      
      if (query.userId && item.votes?.length > 0) {
        const userVote = item.votes.find((v: any) => v.userId === query.userId);
        if (userVote) {
          myVote = userVote.isHelpful ? 'helpful' : 'unhelpful';
        }
      }

      // Calculate isAuthor for review (with type conversion to fix bug)
      let isAuthor = false;
      if (item.targetType === 'USER') {
        // For USER type, check if writerId === targetId
        isAuthor = Number(item.writerId) === Number(item.targetId);
      } else {
        // For POST, ROOM, BUILDING - check owner from map
        const ownerId = targetOwnerMap.get(`${item.targetType}:${item.targetId}`);
        isAuthor = ownerId ? Number(item.writerId) === Number(ownerId) : false;
      }

      // Populate replies array với user info
      const repliesWithUserInfo = (item.replies || []).map((reply: any) => {
        const user = userMap.get(reply.userId);
        return {
          replyId: reply.replyId,
          userId: reply.userId,
          userName: user?.name || 'Unknown',
          userAvatar: user?.avatar || null,
          content: reply.content,
          media: reply.media || [],
          isAuthor: reply.isAuthor,
          createdAt: reply.createdAt,
          isEdited: reply.isEdited,
        };
      });

      // Remove votes array from response (không cần thiết cho FE)
      const { votes, replies, lastReplyId, ...reviewWithoutVotes } = item;
      return {
        ...reviewWithoutVotes,
        myVote,
        isAuthor, // Add isAuthor for review
        replies: repliesWithUserInfo,
        repliesCount: item.repliesCount || 0,
      };
    });

    // Tính nhanh aggregate (avg, count)
    const agg = await this.reviewModel.aggregate([
      { $match: filter },
      { $group: { _id: null, ratingAvg: { $avg: '$rating' }, ratingCount: { $sum: 1 } } },
      { $project: { _id: 0, ratingAvg: 1, ratingCount: 1 } },
    ]);

    return {
      items: itemsWithMyVote,
      total,
      page,
      pageSize,
      ratingSummary: agg[0] || { ratingAvg: null, ratingCount: 0 },
    };
  }

  async listWrittenBy(userId: number) {
    return this.reviewModel
      .find({ writerId: userId, deletedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .lean();
  }

  async listAll(query: {
    targetType?: 'USER' | 'ROOM' | 'BUILDING' | 'POST';
    rating?: number;
    hasMedia?: boolean;
    sort?: 'recent' | 'top';
    page?: number;
    pageSize?: number;
    userId?: number; // User hiện tại (optional, để check myVote)
  }) {
    const filter: any = { deletedAt: { $exists: false } };
    if (query.targetType) filter.targetType = query.targetType;
    if (query.rating) filter.rating = query.rating;
    if (query.hasMedia) filter.media = { $exists: true, $ne: [] };

    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 10));
    const skip = (page - 1) * pageSize;

    const sort: any = query.sort === 'top'
      ? { votesHelpful: -1, createdAt: -1 }
      : { createdAt: -1 };

    const [items, total] = await Promise.all([
      this.reviewModel.find(filter).sort(sort).skip(skip).limit(pageSize).lean(),
      this.reviewModel.countDocuments(filter),
    ]);

    // Collect all userIds from replies to batch query
    const allUserIds = new Set<number>();
    items.forEach((item: any) => {
      if (item.replies?.length > 0) {
        item.replies.forEach((r: any) => allUserIds.add(r.userId));
      }
    });

    // Batch query users
    const users = await this.userModel.find({ userId: { $in: Array.from(allUserIds) } }).lean().exec();
    const userMap = new Map(users.map(u => [u.userId, u]));

    // Batch query targets to calculate isAuthor for reviews
    const targetsByType: { [key: string]: Set<number> } = {};
    items.forEach((item: any) => {
      if (!targetsByType[item.targetType]) {
        targetsByType[item.targetType] = new Set();
      }
      targetsByType[item.targetType].add(item.targetId);
    });

    const targetOwnerMap = new Map<string, number>(); // key: "TYPE:ID", value: ownerId

    // Fetch posts
    if (targetsByType['POST']) {
      const posts = await this.postModel.find({ postId: { $in: Array.from(targetsByType['POST']) } }).lean().exec();
      posts.forEach(p => targetOwnerMap.set(`POST:${p.postId}`, p.userId));
    }

    // Fetch rooms
    if (targetsByType['ROOM']) {
      const rooms = await this.roomModel.find({ roomId: { $in: Array.from(targetsByType['ROOM']) } }).lean().exec();
      rooms.forEach(r => targetOwnerMap.set(`ROOM:${r.roomId}`, r.landlordId));
    }

    // Fetch buildings
    if (targetsByType['BUILDING']) {
      const buildings = await this.buildingModel.find({ buildingId: { $in: Array.from(targetsByType['BUILDING']) } }).lean().exec();
      buildings.forEach(b => targetOwnerMap.set(`BUILDING:${b.buildingId}`, b.landlordId));
    }

    // Thêm myVote, isAuthor và populate replies với user info
    const itemsWithMyVote = items.map((item: any) => {
      let myVote: 'helpful' | 'unhelpful' | null = null;
      
      if (query.userId && item.votes?.length > 0) {
        const userVote = item.votes.find((v: any) => v.userId === query.userId);
        if (userVote) {
          myVote = userVote.isHelpful ? 'helpful' : 'unhelpful';
        }
      }

      // Calculate isAuthor for review (with type conversion to fix bug)
      let isAuthor = false;
      if (item.targetType === 'USER') {
        // For USER type, check if writerId === targetId
        isAuthor = Number(item.writerId) === Number(item.targetId);
      } else {
        // For POST, ROOM, BUILDING - check owner from map
        const ownerId = targetOwnerMap.get(`${item.targetType}:${item.targetId}`);
        isAuthor = ownerId ? Number(item.writerId) === Number(ownerId) : false;
      }

      // Populate replies array với user info
      const repliesWithUserInfo = (item.replies || []).map((reply: any) => {
        const user = userMap.get(reply.userId);
        return {
          replyId: reply.replyId,
          userId: reply.userId,
          userName: user?.name || 'Unknown',
          userAvatar: user?.avatar || null,
          content: reply.content,
          media: reply.media || [],
          isAuthor: reply.isAuthor,
          createdAt: reply.createdAt,
          isEdited: reply.isEdited,
        };
      });

      // Remove votes array from response (không cần thiết cho FE)
      const { votes, replies, lastReplyId, ...reviewWithoutVotes } = item;
      return {
        ...reviewWithoutVotes,
        myVote,
        isAuthor, // Add isAuthor for review
        replies: repliesWithUserInfo,
        repliesCount: item.repliesCount || 0,
      };
    });

    return { items: itemsWithMyVote, total, page, pageSize };
  }

  async listReceivedBy(userId: number) {
    return this.reviewModel
      .find({ targetType: 'USER', targetId: userId, deletedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .lean();
  }

  async update(reviewId: number, userId: number, dto: UpdateReviewDto) {
    const review = await this.reviewModel.findOne({ reviewId });
    if (!review) throw new NotFoundException('Review không tồn tại');
    if (review.writerId !== userId) throw new ForbiddenException('Không có quyền sửa');
    if (review.deletedAt) throw new BadRequestException('Review đã bị xoá');

    const update: any = { ...dto, isEdited: true, updatedAt: new Date() };
    const oldRating = review.rating;
    if (typeof dto.rating === 'number') {
      update.rating = dto.rating;
    }

    const updated = await this.reviewModel.findOneAndUpdate({ reviewId }, update, { new: true });
    return updated;
  }

  async remove(reviewId: number, userId: number) {
    const review = await this.reviewModel.findOne({ reviewId });
    if (!review) throw new NotFoundException('Review không tồn tại');
    if (review.writerId !== userId) throw new ForbiddenException('Không có quyền xoá');
    if (review.deletedAt) return { success: true };
    await this.reviewModel.updateOne({ reviewId }, { $set: { deletedAt: new Date(), updatedAt: new Date() } });
    return { success: true };
  }

  async vote(reviewId: number, voterId: number, isHelpful: boolean) {
    const review = await this.reviewModel.findOne({ reviewId });
    if (!review) throw new NotFoundException('Review không tồn tại');
    if (review.deletedAt) throw new BadRequestException('Review đã bị xoá');

    const existing = review.votes?.find(v => v.userId === voterId);
    let incHelpful = 0;
    let incUnhelpful = 0;
    if (!existing) {
      // Thêm mới
      incHelpful = isHelpful ? 1 : 0;
      incUnhelpful = isHelpful ? 0 : 1;
      await this.reviewModel.updateOne(
        { reviewId },
        {
          $push: { votes: { userId: voterId, isHelpful } },
          $inc: { votesHelpful: incHelpful, votesUnhelpful: incUnhelpful },
          $set: { updatedAt: new Date() },
        },
      );
    } else if (existing.isHelpful !== isHelpful) {
      // Đổi phiếu
      incHelpful = isHelpful ? 1 : -1;
      incUnhelpful = isHelpful ? -1 : 1;
      await this.reviewModel.updateOne(
        { reviewId, 'votes.userId': voterId },
        {
          $set: { 'votes.$.isHelpful': isHelpful, updatedAt: new Date() },
          $inc: { votesHelpful: incHelpful, votesUnhelpful: incUnhelpful },
        },
      );
    }

    const updated = await this.reviewModel.findOne({ reviewId }).lean();
    return updated;
  }

  // Reply Management
  /**
   * Check if user is owner of target
   */
  private async isOwnerOfTarget(review: Review, userId: number): Promise<boolean> {
    switch (review.targetType) {
      case 'POST':
        const post = await this.postModel.findOne({ postId: review.targetId }).lean().exec();
        return post ? post.userId === userId : false;
      
      case 'USER':
        return review.targetId === userId;
      
      case 'ROOM':
        const room = await this.roomModel.findOne({ roomId: review.targetId }).lean().exec();
        return room ? room.landlordId === userId : false;
      
      case 'BUILDING':
        const building = await this.buildingModel.findOne({ buildingId: review.targetId }).lean().exec();
        return building ? building.landlordId === userId : false;
      
      default:
        return false;
    }
  }

  /**
   * Create reply for review (anyone can reply)
   */
  async createReply(reviewId: number, dto: CreateReplyDto) {
    const review = await this.reviewModel.findOne({ reviewId }).exec();
    if (!review) throw new NotFoundException('Review không tồn tại');
    if (review.deletedAt) throw new BadRequestException('Review đã bị xoá');

    // Check if user is owner of target (for isAuthor badge)
    const isAuthor = await this.isOwnerOfTarget(review, dto.userId);

    // Create new reply
    const now = new Date();
    const replyId = review.lastReplyId + 1;
    
    const reply = {
      replyId,
      userId: dto.userId,
      content: dto.content,
      media: dto.media || [],
      isAuthor,
      createdAt: now,
      updatedAt: now,
      isEdited: false,
    };

    // Add reply to array and update counters
    review.replies.push(reply);
    review.repliesCount = review.replies.length;
    review.lastReplyId = replyId;
    review.updatedAt = now;
    await review.save();

    // Get user info to return
    const user = await this.userModel.findOne({ userId: dto.userId }).lean().exec();

    return {
      reviewId: review.reviewId,
      reply: {
        replyId: reply.replyId,
        userId: reply.userId,
        userName: user?.name || 'Unknown',
        userAvatar: user?.avatar || null,
        content: reply.content,
        media: reply.media,
        isAuthor: reply.isAuthor,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        isEdited: reply.isEdited,
      },
    };
  }

  /**
   * Update reply
   */
  async updateReply(reviewId: number, replyId: number, dto: UpdateReplyDto) {
    const review = await this.reviewModel.findOne({ reviewId }).exec();
    if (!review) throw new NotFoundException('Review không tồn tại');
    if (review.deletedAt) throw new BadRequestException('Review đã bị xoá');
    
    // Find reply by replyId
    const replyIndex = review.replies.findIndex(r => r.replyId === replyId);
    if (replyIndex === -1) {
      throw new NotFoundException('Reply không tồn tại');
    }

    const reply = review.replies[replyIndex];

    // Check if user is owner of the reply
    if (reply.userId !== dto.userId) {
      throw new ForbiddenException('Bạn không có quyền sửa reply này');
    }

    // Update reply
    const now = new Date();
    reply.content = dto.content;
    if (dto.media !== undefined) {
      reply.media = dto.media;
    }
    reply.updatedAt = now;
    reply.isEdited = true;
    review.updatedAt = now;
    await review.save();

    // Get user info to return
    const user = await this.userModel.findOne({ userId: dto.userId }).lean().exec();

    return {
      reviewId: review.reviewId,
      reply: {
        replyId: reply.replyId,
        userId: reply.userId,
        userName: user?.name || 'Unknown',
        userAvatar: user?.avatar || null,
        content: reply.content,
        media: reply.media,
        isAuthor: reply.isAuthor,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        isEdited: reply.isEdited,
      },
    };
  }

  /**
   * Delete reply
   */
  async deleteReply(reviewId: number, replyId: number, userId: number) {
    const review = await this.reviewModel.findOne({ reviewId }).exec();
    if (!review) throw new NotFoundException('Review không tồn tại');
    
    // Find reply by replyId
    const replyIndex = review.replies.findIndex(r => r.replyId === replyId);
    if (replyIndex === -1) {
      throw new NotFoundException('Reply không tồn tại');
    }

    const reply = review.replies[replyIndex];

    // Check if user is owner of the reply
    if (reply.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa reply này');
    }

    // Remove reply from array
    review.replies.splice(replyIndex, 1);
    review.repliesCount = review.replies.length;
    review.updatedAt = new Date();
    await review.save();

    return {
      message: 'Đã xóa reply thành công',
      reviewId: review.reviewId,
      replyId,
    };
  }
}

