import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICONS = {
	home: icons.Home,
	games: icons.Gamepad2,
	history: icons.History,
	profile: icons.UserRound,
	search: icons.Search,
	save: icons.Save,
	creditCard: icons.CreditCard,
	landmark: icons.Landmark,
	globe: icons.Globe2,
	zap: icons.Zap,
	ticket: icons.Ticket,
	message: icons.MessageCircleMore,
	package: icons.Package2,
	clock: icons.Clock3,
	user: icons.UserRound,
	crown: icons.Crown,
	smartphone: icons.Smartphone,
	gem: icons.Gem,
	arrowLeft: icons.ArrowLeft,
	circleOff: icons.CircleOff,
	copy: icons.Copy,
	shieldCheck: icons.ShieldCheck,
	circleAlert: icons.CircleAlert,
	sparkles: icons.Sparkles,
	gamepad: icons.Gamepad2,
	target: icons.Target,
	sword: icons.Sword,
	eye: icons.Eye,
	bot: icons.Bot,
	flame: icons.Flame,
	coins: icons.Coins,
	star: icons.Star,
	banknote: icons.Banknote,
	badgeDollar: icons.BadgeDollarSign,
	receipt: icons.ReceiptText,
	percent: icons.Percent,
	handCoins: icons.HandCoins,
	circleDollar: icons.CircleDollarSign,
	chevronRight: icons.ChevronRight,
	chevronUp: icons.ChevronUp,
	chevronDown: icons.ChevronDown,
	check: icons.Check,
	plus: icons.Plus,
	trending: icons.TrendingUp,
	x: icons.X,
	boxes: icons.Boxes,
	users: icons.Users,
	layoutDashboard: icons.LayoutDashboard,
	gripVertical: icons.GripVertical,
	wallet: icons.Wallet,
	headset: icons.Headset,
	moon: icons.Moon,
	sun: icons.Sun,
	play: icons.Play,
	send: icons.Send,
	phone: icons.Smartphone,
	medal: icons.Medal,
	userPlus: icons.UserPlus,
	shoppingBag: icons.ShoppingBag,
	more: icons.EllipsisVertical,
	closeX: icons.X,
	video: icons.CirclePlay,
} as const satisfies Record<string, LucideIcon>

export type AppIconName = keyof typeof ICONS

export function iconHtml(name: AppIconName, className = '', size = 18, strokeWidth = 2) {
	const Icon = ICONS[name]
	if (!Icon) return ''
	return renderToStaticMarkup(
		createElement(Icon, {
			size,
			strokeWidth,
			className,
			'aria-hidden': true
		})
	)
}

export function gameIconHtml(gameId: string, className = '') {
	const map: Record<string, AppIconName> = {
		mlbb: 'sword',
		mlbb_ru: 'sword',
		pubgm: 'target',
		supersus: 'eye',
		mcgg: 'gamepad',
		genshin: 'gem',
		freefire: 'flame',
		hok: 'coins',
		tgpremium: 'crown',
		tgstars: 'star'
	}
	return iconHtml(map[gameId] ?? 'gamepad', className)
}

/** Admin haqiqiy rasm yuklagan bo'lsa (icon maydonida URL saqlangan) — shuni ko'rsatadi, aks holda standart iconni. */
export function gameArtHtml(game: { id: string; icon?: string | null }, className = ''): string {
	if (game.icon && /^https?:\/\//.test(game.icon)) {
		return `<img src="${game.icon}" alt="" class="${className}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />`
	}
	if (BUILTIN_COVERS.has(game.id)) {
		return `<img src="/games/${game.id}.webp" alt="" class="${className}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" />`
	}
	return gameIconHtml(game.id, className)
}

/** frontend/public/games/<id>.webp — admin rasm yuklamagan o'yinlar uchun standart muqova. */
const BUILTIN_COVERS = new Set(['freefire', 'genshin', 'hok', 'mcgg', 'mlbb', 'mlbb_ru', 'pubgm', 'supersus', 'tgpremium', 'tgstars', 'vpn'])
