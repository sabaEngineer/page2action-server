import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const EDIT_PROMPTS: Record<string, string> = {
  make_longer:
    'Add 1-2 short sentences to this book insight — a brief example, a small clarification, or a supporting thought. Do NOT double the length. The result should be only slightly longer than the original. Keep the same tone, style, and language. Return ONLY the expanded text, nothing else.',
  improve_writing:
    'Improve the writing quality of this book insight — better clarity, flow, and word choice. Keep the same meaning, approximate length, and language. Return ONLY the improved text, nothing else.',
  make_shorter:
    'Make this book insight shorter and more concise while keeping the core message and language. Return ONLY the shortened text, nothing else.',
  fix_grammar:
    'Fix all grammar, spelling, and punctuation issues in this text. Keep the meaning, style, and language exactly the same. Return ONLY the corrected text, nothing else.',
};

@Injectable()
export class InsightEditorService {
  private readonly logger = new Logger(InsightEditorService.name);
  private openai: OpenAI | null = null;

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('OPENAI_API_KEY');
    if (key) {
      this.openai = new OpenAI({ apiKey: key });
    } else {
      this.logger.warn('OPENAI_API_KEY not set — AI editing disabled');
    }
  }

  async edit(content: string, action: string): Promise<string | null> {
    if (!this.openai) return null;

    const prompt = EDIT_PROMPTS[action];
    if (!prompt) return null;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content },
        ],
      });
      return response.choices[0]?.message?.content?.trim() ?? null;
    } catch (err) {
      this.logger.error('AI edit failed', (err as Error).stack);
      return null;
    }
  }
}
