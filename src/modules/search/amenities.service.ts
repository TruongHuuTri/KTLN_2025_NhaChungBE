import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

type Amenity = {
  key: string;
  keywords: string[];
  synonyms: string[];
};

type AmenitiesConfig = {
  version: string;
  amenities: Amenity[];
};

@Injectable()
export class AmenitiesService implements OnModuleInit {
  private readonly logger = new Logger(AmenitiesService.name);
  private amenities: Amenity[] = [];
  private keywordToAmenity: Map<string, string> = new Map(); // keyword -> amenity key
  private allSynonyms: string[] = []; // For ES synonyms

  async onModuleInit() {
    try {
      const configPath = path.resolve(process.cwd(), 'config', 'amenities.json');
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const config: AmenitiesConfig = JSON.parse(content);
        this.amenities = config.amenities;
        
        // Build reverse lookup map
        for (const amenity of this.amenities) {
          for (const keyword of amenity.keywords) {
            this.keywordToAmenity.set(keyword.toLowerCase(), amenity.key);
          }
          for (const synonym of amenity.synonyms) {
            this.keywordToAmenity.set(synonym.toLowerCase(), amenity.key);
            this.allSynonyms.push(synonym);
          }
        }
        
        this.logger.log(`Loaded ${this.amenities.length} amenities with ${this.allSynonyms.length} synonyms`);
      } else {
        this.logger.warn('amenities.json not found. Amenities search will not work.');
      }
    } catch (e: any) {
      this.logger.error(`Failed to load amenities.json: ${e.message}`);
    }
  }

  /**
   * Extract amenities from query text
   * Returns array of amenity keys found in query
   */
  extractAmenities(query: string): string[] {
    if (!query || !this.amenities.length) return [];
    
    const lowerQuery = query.toLowerCase();
    const found = new Set<string>();
    
    for (const amenity of this.amenities) {
      // Check keywords and synonyms
      const allTerms = [...amenity.keywords, ...amenity.synonyms];
      for (const term of allTerms) {
        if (lowerQuery.includes(term.toLowerCase())) {
          found.add(amenity.key);
          break; // Found this amenity, move to next
        }
      }
    }
    
    return Array.from(found);
  }

  /**
   * Get all synonyms for ES synonyms.txt
   */
  getSynonymsForES(): string[] {
    return this.allSynonyms;
  }

  /**
   * Get amenity keywords for boosting in search
   */
  getAmenityKeywords(amenityKey: string): string[] {
    const amenity = this.amenities.find(a => a.key === amenityKey);
    return amenity ? [...amenity.keywords, ...amenity.synonyms] : [];
  }

  /**
   * Check if text contains amenity keywords (for boosting)
   */
  containsAmenity(text: string, amenityKey: string): boolean {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    const keywords = this.getAmenityKeywords(amenityKey);
    return keywords.some(k => lowerText.includes(k.toLowerCase()));
  }
}

