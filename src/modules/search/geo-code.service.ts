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
            const wardKey = `${(w.ward_name||'').toLowerCase()}`;
            if (!this.wardNameKeyToCodes.has(wardKey)) {
              this.wardNameKeyToCodes.set(wardKey, { provinceCode: d.province_code, wardCode: w.ward_code });
            }
          }
          for (const al of aliasList) {
            if (!this.aliasToWardCodes.has(al)) this.aliasToWardCodes.set(al, new Set());
            const set = this.aliasToWardCodes.get(al)!;
            codes.forEach(c => set.add(c));
          }
        }
      }
      this.logger.log(`Geo code mapping loaded. Aliases: ${this.aliasToWardCodes.size}`);
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
}


