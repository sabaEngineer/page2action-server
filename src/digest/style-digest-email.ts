import { InsightStyle } from '@prisma/client';

/**
 * Per-style insight digest email: plain layout (normal email body, not a “book page”).
 */

const EMAIL = {
  outerBg: '#0a0a0a',
  cardBg: '#0a0a0a',
  border: '#3f3f46',
  text: '#fafafa',
  textSecondary: '#e4e4e7',
  muted: '#a1a1aa',
  faint: '#71717a',
  link: '#60a5fa',
} as const;

const STYLE_META: Record<
  InsightStyle,
  { subject: string; tagline: string; ribbon: string; pageTitle: string }
> = {
  MORNING_BOOST: {
    subject: '☀️ Your Morning Boost — Page2Action',
    tagline: 'Your Morning Boost from Page2Action',
    ribbon: 'Morning boost',
    pageTitle: 'Your Morning Boost',
  },
  DO_IT_NOW: {
    subject: '⚡ Do it now — Page2Action',
    tagline: 'Your “Do it now” nudge from Page2Action',
    ribbon: 'Do it now',
    pageTitle: 'Do it now',
  },
  SPREAD_THE_IDEA: {
    subject: '💡 Spread the idea — Page2Action',
    tagline: 'An idea worth sharing — from Page2Action',
    ribbon: 'Spread the idea',
    pageTitle: 'Spread the idea',
  },
  APPLY_TODAY: {
    subject: '🎯 Apply this today — Page2Action',
    tagline: 'Something to apply today — from Page2Action',
    ribbon: 'Apply today',
    pageTitle: 'Apply this today',
  },
  TODAYS_TAKEAWAY: {
    subject: '📌 Today’s takeaway — Page2Action',
    tagline: 'Today’s takeaway from Page2Action',
    ribbon: 'Today’s takeaway',
    pageTitle: 'Today’s takeaway',
  },
};

export function styleDigestEmailSubject(style: InsightStyle): string {
  return STYLE_META[style].subject;
}

const FF =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const P_BODY =
  `margin:0 0 12px 0;color:${EMAIL.text} !important;-webkit-text-fill-color:${EMAIL.text} !important;` +
  `font-family:${FF};font-size:16px;line-height:1.6;opacity:1 !important;`;

const VOID_TAGS = new Set(['br', 'hr', 'img']);

function stripDangerousBlocks(html: string): string {
  return html
    .replace(/<\/script/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '');
}

function splitRoughTags(html: string): string[] {
  const parts: string[] = [];
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      parts.push(html.slice(i));
      break;
    }
    if (lt > i) parts.push(html.slice(i, lt));
    const gt = html.indexOf('>', lt);
    if (gt === -1) {
      parts.push(escapeHtml(html.slice(lt)));
      break;
    }
    parts.push(html.slice(lt, gt + 1));
    i = gt + 1;
  }
  return parts;
}

const TAG_RE =
  /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9:-]*)\s*((?:[^>"']|"[^"]*"|'[^']*')*?)\s*(\/?)\s*>$/;

function extractAttr(attrPart: string, name: string): string {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = re.exec(attrPart);
  if (!m) return '';
  return (m[2] ?? m[3] ?? m[4] ?? '').trim();
}

function safeHref(href: string): boolean {
  const h = href.trim().toLowerCase();
  if (!h) return false;
  if (h.startsWith('javascript:') || h.startsWith('data:') || h.startsWith('vbscript:')) return false;
  if (h.startsWith('http://') || h.startsWith('https://') || h.startsWith('mailto:')) return true;
  if (h.startsWith('/') && !h.startsWith('//')) return true;
  return false;
}

function headingOpen(tag: string): string {
  const n = tag[1];
  const px = n === '1' ? 22 : n === '2' ? 20 : n === '3' ? 18 : 17;
  return `<${tag} style="margin:0 0 10px 0;font-weight:700;font-size:${px}px;line-height:1.35;color:${EMAIL.text} !important;-webkit-text-fill-color:${EMAIL.text} !important;font-family:${FF};">`;
}

/**
 * Keeps safe structure: bold/italic/underline, lists, links, blockquote, headings, br.
 * Strips all user styles/classes so iOS Mail stays readable.
 */
export function sanitizeInsightHtmlForEmailBody(html: string): string {
  if (!html || !html.trim()) {
    return `<p style="${P_BODY}margin-bottom:0;color:${EMAIL.muted} !important;-webkit-text-fill-color:${EMAIL.muted} !important;">(No text in this insight.)</p>`;
  }
  const cleaned = stripDangerousBlocks(html);
  const parts = splitRoughTags(cleaned);
  let out = '';
  for (const part of parts) {
    if (!part.startsWith('<')) {
      out += escapeHtml(part);
      continue;
    }
    const m = TAG_RE.exec(part);
    if (!m) continue;
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    const attrPart = m[3] ?? '';
    const selfClose = m[4] === '/' || VOID_TAGS.has(name);

    if (name === 'br') {
      out += '<br />';
      continue;
    }
    if (name === 'hr') {
      if (!closing) {
        out += `<hr style="border:none;border-top:1px solid ${EMAIL.border};margin:12px 0;" />`;
      }
      continue;
    }
    if (name === 'img') {
      if (!closing) {
        const alt = extractAttr(attrPart, 'alt');
        if (alt) out += `<span style="color:${EMAIL.muted};font-style:italic;">${escapeHtml(alt)}</span>`;
      }
      continue;
    }

    if (closing) {
      if (name === 'strong' || name === 'b') {
        out += '</strong>';
        continue;
      }
      if (name === 'em' || name === 'i') {
        out += '</em>';
        continue;
      }
      if (name === 'u') {
        out += '</u>';
        continue;
      }
      if (name === 'a') {
        out += '</a>';
        continue;
      }
      if (name === 'p' || name === 'div' || name === 'section' || name === 'article') {
        out += '</p>';
        continue;
      }
      if (name === 'span') {
        continue;
      }
      if (name === 'li' || name === 'ul' || name === 'ol' || name === 'blockquote' || /^h[1-6]$/.test(name)) {
        out += `</${name}>`;
        continue;
      }
      continue;
    }

    if (selfClose && name !== 'br' && name !== 'hr' && name !== 'img') continue;

    if (name === 'strong' || name === 'b') {
      out += '<strong style="font-weight:700;">';
      continue;
    }
    if (name === 'em' || name === 'i') {
      out += '<em>';
      continue;
    }
    if (name === 'u') {
      out += '<u>';
      continue;
    }
    if (name === 'a') {
      const href = extractAttr(attrPart, 'href');
      if (!safeHref(href)) continue;
      out += `<a href="${escapeAttr(href)}" style="color:${EMAIL.link};text-decoration:underline;">`;
      continue;
    }
    if (name === 'p' || name === 'div' || name === 'section' || name === 'article') {
      out += `<p style="${P_BODY}">`;
      continue;
    }
    if (name === 'ul') {
      out += `<ul style="margin:0 0 12px 0;padding-left:1.25em;list-style-type:disc;color:${EMAIL.text} !important;-webkit-text-fill-color:${EMAIL.text} !important;font-family:${FF};font-size:16px;line-height:1.6;">`;
      continue;
    }
    if (name === 'ol') {
      out += `<ol style="margin:0 0 12px 0;padding-left:1.25em;list-style-type:decimal;color:${EMAIL.text} !important;-webkit-text-fill-color:${EMAIL.text} !important;font-family:${FF};font-size:16px;line-height:1.6;">`;
      continue;
    }
    if (name === 'li') {
      out += `<li style="margin:0 0 4px 0;color:${EMAIL.text} !important;-webkit-text-fill-color:${EMAIL.text} !important;font-family:${FF};font-size:16px;line-height:1.6;">`;
      continue;
    }
    if (name === 'blockquote') {
      out += `<blockquote style="margin:0 0 12px 0;padding-left:12px;border-left:3px solid ${EMAIL.border};color:${EMAIL.muted} !important;-webkit-text-fill-color:${EMAIL.muted} !important;font-family:${FF};font-size:16px;line-height:1.6;">`;
      continue;
    }
    if (/^h[1-6]$/.test(name)) {
      out += headingOpen(name);
      continue;
    }
    if (name === 'span') {
      continue;
    }
  }

  const trimmed = out.trim();
  if (!trimmed) {
    return `<p style="${P_BODY}margin-bottom:0;color:${EMAIL.muted} !important;-webkit-text-fill-color:${EMAIL.muted} !important;">(No text in this insight.)</p>`;
  }
  return trimmed;
}

export function styleDigestEmailHtml(opts: {
  style: InsightStyle;
  name: string;
  bookTitle: string;
  contentHtml: string;
  insightsUrl: string;
}): string {
  const meta = STYLE_META[opts.style];
  const bodyHtml = sanitizeInsightHtmlForEmailBody(opts.contentHtml);
  const greeting = opts.name.trim() ? `Hey ${escapeHtml(opts.name.trim())},` : 'Hey there,';

  return `
<!DOCTYPE html>
<html lang="en" style="color-scheme: dark;">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escapeHtml(meta.pageTitle)}</title>
  <style type="text/css">
    body { margin: 0 !important; padding: 0 !important; -webkit-text-size-adjust: 100%; }
    .digest-body p { margin: 0 0 12px 0; }
    .digest-body p:last-child { margin-bottom: 0; }
    .digest-body ul, .digest-body ol { margin: 0 0 12px 0; padding-left: 1.25em; }
    .digest-body li { margin: 0 0 4px 0; }
    .digest-body strong, .digest-body b { font-weight: 700 !important; }
    .digest-body a { color: ${EMAIL.link} !important; }
    .digest-sep { border: none !important; border-top: 1px solid ${EMAIL.border} !important; margin: 0 0 20px 0 !important; }
    @media (prefers-color-scheme: dark) {
      .digest-card { background-color: ${EMAIL.cardBg} !important; }
      .digest-body, .digest-body p, .digest-body li, .digest-body td, .digest-body th {
        color: ${EMAIL.text} !important;
        -webkit-text-fill-color: ${EMAIL.text} !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL.outerBg};color-scheme:dark;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${EMAIL.outerBg};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" class="digest-card" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-collapse:collapse;background-color:${EMAIL.cardBg};border:1px solid ${EMAIL.border};border-radius:8px;">
          <tr>
            <td style="padding:24px 20px;font-family:${FF};background-color:${EMAIL.cardBg};color:${EMAIL.text};">
              <p style="margin:0 0 6px;font-size:15px;line-height:1.5;color:${EMAIL.text};-webkit-text-fill-color:${EMAIL.text};">${greeting}</p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:${EMAIL.muted};-webkit-text-fill-color:${EMAIL.muted};">${escapeHtml(meta.tagline)}</p>
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${EMAIL.faint};-webkit-text-fill-color:${EMAIL.faint};">${escapeHtml(meta.ribbon)}</p>
              <p style="margin:0 0 0;font-size:14px;line-height:1.45;color:${EMAIL.textSecondary};-webkit-text-fill-color:${EMAIL.textSecondary};font-weight:600;">${escapeHtml(opts.bookTitle)}</p>
              <hr class="digest-sep" style="border:none;border-top:1px solid ${EMAIL.border};margin:20px 0 20px 0;width:100%;" />
              <div class="digest-body">
                ${bodyHtml}
              </div>
              <p style="margin:20px 0 0;font-size:15px;line-height:1.5;">
                <a href="${escapeAttr(opts.insightsUrl)}" style="color:${EMAIL.link};-webkit-text-fill-color:${EMAIL.link};text-decoration:underline;">Open insights in Page2Action</a>
              </p>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:${EMAIL.faint};-webkit-text-fill-color:${EMAIL.faint};">
                Page2Action — ideas at the right time
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
