import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export type RerankItem = {
  id: string;
  postId?: number;
  title?: string;
  roomDescription?: string;
  postDescription?: string;
  address?: any;
  category?: string;
  price?: number;
  area?: number;
  amenities?: string[];
};

@Injectable()
export class RerankAgent {
  private readonly logger = new Logger(RerankAgent.name);
  private readonly genAI?: GoogleGenerativeAI;
  private cachedModelName: string | null = null;

  constructor(private readonly cfg: ConfigService) {
    const apiKey = this.cfg.get<string>('GEMINI_API_KEY');
    if (apiKey) this.genAI = new GoogleGenerativeAI(apiKey);
    else this.logger.warn('GEMINI_API_KEY not set. RerankAgent will be disabled.');
  }

  private async getModel(): Promise<GenerativeModel | null> {
    if (!this.genAI) return null;
    const preferred = (this.cfg.get<string>('GEMINI_MODEL_RERANK') || '').trim();
    const names = [
      preferred || '',
      'gemini-2.5-flash',
      'gemini-2.5-flash-exp',
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
    ].filter(Boolean);

    if (this.cachedModelName) {
      try {
        return this.genAI.getGenerativeModel({ model: this.cachedModelName, generationConfig: { temperature: 0.2 } });
      } catch {
        this.cachedModelName = null;
      }
    }

    for (const name of names) {
      if (name === this.cachedModelName) continue;
      try {
        const m = this.genAI.getGenerativeModel({ model: name, generationConfig: { temperature: 0.2 } });
        await m.generateContent('ping');
        this.cachedModelName = name;
        this.logger.log(`✅ RerankAgent using model: ${name}`);
        return m;
      } catch {
        continue;
      }
    }
    return null;
  }

  private buildPrompt(query: string, items: RerankItem[]): string {
    const condensed = items.map((it, idx) => ({
      idx,
      id: it.id,
      postId: it.postId,
      title: (it.title || '').toString().slice(0, 140),
      desc: (it as any).roomDescription || (it as any).postDescription || '',
      category: it.category,
      price: it.price,
      area: it.area,
      amenities: it.amenities || [],
      address: it.address?.full || '',
    }));

    return `Bạn là bộ chấm điểm mức phù hợp cho kết quả tìm nhà. Cho câu truy vấn và danh sách item, hãy trả về JSON duy nhất dạng:
{
  "scores": [ { "idx": number, "score": number } ]
}
- score trong [0,1], càng cao càng phù hợp với query.
- Không giải thích.

Query: ${JSON.stringify(query)}
Items: ${JSON.stringify(condensed).slice(0, 12000)}
`;
  }

  async rerank(query: string, items: RerankItem[], topK = 30, timeoutMs = 2000): Promise<RerankItem[]> {
    try {
      const model = await this.getModel();
      if (!model) return items;
      const slice = items.slice(0, Math.min(topK, items.length));
      const prompt = this.buildPrompt(query, slice);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }], safetySettings: [], generationConfig: { temperature: 0.2 } }, { signal: controller.signal as any } as any);
      clearTimeout(timer);
      const text = res.response.text().trim().replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const match = text.match(/\{[\s\S]*\}/);
      const json = JSON.parse(match ? match[0] : text);
      const scores: { idx: number; score: number }[] = Array.isArray(json?.scores) ? json.scores : [];

      const byIdx = new Map<number, number>();
      for (const s of scores) {
        if (typeof s?.idx === 'number' && typeof s?.score === 'number') byIdx.set(s.idx, s.score);
      }

      const ranked = slice
        .map((it, i) => ({ it, s: byIdx.get(i) ?? 0 }))
        .sort((a, b) => b.s - a.s)
        .map((x) => x.it);

      // Giữ nguyên phần còn lại (không chấm điểm) nối vào cuối
      if (items.length > slice.length) {
        ranked.push(...items.slice(slice.length));
      }
      return ranked;
    } catch (e: any) {
      this.logger.warn(`RerankAgent failed: ${e?.message || e}`);
      return items;
    }
  }
}

