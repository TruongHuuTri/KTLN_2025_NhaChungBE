import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
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

    // Tính nhanh aggregate (avg, count)
    const agg = await this.reviewModel.aggregate([
      { $match: filter },
      { $group: { _id: null, ratingAvg: { $avg: '$rating' }, ratingCount: { $sum: 1 } } },
      { $project: { _id: 0, ratingAvg: 1, ratingCount: 1 } },
    ]);

    return {
      items,
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

    return { items, total, page, pageSize };
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
}

