# Komak Pay — Donat Shop (Telegram Mini App demo)

Vite + TypeScript bilan qurilgan demo. Barcha ma'lumotlar (balans, buyurtmalar,
saqlangan ID'lar) brauzerning `localStorage`'ida saqlanadi — hech qanday backend
kerak emas, shu bilan birga sahifani yangilasangiz ham ma'lumotlar yo'qolmaydi.

## Ishga tushirish

```bash
npm install
npm run dev       # http://localhost:5173 — lokal ko'rish uchun
npm run build     # dist/ papkasiga production build
```

## Loyihaning tuzilishi

```
src/
  main.ts              — router, ilova kirish nuqtasi
  router.ts             — oddiy hash-router (#/, #/games, #/game/:id, #/history, #/profile)
  store.ts               — demo o'yinlar/paketlar ma'lumotlari + localStorage state
  telegram.ts             — Telegram WebApp SDK bilan integratsiya (pastga qarang)
  types.ts
  style.css               — yagona global uslub fayli (mavzu: to'q indigo fon + limon-yashil "zaryad" aksenti)
  screens/                — asosiy ekranlar (home, games, gameDetail, history, profile)
  components/
    sheet.ts               — pastdan chiqadigan oyna (bottom-sheet) menejeri + toast
    bottomNav.ts            — pastki navigatsiya
    paymentFlow.ts          — to'lov logikasi (pastga qarang)
    savedIds.ts             — saqlangan Player ID'lar oynasi
```

## To'lov logikasi

Ikkita alohida yo'l bor, aynan siz so'ragandek:

1. **Balansdan xarid** — foydalanuvchi avval "Hisobni to'ldirish" orqali balansni
   to'ldiradi, keyin istalgan paketni **balansdan** xarid qiladi (darhol yakunlanadi).
2. **To'g'ridan-to'g'ri to'lov** — foydalanuvchi hisobni to'ldirmasdan, tanlagan
   paket narxini **to'g'ridan-to'g'ri** (karta / bankomat / chet eldan) to'laydi.
   Bu holatda alohida buyurtma yaratiladi va to'lov tasdiqlangach avtomatik
   "Bajarildi" holatiga o'tadi.

Har ikkala yo'lda ham 3 xil to'lov usuli bor:
- **Bank kartasi (avtomatik)** — demo: 3-D Secure asosidagi kutish ekrani,
  taymer tugagach avtomatik tasdiqlanadi (yoki "Demo: to'lov muvaffaqiyatli" tugmasi).
- **Bankomat (avtomatik)** — demo: bankomatga tashlanadigan karta raqami,
  taymer, komissiya haqida ogohlantirish. **Muhim:** haqiqiy loyihada bu yerga
  bank/eKassa/Payme kabi provayderning webhook orqali to'lovni tasdiqlashi ulanishi kerak —
  demo rejimida buni "Demo: to'lov qabul qilindi" tugmasi almashtiradi.
- **Chet eldan (admin orqali)** — chet elda joylashgan mijozlar uchun; admin
  bilan Telegram orqali bog'lanib, admin tasdiqlagach buyurtma yakunlanadi.

`src/components/paymentFlow.ts` faylida har uch oqim ham alohida funksiya
(`openCardScreen`, `openAtmScreen`, `openForeignScreen`) sifatida ajratilgan —
haqiqiy to'lov provayderini ulash uchun faqat shu 3 ta funksiya ichidagi
"demo: muvaffaqiyatli/bekor qilindi" tugmalarini API chaqiruviga almashtirish kifoya.

## Mini App vs. Bot-tugmalar — javob

`src/telegram.ts` faylining pastki qismida batafsil izoh bor, lekin qisqacha:

Bu sayt **Bot Menu Button** orqali ochiladigan haqiqiy Telegram **Mini App**
sifatida ishlashi kerak, oddiy inline-keyboard ("buyurtma qilish" kabi) tugmalar
orqali emas. Bot faqat: (1) shu saytni Menu Button orqali ochadi, (2) buyurtma
holati haqida xabar yuboradi. Qolgan hamma narsa — qidiruv, filtrlar,
animatsiyalar, forma validatsiyasi — shu Mini App'ning o'zida bo'ladi. Bu tezroq
va tabiiyroq tajriba beradi, va Telegram foydalanuvchi ma'lumotlarini
(`window.Telegram.WebApp.initDataUnsafe.user`) avtomatik beradi, alohida
ro'yxatdan o'tish shart emas.

## Dizayn haqida

Asl skrinshotdagi tuzilma (balans kartasi, o'yinlar setkasi, paket kartalar,
pastki navigatsiya) saqlab qolindi, lekin rang sxemasi o'zgartirildi: umumiy
ko'k-siyoh gaming shabloni o'rniga to'q indigo fon ustida **limon-yashil**
("zaryad/energiya") aksent rangi qo'llanildi — bu "Tezkor donatlar" g'oyasiga
(chaqmoq belgisi, "zaryadlash") mos keladi. Paket kartalarining pastki o'ng
burchagi qirqilgan (clip-path) — chaqmoq/energiya hissini kuchaytirish uchun.
