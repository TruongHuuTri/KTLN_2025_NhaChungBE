import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Redis from 'ioredis';
import NodeGeocoder from 'node-geocoder';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room } from '../modules/rooms/schemas/room.schema';

@Injectable()
export class NlpSearchService {
  private readonly logger = new Logger(NlpSearchService.name);
  private genAI: GoogleGenerativeAI;
  private redisClient: Redis;
  private geocoder: NodeGeocoder.Geocoder;

  constructor(
    private configService: ConfigService,
    @InjectModel(Room.name) private readonly roomModel: Model<Room>,
  ) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY') as string,
    );

    // Khởi tạo Redis Client
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST') as string,
      port: Number(this.configService.get<number>('REDIS_PORT')),
    });
    this.redisClient.on('connect', () => console.log('✅ Connected to Redis'));
    this.redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));

    const options: NodeGeocoder.Options = {
      provider: 'mapbox',
      apiKey: this.configService.get<string>('MAPBOX_API_KEY') as string,
    };
    this.geocoder = NodeGeocoder(options);
  }

  async search(query: string): Promise<any> {
    const cacheKey = `search:nlp:${query.trim().toLowerCase()}`;

    // 1. Kiểm tra cache
    const cachedResult = await this.redisClient.get(cacheKey);
    if (cachedResult) {
      console.log('⚡️ Cache HIT!');
      return JSON.parse(cachedResult);
    }
    console.log('🤔 Cache MISS! Processing query...');

    const aggregationPipeline = await this.getTextToAggregation(query);
    if (!aggregationPipeline || aggregationPipeline.length === 0) {
      this.logger.warn('Received empty pipeline from Gemini, using fallback');
      // Fallback đã được trả về từ getTextToAggregation nếu có lỗi
      // Nếu vẫn rỗng, throw error
      throw new Error('Failed to generate aggregation pipeline from Gemini. Please check GEMINI_API_KEY and try again.');
    }

    const userId = 'user:123:prefs';
    await this.updateUserPreferences(userId, aggregationPipeline);

    const processedPipeline = await this.handleGeocoding(aggregationPipeline);

    // Thực thi pipeline trên MongoDB thật sự
    let rawResultsFromDB: any[] = [];
    try {
      rawResultsFromDB = await this.roomModel.aggregate(processedPipeline).exec();
    } catch (err) {
      console.error('Aggregate execution error:', err);
      throw err;
    }

    const rankedResults = await this.rankResults(userId, rawResultsFromDB);

    // Lưu kết quả đã ranking vào cache và trả về
    await this.redisClient.set(cacheKey, JSON.stringify(rankedResults), 'EX', 3600);
    console.log('💾 Result cached successfully.');
    return rankedResults;
  }

  private async getTextToAggregation(query: string): Promise<any[]> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
You are a master real estate search assistant for a rental platform in Vietnam. Your task is to convert a user's natural language query into a precise MongoDB aggregation pipeline JSON array.

The data schema you will query against combines room and post information:
{
  "postStatus": String, "postType": String, "category": String, "area": Number,
  "price": Number, "deposit": Number, "furniture": String,
  "status": String,
  "address": { "street": String, "wardName": String, "provinceName": String },
  "utilities": { "electricityPricePerKwh": Number, "waterPrice": Number, "internetFee": Number }
}

User query: "${query}"

RULES:
1. **Default Filter:** ALWAYS include a stage at the beginning to match only active posts and available rooms: { "$match": { "status": "available", "isActive": true } }.
2. **Location:** If the query mentions a location (e.g., "quận 1", "Thủ Đức", "Hai Bà Trưng"), create a preliminary stage: { "$addFields": { "locationName": "tên địa điểm đó" } }. Extract location name from query.
3. **Price:** For "giá dưới 3 triệu" or "dưới 3 triệu", use { "$match": { "price": { "$lt": 3000000 } } }. For "dưới 6 triệu", use { "$match": { "price": { "$lt": 6000000 } } }. For ranges, use $gte and $lte.
4. **Area:** For "diện tích trên 20m2", use { "$match": { "area": { "$gt": 20 } } }.
5. **Category:** If query mentions "chung cư", set { "$match": { "category": "chung-cu" } }. For "phòng trọ", use "phong-tro".
6. Ignore occupancy fields (no max occupancy constraint in schema).
7. **Utilities:** For "bao điện nước", prefer matching price fields equals 0 if provided by UI.
8. **Output:** Your response MUST BE ONLY a valid JSON array. No explanations, no markdown code blocks, no text before or after. Start with [ and end with ].
    `.trim();

    try {
      this.logger.debug(`Calling Gemini with query: "${query}"`);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Log raw response for debugging
      this.logger.debug(`Gemini raw response: ${text.substring(0, 200)}...`);
      
      // Clean up markdown code blocks and extra whitespace
      text = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^[\s\n]*\[/, '[') // Remove text before [
        .replace(/\]\s*$/, ']') // Remove text after ]
        .trim();
      
      // Try to extract JSON array if there's text around it
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }
      
      this.logger.debug(`Cleaned JSON text: ${text.substring(0, 100)}...`);
      
      const parsed = JSON.parse(text);
      
      if (!Array.isArray(parsed)) {
        this.logger.error('Gemini returned non-array result');
        return [];
      }
      
      if (parsed.length === 0) {
        this.logger.warn('Gemini returned empty pipeline');
      } else {
        this.logger.log(`Successfully parsed pipeline with ${parsed.length} stages`);
      }
      
      return parsed;
    } catch (error: any) {
      this.logger.error(`Error calling Gemini AI or parsing response: ${error?.message || error}`);
      this.logger.error(`Error stack: ${error?.stack || 'N/A'}`);
      
      // Return a basic fallback pipeline
      this.logger.warn('Returning fallback pipeline');
      return [
        {
          $match: {
            status: 'available',
            isActive: true,
          },
        },
      ];
    }
  }

  private async handleGeocoding(pipeline: any[]): Promise<any[]> {
    const addFieldsStageIndex = pipeline.findIndex((stage) => stage.$addFields && stage.$addFields.locationName);
    if (addFieldsStageIndex === -1) return pipeline;

    const locationName = pipeline[addFieldsStageIndex].$addFields.locationName;
    try {
      const cacheKey = `geo:mapbox:${locationName.toLowerCase().trim()}`;
      let longitude: number | null = null;
      let latitude: number | null = null;
      
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        const [lon, lat] = JSON.parse(cached);
        longitude = lon;
        latitude = lat;
      } else {
        const geoResult = await this.geocoder.geocode(`${locationName}, Vietnam`);
        if (geoResult.length > 0) {
          const lon = geoResult[0].longitude;
          const lat = geoResult[0].latitude;
          if (typeof lon === 'number' && typeof lat === 'number') {
            longitude = lon;
            latitude = lat;
            await this.redisClient.set(cacheKey, JSON.stringify([longitude, latitude]), 'EX', 60 * 60 * 24 * 30);
          }
        }
      }
      if (longitude != null && latitude != null) {
        const geoNearStage = {
          $geoNear: {
            near: { type: 'Point', coordinates: [longitude, latitude] },
            distanceField: 'distance',
            maxDistance: 10000,
            spherical: true,
            key: 'address.location',
          },
        };
        const cloned = [...pipeline];
        cloned.splice(addFieldsStageIndex, 1);
        cloned.unshift(geoNearStage);
        return cloned;
      }
    } catch (error) {
      console.error('Mapbox Geocoding failed:', error);
    }
    const fallback = [...pipeline];
    fallback.splice(addFieldsStageIndex, 1);
    return fallback;
  }

  private async updateUserPreferences(userId: string, pipeline: any[]): Promise<void> {
    // Dùng Redis HINCRBY để tăng số đếm cho mỗi tiêu chí
    // Đây là một ví dụ đơn giản, bạn có thể làm logic này phức tạp hơn
    for (const stage of pipeline) {
      if (stage.$match) {
        if (stage.$match.price) {
          await this.redisClient.hincrby(userId, 'pref:price', 1);
        }
        if (stage.$match.area) {
          await this.redisClient.hincrby(userId, 'pref:area', 1);
        }
      }
    }
  }

  private async rankResults(userId: string, results: any[]): Promise<any[]> {
    const prefs = await this.redisClient.hgetall(userId);
    const pricePrefCount = parseInt(prefs['pref:price'] || '0', 10);
    return results
      .map((room) => {
        let score = 100;
        if (pricePrefCount > 2 && room.price) {
          score += pricePrefCount * 5;
        }
        if (typeof room.distance === 'number') {
          const km = room.distance / 1000;
          if (km <= 2) score += 20;
          else if (km <= 5) score += 10;
          else if (km <= 10) score += 5;
        }
        return { ...room, score };
      })
      .sort((a, b) => b.score - a.score);
  }
}


