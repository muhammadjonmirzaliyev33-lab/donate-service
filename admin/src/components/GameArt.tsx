import { Sword, Target, Eye, Gamepad2, Gem, Flame, Coins, Crown, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const GAME_ICONS: Record<string, LucideIcon> = {
  mlbb: Sword,
  mlbb_ru: Sword,
  pubgm: Target,
  supersus: Eye,
  mcgg: Gamepad2,
  genshin: Gem,
  freefire: Flame,
  hok: Coins,
  tgpremium: Crown,
  tgstars: Star
}

/** admin/public/games/<id>.webp — rasm yuklanmagan o'yinlar uchun standart muqova. */
const BUILTIN_COVERS = new Set(['freefire', 'genshin', 'hok', 'mcgg', 'mlbb', 'mlbb_ru', 'pubgm', 'supersus', 'tgpremium', 'tgstars', 'vpn'])

/** Admin haqiqiy rasm yuklagan bo'lsa (icon maydonida URL saqlangan) — shuni ko'rsatadi, aks holda standart iconni (frontend/src/icons.ts gameArtHtml bilan bir xil xarita). */
export function GameArt({ game, size = 20 }: { game: { id: string; icon?: string | null }; size?: number }) {
  if (game.icon && /^https?:\/\//.test(game.icon)) {
    return <img src={game.icon} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
  }
  if (BUILTIN_COVERS.has(game.id)) {
    return <img src={`/games/${game.id}.webp`} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
  }
  const Icon = GAME_ICONS[game.id] ?? Gamepad2
  return <Icon size={size} strokeWidth={2} />
}
