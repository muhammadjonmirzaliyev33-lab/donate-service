# MooGold bilan ishlash — admin uchun qo'llanma

Bu hujjat MooGold orqali o'yin valyutalarini **avtomatik yetkazib berish**ni sozlashni
tushuntiradi. Tizimda ikkita yetkazib beruvchi bor va ular birga ishlaydi:

| Provayder | Qachon ishlatiladi |
|---|---|
| **PayCore** | Hozirgi ishlab turgan o'yinlar (Free Fire, PUBG, MLBB, HoK, Telegram Stars/Premium, VPN) |
| **MooGold** | Yangi qo'shiladigan o'yinlar yoki PayCore'da yo'q mahsulotlar |

Har bir o'yin uchun provayder **alohida** tanlanadi — birini o'zgartirish ikkinchisiga
ta'sir qilmaydi.

---

## 1. Bir martalik sozlash (server tomoni)

`.env` fayliga ikkita qator qo'shiladi va backend qayta ishga tushiriladi:

```
MOOGOLD_PARTNER_ID=<Partner ID (API Key)>
MOOGOLD_SECRET_KEY=<Secret Key>
```

Bo'sh qoldirilsa — MooGold shunchaki o'chirilgan holda qoladi, PayCore o'yinlari
odatdagidek ishlayveradi.

> **Diqqat:** MooGold API'si serveringiz IP manzilini oldindan ruxsat etilganlar
> ro'yxatiga (whitelist) qo'shishni talab qilishi mumkin. Agar admin panelda
> "MooGold: xato — ..." yoki "ulanmagan" deb tursa, MooGold support'ga yozib,
> API'ni yoqishni va server IP'ingizni whitelist qilishni so'rang.

Admin panelda **Katalog** bo'limining tepasida ikkala provayder balansi ko'rinadi:

```
PayCore: 60.64 USDT · MooGold: 25.00 USD
```

---

## 2. Yangi o'yinni MooGold'ga ulash

**Katalog → + Yangi** (yoki mavjud o'yinni ochib → **Tahrirlash**):

1. **Nomi**, **Kategoriya**, **Valyuta nomi** — odatdagidek to'ldiriladi
2. **Server ID talab qilinadi** — agar o'yinda server tanlash bo'lsa (masalan Mobile Legends), belgilanadi
3. **Yetkazib beruvchi** → **MooGold** tanlanadi
4. **MooGold bo'limi** — odatda **"Direct top-up (o'yinlar)"**; gift card sotmoqchi bo'lsangiz mos bo'limni tanlang
5. **MooGold o'yini (mahsulot)** — ro'yxatdan kerakli o'yinni tanlaysiz (ro'yxat MooGold'dan real vaqtda yuklanadi)
6. **Buyurtma turi**:
   - **1 — Direct Top Up** → o'yin hisobiga to'g'ridan-to'g'ri tushadi (deyarli hamma o'yinlar shu)
   - **2 — eVoucher** → kod/vaucher sifatida keladi (gift card'lar)
7. **Saqlash**

---

## 3. Paketlarni (narxlarni) qo'shish

O'yinni ochib → **Paketlar → + Yangi**:

1. **Nomi** — foydalanuvchi ko'radigan matn, masalan `100 Diamonds`
2. **Miqdor** — nechta valyuta (100)
3. **Narx (so'm)** — foydalanuvchiga sotiladigan narx (**siz belgilaysiz**, MooGold narxi emas)
4. **Guruh** — filter uchun, masalan `Olmoslar` yoki `Barchasi`
5. **MooGold varianti** — MooGold'dagi aniq paket tanlanadi (narxi USD'da ko'rsatiladi)
6. **Saqlash**

> **Muhim:** "MooGold varianti" tanlanmagan paket avtomatik yetkazilmaydi — bunday
> buyurtma tasdiqlangach qo'lda bajarishingiz kerak bo'ladi. Ro'yxatda variant
> yonida **(tugagan)** deb tursa — o'sha nominal MooGold'da hozir yo'q.

### Marja hisoblash

MooGold sizdan **USD**da yechadi, siz esa **so'm**da sotasiz. Narxni belgilashda:

```
Sotish narxi (so'm) = MooGold narxi (USD) × dollar kursi + sizning foydangiz
```

Variantlar ro'yxatida MooGold narxi ko'rinib turadi, shunga qarab narx qo'yasiz.

---

## 4. Buyurtma qanday ketadi

```
Foydalanuvchi paket tanlaydi
   ↓
Player ID kiritadi → "Tekshirish" (MooGold orqali real tekshiriladi, nickname chiqadi)
   ↓
To'laydi (karta/balans)
   ↓
Tasdiqlangach → MooGold'ga avtomatik buyurtma ketadi
   ↓
MooGold "processing" holatida qabul qiladi
   ↓
Tizim har 25 soniyada holatni tekshiradi
   ↓
"completed" → foydalanuvchiga "✅ yetkazildi" xabari boradi
```

**Buyurtma raqami:** MooGold'ga bizning buyurtma raqamimiz (`#123`) ham yuboriladi —
shu sabab bir buyurtma ikki marta ketib qolmaydi va kerak bo'lsa MooGold panelidan
o'sha raqam bo'yicha topish mumkin.

---

## 5. Muammo bo'lsa nima qilish

Admin panelda buyurtmani ochsangiz **"Avtomatik yetkazish"** qatori ko'rinadi:

| Ko'rsatkich | Ma'nosi | Nima qilish kerak |
|---|---|---|
| ⏳ **PayCore/MooGold: kutilmoqda** | Buyurtma yuborilgan, javob kutilyapti | Kutish (odatda bir necha daqiqa) |
| ✅ **yetkazildi** | Hammasi joyida | Hech narsa |
| ❌ **yetkazilmadi** | Xato bo'lgan, sabab pastda yoziladi | **Qo'lda yetkazib berish kerak** |

Tarix ro'yxatida bunday buyurtmalar oldida **⚠️ Yetkazilmadi** belgisi turadi —
ro'yxatni ko'zdan kechirganda darrov ko'rinadi.

**Muhim:** yetkazish muvaffaqiyatsiz bo'lsa ham, foydalanuvchidan pul yechilgan
holicha qoladi (to'lov haqiqiy). Ya'ni siz mahsulotni qo'lda yetkazib berishingiz kerak.

### Ko'p uchraydigan xatolar

| Xato | Sabab |
|---|---|
| `INSUFFICIENT_FUNDS` / balans yetarli emas | MooGold hisobingizda pul tugagan — to'ldirish kerak |
| `OUT_OF_STOCK` / tugagan | O'sha nominal MooGold omborida qolmagan |
| `INVALID_PLAYER` | Foydalanuvchi noto'g'ri ID kiritgan |
| `403` / HTML xato sahifasi | API yoqilmagan yoki server IP whitelist qilinmagan — MooGold support'ga yozing |

---

## 6. PayCore'dan MooGold'ga o'tkazish

Mavjud o'yinni boshqa provayderga o'tkazish uchun:

1. O'yinni ochib → **Tahrirlash** → **Yetkazib beruvchi**ni **MooGold**ga o'zgartiring
2. MooGold bo'limi/mahsulotini tanlab **Saqlang**
3. **Har bir paketni** qayta ochib, **MooGold varianti**ni tanlang

> Paketlardagi eski PayCore bog'lanishi avtomatik ko'chmaydi — variantlarni qo'lda
> qayta tanlash shart. Tanlanmagan paketlar qo'lda yetkaziladigan bo'lib qoladi.

Orqaga qaytarish ham xuddi shunday — provayderni PayCore'ga qaytarib, paketlarga
PayCore mahsulotlarini qayta tanlaysiz.
