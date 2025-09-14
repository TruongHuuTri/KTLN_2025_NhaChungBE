export class AgeUtils {
  /**
   * Tính tuổi từ ngày sinh
   */
  static calculateAge(dateOfBirth: Date | string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Validate tuổi từ ngày sinh
   */
  static validateAge(dateOfBirth: Date | string, minAge: number = 18, maxAge: number = 100): boolean {
    const age = this.calculateAge(dateOfBirth);
    return age >= minAge && age <= maxAge;
  }

  /**
   * Tính ngày sinh từ tuổi (cho migration)
   */
  static calculateDateOfBirthFromAge(age: number): Date {
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - age;
    return new Date(birthYear, 0, 1); // 1/1 của năm sinh
  }

  /**
   * Format ngày sinh cho display
   */
  static formatDateOfBirth(dateOfBirth: Date | string): string {
    const date = new Date(dateOfBirth);
    return date.toLocaleDateString('vi-VN');
  }

  /**
   * Lấy thông tin tuổi chi tiết
   */
  static getAgeInfo(dateOfBirth: Date | string): { age: number; formatted: string; isValid: boolean } {
    const age = this.calculateAge(dateOfBirth);
    const formatted = this.formatDateOfBirth(dateOfBirth);
    const isValid = this.validateAge(dateOfBirth);
    
    return { age, formatted, isValid };
  }
}
