import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { AmenitiesService } from '../search/amenities.service';
import { ParsedNlpQuery } from '../nlp-search/types';

@Injectable()
export class ParserAgent {
  private readonly logger = new Logger(ParserAgent.name);
  private genAI: GoogleGenerativeAI;
  private cachedWorkingModel: string | null = null;

  constructor(
    private readonly cfg: ConfigService,
    private readonly amenities: AmenitiesService,
  ) {
    const apiKey = this.cfg.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn(
        'GEMINI_API_KEY not set. ParserAgent will use heuristic only.',
      );
    }
  }

  private normalizeQuery(query: string): string {
    if (!query) return '';
    return query.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  /**
   * Trích xuất POI theo ngữ cảnh: lấy cụm sau các từ "gần|cạnh|đối diện|khu vực|xung quanh|near"
   * và để LocationAgent geocode. Không cần danh sách cố định.
   */
  private extractContextPoi(q: string): string[] {
    if (!q) return [];
    const text = this.normalizeQuery(q);
    // Đổi dấu câu thành ngắt câu
    const cleaned = text.replace(/[.,;]+/g, ' ');
    const patterns = [
      /(gần|gan|near|cạnh|canh|đối diện|doi dien|khu vực|khu vuc|xung quanh)\s+([^,.;]+?)(?=$|\s+(q\.|quận|huyện|p\.|phường|tp|thành phố|ho chi minh|hcm))/i,
      /(gần|gan|near|cạnh|canh|đối diện|doi dien|khu vực|khu vuc|xung quanh)\s+(.+)/i,
    ];
    for (const re of patterns) {
      const m = cleaned.match(re);
      if (m && m[2]) {
        const phrase = m[2].trim();
        if (phrase.length > 2) return [phrase];
      }
    }
    return [];
  }

  // Quyết định có cần AI: chỉ bỏ qua AI nếu đã có filter cứng (loại hình + giá/quận/POI) và không chứa ngữ tự do.
  private shouldSkipAi(q: string, poiKeywords: string[]): boolean {
    const text = this.normalizeQuery(q);
    const stripped = text.replace(/^\s*tìm\s+/, ''); // “tìm” rất phổ biến, không tính là free-text
    const tokens = stripped.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    const hasPrice =
      /\d+([.,]\d+)?\s*(trieu|triệu|tr|vnđ|vnd|m)/.test(stripped) ||
      /\b\d{6,9}\b/.test(stripped);
    const hasDistrictHint = /(?:quận|huyện|q\.|q\s+\d+)/.test(stripped);
    const hasCategoryWord = /(?:phòng trọ|chung cư|căn hộ|nhà nguyên căn)/.test(
      stripped,
    );
    const hasNearWord = /(gần|gan|near|cạnh|canh|đối diện|doi dien)/.test(
      stripped,
    );
    // Các mô tả tự do chưa map amenity → coi như free-text để cân nhắc AI
    const freeTextKeywords = [
      'thoáng',
      'mát',
      'thoáng mát',
      'yên tĩnh',
      'sạch',
      'sạch sẽ',
    ];
    const hasFreeText =
      /(như|giống|tương tự|hoặc|và|nhưng|tuy nhiên|ngoài ra)/.test(stripped) ||
      freeTextKeywords.some((w) => stripped.includes(w));

    const hasPoi = poiKeywords && poiKeywords.length > 0;

    // Điều kiện bỏ AI: đã có category AND (price hoặc district hoặc POI), không free-text.
    const structuredEnough =
      hasCategoryWord &&
      (hasPrice || hasDistrictHint || hasPoi) &&
      !hasFreeText;

    // Cực ngắn chỉ giá/quận cũng được bỏ AI nếu không có từ "gần" hay free-text
    const shortPriceDistrict =
      tokens.length <= 8 &&
      (hasPrice || hasDistrictHint) &&
      !hasNearWord &&
      !hasFreeText;

    // Nếu thiếu category nhưng đã có POI + price/quận, vẫn cho heuristic (để lấy filter cứng) nếu không free-text
    const poiWithSignals =
      hasPoi && (hasPrice || hasDistrictHint) && !hasFreeText;

    return structuredEnough || shortPriceDistrict || poiWithSignals;
  }

  private heuristicParse(q: string): ParsedNlpQuery {
    const text = this.normalizeQuery(q);
    const result: ParsedNlpQuery = { raw: q, q: text };

    if (/chung\s*c[ưu]|căn\s*hộ|cc/i.test(text)) result.category = 'chung-cu';
    else if (/phòng\s*trọ|pt/i.test(text)) result.category = 'phong-tro';
    else if (/nhà\s*nguyên\s*căn|nguyên\s*căn/i.test(text))
      result.category = 'nha-nguyen-can';
    // Fallback: nếu chỉ thấy "phòng" mà không có từ khóa chung cư/nhà thì coi là phòng trọ
    if (
      !result.category &&
      /\bphòng\b/i.test(q) &&
      !/chung\s*c[ưu]|căn\s*hộ|cc|nhà\s*nguyên\s*căn/i.test(text)
    ) {
      result.category = 'phong-tro';
    }

    result.postType = /(?:ở\s*ghép|o\s*ghep|og|share)/.test(text)
      ? 'roommate'
      : 'rent';

    // Price parsing (VN)
    const trToVnd = (v: number) => (v < 1000 ? v * 1_000_000 : v);
    const parseTrNum = (s: string) => {
      const m = s.match(/^(\d+)\s*tr\s*(\d+)$/i); // 6tr5
      if (m) return Number(m[1]) + Number(m[2]) / 10;
      return Number(s.replace(',', '.'));
    };
    const range = text.match(
      /(?:từ\s*)?(\d+(?:[.,]\d+)?(?:\s*tr)?)\s*(?:triệu|tr|m)?\s*(?:đến|to|-|~)\s*(\d+(?:[.,]\d+)?(?:\s*tr)?)\s*(?:triệu|tr|m|triệu\s*đồng)?/i,
    );
    if (range) {
      const min = trToVnd(parseTrNum(range[1].replace(/\s*tr/i, '')));
      const max = trToVnd(parseTrNum(range[2].replace(/\s*tr/i, '')));
      result.minPrice = Math.max(0, Math.floor(min * 0.95));
      result.maxPrice = Math.floor(max * 1.05);
    } else {
      const m6tr5 = text.match(/(\d+)\s*tr\s*(\d+)/i);
      const mUnit = text.match(
        /(\d+(?:[.,]\d+)?)\s*(triệu|tr|m|triệu\s*đồng)(?:\s*\/\s*tháng)?/i,
      );
      const mRawDot = text.match(/(\d{1,3}(?:[.,]\d{3}){2,})/);
      const mRaw = text.match(/\b(\d{6,9})\b/);
      let value: number | undefined;
      if (m6tr5) value = trToVnd(Number(m6tr5[1]) + Number(m6tr5[2]) / 10);
      else if (mUnit) value = trToVnd(Number(mUnit[1].replace(',', '.')));
      else if (mRawDot) value = Number(mRawDot[1].replace(/[.,]/g, ''));
      else if (mRaw) value = Number(mRaw[1]);
      if (value) {
        const delta = Math.floor(value * 0.1); // ±10% để biên hẹp hơn
        result.minPrice = Math.max(0, value - delta);
        result.maxPrice = value + delta;
      }
    }

    if (/giá\s*rẻ|rẻ|rẻ tiền/i.test(text) && !result.maxPrice) {
      result.maxPrice = 5_000_000;
    } else if (/giá\s*cao|đắt|đắt đỏ/i.test(text) && !result.minPrice) {
      result.minPrice = 10_000_000;
    } else if (
      /tầm\s*trung|trung bình/i.test(text) &&
      !result.minPrice &&
      !result.maxPrice
    ) {
      result.minPrice = 5_000_000;
      result.maxPrice = 10_000_000;
    }

    // District extraction (q7, q.7, quan 7, quận 7, district 7)
    if (!result.district) {
      const districtRegexes = [
        /(?:quận|quan)\s*(\d{1,2})\b/,
        /\bq\.?\s*(\d{1,2})\b/,
        /\bdistrict\s*(\d{1,2})\b/,
      ];
      for (const re of districtRegexes) {
        const m = text.match(re);
        if (m && m[1]) {
          result.district = `quận ${m[1]}`;
          break;
        }
      }
    }

    const wardMatch = text.match(/(?:phường|p\.|p\s*)\s*([a-z0-9\s]+)/);
    if (wardMatch) result.ward = wardMatch[1].trim();

    const bedroomsMatch = text.match(/(\d+)\s*(?:phòng\s*ngủ|pn|bedroom)/i);
    if (bedroomsMatch) result.minBedrooms = parseInt(bedroomsMatch[1], 10);

    const bathroomsMatch = text.match(
      /(\d+)\s*(?:phòng\s*tắm|pt|wc|bathroom)/i,
    );
    if (bathroomsMatch) result.minBathrooms = parseInt(bathroomsMatch[1], 10);

    if (
      /full\s*nội\s*thất|đầy\s*đủ\s*nội\s*thất|nội\s*thất\s*đầy\s*đủ/i.test(
        text,
      )
    ) {
      result.furniture = 'full';
    } else if (/nội\s*thất\s*cơ\s*bản|cơ\s*bản/i.test(text)) {
      result.furniture = 'basic';
    } else if (
      /(?:không|ko|khong)\s*nội\s*thất|phòng\s*trống|trống/i.test(text)
    ) {
      result.furniture = 'none';
    }

    if (/(?:có|co)\s*sổ\s*hồng|sổ\s*hồng|so\s*hong/i.test(text)) {
      result.legalStatus = 'co-so-hong';
    } else if (/chờ\s*sổ|cho\s*so/i.test(text)) {
      result.legalStatus = 'cho-so';
    }

    const timeMatch = text.match(
      /(?:mới\s*đăng|đăng\s*gần\s*đây|(\d+)\s*ngày\s*trước)/i,
    );
    if (timeMatch) {
      const days = timeMatch[1] ? parseInt(timeMatch[1], 10) : 7;
      const d = new Date();
      d.setDate(d.getDate() - days);
      result.minCreatedAt = d.toISOString();
    }

    const areaMatch = text.match(
      /(\d+(?:[.,]\d+)?)\s*(?:m2|m²|mét\s*vuông|m\s*vuông)/i,
    );
    if (areaMatch) {
      const area = parseFloat(areaMatch[1].replace(',', '.'));
      result.minArea = area * 0.9;
      result.maxArea = area * 1.1;
    }

    // --- Extra patterns (hardening) ---
    // Price single patterns if still not set: 6tr5, 7m, 7tr, raw 7.000.000
    if (result.minPrice == null && result.maxPrice == null) {
      const m6tr5 = text.match(/(\d+)\s*tr\s*(\d+)/i);
      const mUnit = text.match(
        /(\d+(?:[.,]\d+)?)\s*(triệu|tr|m|triệu\s*đồng)(?:\s*\/\s*tháng)?/i,
      );
      const mRawDot = text.match(/(\d{1,3}(?:[.,]\d{3}){2,})/); // 7.000.000
      const mRaw = text.match(/\b(\d{6,9})\b/);
      const trToVnd = (v: number) => (v < 1000 ? v * 1_000_000 : v);
      let value: number | undefined;
      if (m6tr5) value = trToVnd(Number(m6tr5[1]) + Number(m6tr5[2]) / 10);
      else if (mUnit) value = trToVnd(Number(mUnit[1].replace(',', '.')));
      else if (mRawDot) value = Number(mRawDot[1].replace(/[.,]/g, ''));
      else if (mRaw) value = Number(mRaw[1]);
      if (value) {
        const delta = Math.floor(value * 0.1); // thu hẹp biên ±10% để giá gần hơn kỳ vọng
        result.minPrice = Math.max(0, value - delta);
        result.maxPrice = value + delta;
      }
    }

    // Recency extra: "tuan qua", non-diacritic "ngay"
    if (!result.minCreatedAt) {
      const mDayNoAccent = text.match(/(\d+)\s*ngay/i);
      if (mDayNoAccent) {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(mDayNoAccent[1], 10));
        result.minCreatedAt = d.toISOString();
      } else {
        const weekMatch = text.match(/(\d+)\s*(?:tuần|tuan)/i);
        if (weekMatch) {
          const weeks = parseInt(weekMatch[1], 10);
          if (!Number.isNaN(weeks) && weeks > 0) {
            const d = new Date();
            d.setDate(d.getDate() - weeks * 7);
            result.minCreatedAt = d.toISOString();
          }
        } else if (
          /tuần\s*qua|tuan\s*qua/i.test(text) ||
          /(?:mới|vừa)\s*đăng/i.test(text)
        ) {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          result.minCreatedAt = d.toISOString();
        }
      }
    }

    // Building name heuristic around known hints
    if (!result.buildingName) {
      const buildingRegexes = [
        /(vinhomes[\w\s]*(?:grand park|central park|smart city)?)/i,
        /(vincom[\w\s]+)/i,
        /(landmark\s*\d+)/i,
        /(masteri[\w\s]*(?:an phú|thảo điền)?)/i,
        /(sunrise\s*city[\w\s]*)/i,
        /(city\s*garden[\w\s]*)/i,
        /(the\s+manor[\w\s]*)/i,
        /(sarimi[\w\s]*)/i,
        /(sadora[\w\s]*)/i,
        /(sala[\w\s]*)/i,
        /(estella[\w\s]*(?:heights)?)/i,
        /(golden\s+river[\w\s]*)/i,
      ];
      for (const pattern of buildingRegexes) {
        const match = q.match(pattern);
        if (match) {
          result.buildingName = match[0].trim();
          break;
        }
      }
      if (!result.buildingName) {
        const hints = [
          'vinhomes',
          'masteri',
          'landmark',
          'sunrise',
          'vincom',
          'the sun',
          'sala',
          'golden',
          'city garden',
          'estella',
          'the manor',
          'sarimi',
          'sadora',
        ];
        const lowerRaw = q.toLowerCase();
        for (const h of hints) {
          const idx = lowerRaw.indexOf(h);
          if (idx >= 0) {
            const start = Math.max(0, idx - 20);
            const end = Math.min(q.length, idx + 60);
            result.buildingName = q.substring(start, end).trim();
            break;
          }
        }
      }
    }

    // Amenities (đã có service riêng)
    result.amenities = this.amenities.extractAmenities(q);

    // POI keywords (để LocationAgent/ES boost) - dùng context POI
    const poi = this.extractContextPoi(q);
    if (poi.length) result.poiKeywords = poi;
    return result;
  }

  private readonly GEMINI_SYSTEM_PROMPT = `\nBạn là bộ parser NLP thông minh cho hệ thống tìm phòng trọ/chung cư tại Việt Nam.\nHãy đọc câu tìm kiếm tiếng Việt và trả về JSON KHÔNG có giải thích, với dạng:\n{\n  \"q\": string,\n  \"postType\": \"rent\" | \"roommate\" | null,\n  \"category\": \"phong-tro\" | \"chung-cu\" | \"nha-nguyen-can\" | null,\n  \"minPrice\": number | null,\n  \"maxPrice\": number | null,\n  \"district\": string | null,\n  \"ward\": string | null,\n  \"amenities\": string[] | null,\n  \"minBedrooms\": number | null,\n  \"minBathrooms\": number | null,\n  \"furniture\": \"full\" | \"basic\" | \"none\" | null,\n  \"legalStatus\": \"co-so-hong\" | \"cho-so\" | null,\n  \"radiusKm\": number | null,\n  \"minCreatedAtDaysAgo\": number | null\n}\nYêu cầu NLP:\n- Dùng VND cho giá. Ví dụ \"7 triệu\" → 6000000 đến 8000000.\n- amenities phải dùng key chuẩn: \"gym\", \"ho_boi\", \"ban_cong\", ...\n- Xử lý số phòng: \"2 phòng ngủ\" -> minBedrooms: 2.\n- Xử lý nội thất: \"full nội thất\" -> \"full\"; \"nội thất cơ bản\" -> \"basic\".\n- Xử lý pháp lý: \"có sổ hồng\" -> \"co-so-hong\".\n- Nếu không chắc, để null.\n`;

  private async aiParse(q: string): Promise<ParsedNlpQuery | null> {
    if (!this.genAI) return null;
    // Prefer Gemini Flash 2.x if available; allow override via GEMINI_MODEL_PARSER
    const preferred = (
      this.cfg.get<string>('GEMINI_MODEL_PARSER') || ''
    ).trim();
    const modelNames = [
      preferred || '',
      'gemini-2.5-flash',
      'gemini-2.5-flash-exp',
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro',
    ].filter(Boolean);

    let model: GenerativeModel | null = null;
    if (this.cachedWorkingModel) {
      try {
        model = this.genAI.getGenerativeModel({
          model: this.cachedWorkingModel,
          generationConfig: { temperature: 0.2 },
        });
      } catch {
        this.cachedWorkingModel = null;
      }
    }
    if (!model) {
      for (const name of modelNames) {
        if (name === this.cachedWorkingModel) continue;
        try {
          const candidate = this.genAI.getGenerativeModel({
            model: name,
            generationConfig: { temperature: 0.2 },
          });
          await candidate.generateContent('ping');
          this.cachedWorkingModel = name;
          model = candidate;
          this.logger.log(`✅ ParserAgent using model: ${name}`);
          break;
        } catch {
          continue;
        }
      }
    }
    if (!model) return null;

    const prompt =
      this.GEMINI_SYSTEM_PROMPT + `\n\nCâu tìm kiếm: \"${q}\"\nChỉ trả JSON.`;
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response
        .text()
        .trim()
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '');
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) text = jsonMatch[0];
      const parsed = JSON.parse(text);
      const out: ParsedNlpQuery = {
        raw: q,
        q: parsed.q || this.normalizeQuery(q),
        postType: parsed.postType || 'rent',
        category: parsed.category || undefined,
        minPrice: parsed.minPrice ?? undefined,
        maxPrice: parsed.maxPrice ?? undefined,
        district: parsed.district ?? undefined,
        ward: parsed.ward ?? undefined,
        amenities: parsed.amenities ?? undefined,
        minBedrooms: parsed.minBedrooms ?? undefined,
        maxBedrooms: parsed.maxBedrooms ?? undefined,
        minBathrooms: parsed.minBathrooms ?? undefined,
        maxBathrooms: parsed.maxBathrooms ?? undefined,
        furniture: parsed.furniture ?? undefined,
        legalStatus: parsed.legalStatus ?? undefined,
        propertyType: parsed.propertyType ?? undefined,
      };
      if (parsed.minCreatedAtDaysAgo != null) {
        const days = Number(parsed.minCreatedAtDaysAgo);
        if (!Number.isNaN(days) && days > 0) {
          const d = new Date();
          d.setDate(d.getDate() - days);
          out.minCreatedAt = d.toISOString();
        }
      }
      if (parsed.radiusKm != null) {
        const km = Number(parsed.radiusKm);
        if (!Number.isNaN(km) && km > 0) out.distance = `${km}km`;
      }
      return out;
    } catch (e) {
      this.logger.warn('ParserAgent AI parse failed, fallback heuristic');
      return null;
    }
  }

  async parse(rawQuery: string): Promise<ParsedNlpQuery> {
    const t0 = Date.now();
    const normalized = this.normalizeQuery(rawQuery);
    try {
      // Lấy trước POI ngữ cảnh (rẻ, không tốn AI) để quyết định có cần AI không
      const poi = this.extractContextPoi(rawQuery);
      const skipAi = this.shouldSkipAi(normalized, poi);
      let ai: ParsedNlpQuery | null = null;
      if (!skipAi) {
        // Đặt timeout mềm cho AI để không chậm
        const aiPromise = this.aiParse(rawQuery);
        ai = await Promise.race([
          aiPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
        ]);
      }
      const out = ai || this.heuristicParse(rawQuery);
      this.logger.debug(
        `ParserAgent.parse ${ai ? 'ai' : 'heuristic'} in ${Date.now() - t0}ms (skipAi=${skipAi})`,
      );
      return out;
    } catch (e: any) {
      this.logger.warn(`ParserAgent.parse error: ${e?.message || e}`);
      const out = this.heuristicParse(rawQuery);
      this.logger.debug(
        `ParserAgent.parse heuristic (error fallback) in ${Date.now() - t0}ms`,
      );
      return out;
    }
  }
}
