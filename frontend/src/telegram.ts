// Thin wrapper around the Telegram Web App JS SDK (loaded via <script> in index.html).
// This lets the same code run standalone in a browser (for the demo) AND inside
// Telegram as a real Mini App, opened from the bot's Menu Button.
//
// See the note at the bottom of this file re: Menu Button vs. inline keyboard.

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        enableClosingConfirmation: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (fn: () => void) => void;
          offClick: (fn: () => void) => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
        initData?: string;
        initDataUnsafe?: {
          user?: { id: number; username?: string; first_name?: string };
        };
        colorScheme?: 'light' | 'dark';
        openTelegramLink?: (url: string) => void;
        openLink?: (url: string) => void;
      };
    };
  }
}

export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

export function initTelegram() {
  if (!tg) return; // running as a plain web demo outside Telegram
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0B0F14');
    tg.setBackgroundColor('#0B0F14');
    tg.enableClosingConfirmation();
  } catch {
    /* older client versions may not support every method — safe to ignore */
  }
}

/**
 * Backendga yuboriladigan xom initData satri (`X-Telegram-Init-Data` header).
 * Telegram tashqarisida (lokal brauzer sinovi) ishlashi uchun `VITE_DEV_INIT_DATA`
 * bilan almashtirish mumkin — backend/.env'da bir xil BOT tokeni bilan generatsiya qiling.
 *
 * MUHIM: bu fallback faqat `vite dev` (import.meta.env.DEV) rejimida ishlaydi.
 * Production build'da (Vercel) hech qachon ishlatilmaydi — aks holda Vercel'ga
 * tasodifan VITE_DEV_INIT_DATA qo'yilib qolsa, HAMMA real foydalanuvchi bitta
 * (dev'da sinalgan) hisob sifatida ko'rinib qoladi.
 */
export function getInitData(): string {
  if (tg?.initData) return tg.initData
  if (import.meta.env.DEV) return (import.meta.env.VITE_DEV_INIT_DATA as string | undefined) || ''
  return ''
}

/**
 * `@username` (yoki to'liq t.me havolasi) ni ochadi. Telegram WebApp SDK metodlari
 * client versiyasiga qarab mavjud bo'lmasligi/xato berishi mumkin — shuning uchun
 * ketma-ket bir nechta usul sinaladi, oxirgi chora sifatida oddiy navigatsiya ishlatiladi
 * (embedded webview'larda `window.open` ko'pincha e'tiborsiz qoldiriladi).
 */
export function openTelegramLink(usernameOrUrl: string) {
  const url = usernameOrUrl.startsWith('http') ? usernameOrUrl : `https://t.me/${usernameOrUrl.replace(/^@/, '')}`

  if (tg?.openTelegramLink) {
    try {
      tg.openTelegramLink(url)
      return
    } catch {
      /* keyingi usulga o'tamiz */
    }
  }
  if (tg?.openLink) {
    try {
      tg.openLink(url)
      return
    } catch {
      /* keyingi usulga o'tamiz */
    }
  }
  const win = window.open(url, '_blank')
  if (!win) window.location.href = url
}

export function haptic(kind: 'light' | 'medium' | 'success' | 'error' = 'light') {
  if (!tg?.HapticFeedback) return;
  if (kind === 'success' || kind === 'error') tg.HapticFeedback.notificationOccurred(kind);
  else tg.HapticFeedback.impactOccurred(kind);
}

/*
  MINI APP vs. BOT-KEYBOARD — javob (mijoz savoliga):

  To'g'ri yechim: shu sayt Telegram BOT ning "Menu Button" (pastdagi klaviatura
  o'rnidagi tugma, ✅ ekran rasmidagi kabi "Mini App'ni ochish") orqali ochiladigan
  haqiqiy MINI APP bo'lishi kerak, oddiy inline-keyboard tugmalari orqali emas.

  Sabablari:
  - Inline tugmalar bilan har bir amal alohida bot xabari/klik bo'ladi — sekin va cheklangan UI.
  - Mini App esa to'liq sayt: qidiruv, filtrlar, animatsiyalar, forma validatsiyasi —
    hammasi shu yerda, tezkor va tabiiy mobil tajriba.
  - Telegram foydalanuvchi ma'lumotlarini (id, username) beradi — alohida ro'yxatdan
    o'tish shart emas (pastda initDataUnsafe.user orqali olinadi).
  - Bot faqat: (1) Menu Button orqali shu sayt manzilini ochadi, (2) to'lov/buyurtma
    holatlari haqida xabar yuboradi (masalan admin tasdiqlaganda). Bot o'zida
    "buyurtma qilish" tugmalari BO'LMAYDI — bularning barchasi shu Mini App ichida.

  Amalga oshirish uchun (backend qismi, bu demo emas):
  1. BotFather'da /setmenubutton orqali bot uchun "Web App" turidagi tugma o'rnatiladi,
     unga shu saytning (masalan https://zaryad.uz) manzili beriladi.
  2. Sayt build qilinib, HTTPS domenga joylanadi (Telegram faqat https qabul qiladi).
  3. Backend (bu loyihada localStorage bilan simulyatsiya qilingan qism) haqiqiy
     to'lov provayderi (Payme/Click/Uzcard gateway) va Telegram Bot API bilan
     bog'lanadi, buyurtma holatini botga xabar sifatida yuboradi.
*/
