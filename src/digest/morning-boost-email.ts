/**
 * Morning Boost HTML — matches in-app insight paper (parchment, ruled lines, tiptap-like typography).
 * Table layout + inline fallbacks; <style> mirrors client `index.css` `.tiptap` rules where possible.
 */

/** Aligns with `insightPaperTheme` + `index.css` `.tiptap` */
const C = {
  shell: '#030712',
  paperTop: '#f5f0e1',
  paperBottom: '#ebe5d3',
  text: '#3b3225',
  muted: '#8a7e6b',
  light: '#b0a48d',
  border: '#d9ceb8',
  lineRgba: 'rgba(217,206,184,0.45)',
  redMargin: 'rgba(252,165,165,0.30)',
  blockquote: '#6b5d4d',
  hr: '#1c1917',
  accent: '#8b4513',
} as const;

export function sanitizeInsightHtmlForEmail(html: string): string {
  if (!html || !html.trim()) {
    return `<p style="margin:0;color:${C.muted};font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:26px;">(empty page)</p>`;
  }
  let s = html.replace(/<\/script/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/javascript:/gi, '');
  return s;
}

export function morningBoostEmailHtml(opts: {
  name: string;
  bookTitle: string;
  contentHtml: string;
  insightsUrl: string;
}): string {
  const safeContent = sanitizeInsightHtmlForEmail(opts.contentHtml);
  const greeting = opts.name.trim() ? `Hey ${escapeHtml(opts.name.trim())},` : 'Hey there,';

  const paperShadow = '4px 4px 20px rgba(0,0,0,0.5), inset 0 0 60px rgba(139,69,19,0.04)';
  const ruledBg = `linear-gradient(180deg, ${C.paperTop} 0%, ${C.paperBottom} 100%), repeating-linear-gradient(transparent, transparent 25px, ${C.lineRgba} 26px)`;

  return `
<!DOCTYPE html>
<html lang="en" style="color-scheme: light;">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Your Morning Boost</title>
  <style type="text/css">
    :root { color-scheme: light; }
    body { margin: 0 !important; padding: 0 !important; -webkit-text-size-adjust: 100%; }
    /* Match client .tiptap — use !important so Gmail/Apple don’t override with dark theme */
    .insight-email-body, .insight-email-body p, .insight-email-body li, .insight-email-body td {
      font-family: Georgia, 'Times New Roman', serif !important;
      color: ${C.text} !important;
      font-size: 16px !important;
      line-height: 26px !important;
    }
    .insight-email-body p { margin: 0 0 0.25em 0 !important; }
    .insight-email-body ul {
      list-style-type: disc !important;
      padding-left: 1.2em !important;
      margin: 0.3em 0 !important;
    }
    .insight-email-body ol {
      list-style-type: decimal !important;
      padding-left: 1.2em !important;
      margin: 0.3em 0 !important;
    }
    .insight-email-body blockquote {
      border-left: 3px solid ${C.border} !important;
      padding-left: 0.8em !important;
      margin: 0.4em 0 !important;
      color: ${C.blockquote} !important;
      font-style: italic !important;
    }
    .insight-email-body hr {
      border: none !important;
      border-top: 2px solid ${C.hr} !important;
      margin: 0.75rem 0 !important;
      width: 100% !important;
      background: transparent !important;
    }
    .insight-email-body strong, .insight-email-body b { color: ${C.text} !important; font-weight: 700 !important; }
    .insight-email-body em, .insight-email-body i { font-style: italic !important; }
    .insight-email-body u { text-decoration: underline !important; }
    [data-ogsc] .email-shell { background-color: ${C.shell} !important; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.shell};color-scheme:light;">
  <table role="presentation" class="email-shell" width="100%" cellspacing="0" cellpadding="0" bgcolor="${C.shell}" style="background-color:${C.shell};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-collapse:collapse;">
          <tr>
            <td style="padding:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:${C.muted};text-align:left;">
              ${greeting}<br />
              <span style="color:${C.light};">Your Morning Boost from Page2Action</span>
            </td>
          </tr>
          <tr>
            <td bgcolor="${C.paperTop}" style="background:${ruledBg};background-color:${C.paperTop};border:1px solid ${C.border};border-radius:2px;box-shadow:${paperShadow};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:14px 20px 12px 20px;border-bottom:1px solid ${C.border};font-family:Georgia,'Times New Roman',serif;background-color:${C.paperTop};">
                    <span style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${C.muted};">Morning boost</span><br />
                    <span style="font-size:11px;color:${C.light};">${escapeHtml(opts.bookTitle)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;background-color:${C.paperTop};">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                      <tr>
                        <td width="48" valign="top" bgcolor="${C.paperTop}" style="width:48px;min-width:48px;background-color:${C.paperTop};border-right:1px solid ${C.redMargin};font-size:1px;line-height:1px;">&nbsp;</td>
                        <td valign="top" bgcolor="${C.paperTop}" style="padding:22px 20px 28px 16px;background:${ruledBg};background-color:${C.paperTop};">
                          <div class="insight-email-body" style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:26px;color:${C.text};">
                            ${safeContent}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 0 8px 0;text-align:center;">
              <a href="${escapeAttr(opts.insightsUrl)}" style="display:inline-block;padding:10px 20px;background-color:rgba(139,69,19,0.15);color:${C.accent};font-family:Georgia,'Times New Roman',serif;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;border:1px solid rgba(139,69,19,0.25);">
                Open insights
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-size:12px;color:${C.muted};text-align:center;">
              Page2Action — ideas at the right time
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
