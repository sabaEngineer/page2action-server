import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const VALID_STYLES = [
  'MORNING_BOOST',
  'APPLY_TODAY',
  'DO_IT_NOW',
  'SPREAD_THE_IDEA',
  'TODAYS_TAKEAWAY',
] as const;

const SYSTEM_PROMPT = `Classify a book insight into ONE notification style. Pick the FIRST one that fits:

1. DO_IT_NOW — a specific, concrete action the person can do right now, no dependencies. "Call someone", "Write it down", "Delete the app". If it tells you to DO something immediately → DO_IT_NOW.

2. APPLY_TODAY — a practical technique or method to try today, but depends on context or situation. "Next time someone criticises you, pause before reacting." Needs a moment or setting to apply → APPLY_TODAY.

3. MORNING_BOOST — not long, punchy, motivational. Makes you feel energised or reminded of what matters. No specific action needed. "You don't need more time, you need more focus." If it's a quick hit of energy or perspective → MORNING_BOOST. When in doubt between this and SPREAD_THE_IDEA, pick MORNING_BOOST.

4. SPREAD_THE_IDEA — a surprising fact, counterintuitive concept, or deep insight that makes you want to tell someone about it. "Did you know 90% of startups fail because of X?" ONLY use this when the main value is the idea itself being shared, not personal motivation.

Respond with ONLY the style name. Nothing else.`;

const COOLDOWN_MS = 60_000;
const MIN_CONTENT_LENGTH = 30;

@Injectable()
export class InsightClassifierService {
  private readonly logger = new Logger(InsightClassifierService.name);
  private openai: OpenAI | null = null;
  /** Tracks pending timers per insight so we only classify once after edits settle. */
  private pending = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const key = this.config.get<string>('OPENAI_API_KEY');
    if (key) {
      this.openai = new OpenAI({ apiKey: key });
    } else {
      this.logger.warn('OPENAI_API_KEY not set — insight classification disabled');
    }
  }

  /**
   * Schedule classification. On create (`immediate=true`) it runs right away.
   * On update it debounces — waits COOLDOWN_MS after the last call before
   * actually hitting OpenAI, so rapid auto-saves don't spam the API.
   */
  scheduleClassify(insightId: string, content: string, immediate = false): void {
    if (!this.openai) return;
    if (stripHtml(content).length < MIN_CONTENT_LENGTH) return;

    const prev = this.pending.get(insightId);
    if (prev) clearTimeout(prev);

    if (immediate) {
      this.pending.delete(insightId);
      void this.doClassify(insightId, content);
    } else {
      const timer = setTimeout(() => {
        this.pending.delete(insightId);
        void this.doClassify(insightId, content);
      }, COOLDOWN_MS);
      this.pending.set(insightId, timer);
    }
  }

  private async doClassify(insightId: string, content: string): Promise<void> {
    if (!this.openai) return;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 20,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: stripHtml(content) },
        ],
      });

      const raw = response.choices[0]?.message?.content?.trim();
      const style = VALID_STYLES.find((s) => s === raw) ?? null;

      if (style) {
        await this.prisma.insight.update({
          where: { id: insightId },
          data: { style },
        });
      } else {
        this.logger.warn(`Unexpected classification result: "${raw}" for insight ${insightId}`);
      }
    } catch (err) {
      this.logger.error(`Failed to classify insight ${insightId}`, (err as Error).stack);
    }
  }
}
