/** Match client `sharePathSegmentFromUser` for stable /insight/:who/... URLs. */
export function sharePathSegmentFromUser(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const raw = (name ?? '').trim();
  if (raw) {
    const parts = raw.split(/\s+/).filter(Boolean);
    const label =
      parts.length >= 2
        ? `${parts[0]} ${parts[parts.length - 1]}`
        : (parts[0] ?? '');
    const s = slugifySegment(label);
    if (s) return s;
  }
  if (email) {
    const local = email.split('@')[0] ?? '';
    const s = slugifySegment(local);
    if (s) return s;
  }
  return 'reader';
}

export function slugifySegment(input: string): string {
  const s = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || '';
}

export function slugifyBookTitle(title: string): string {
  const s = slugifySegment(title);
  return s || 'book';
}
