import { ParsedNlpQuery } from '../../nlp-search/types';
import { SearchPostsParams } from '../../search/search.service';

export function mapParsedToParams(parsed: ParsedNlpQuery): SearchPostsParams {
  // Fallback tự tính giá nếu parser không set (đảm bảo filter giá cho query ngắn như "6tr")
  const ensurePriceRange = (qText: string) => {
    if (!qText)
      return {
        minPrice: undefined as number | undefined,
        maxPrice: undefined as number | undefined,
      };
    const text = qText.trim().toLowerCase();
    const trToVnd = (v: number) => (v < 1000 ? v * 1_000_000 : v);
    const parseTrNum = (s: string) => {
      const m = s.match(/^(\d+)\s*tr\s*(\d+)$/i); // 6tr5
      if (m) return Number(m[1]) + Number(m[2]) / 10;
      return Number(s.replace(',', '.'));
    };
    // range 5-7tr, 5~7m, 5-7 triệu
    const range = text.match(
      /(?:từ\s*)?(\d+(?:[.,]\d+)?(?:\s*tr)?)\s*(?:triệu|tr|m)?\s*(?:đến|to|-|~)\s*(\d+(?:[.,]\d+)?(?:\s*tr)?)\s*(?:triệu|tr|m|triệu\s*đồng)?/i,
    );
    if (range) {
      const min = trToVnd(parseTrNum(range[1].replace(/\s*tr/i, '')));
      const max = trToVnd(parseTrNum(range[2].replace(/\s*tr/i, '')));
      return {
        minPrice: Math.max(0, Math.floor(min * 0.9)),
        maxPrice: Math.floor(max * 1.1),
      };
    }
    // single 6tr5, 6tr, 7m, 7.000.000
    const m6tr5 = text.match(/(\d+)\s*tr\s*(\d+)/i);
    const mUnit = text.match(
      /(\d+(?:[.,]\d+)?)\s*(triệu|tr|m|triệu\s*đồng)(?:\s*\/\s*tháng)?/i,
    );
    const mRawDot = text.match(/(\d{1,3}(?:[.,]\d{3}){2,})/);
    const mRaw = text.match(/\b(\d{6,9})\b/);
    // loose: số nhỏ (<=30) kèm ngữ cảnh giá (tr/triệu/m) ở câu khác vị trí
    const mLoose = text.match(/\b(\d{1,2}(?:[.,]\d+)?)\b/);
    let value: number | undefined;
    if (m6tr5) value = trToVnd(Number(m6tr5[1]) + Number(m6tr5[2]) / 10);
    else if (mUnit) value = trToVnd(Number(mUnit[1].replace(',', '.')));
    else if (mRawDot) value = Number(mRawDot[1].replace(/[.,]/g, ''));
    else if (mRaw) value = Number(mRaw[1]);
    else if (
      mLoose &&
      Number(mLoose[1].replace(',', '.')) > 0 &&
      Number(mLoose[1].replace(',', '.')) <= 30 &&
      /(triệu|tr|m|giá|thue|thuê|gia)/i.test(text)
    ) {
      value = trToVnd(Number(mLoose[1].replace(',', '.')));
    }
    if (value) {
      const delta = Math.floor(value * 0.1);
      return { minPrice: Math.max(0, value - delta), maxPrice: value + delta };
    }
    return { minPrice: undefined, maxPrice: undefined };
  };

  const p: SearchPostsParams = {
    q: parsed.q || parsed.raw,
    postType: parsed.postType,
    category: parsed.category,
    city: parsed.city,
    district: parsed.district,
    ward: parsed.ward,
    minPrice: parsed.minPrice,
    maxPrice: parsed.maxPrice,
    minArea: parsed.minArea,
    maxArea: parsed.maxArea,
    lat: parsed.lat,
    lon: parsed.lon,
    distance: parsed.distance,
    amenities: parsed.amenities,
    poiKeywords: parsed.poiKeywords,
    province_code: parsed.provinceCode,
    ward_code: parsed.wardCodes,
    minBedrooms: parsed.minBedrooms,
    maxBedrooms: parsed.maxBedrooms,
    minBathrooms: parsed.minBathrooms,
    maxBathrooms: parsed.maxBathrooms,
    furniture: parsed.furniture,
    legalStatus: parsed.legalStatus,
    propertyType: parsed.propertyType,
    buildingName: parsed.buildingName,
  };

  // Fallback category nếu parser chưa gán
  if (!p.category) {
    const t = (parsed.q || parsed.raw || '').toLowerCase();
    if (/phòng\s*trọ|phong\s*tro/.test(t)) p.category = 'phong-tro';
    else if (/chung\s*c[ưu]|căn\s*hộ|can\s*ho|chungcu/.test(t))
      p.category = 'chung-cu';
    else if (/nhà\s*nguyên\s*căn|nguyen\s*can|nha\s*nguyen\s*can/.test(t))
      p.category = 'nha-nguyen-can';
  }

  // Giá fallback nếu parser chưa gán
  if (p.minPrice == null && p.maxPrice == null) {
    const { minPrice, maxPrice } = ensurePriceRange(
      parsed.q || parsed.raw || '',
    );
    if (minPrice != null) p.minPrice = minPrice;
    if (maxPrice != null) p.maxPrice = maxPrice;
  }

  // Fallback bedrooms/bathrooms nếu parser chưa gán nhưng text có số
  if (p.minBedrooms == null && p.maxBedrooms == null) {
    const text = (parsed.q || parsed.raw || '').toLowerCase();
    const mBed = text.match(/(\d+)\s*phòng\s*ngủ/);
    if (mBed) {
      const n = Number(mBed[1]);
      if (Number.isFinite(n) && n > 0 && n <= 20) {
        p.minBedrooms = n;
        p.maxBedrooms = n;
      }
    }
  }
  if (p.minBathrooms == null && p.maxBathrooms == null) {
    const text = (parsed.q || parsed.raw || '').toLowerCase();
    const mBath = text.match(/(\d+)\s*phòng\s*tắm/);
    if (mBath) {
      const n = Number(mBath[1]);
      if (Number.isFinite(n) && n > 0 && n <= 20) {
        p.minBathrooms = n;
        p.maxBathrooms = n;
      }
    }
  }

  if (parsed.minCreatedAt) p.minCreatedAt = parsed.minCreatedAt;
  if (parsed.priceComparison) p.priceComparison = parsed.priceComparison;
  if (parsed.excludeAmenities?.length)
    p.excludeAmenities = parsed.excludeAmenities;
  if (parsed.excludeDistricts?.length)
    p.excludeDistricts = parsed.excludeDistricts;
  return p;
}
