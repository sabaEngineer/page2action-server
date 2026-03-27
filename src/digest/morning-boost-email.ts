/**
 * Book-style Morning Boost HTML for email clients (inline styles, table layout).
 */
export function sanitizeInsightHtmlForEmail(html: string): string {
  if (!html || !html.trim()) {
    return '<p style="margin:0;color:#8a7e6b;font-family:Georgia,serif;">(empty page)</p>';
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

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Your Morning Boost</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#1a1a1a;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-collapse:collapse;">
          <tr>
            <td style="padding:0 0 16px 0;font-family:Georgia,serif;font-size:13px;color:#a8a29e;text-align:left;">
              ${greeting}<br />
              <span style="color:#d6d3d1;">Your Morning Boost from Page2Action</span>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(180deg,#f5f0e1 0%,#ebe5d3 100%);border:1px solid #d9ceb8;border-radius:2px;box-shadow:4px 4px 20px rgba(0,0,0,0.35);overflow:hidden;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #d9ceb8;font-family:Georgia,serif;">
                    <span style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#8a7e6b;">Morning boost</span><br />
                    <span style="font-size:11px;color:#b0a48d;font-style:italic;">${escapeHtml(opts.bookTitle)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="width:12px;background-color:rgba(252,165,165,0.35);">&nbsp;</td>
                        <td style="padding:20px 20px 28px 16px;font-family:Georgia,serif;font-size:16px;line-height:26px;color:#3b3225;background-color:#f5f0e1;background-image:repeating-linear-gradient(transparent,transparent 25px,rgba(217,206,184,0.45) 26px);">
                          <div style="color:#3b3225;">
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
              <a href="${escapeAttr(opts.insightsUrl)}" style="display:inline-block;padding:10px 20px;background-color:rgba(139,69,19,0.15);color:#8b4513;font-family:Georgia,serif;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;border:1px solid rgba(139,69,19,0.25);">
                Open insights
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0 0 0;font-family:Georgia,serif;font-size:12px;color:#78716c;text-align:center;">
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
