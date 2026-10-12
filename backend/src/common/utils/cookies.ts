/** `Cookie` header'ni { nom: qiymat } shakliga o'giradi — cookie-parser paketi shart emas. */
export function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) result[name] = decodeURIComponent(value);
  }
  return result;
}
