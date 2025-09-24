export enum UtilityType {
  ELECTRICITY = 'electricity',
  WATER = 'water',
  INTERNET = 'internet',
  GARBAGE = 'garbage',
  CLEANING = 'cleaning',
  PARKING_MOTORBIKE = 'parking_motorbike',
  PARKING_CAR = 'parking_car',
  MANAGEMENT = 'management',
  GARDENING = 'gardening',
  COOKING_GAS = 'cooking_gas',
  SECURITY = 'security',
  ELEVATOR = 'elevator',
  AIR_CONDITIONING = 'air_conditioning',
  HEATING = 'heating',
  LAUNDRY = 'laundry',
  SWIMMING_POOL = 'swimming_pool',
  GYM = 'gym',
  LIBRARY = 'library',
  CAFETERIA = 'cafeteria',
  WIFI = 'wifi',
  CABLE_TV = 'cable_tv',
  PHONE = 'phone',
  MAILBOX = 'mailbox',
  BALCONY = 'balcony',
  TERRACE = 'terrace',
  GARDEN = 'garden',
  PARKING_SPACE = 'parking_space',
  STORAGE = 'storage',
  PET_FRIENDLY = 'pet_friendly',
  SMOKING_ALLOWED = 'smoking_allowed',
  WHEELCHAIR_ACCESSIBLE = 'wheelchair_accessible'
}

export interface UtilityInfo {
  type: UtilityType;
  name: string;
  description?: string;
  isIncluded: boolean;
  price?: number;
  unit?: string;
}

export const UTILITY_LABELS: Record<UtilityType, string> = {
  [UtilityType.ELECTRICITY]: 'Điện',
  [UtilityType.WATER]: 'Nước',
  [UtilityType.INTERNET]: 'Internet',
  [UtilityType.GARBAGE]: 'Rác',
  [UtilityType.CLEANING]: 'Dọn dẹp',
  [UtilityType.PARKING_MOTORBIKE]: 'Gửi xe máy',
  [UtilityType.PARKING_CAR]: 'Gửi xe ô tô',
  [UtilityType.MANAGEMENT]: 'Quản lý',
  [UtilityType.GARDENING]: 'Chăm sóc cây',
  [UtilityType.COOKING_GAS]: 'Gas nấu ăn',
  [UtilityType.SECURITY]: 'Bảo vệ',
  [UtilityType.ELEVATOR]: 'Thang máy',
  [UtilityType.AIR_CONDITIONING]: 'Điều hòa',
  [UtilityType.HEATING]: 'Sưởi ấm',
  [UtilityType.LAUNDRY]: 'Giặt ủi',
  [UtilityType.SWIMMING_POOL]: 'Hồ bơi',
  [UtilityType.GYM]: 'Phòng gym',
  [UtilityType.LIBRARY]: 'Thư viện',
  [UtilityType.CAFETERIA]: 'Căng tin',
  [UtilityType.WIFI]: 'WiFi',
  [UtilityType.CABLE_TV]: 'Truyền hình cáp',
  [UtilityType.PHONE]: 'Điện thoại',
  [UtilityType.MAILBOX]: 'Hộp thư',
  [UtilityType.BALCONY]: 'Ban công',
  [UtilityType.TERRACE]: 'Sân thượng',
  [UtilityType.GARDEN]: 'Vườn',
  [UtilityType.PARKING_SPACE]: 'Chỗ đỗ xe',
  [UtilityType.STORAGE]: 'Kho chứa',
  [UtilityType.PET_FRIENDLY]: 'Cho phép thú cưng',
  [UtilityType.SMOKING_ALLOWED]: 'Cho phép hút thuốc',
  [UtilityType.WHEELCHAIR_ACCESSIBLE]: 'Thiết kế cho người khuyết tật'
};
