import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

type WardEntry = { ward_code: string; ward_name: string };
type DistrictEntry = { old_name: string; aliases: string[]; province_code: string; current_wards: WardEntry[] };

@Injectable()
export class GeoCodeService {
  private readonly logger = new Logger(GeoCodeService.name);
  private aliasToWardCodes: Map<string, Set<string>> = new Map();
  private normalizedAliasToWardCodes: Map<string, Set<string>> = new Map();
  private wardNameKeyToCodes: Map<string, { provinceCode: string; districtCode?: string; wardCode: string }> = new Map();
  private wardCodeToDistrictKey: Map<string, string> = new Map(); // ward_code -> district_key
  private districtToWardCodes: Map<string, Set<string>> = new Map(); // district_key -> Set<ward_code>
  private wardCodeToDistrictName: Map<string, string> = new Map(); // ward_code -> district old_name
  private configLoaded = false; // Flag để đảm bảo chỉ load 1 lần

  constructor() {
    // Không load ngay, sẽ lazy load khi cần
    // this.loadConfig(); // Đã tắt để giảm memory khi start
  }

  private normalize(text: string): string {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeNoSpace(text: string): string {
    return this.normalize(text).replace(/\s+/g, '');
  }

  /**
   * Đảm bảo config đã được load (lazy load)
   * Chỉ load khi thực sự cần dùng
   */
  private ensureConfigLoaded(): void {
    if (!this.configLoaded) {
      this.loadConfig();
      this.configLoaded = true;
    }
  }

  private loadConfig(): void {
    try {
      const file = path.resolve(process.cwd(), 'config', 'legacy-district-mapping.json');
      if (!fs.existsSync(file)) return;
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      const mappings = json?.mappings || {};

      const addAlias = (alias: string, codes: Set<string>) => {
        if (!alias) return;
        const base = alias.toLowerCase().trim();
        if (!this.aliasToWardCodes.has(base)) this.aliasToWardCodes.set(base, new Set());
        const set = this.aliasToWardCodes.get(base)!;
        codes.forEach((c) => set.add(c));

        const n1 = this.normalize(alias);
        const n2 = this.normalizeNoSpace(alias);
        const variations = new Set<string>([n1, n2, n1.replace(/^q\s+/,'').trim(), n2.replace(/^q/,'').trim(), n1.replace(/^quan\s+/,'').trim()]);
        for (const v of variations) {
          if (!v) continue;
          if (!this.normalizedAliasToWardCodes.has(v))
            this.normalizedAliasToWardCodes.set(v, new Set());
          const nset = this.normalizedAliasToWardCodes.get(v)!;
          codes.forEach((c) => nset.add(c));
        }
      };
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
            this.wardCodeToDistrictName.set(w.ward_code, d.old_name || dKey);
            const wardKey = `${(w.ward_name||'').toLowerCase()}`;
            if (!this.wardNameKeyToCodes.has(wardKey)) {
              this.wardNameKeyToCodes.set(wardKey, { provinceCode: d.province_code, wardCode: w.ward_code });
            }
          }
          // Lưu mapping district_key -> Set<ward_code>
          this.districtToWardCodes.set(dKey, codes);
          for (const al of aliasList) {
            addAlias(al, codes);
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
    this.ensureConfigLoaded(); // Lazy load khi cần
    const key = text.toLowerCase().trim();
    const normKey = this.normalize(key);
    const normKeyNoSpace = this.normalizeNoSpace(key);
    const candidates = [
      this.aliasToWardCodes.get(key),
      this.normalizedAliasToWardCodes.get(normKey),
      this.normalizedAliasToWardCodes.get(normKeyNoSpace),
      this.normalizedAliasToWardCodes.get(normKey.replace(/^q\s+/,'').trim()),
      this.normalizedAliasToWardCodes.get(normKey.replace(/^quan\s+/,'').trim()),
      this.normalizedAliasToWardCodes.get(normKeyNoSpace.replace(/^q/,'').trim()),
    ].filter(Boolean) as Set<string>[];
    const s = candidates.find((c) => c && c.size > 0);
    if (!s || s.size === 0) return undefined;
    return Array.from(s);
  }

  /**
   * Quét trong câu query (không dấu, viết liền) để tìm alias quận và trả wardCodes.
   * Ưu tiên alias dài nhất để tránh trùng từ ngắn (vd: "an khanh" vs "an").
   */
  detectDistrictFromText(
    text?: string,
  ): { alias: string; wardCodes: string[] } | undefined {
    if (!text) return undefined;
    this.ensureConfigLoaded();
    const normQuery = this.normalize(text);
    const normNoSpace = this.normalizeNoSpace(text);

    let bestAlias = '';
    let bestCodes: string[] | undefined;

    const tryMatch = (alias: string, codes: Set<string>) => {
      if (!alias || !codes || codes.size === 0) return;
      const aliasNoSpace = alias.replace(/\s+/g, '');
      const hit =
        normQuery.includes(alias) ||
        normNoSpace.includes(aliasNoSpace) ||
        normQuery.includes(`q ${alias}`) ||
        normQuery.includes(`quan ${alias}`);
      if (!hit) return;
      if (!bestCodes || alias.length > bestAlias.length) {
        bestAlias = alias;
        bestCodes = Array.from(codes);
      }
    };

    // Ưu tiên normalized map (đã gồm nhiều biến thể)
    for (const [alias, codes] of this.normalizedAliasToWardCodes.entries()) {
      tryMatch(alias, codes);
    }
    // Sau đó đến alias raw (có dấu)
    for (const [alias, codes] of this.aliasToWardCodes.entries()) {
      tryMatch(this.normalize(alias), codes);
    }

    if (!bestCodes) return undefined;
    return { alias: bestAlias, wardCodes: bestCodes };
  }

  resolveWardByName(wardName?: string): { provinceCode: string; wardCode: string } | undefined {
    if (!wardName) return undefined;
    this.ensureConfigLoaded(); // Lazy load khi cần
    const entry = this.wardNameKeyToCodes.get(wardName.toLowerCase().trim());
    return entry ? { provinceCode: entry.provinceCode, wardCode: entry.wardCode } : undefined;
  }

  /**
   * Lấy tên quận (old_name) từ ward code.
   */
  getDistrictNameByWardCode(wardCode?: string): string | undefined {
    if (!wardCode) return undefined;
    this.ensureConfigLoaded();
    return this.wardCodeToDistrictName.get(wardCode);
  }

  /**
   * Lấy tất cả ward codes trong cùng quận từ ward name hoặc ward code
   * @param wardNameOrCode Tên phường hoặc mã phường
   * @returns Mảng các ward codes trong cùng quận, hoặc undefined nếu không tìm thấy
   */
  getWardsInSameDistrict(wardNameOrCode?: string): string[] | undefined {
    if (!wardNameOrCode) return undefined;
    this.ensureConfigLoaded(); // Lazy load khi cần
    
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


