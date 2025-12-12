/**
 * Kiểu dữ liệu kết quả NLP parsing
 * Dùng chung cho heuristic parser và AI parser
 */
export interface ParsedNlpQuery {
  raw: string;             // query gốc
  q: string;               // query đã normalize (không stopwords, lower...)
  postType?: 'rent' | 'roommate';
  category?: 'phong-tro' | 'chung-cu' | 'nha-nguyen-can';

  // Giá
  minPrice?: number;       // VND
  maxPrice?: number;       // VND

  // Diện tích (nếu có)
  minArea?: number;
  maxArea?: number;

  // Địa chỉ theo tên
  city?: string;
  district?: string;
  ward?: string;

  // Địa chỉ theo code (sau khi map)
  provinceCode?: string;
  // Không dùng districtCodes vì mapping chỉ là helper, không có districtCodes thực sự
  wardCodes?: string[];

  // Vị trí (POI / geo)
  poiKeywords?: string[];  // tên POI: ["Đại học Công nghiệp", "IUH"]
  lat?: number;
  lon?: number;
  distance?: string;       // "2km", "1km"...

  // Tiện ích (đã map về key trong amenities.json)
  amenities?: string[];    // ["gym", "ho_boi", "ban_cong", ...]

  // Thời gian đăng
  minCreatedAt?: string;   // ISO string "2025-11-01T00:00:00Z" chẳng hạn
  maxCreatedAt?: string;   // ít dùng, nhưng để sẵn

  // Negative filters (tránh, không có)
  excludeAmenities?: string[];  // ["gym", "ho_boi"] - tránh các tiện ích này
  excludeDistricts?: string[];  // ["quận 1"] - tránh các quận này
  
  // So sánh (rẻ hơn, đắt hơn)
  priceComparison?: 'cheaper' | 'more_expensive';  // so với giá trung bình
  
  // Điều kiện phức tạp
  mustHave?: string[];     // điều kiện bắt buộc
  preferHave?: string[];   // điều kiện ưu tiên

  // --- START: Các trường mới cho filter nâng cao ---
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  furniture?: string; // 'full', 'basic', 'none'
  legalStatus?: string; // 'co-so-hong', 'cho-so'
  propertyType?: string;
  buildingName?: string;
  // --- END: Các trường mới ---
}

