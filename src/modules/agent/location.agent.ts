import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import NodeGeocoder from 'node-geocoder';
import Redis from 'ioredis';

export type LocationEnrichment = {
  lat?: number;
  lon?: number;
  distance?: string;
  poiKeywords?: string[];
};

@Injectable()
export class LocationAgent {
  private readonly logger = new Logger(LocationAgent.name);
  private geocoder: NodeGeocoder.Geocoder;
  private redis: Redis;
  private readonly geoPoiTtlSec: number;
  private readonly aliasReplacements = [
    // Dùng lookaround thay vì \b để hỗ trợ dấu tiếng Việt (đ, ê, ô...)
    { regex: /(?<!\S)(đh)(?!\S)/giu, replace: 'đại học' },
    { regex: /(?<!\S)(dh)(?!\S)/giu, replace: 'đại học' },
    { regex: /(?<!\S)(bv)(?!\S)/giu, replace: 'bệnh viện' },
    { regex: /benh vien/giu, replace: 'bệnh viện' },
    { regex: /(?<!\S)(cho)(?!\S)/giu, replace: 'chợ' },
    { regex: /tttm/giu, replace: 'trung tâm thương mại' },
    { regex: /(?<!\S)(tn th)(?!\S)/giu, replace: 'tân thuận' },
    { regex: /đại hoc/giu, replace: 'đại học' },
  ];

  constructor(private readonly cfg: ConfigService) {
    const providerOptions: NodeGeocoder.Options = {
      provider: 'mapbox',
      apiKey: this.cfg.get<string>('MAPBOX_API_KEY') as string,
    };
    this.geocoder = NodeGeocoder(providerOptions);

    const redisUrl = this.cfg.get<string>('REDIS_URL');
    if (redisUrl)
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        enableReadyCheck: false,
      } as any);
    else {
      const host = this.cfg.get<string>('REDIS_HOST') || 'localhost';
      const port = Number(this.cfg.get<number>('REDIS_PORT')) || 6379;
      this.redis = new Redis({
        host,
        port,
        lazyConnect: true,
        enableReadyCheck: false,
      });
    }
    this.geoPoiTtlSec =
      Number(this.cfg.get<number>('GEO_POI_TTL_SEC')) || 10800;
  }

  private isValidHcmcCoords(lat: number, lon: number): boolean {
    return lat >= 10.3 && lat <= 11.0 && lon >= 106.3 && lon <= 107.0;
  }

  extractPoiName(query: string): { poiName: string; city?: string } | null {
    if (!query) return null;
    const lc = query.toLowerCase();
    let city: string | undefined;
    const cityMatch = lc.match(
      /(?:tp|thành phố|thanh pho)\s*(hồ chí minh|ho chi minh|hcm)/i,
    );
    if (cityMatch) city = 'Ho Chi Minh City, Vietnam';

    const normalized = this.standardizeSnippet(lc);

    // Ưu tiên các mẫu ngữ cảnh "gần/cạnh/đối diện/khu vực/xung quanh"
    const nearMatch = normalized.match(
      /\b(gần|gan|near|cạnh|canh|đối diện|doi dien|khu vực|khu vuc|xung quanh)\s+([^,.;]+?)(?=(\bq\.|\bquận|\bhuyện|\bp\.|\bphường|\btp|\bthành phố|,|\.|;|$))/i,
    );
    if (nearMatch && nearMatch[2]) {
      const poiName = this.standardizeSnippet(nearMatch[2]);
      return poiName ? { poiName, city } : null;
    }

    // Fallback nhẹ: lấy đoạn có từ khóa địa điểm chung (đại học/bệnh viện/tttm/...) nhưng không cần danh sách cứng
    const fallback = normalized.match(
      /(đại học|dai hoc|đh|dh|bệnh viện|benh vien|bv|trung tâm thương mại|tttm|chợ|cho|trường|truong)\s+(.+)/i,
    );
    if (fallback && fallback[0]) {
      const poiName = this.standardizeSnippet(fallback[0]);
      return poiName ? { poiName, city } : null;
    }
    return null;
  }

  private standardizeSnippet(snippet: string): string {
    if (!snippet) return '';
    let value = snippet
      .replace(/[,.;]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    // Remove trailing district/ward hints
    value = value
      .replace(
        /\s*(?:q|quận|p|phường|tp|thành phố|huyện)\.?\s*[0-9a-zàáạảãâầấậẩẫăằắặẳẵ\s-]*$/i,
        '',
      )
      .trim();
    for (const { regex, replace } of this.aliasReplacements) {
      value = value.replace(regex, replace);
    }
    return value.trim();
  }

  async geocodePoi(
    poiName: string,
    city?: string,
  ): Promise<{ lat: number; lon: number } | null> {
    if (!poiName) return null;
    let geocodeQuery = poiName;
    if (city) geocodeQuery = `${poiName}, ${city}`;
    else geocodeQuery = `${poiName}, Ho Chi Minh City, Vietnam`;
    const cacheKey = `geo:poi:${geocodeQuery.toLowerCase()}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const { lat, lon } = JSON.parse(cached);
        if (this.isValidHcmcCoords(lat, lon)) return { lat, lon };
        await this.redis.del(cacheKey);
      }
    } catch {}

    try {
      const results = await this.geocoder.geocode(geocodeQuery);
      if (results && results.length > 0) {
        let first = results[0];
        for (const r of results) {
          const lat = Number(r.latitude);
          const lon = Number(r.longitude);
          if (
            Number.isFinite(lat) &&
            Number.isFinite(lon) &&
            this.isValidHcmcCoords(lat, lon)
          ) {
            first = r;
            break;
          }
        }
        const lat = Number(first.latitude);
        const lon = Number(first.longitude);
        if (
          Number.isFinite(lat) &&
          Number.isFinite(lon) &&
          this.isValidHcmcCoords(lat, lon)
        ) {
          await this.redis.set(
            cacheKey,
            JSON.stringify({ lat, lon }),
            'EX',
            this.geoPoiTtlSec,
          );
          return { lat, lon };
        }
      }
    } catch (e: any) {
      this.logger.warn(`Geocode failed for "${poiName}": ${e?.message || e}`);
    }
    return null;
  }

  async enrich(rawQuery: string): Promise<LocationEnrichment> {
    const out: LocationEnrichment = {};
    const poiInfo = this.extractPoiName(rawQuery);
    if (poiInfo?.poiName) {
      const coords = await this.geocodePoi(poiInfo.poiName, poiInfo.city);
      out.poiKeywords = [poiInfo.poiName];
      if (coords) {
        out.lat = coords.lat;
        out.lon = coords.lon;
        out.distance = '3km';
      }
    }
    return out;
  }
}
