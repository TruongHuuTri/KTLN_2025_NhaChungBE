import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

type WardEntry = { ward_code: string; ward_name: string };
type DistrictEntry = { old_name: string; aliases: string[]; province_code: string; current_wards: WardEntry[] };

@Injectable()
export class GeoCodeService {
  private readonly logger = new Logger(GeoCodeService.name);
  private aliasToWardCodes: Map<string, Set<string>> = new Map();
  private wardNameKeyToCodes: Map<string, { provinceCode: string; districtCode?: string; wardCode: string }> = new Map();
  private wardCodeToDistrictKey: Map<string, string> = new Map(); // ward_code -> district_key
  private districtToWardCodes: Map<string, Set<string>> = new Map(); // district_key -> Set<ward_code>

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const file = path.resolve(process.cwd(), 'config', 'legacy-district-mapping.json');
      if (!fs.existsSync(file)) return;
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      const mappings = json?.mappings || {};
      for (const provKey of Object.keys(mappings)) {
        const districts = mappings[provKey] as Record<string, DistrictEntry>;
        for (const dKey of Object.keys(districts)) {
          const d = districts[dKey];
          const aliasList = new Set<string>([d.old_name.toLowerCase(), ...(d.aliases||[]).map((a: string)=>a.toLowerCase())]);
          const codes = new Set<string>();
          for (const w of d.current_wards || []) {
            codes.add(w.ward_code);
            // Lưu mapping ward_code -> district_key
            this.wardCodeToDistrictKey.set(w.ward_code, dKey);
            const wardKey = `${(w.ward_name||'').toLowerCase()}`;
            if (!this.wardNameKeyToCodes.has(wardKey)) {
              this.wardNameKeyToCodes.set(wardKey, { provinceCode: d.province_code, wardCode: w.ward_code });
            }
          }
          // Lưu mapping district_key -> Set<ward_code>
          this.districtToWardCodes.set(dKey, codes);
          for (const al of aliasList) {
            if (!this.aliasToWardCodes.has(al)) this.aliasToWardCodes.set(al, new Set());
            const set = this.aliasToWardCodes.get(al)!;
            codes.forEach(c => set.add(c));
          }
        }
      }
      this.logger.log(`Geo code mapping loaded. Aliases: ${this.aliasToWardCodes.size}, Districts: ${this.districtToWardCodes.size}`);
    } catch (e: any) {
      this.logger.warn(`Failed to load geo mapping: ${e?.message || e}`);
    }
  }

  expandDistrictAliasesToWardCodes(text?: string): string[] | undefined {
    if (!text) return undefined;
    const key = text.toLowerCase().trim();
    const s = this.aliasToWardCodes.get(key);
    if (!s || s.size === 0) return undefined;
    return Array.from(s);
  }

  resolveWardByName(wardName?: string): { provinceCode: string; wardCode: string } | undefined {
    if (!wardName) return undefined;
    const entry = this.wardNameKeyToCodes.get(wardName.toLowerCase().trim());
    return entry ? { provinceCode: entry.provinceCode, wardCode: entry.wardCode } : undefined;
  }

  /**
   * Lấy tất cả ward codes trong cùng quận từ ward name hoặc ward code
   * @param wardNameOrCode Tên phường hoặc mã phường
   * @returns Mảng các ward codes trong cùng quận, hoặc undefined nếu không tìm thấy
   */
  getWardsInSameDistrict(wardNameOrCode?: string): string[] | undefined {
    if (!wardNameOrCode) return undefined;
    
    let wardCode: string | undefined;
    
    // Nếu là ward code (số)
    if (/^\d+$/.test(wardNameOrCode.trim())) {
      wardCode = wardNameOrCode.trim();
    } else {
      // Nếu là ward name, resolve sang ward code
      const resolved = this.resolveWardByName(wardNameOrCode);
      if (!resolved) return undefined;
      wardCode = resolved.wardCode;
    }
    
    if (!wardCode) return undefined;
    
    // Tìm district key từ ward code
    const districtKey = this.wardCodeToDistrictKey.get(wardCode);
    if (!districtKey) return undefined;
    
    // Lấy tất cả ward codes trong quận đó
    const wardCodes = this.districtToWardCodes.get(districtKey);
    if (!wardCodes || wardCodes.size === 0) return undefined;
    
    return Array.from(wardCodes);
  }
}


