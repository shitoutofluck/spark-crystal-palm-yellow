/** Stable 32-bit FNV-1a → 8-char hex, used as BIM-style instance IDs. */
export function hexId(...parts: Array<string | number | undefined>): string {
  let h = 0x811c9dc5;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function typeHex(kind: string): string {
  return `0x${hexId("kind", kind).slice(0, 4)}`;
}

export function formatHex(id: string): string {
  const t = id.replace(/^0x/i, "").toUpperCase();
  return `0x${t}`;
}

export function parseUserHex(raw: string): string | null {
  const t = raw.trim().replace(/^#/, "").replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{6}$/.test(t)) return null;
  return `#${t.toUpperCase()}`;
}
