/**
 * Statik fayl manzili. Oddiy build'da — o'zgarishsiz qaytadi (/games/pubgm.webp).
 * Demo build'da (src/demo) rasmlar HTML ichiga joylanadi — shu xarita orqali almashtiriladi.
 */
export function asset(path: string): string {
  const map = (window as unknown as { __DEMO_ASSETS?: Record<string, string> }).__DEMO_ASSETS
  return (map && map[path]) || path
}
