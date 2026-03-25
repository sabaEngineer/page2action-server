import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

const FROM_ADDRESS = 'Page2Action <noreply@page2action.com>';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('EMAIL_API_KEY');
    if (key) {
      this.resend = new Resend(key);
    } else {
      this.logger.warn('EMAIL_API_KEY not set — email sending disabled');
    }
  }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.resend) return false;

    try {
      const { error } = await this.resend.emails.send({
        from: FROM_ADDRESS,
        to: [to],
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        return false;
      }

      return true;
    } catch (err) {
      this.logger.error(`Email send error: ${(err as Error).message}`);
      return false;
    }
  }
}
