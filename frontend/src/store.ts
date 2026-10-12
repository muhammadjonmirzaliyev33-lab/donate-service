import type { AppState, Game, Order, PayMethod, SavedId, TopUpTx } from './types'

export type Language = 'uz' | 'ru'
export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'zaryad_demo_state_v1'

const DICT: Record<Language, Record<string, string>> = {
  uz: {
    greeting: 'Salom',
    popularGames: "Ommabop o'yinlar",
    seeAllShort: 'Barchasi',
    promoCodesBtn: 'Promokodlar',
    navTopUpLabel: "To'ldirish",
    navOrdersLabel: 'Buyurtmalar',
    topUpScreenTitle: "Balansni to'ldirish",
    paymentMethodTitle: "To'lov usuli",
    minTopUpNote: "Eng kam: 2 000 so'm",
    howToTopUp: "Qanday to'ldirish?",
    guidesHeader: 'Havolalar',
    videoGuideSub: "Video qo'llanma — ko'rish",
    methodUzcardSub: "Kartaga o'tkazma",
    methodAtmSub: 'Terminal orqali',
    methodForeignName: 'INTERNATIONAL',
    ordersTabOrders: 'Buyurtmalar',
    ordersTabTx: 'Tranzaksiyalar',
    noOrdersTitle: 'Buyurtmalar yoʻq',
    noTxTitle: 'Tranzaksiyalar yoʻq',
    noTxSub: "Balans to'ldirishlaringiz shu yerda ko'rinadi",
    chooseDenomination: 'Paketni tanlang',
    phoneOptionalSub: "Ixtiyoriy, support bilan bog'lanish uchun",
    sharePhone: 'Telefon raqamini ulashish',
    activateBtn: 'Faollashtirish',
    promoInputPlaceholder: 'PROMOKODNI KIRITING',
    topDonors: 'Top donaterlar',
    topDonorsSub: 'Top 100',
    themeLabel: 'Mavzu',
    helpCenter: 'Yordam markazi',
    socialsHeader: 'Bizning ijtimoiy tarmoqlar',
    supportLabel: 'SUPPORT',
    faqHeader: 'Tez-tez beriladigan savollar',
    aboutHeader: 'Ilova haqida',
    versionLabel: 'Versiya',
    faq1q: "To'lov qildim, lekin balansimga tushmadi",
    faq1a: "To'lov avtomatik aniqlanishi uchun aynan ko'rsatilgan summani o'tkazing. Bir necha daqiqa kuting, tushmasa chek bilan support'ga yozing.",
    faq2q: "Buyurtmam o'yinga tushmadi. Qancha kutaman?",
    faq2a: "Odatda buyurtmalar bir necha daqiqada bajariladi. Agar 30 daqiqadan oshsa, support'ga murojaat qiling.",
    faq3q: "Nega to'lov summasi g'alati (masalan 31 068 so'm)?",
    faq3a: "Avtomatik aniqlash uchun summaga bir necha so'm qo'shiladi. Aynan ko'rsatilgan summani o'tkazing.",
    faq4q: "Bankomat yoki terminal orqali to'lasam bo'ladimi?",
    faq4a: "Ha, 'Bankomat' usulini tanlang va ko'rsatilgan summani kiriting.",
    faq5q: "To'lov oynasi (taymer) tugab qoldi. Endi nima bo'ladi?",
    faq5a: "Buyurtma muddati tugagan. Pul o'tkazgan bo'lsangiz support'ga yozing, aks holda yangi buyurtma yarating.",
    faq6q: "Nega to'g'ridan-to'g'ri karta bilan xarid qila olmayman?",
    faq6a: "Xaridlar balans orqali amalga oshiriladi. Avval balansni to'ldiring.",
    faq7q: "Balansimdagi pulni naqd qilib yechib olsam bo'ladimi?",
    faq7a: "Yo'q, balans faqat ilova ichidagi xaridlar uchun.",
    faq8q: "O'yin ID'sini xato kiritsam nima bo'ladi?",
    faq8a: "Buyurtma noto'g'ri akkauntga tushishi mumkin. Yuborishdan oldin ID'ni diqqat bilan tekshiring.",
    brandTitle: 'UZDI',
    brandSubtitle: 'Tezkor donatlar',
    quickActions: 'Asosiy funksiyalar',
    actionDonate: 'Donat qilish',
    actionTopUp: 'Hisobni to‘ldirish',
    actionHistory: 'Buyurtmalar',
    actionGames: 'O`yinlar',
    actionProfile: 'Profil',
    navHome: 'Bosh sahifa',
    navGames: 'O`yinlar',
    navHistory: 'Tarix',
    navProfile: 'Profil',
    balanceLabel: 'Mening balansim',
    cashbackLabel: 'Keshbek',
    topUp: 'To‘ldirish',
    bonusCode: 'Bonus kod',
    help: 'Yordam',
    allGames: 'Barchasi →',
    gamesTitle: 'O`yinlar',
    gamesSubtitle: 'Barcha o`yinlar',
    searchPlaceholder: 'O‘yin nomini izlash',
    profileTitle: 'Profil',
    profileSubtitle: 'Hisobingiz',
    mainBalance: 'Asosiy balans',
    cashback: 'Keshbek',
    purchases: 'Sotib olishlar',
    totalDiamonds: 'Jami olmoslar',
    languageSection: 'Til',
    themeSection: 'Mavzu',
    themeDark: 'Tun',
    themeLight: 'Kunduz',
    topUpBalance: 'Hisobni to‘ldirish',
    phoneNumber: 'Telefon raqami',
    phoneNotShared: 'Ulashilmagan',
    orderHistory: 'Buyurtmalar tarixi',
    rating: 'Reyting',
    allTab: 'Barchasi',
    completedTab: 'Bajarildi',
    pendingTab: 'Kutilmoqda',
    cancelledTab: 'Bekor qilindi',
    ordersTitle: 'Buyurtmalar',
    ordersSubtitle: 'Tarix',
    noOrders: "Hech qanday buyurtma yo'q",
    expiredStatus: "Muddati o'tgan",
    rejectReasonLabel: 'Sabab',
    noOrdersSub: "Birinchi sotib olishingizni amalga oshiring!",
    orderLabel: 'Hisobni to‘ldirish',
    accountLabel: 'Player ID',
    telegramUsernameLabel: 'Telegram username',
    serverLabel: 'Server',
    checkAccount: '🔍 Akkauntni tekshirish',
    enterIdHint: "Avval Player ID va Server ID kiriting.",
    enterIdHintNoServer: "Avval Player ID kiriting.",
    enterUsernameHint: 'Avval Telegram username kiriting (@ belgisiz ham bo\'ladi).',
    checkingHint: '🔄 Tekshirilmoqda…',
    errorHint: "ID formati noto'g'ri. Qaytadan tekshiring.",
    missingServerError: 'Server ID ham kiritilishi kerak.',
    successHint: "✅ ID qabul qilindi. Xaridni yakunlaganingizda admin o'yin ichida tekshiradi.",
    idSave: 'ID saqlash',
    idNoSave: 'Saqlanmaydi',
    selectPackage: 'Paket tanlang',
    payWith: 'To‘lash —',
    back: '← Orqaga',
    packageTitle: 'Paketlar',
    save: 'Saqlash',
    remove: 'O‘chirish',
    close: 'Yopish',
    payNow: 'To‘lovga o‘tish →',
    orderCompleted: '✅ Buyurtma bajarildi!',
    orderCancelled: '❌ Buyurtma bekor qilindi',
    topUpSuccess: '✅ Hisob to‘ldirildi. Balans:',
    demoDemo: 'Demo rejim: haqiqiy bank integratsiyasi ulanmagan.',
    cardTitle: '💳 Karta orqali to‘lov',
    cardSub: '3-D Secure orqali tasdiqlanmoqda',
    atmTitle: '🏧 Bankomat orqali to‘lov',
    foreignTitle: '🌍 Chet eldan to‘lov',
    copyCard: 'Kartani nusxalash',
    confirmation: 'To‘lov kutilmoqda',
    enoughBalance: 'Balans yetarli emas — avval hisobingizni to‘ldiring',
    ratingSoon: 'Reyting tez orada qo‘shiladi',
    ratingRowSub: 'Eng ko‘p xarid qilganlar reytingi',
    ratingSub: 'Eng ko‘p xarid qilgan foydalanuvchilar',
    ratingYou: 'siz',
    ratingYourPlace: 'Sizning o‘rningiz',
    ratingEmpty: 'Hali hech kim reytingda yo‘q',
    ratingNoneYet: 'Reytingga tushish uchun birinchi xaridingizni qiling',
    supportSoon: 'Admin bilan chat tez orada ulanadi',
    supportAvailable: 'Admin bilan bog‘lanish uchun bosing',
    promoCode: 'Promokod',
    promoCodeRowSub: 'Kodni kiritib bonus oling',
    promoCodeSheetSub: 'Promokodni kiriting va balansingizga bonus qo‘shiladi',
    promoCodePlaceholder: 'Masalan: WELCOME10000',
    promoCodeRedeemBtn: 'Faollashtirish',
    promoCodeSuccess: 'Promokod faollashtirildi',
    promoCodeEnterCode: 'Kodni kiriting',
    noSavedIds: 'Saqlangan ID yo‘q',
    savedIdsSub: "O'yin sahifasida ID saqlasangiz, shu yerda ko'rinadi",
    myIdsTitle: "Mening ID'larim",
    pickSavedIdSub: "O'zgartirish uchun saqlangan ID'ni tanlang",
    serverLabelShort: 'Server',

    // Bottom nav
    navHomeLabel: 'Asosiy',
    navGamesLabel: "O'yinlar",
    navHistoryLabel: 'Tarix',
    navProfileLabel: 'Profil',

    // Games screen
    allGamesTitle: "Barcha o'yinlar",

    // History screen — method/status labels
    methodBalance: 'Balansdan',
    methodCard: 'Karta',
    methodAtm: 'Bankomat',
    methodForeign: 'Chet eldan',
    topUpOrderTitle: "Hisobni to'ldirish",

    // Game detail screen
    gameNotFound: "O'yin topilmadi",
    backPlain: 'Orqaga',
    enterIdShort: 'Avval ID kiriting',
    checkAccountPlain: 'Akkauntni tekshirish',
    idSaved: 'ID saqlandi',
    bonusSuffix: 'bonus',
    bonusSoon: "Bonus kodlar tez orada qo'shiladi",

    // Profile screen extras
    topUpBalanceSub: 'Uzcard / Humo orqali',
    allPurchasesSub: 'Barcha sotib olishlar',
    phoneChangeSoon: "Telefon raqamini o'zgartirish tez orada",

    // Payment flow — top-up sheet
    topUpSheetTitle: "Hisobni to'ldirish",
    chooseMethodSub: 'Qulay usulni tanlang',
    step1Amount: '1 · Summani kiriting',
    minAmountHint: "Kamida 2 000 so'm",
    customAmountPlaceholder: 'Masalan: 25000',
    step2Method: "2 · To'lov usulini tanlang",
    step2Hint: "Usulni tanlang, so'ng pastdagi tugmani bosing",
    payMethodCardTitle: 'Bank kartasi',
    payMethodCardSub: 'Uzcard / Humo — avtomatik',
    payMethodCardTag: 'TAVSIYA ETILADI',
    payMethodAtmTitle: 'Bankomat',
    payMethodAtmSub: "Avtomatik to'lov",
    payMethodForeignTitle: 'Chet eldan',
    payMethodForeignSub: "Admin orqali to'lash",
    directPaymentTitle: "To'g'ridan-to'g'ri to'lov",
    payConfirming: "To'lov tasdiqlanmoqda…",
    demoPaySuccess: "Demo: to'lov muvaffaqiyatli",
    cancelPayment: "✕ To'lovni bekor qilish",
    paymentCancelled: "To'lov bekor qilindi",
    atmSub: "Summani kiriting, bankomatga o'tkazing — balans avtomatik to'ldiriladi",
    atmWarning: "Bankomatga aynan shu summani tashlang — balans avtomatik to'ladi.",
    atmEnterLabel: 'Bankomatga kiriting',
    cardNumberLabel: 'KARTA RAQAMI (UZCARD)',
    copyBtn: 'Nusxa',
    cardCopied: 'Karta raqami nusxalandi',
    orderNoCopied: 'Buyurtma raqami nusxalandi',
    amountCopied: 'Summa nusxalandi',
    copyFailed: "Nusxalab bo'lmadi",
    loadingText: 'Yuklanmoqda…',
    genericError: "Xatolik yuz berdi",
    defaultUsername: 'Foydalanuvchi',
    foundLabel: 'Topildi',
    premiumAlreadyActive: "⚠️ {nickname}да Telegram Premium allaqachon faol. Xohlasangiz baribir davom etishingiz mumkin.",
    notFoundTitle: '404 — Sahifa topilmadi',
    notFoundSub: 'Bunday sahifa mavjud emas.',
    notFoundBackHome: 'Bosh sahifaga qaytish',
    paymentExpiryMinutesLabel: '15 daqiqa',
    orderSheetTitle: 'Buyurtma',
    transferAmountLabel: "O'tkazish kerak bo'lgan summa",
    copyAmountBtn: 'Summani nusxalash',
    exactAmountWarning: "⚠️ Aynan shu summani o'tkazing — ozroq yoki ko'proq yuborsangiz avtomatik aniqlanmaydi.",
    commentOrderNoHint: '💡 O\'tkazma "Izoh" qismiga <b>#{orderNo}</b> yozing — to\'lov shu bilan tezroq aniqlanadi.',
    moneyNotFoundHint: "Pul hali topilmadi. Bir necha daqiqa kechikishi mumkin — birozdan keyin yana tekshiring, yoki chek/screenshot yuboring.",
    receiptSentLabel: '✅ Chek yuborilgan',
    receiptFieldLabel: 'Chek/screenshot',
    checkAgainBtn: 'Qayta tekshirish',
    resendReceiptBtn: 'Qayta yuborish',
    sendReceiptBtn: 'Chek yuborish',
    autoCheckingStatus: "To'lov avtomatik tekshirilmoqda…",
    avgProcessingTimeLabel: "⏱ O'rtacha bajarilish vaqti: ~{minutes} daqiqa",
    waitInBackgroundBtn: 'Fonda kutish',
    orderExpiredSub: 'Bu buyurtma muddati tugadi ({minutes})',
    orderExpiredHint: "Agar pul allaqachon o'tkazgan bo'lsangiz, admin bilan bog'laning. Aks holda qayta buyurtma yaratishingiz mumkin.",
    selectImageFirst: 'Avval rasm tanlang',
    receiptSentToast: 'Chek yuborildi',
    sendFailedError: "Yuborib bo'lmadi",
    inviteFriends: "Do'stlarni taklif qilish",
    inviteFriendsSub: "Do'stingiz birinchi to'lovini qilganda siz bonus olasiz",
    copyLink: 'Linkni nusxalash',
    referralLinkCopied: 'Referral link nusxalandi',
    referralLinkUnavailable: "Referral linki hozircha mavjud emas",
    referralInvitedCount: 'Taklif qilinganlar',
    referralTotalEarned: 'Jami topilgan',
    referralInvitedList: 'Taklif qilinganlar ro\'yxati',
    referralNoInvites: "Hali hech kimni taklif qilmadingiz",
    referralFriend: "Do'st",
    referralRewarded: 'Bonus berildi',
    referralPending: "Hali to'lov qilmagan",
    paymentPending: "To'lov kutilmoqda",
    importantLabel: 'Muhim',
    atmCheck1: "✅ Komissiya ~2.85–3.0% hisobga olinadi",
    atmCheck2: "✅ To'lovdan so'ng balans avtomatik to'ladi",
    atmCheck3: "❌ Boshqa kartaga o'tkazmang",
    atmCreditPrefix: "Hisobingizga komissiyadan so'ng taxminan",
    atmCreditSuffix: "oralig'ida tushadi.",
    atmDemoNote: "Demo rejim: haqiqiy bankomat/webhook ulanmagan. Ishlab chiqarishda bu qadam bank tomonidan avtomatik tasdiqlanadi. Hozircha natijani qo'lda tanlang.",
    atmDemoAccepted: "Demo: to'lov qabul qilindi",
    foreignHint: "Siz chet elda joylashgansiz. To'lovni admin bilan bog'lanib, ko'rsatilgan usullardan biri orqali (karta, Payme/Click hamkori, yoki boshqa) amalga oshirasiz.",
    foreignWaiting: 'Admin javobini kutmoqda',
    foreignDemoNote: "Demo rejim: haqiqiy loyihada bu yerda Telegram bot orqali adminga so'rov yuboriladi, admin tasdiqlagach buyurtma avtomatik yakunlanadi.",
    contactAdmin: "Admin bilan bog'lanish",
    demoAdminConfirmed: 'Demo: admin tasdiqladi',
    demoAdminChat: 'Demo: admin bilan chat ochiladi',
    cancel: '✕ Bekor qilish',
    chooseMethodTitle: "To'lov usulini tanlang",
    payFromBalance: "Balansdan to'lash",
    currentBalance: 'Joriy balans:',
    insufficientBalance: 'Balans yetarli emas',
    directPaySub: "Hisobni to'ldirmasdan, karta/bankomat orqali",
    purchaseDoneFromBalance: '✅ Buyurtma bajarildi! Balansdan yechildi.'
  },
  ru: {
    greeting: 'Привет',
    popularGames: 'Популярные игры',
    seeAllShort: 'Все',
    promoCodesBtn: 'Промокоды',
    navTopUpLabel: 'Пополнить',
    navOrdersLabel: 'Заказы',
    topUpScreenTitle: 'Пополнение баланса',
    paymentMethodTitle: 'Способ оплаты',
    minTopUpNote: 'Минимум: 2 000 сум',
    howToTopUp: 'Как пополнить?',
    guidesHeader: 'Инструкции',
    videoGuideSub: 'Видео-инструкция — смотреть',
    methodUzcardSub: 'Перевод на карту',
    methodAtmSub: 'Через терминал',
    methodForeignName: 'INTERNATIONAL',
    ordersTabOrders: 'Заказы',
    ordersTabTx: 'Транзакции',
    noOrdersTitle: 'Заказов нет',
    noTxTitle: 'Транзакций нет',
    noTxSub: 'Ваши пополнения появятся здесь',
    chooseDenomination: 'Выберите пакет',
    phoneOptionalSub: 'Необязательно, для связи с поддержкой',
    sharePhone: 'Поделиться номером',
    activateBtn: 'Активировать',
    promoInputPlaceholder: 'ВВЕДИТЕ ПРОМОКОД',
    topDonors: 'Топ донатеров',
    topDonorsSub: 'Топ 100',
    themeLabel: 'Тема',
    helpCenter: 'Центр помощи',
    socialsHeader: 'Наши соцсети',
    supportLabel: 'SUPPORT',
    faqHeader: 'Частые вопросы',
    aboutHeader: 'О приложении',
    versionLabel: 'Версия',
    faq1q: 'Я оплатил, но баланс не пополнился',
    faq1a: 'Переводите точную сумму, как указано. Подождите несколько минут, если не пришло — напишите в поддержку с чеком.',
    faq2q: 'Заказ не пришёл в игру. Сколько ждать?',
    faq2a: 'Обычно заказы выполняются за несколько минут. Если прошло больше 30 минут — обратитесь в поддержку.',
    faq3q: 'Почему сумма оплаты странная (например 31 068 сум)?',
    faq3a: 'Для автоматического определения к сумме добавляется несколько сумов. Переводите точную сумму.',
    faq4q: 'Можно оплатить через банкомат или терминал?',
    faq4a: "Да, выберите способ «Банкомат» и введите указанную сумму.",
    faq5q: 'Время оплаты (таймер) истекло. Что делать?',
    faq5a: 'Срок заказа истёк. Если вы уже перевели деньги — напишите в поддержку, иначе создайте новый заказ.',
    faq6q: 'Почему нельзя купить напрямую картой?',
    faq6a: 'Покупки совершаются с баланса. Сначала пополните баланс.',
    faq7q: 'Можно ли вывести деньги с баланса наличными?',
    faq7a: 'Нет, баланс предназначен только для покупок в приложении.',
    faq8q: 'Что будет, если я неверно введу ID игры?',
    faq8a: 'Заказ может уйти на чужой аккаунт. Внимательно проверяйте ID перед отправкой.',
    brandTitle: 'UZDI',
    brandSubtitle: 'Быстрые донаты',
    quickActions: 'Основные функции',
    actionDonate: 'Сделать донат',
    actionTopUp: 'Пополнить баланс',
    actionHistory: 'Заказы',
    actionGames: 'Игры',
    actionProfile: 'Профиль',
    navHome: 'Главная',
    navGames: 'Игры',
    navHistory: 'История',
    navProfile: 'Профиль',
    balanceLabel: 'Мой баланс',
    cashbackLabel: 'Кэшбек',
    topUp: 'Пополнить',
    bonusCode: 'Бонус код',
    help: 'Помощь',
    allGames: 'Все →',
    gamesTitle: 'Игры',
    gamesSubtitle: 'Все игры',
    searchPlaceholder: 'Поиск игры',
    profileTitle: 'Профиль',
    profileSubtitle: 'Ваш счет',
    mainBalance: 'Основной баланс',
    cashback: 'Кэшбек',
    purchases: 'Покупки',
    totalDiamonds: 'Всего алмазов',
    languageSection: 'Язык',
    themeSection: 'Тема',
    themeDark: 'Ночь',
    themeLight: 'День',
    topUpBalance: 'Пополнить баланс',
    phoneNumber: 'Номер телефона',
    phoneNotShared: 'Не передан',
    orderHistory: 'История заказов',
    rating: 'Рейтинг',
    allTab: 'Все',
    completedTab: 'Выполнено',
    pendingTab: 'Ожидается',
    cancelledTab: 'Отменено',
    ordersTitle: 'Заказы',
    ordersSubtitle: 'История',
    noOrders: 'Нет заказов',
    expiredStatus: 'Истёк срок',
    rejectReasonLabel: 'Причина',
    noOrdersSub: 'Сделайте первую покупку!',
    orderLabel: 'Пополнение баланса',
    accountLabel: 'Player ID',
    telegramUsernameLabel: 'Telegram username',
    serverLabel: 'Сервер',
    checkAccount: '🔍 Проверить аккаунт',
    enterIdHint: 'Сначала введите Player ID и Server ID.',
    enterIdHintNoServer: 'Сначала введите Player ID.',
    enterUsernameHint: 'Сначала введите Telegram username (можно без @).',
    checkingHint: '🔄 Проверяется…',
    errorHint: 'Неверный формат ID. Проверьте ещё раз.',
    missingServerError: 'Также нужно указать Server ID.',
    successHint: '✅ ID принят. При оформлении заказа админ проверит его в игре.',
    idSave: 'Сохранить ID',
    idNoSave: 'Не сохранять',
    selectPackage: 'Выберите пакет',
    payWith: 'Оплатить —',
    back: '← Назад',
    packageTitle: 'Пакеты',
    save: 'Сохранить',
    remove: 'Удалить',
    close: 'Закрыть',
    payNow: 'Перейти к оплате →',
    orderCompleted: '✅ Заказ выполнен!',
    orderCancelled: '❌ Заказ отменен',
    topUpSuccess: '✅ Баланс пополнен. Баланс:',
    demoDemo: 'Демо режим: реальная банковская интеграция не подключена.',
    cardTitle: '💳 Оплата картой',
    cardSub: 'Проходит 3-D Secure',
    atmTitle: '🏧 Оплата через банкомат',
    foreignTitle: '🌍 Оплата из-за рубежа',
    copyCard: 'Скопировать карту',
    confirmation: 'Платеж ожидается',
    enoughBalance: 'Баланс недостаточен — сначала пополните счет',
    ratingSoon: 'Рейтинг скоро добавится',
    ratingRowSub: 'Рейтинг самых активных покупателей',
    ratingSub: 'Пользователи с наибольшей суммой покупок',
    ratingYou: 'вы',
    ratingYourPlace: 'Ваше место',
    ratingEmpty: 'В рейтинге пока никого нет',
    ratingNoneYet: 'Совершите первую покупку, чтобы попасть в рейтинг',
    supportSoon: 'Чат с админом скоро появится',
    supportAvailable: 'Нажмите, чтобы связаться с админом',
    promoCode: 'Промокод',
    promoCodeRowSub: 'Введите код и получите бонус',
    promoCodeSheetSub: 'Введите промокод — бонус будет зачислен на баланс',
    promoCodePlaceholder: 'Например: WELCOME10000',
    promoCodeRedeemBtn: 'Активировать',
    promoCodeSuccess: 'Промокод активирован',
    promoCodeEnterCode: 'Введите код',
    noSavedIds: 'Нет сохраненных ID',
    savedIdsSub: 'Если сохраните ID на странице игры, он появится здесь',
    myIdsTitle: 'Мои ID',
    pickSavedIdSub: 'Выберите сохранённый ID для изменения',
    serverLabelShort: 'Сервер',

    // Bottom nav
    navHomeLabel: 'Главная',
    navGamesLabel: 'Игры',
    navHistoryLabel: 'История',
    navProfileLabel: 'Профиль',

    // Games screen
    allGamesTitle: 'Все игры',

    // History screen — method/status labels
    methodBalance: 'С баланса',
    methodCard: 'Карта',
    methodAtm: 'Банкомат',
    methodForeign: 'Из-за рубежа',
    topUpOrderTitle: 'Пополнение баланса',

    // Game detail screen
    gameNotFound: 'Игра не найдена',
    backPlain: 'Назад',
    enterIdShort: 'Сначала введите ID',
    checkAccountPlain: 'Проверить аккаунт',
    idSaved: 'ID сохранён',
    bonusSuffix: 'бонус',
    bonusSoon: 'Бонус-коды скоро появятся',

    // Profile screen extras
    topUpBalanceSub: 'Через Uzcard / Humo',
    allPurchasesSub: 'Все покупки',
    phoneChangeSoon: 'Смена номера телефона скоро появится',

    // Payment flow — top-up sheet
    topUpSheetTitle: 'Пополнить баланс',
    chooseMethodSub: 'Выберите удобный способ',
    step1Amount: '1 · Введите сумму',
    minAmountHint: 'Минимум 2 000 сум',
    customAmountPlaceholder: 'Например: 25000',
    step2Method: '2 · Выберите способ оплаты',
    step2Hint: 'Выберите способ и нажмите кнопку ниже',
    payMethodCardTitle: 'Банковская карта',
    payMethodCardSub: 'Uzcard / Humo — автоматически',
    payMethodCardTag: 'РЕКОМЕНДУЕТСЯ',
    payMethodAtmTitle: 'Банкомат',
    payMethodAtmSub: 'Автоматический платёж',
    payMethodForeignTitle: 'Из-за рубежа',
    payMethodForeignSub: 'Через администратора',
    directPaymentTitle: 'Прямая оплата',
    payConfirming: 'Платёж подтверждается…',
    demoPaySuccess: 'Демо: платёж успешен',
    cancelPayment: '✕ Отменить платёж',
    paymentCancelled: 'Платёж отменён',
    atmSub: 'Введите сумму, внесите в банкомат — баланс пополнится автоматически',
    atmWarning: 'Внесите в банкомат именно эту сумму — баланс пополнится автоматически.',
    atmEnterLabel: 'Внесите в банкомат',
    cardNumberLabel: 'НОМЕР КАРТЫ (UZCARD)',
    copyBtn: 'Копировать',
    cardCopied: 'Номер карты скопирован',
    orderNoCopied: 'Номер заказа скопирован',
    amountCopied: 'Сумма скопирована',
    copyFailed: 'Не удалось скопировать',
    loadingText: 'Загрузка…',
    genericError: 'Произошла ошибка',
    defaultUsername: 'Пользователь',
    foundLabel: 'Найдено',
    premiumAlreadyActive: '⚠️ У {nickname} уже активен Telegram Premium. Если хотите, можете всё равно продолжить.',
    notFoundTitle: '404 — Страница не найдена',
    notFoundSub: 'Такой страницы не существует.',
    notFoundBackHome: 'Вернуться на главную',
    paymentExpiryMinutesLabel: '15 минут',
    orderSheetTitle: 'Заказ',
    transferAmountLabel: 'Сумма для перевода',
    copyAmountBtn: 'Скопировать сумму',
    exactAmountWarning: '⚠️ Переведите ровно эту сумму — если отправите больше или меньше, оплата не определится автоматически.',
    commentOrderNoHint: 'Укажите в "Комментарии" к переводу <b>#{orderNo}</b> — так оплата определится быстрее.',
    moneyNotFoundHint: 'Оплата пока не найдена. Возможна небольшая задержка — проверьте чуть позже, либо отправьте чек/скриншот.',
    receiptSentLabel: '✅ Чек отправлен',
    receiptFieldLabel: 'Чек/скриншот',
    checkAgainBtn: 'Проверить снова',
    resendReceiptBtn: 'Отправить заново',
    sendReceiptBtn: 'Отправить чек',
    autoCheckingStatus: 'Оплата проверяется автоматически…',
    avgProcessingTimeLabel: '⏱ Среднее время обработки: ~{minutes} мин',
    waitInBackgroundBtn: 'Ждать в фоне',
    orderExpiredSub: 'Срок этого заказа истёк ({minutes})',
    orderExpiredHint: 'Если вы уже перевели деньги — свяжитесь с админом, мы проверим. Либо оформите заказ заново.',
    selectImageFirst: 'Сначала выберите изображение',
    receiptSentToast: 'Чек отправлен',
    sendFailedError: 'Не удалось отправить',
    inviteFriends: 'Пригласить друзей',
    inviteFriendsSub: 'Вы получите бонус, когда друг совершит первый платёж',
    copyLink: 'Копировать ссылку',
    referralLinkCopied: 'Реферальная ссылка скопирована',
    referralLinkUnavailable: 'Реферальная ссылка пока недоступна',
    referralInvitedCount: 'Приглашено',
    referralTotalEarned: 'Всего заработано',
    referralInvitedList: 'Список приглашённых',
    referralNoInvites: 'Вы ещё никого не пригласили',
    referralFriend: 'Друг',
    referralRewarded: 'Бонус начислен',
    referralPending: 'Ещё не платил',
    paymentPending: 'Платёж ожидается',
    importantLabel: 'Важно',
    atmCheck1: '✅ Комиссия ~2.85–3.0% учитывается',
    atmCheck2: '✅ После оплаты баланс пополнится автоматически',
    atmCheck3: '❌ Не переводите на другую карту',
    atmCreditPrefix: 'На ваш счёт после комиссии поступит примерно',
    atmCreditSuffix: '.',
    atmDemoNote: 'Демо режим: реальный банкомат/webhook не подключен. В продакшене этот шаг подтверждается банком автоматически. Пока выберите результат вручную.',
    atmDemoAccepted: 'Демо: платёж принят',
    foreignHint: 'Вы находитесь за границей. Оплату проведёте, связавшись с администратором, одним из указанных способов (карта, партнёр Payme/Click или другой).',
    foreignWaiting: 'Ожидается ответ администратора',
    foreignDemoNote: 'Демо режим: в реальном проекте здесь отправляется запрос администратору через Telegram-бота, после подтверждения заказ завершается автоматически.',
    contactAdmin: 'Связаться с администратором',
    demoAdminConfirmed: 'Демо: администратор подтвердил',
    demoAdminChat: 'Демо: чат с администратором откроется',
    cancel: '✕ Отменить',
    chooseMethodTitle: 'Выберите способ оплаты',
    payFromBalance: 'Оплатить с баланса',
    currentBalance: 'Текущий баланс:',
    insufficientBalance: 'Недостаточно баланса',
    directPaySub: 'Без пополнения баланса, через карту/банкомат',
    purchaseDoneFromBalance: '✅ Заказ выполнен! Списано с баланса.'
  }
}

// Full category strings from the static game catalog (e.g. the subtitle line
// on a game's detail page). Matched before the word-swap map below so
// bilingual uz/en pairs like "Olmoslar / Diamonds" collapse into one term
// instead of translating both halves into the same Russian word.
const CATEGORY_FULL: Record<string, string> = {
  'Olmoslar / Diamonds — Global': 'Алмазы — Global',
  'Olmoslar / Diamonds — Russia': 'Алмазы — Россия',
  'Olmoslar / Diamonds': 'Алмазы',
  'Jetonlar / Tokens': 'Жетоны',
  Obuna: 'Подписка',
  Diamonds: 'Алмазы',
  Crystals: 'Кристаллы',
  Stars: 'Звёзды'
}

// Shorter filter-group / tile-tag words (e.g. the single word shown on a
// game tile's badge, or a filter chip label). Translated by word-swap so
// the catalog itself doesn't need per-language duplication.
const CATEGORY_WORDS: Record<string, string> = {
  'Bonus paketlar': 'Бонус-пакеты',
  'Level Up': 'Повышение уровня',
  Olmoslar: 'Алмазы',
  Obunalar: 'Подписки',
  Obuna: 'Подписка',
  Bundle: 'Наборы',
  Jetonlar: 'Жетоны',
  Jeton: 'Жетон',
  Haftalik: 'Недельные',
  Barchasi: 'Все',
  Diamonds: 'Алмазы',
  Crystals: 'Кристаллы',
  Tokens: 'Жетоны',
  Stars: 'Звёзды',
  Russia: 'Россия'
}

export function tCategory(text: string): string {
  if (state.language !== 'ru') return text
  if (CATEGORY_FULL[text]) return CATEGORY_FULL[text]
  return Object.keys(CATEGORY_WORDS)
    .sort((a, b) => b.length - a.length)
    .reduce((acc, key) => acc.split(key).join(CATEGORY_WORDS[key]), text)
}

function defaultState(): AppState {
  const prefersDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  return {
    balance: 0,
    cashback: 0,
    phone: null,
    username: 'Foydalanuvchi',
    handle: '',
    userId: '',
    language: 'uz',
    theme: prefersDark ? 'dark' : 'light',
    savedIds: {},
    orders: [],
    topups: []
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    // merge with defaults so new fields don't break old saved state
    return { ...defaultState(), ...parsed }
  } catch {
    return defaultState()
  }
}

let state: AppState = load()
const listeners = new Set<() => void>()

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  listeners.forEach((fn) => fn())
}

export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getState(): Readonly<AppState> {
  return state
}

/** Sana/vaqt formatlash uchun (`toLocaleString` va h.k.) — joriy tilga mos locale kodi. */
export function currentLocale(): string {
  return state.language === 'ru' ? 'ru-RU' : 'uz-UZ'
}
export function getTranslation(key: keyof typeof DICT['uz']): string {
  return DICT[state.language][key] || key
}

export function t(key: keyof typeof DICT['uz']): string {
  return getTranslation(key)
}

export function getTheme(): ThemeMode {
  return state.theme
}

export function setTheme(theme: ThemeMode) {
  state = { ...state, theme }
  persist()
}

/** Backend `/users/me`dan kelgan haqiqiy identity bilan lokal state'ni yangilaydi (har user o'zinikini ko'rsin). */
export function setIdentity(identity: { username: string; handle: string; userId: string; phone?: string | null }) {
  const phone: string | null = 'phone' in identity ? (identity.phone ?? null) : state.phone
  state = { ...state, ...identity, phone }
  persist()
}

/** Backend `/users/me`dan kelgan haqiqiy balans/keshbek bilan lokal state'ni yangilaydi
 * (masalan checkout varag'i "Balansdan to'lash"ni to'g'ri ko'rsatishi uchun). */
export function setBalance(balance: number, cashback: number) {
  state = { ...state, balance, cashback }
  persist()
}

export function applyTheme(theme: ThemeMode = state.theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
}
export function resetDemoData() {
  state = defaultState()
  persist()
}

// ---------- Demo catalog (static — not persisted) ----------

export const GAMES: Game[] = [
  {
    id: 'mlbb',
    name: 'Mobile Legends',
    category: 'Olmoslar / Diamonds — Global',
    emoji: '⚔️',
    gradient: 'linear-gradient(160deg,#1b2a5e,#3a2e78)',
    filters: ['Barchasi', 'Olmoslar', 'Obunalar'],
    requiresServer: true,
    packages: [
      { id: 'ml1', label: '5', amount: 5, price: 2000, group: 'Olmoslar' },
      { id: 'ml2', label: '12', amount: 12, price: 5000, group: 'Olmoslar' },
      { id: 'ml3', label: '19', amount: 19, price: 8000, group: 'Olmoslar' },
      { id: 'ml4', label: '28', amount: 28, price: 10500, group: 'Olmoslar' },
      { id: 'ml5', label: '44', amount: 44, price: 14000, group: 'Olmoslar' },
      { id: 'ml6', label: '59', amount: 59, price: 16500, group: 'Olmoslar' },
      { id: 'ml7', label: '85', amount: 85, price: 19500, group: 'Olmoslar' },
      { id: 'ml8', label: '170', amount: 170, price: 37000, group: 'Olmoslar' },
      { id: 'ml9', label: '240', amount: 240, price: 51000, group: 'Olmoslar' },
      { id: 'ml10', label: '296', amount: 296, price: 61500, group: 'Olmoslar' },
      { id: 'ml11', label: '408', amount: 408, price: 85000, group: 'Olmoslar' },
      { id: 'ml12', label: '875', amount: 875, price: 170000, badge: 'top', group: 'Olmoslar' },
      { id: 'ml13', label: '2010', amount: 2010, price: 385500, badge: 'top', group: 'Olmoslar' },
      { id: 'ml14', label: '4830', amount: 4830, price: 940000, badge: 'top', group: 'Olmoslar' },
      { id: 'ml15', label: 'Weekly', amount: 1, price: 22000, group: 'Obunalar' },
      { id: 'ml16', label: 'Weekly Elite Pack', amount: 1, price: 13500, group: 'Obunalar' },
      { id: 'ml17', label: 'Monthly Elite Pack', amount: 1, price: 60000, group: 'Obunalar' },
      { id: 'ml18', label: 'Twilight Pass', amount: 1, price: 135000, group: 'Obunalar' }
    ]
  },
  {
    id: 'mlbb_ru',
    name: 'Mobile Legends (RU)',
    category: 'Olmoslar / Diamonds — Russia',
    emoji: '⚔️',
    gradient: 'linear-gradient(160deg,#2a1b5e,#4e2e78)',
    filters: ['Barchasi', 'Olmoslar', 'Obunalar'],
    requiresServer: true,
    packages: [
      { id: 'mlru1', label: '35', amount: 35, price: 13000, group: 'Olmoslar' },
      { id: 'mlru2', label: '55', amount: 55, price: 18000, group: 'Olmoslar' },
      { id: 'mlru3', label: '165', amount: 165, price: 45500, group: 'Olmoslar' },
      { id: 'mlru4', label: '275', amount: 275, price: 71000, group: 'Olmoslar' },
      { id: 'mlru5', label: '565', amount: 565, price: 142000, group: 'Olmoslar' },
      { id: 'mlru6', label: '1155', amount: 1155, price: 289000, group: 'Olmoslar' },
      { id: 'mlru7', label: '1765', amount: 1765, price: 430000, badge: 'top', group: 'Olmoslar' },
      { id: 'mlru8', label: '2975', amount: 2975, price: 709000, badge: 'top', group: 'Olmoslar' },
      { id: 'mlru9', label: '6000', amount: 6000, price: 1400000, badge: 'top', group: 'Olmoslar' },
      { id: 'mlru10', label: 'Weekly Diamond Pass RU', amount: 1, price: 29500, group: 'Obunalar' }
    ]
  },
  {
    id: 'pubgm',
    name: 'PUBG Mobile',
    category: 'UC',
    emoji: '🎯',
    gradient: 'linear-gradient(160deg,#2a1c10,#5a3a12)',
    filters: ['Barchasi'],
    packages: [
      { id: 'pg1', label: '60 UC', amount: 60, price: 15500, group: 'Barchasi' },
      { id: 'pg2', label: '325 UC', amount: 325, price: 62000, group: 'Barchasi' },
      { id: 'pg3', label: '660 UC', amount: 660, price: 119000, group: 'Barchasi' },
      { id: 'pg4', label: '1800 UC', amount: 1800, price: 285000, badge: 'top', group: 'Barchasi' },
      { id: 'pg5', label: '3850 UC', amount: 3850, price: 571000, badge: 'top', group: 'Barchasi' },
      { id: 'pg6', label: '8100 UC', amount: 8100, price: 1170000, badge: 'top', group: 'Barchasi' }
    ]
  },
  {
    id: 'freefire',
    name: 'Free Fire',
    category: 'Olmoslar / Diamonds',
    emoji: '🔥',
    gradient: 'linear-gradient(160deg,#4a1408,#8a3a10)',
    filters: ['Barchasi', 'Olmoslar', 'Bundle', 'Level Up'],
    requiresServer: false,
    packages: [
      { id: 'ff1', label: '110', amount: 110, price: 16500, group: 'Olmoslar' },
      { id: 'ff2', label: '341', amount: 341, price: 31000, group: 'Olmoslar' },
      { id: 'ff3', label: '572', amount: 572, price: 57500, group: 'Olmoslar' },
      { id: 'ff4', label: '1166', amount: 1166, price: 115000, group: 'Olmoslar' },
      { id: 'ff5', label: '2398', amount: 2398, price: 213000, badge: 'top', group: 'Olmoslar' },
      { id: 'ff6', label: '6160', amount: 6160, price: 550000, badge: 'top', group: 'Olmoslar' },
      { id: 'ff7', label: 'Newbie Bundle', amount: 1, price: 5000, group: 'Bundle' },
      { id: 'ff8', label: 'Evo Access 3D', amount: 1, price: 8900, group: 'Bundle' },
      { id: 'ff9', label: 'Evo Access 7D', amount: 1, price: 15500, group: 'Bundle' },
      { id: 'ff10', label: 'Evo Access 30D', amount: 1, price: 40000, group: 'Bundle' },
      { id: 'ff11', label: 'Weekly Lite', amount: 1, price: 10000, group: 'Bundle' },
      { id: 'ff12', label: 'Weekly Membership', amount: 1, price: 27900, group: 'Bundle' },
      { id: 'ff13', label: 'Monthly Membership', amount: 1, price: 83000, group: 'Bundle' },
      { id: 'ff14', label: 'Level Up — Level 6', amount: 1, price: 6500, group: 'Level Up' },
      { id: 'ff15', label: 'Level Up — Level 10', amount: 1, price: 10000, group: 'Level Up' },
      { id: 'ff16', label: 'Level Up — Level 15', amount: 1, price: 12000, group: 'Level Up' },
      { id: 'ff17', label: 'Level Up — Level 20', amount: 1, price: 13900, group: 'Level Up' },
      { id: 'ff18', label: 'Level Up — Level 25', amount: 1, price: 15000, group: 'Level Up' },
      { id: 'ff19', label: 'Level Up — Level 30', amount: 1, price: 17700, group: 'Level Up' }
    ]
  },
  {
    id: 'hok',
    name: 'Honor of Kings',
    category: 'Jetonlar / Tokens',
    emoji: '🪙',
    gradient: 'linear-gradient(160deg,#3a2a08,#6a4a10)',
    filters: ['Barchasi', 'Jetonlar', 'Haftalik', 'Bonus paketlar'],
    packages: [
      { id: 'hok1', label: '16 Jeton', amount: 16, price: 4000, group: 'Jetonlar' },
      { id: 'hok2', label: '80 Jeton', amount: 80, price: 13500, group: 'Jetonlar' },
      { id: 'hok3', label: '240 Jeton', amount: 240, price: 37500, group: 'Jetonlar' },
      { id: 'hok4', label: '400 Jeton', amount: 400, price: 57500, group: 'Jetonlar' },
      { id: 'hok5', label: '560 Jeton', amount: 560, price: 79000, group: 'Jetonlar' },
      { id: 'hok6', label: '830 Jeton', amount: 830, price: 115000, group: 'Jetonlar' },
      { id: 'hok7', label: '1245 Jeton', amount: 1245, price: 175000, group: 'Jetonlar' },
      { id: 'hok8', label: '2508 Jeton', amount: 2508, price: 350000, badge: 'top', group: 'Jetonlar' },
      { id: 'hok9', label: '4180 Jeton', amount: 4180, price: 578000, badge: 'top', group: 'Jetonlar' },
      { id: 'hok10', label: '8360 Jeton', amount: 8360, price: 1160000, badge: 'top', group: 'Jetonlar' },
      { id: 'hok11', label: 'Weekly Card', amount: 1, price: 16000, group: 'Haftalik' },
      { id: 'hok12', label: 'Weekly Card Plus', amount: 1, price: 39000, group: 'Haftalik' },
      { id: 'hok13', label: 'Double Token Lucky Bag', amount: 1, price: 5000, group: 'Bonus paketlar' },
      { id: 'hok14', label: 'Honor Point Value Pack', amount: 1, price: 5500, group: 'Bonus paketlar' },
      { id: 'hok15', label: 'Standard Purchase Rebate Pack', amount: 1, price: 6000, group: 'Bonus paketlar' },
      { id: 'hok16', label: 'Premium Purchase Rebate Pack', amount: 1, price: 17000, group: 'Bonus paketlar' },
      { id: 'hok17', label: 'Crimson Skyblade Aoyin', amount: 1, price: 12000, group: 'Bonus paketlar' }
    ]
  },
  {
    id: 'tgpremium',
    name: 'Telegram Premium',
    category: 'Obuna',
    emoji: '⭐',
    gradient: 'linear-gradient(160deg,#142840,#1a3a6a)',
    filters: ['Barchasi'],
    packages: [
      { id: 'tgp1', label: '3 oylik Premium', amount: 3, price: 165000, group: 'Barchasi' },
      { id: 'tgp2', label: '6 oylik Premium', amount: 6, price: 217000, group: 'Barchasi' },
      { id: 'tgp3', label: '12 oylik Premium', amount: 12, price: 378000, badge: 'top', group: 'Barchasi' }
    ]
  },
  {
    id: 'supersus',
    name: 'Super Sus',
    category: 'Goldstar',
    emoji: '🕵️',
    gradient: 'linear-gradient(160deg,#5a1414,#8a2a10)',
    filters: ['Barchasi'],
    packages: [
      { id: 'ss1', label: '100 Goldstar', amount: 100, price: 9900, group: 'Barchasi' },
      { id: 'ss2', label: '550 Goldstar', amount: 550, price: 45000, group: 'Barchasi' },
      { id: 'ss3', label: '1200 Goldstar', amount: 1200, price: 89000, group: 'Barchasi' }
    ]
  },
  {
    id: 'mcgg',
    name: 'Magic Chess GoGo',
    category: 'Diamonds',
    emoji: '♟️',
    gradient: 'linear-gradient(160deg,#241a4a,#4a1a5a)',
    filters: ['Barchasi'],
    packages: [
      { id: 'mc1', label: '50 Diamonds', amount: 50, price: 13000, group: 'Barchasi' },
      { id: 'mc2', label: '150 Diamonds', amount: 150, price: 35000, group: 'Barchasi' },
      { id: 'mc3', label: '500 Diamonds', amount: 500, price: 106000, group: 'Barchasi' }
    ]
  },
  {
    id: 'genshin',
    name: 'Genshin Impact',
    category: 'Crystals',
    emoji: '💠',
    gradient: 'linear-gradient(160deg,#1a2a4a,#2a4a6a)',
    filters: ['Barchasi'],
    packages: [
      { id: 'gi1', label: '60 Crystals', amount: 60, price: 14000, group: 'Barchasi' },
      { id: 'gi2', label: '300+30 Crystals', amount: 330, price: 65000, group: 'Barchasi' },
      { id: 'gi3', label: '980+110 Crystals', amount: 1090, price: 199000, group: 'Barchasi' },
      { id: 'gi4', label: 'Welkin Moon', amount: 1, price: 21000, group: 'Barchasi' }
    ]
  },
  {
    id: 'tgstars',
    name: 'Telegram Stars',
    category: 'Stars',
    emoji: '⭐',
    gradient: 'linear-gradient(160deg,#141414,#2a2418)',
    filters: ['Barchasi'],
    packages: [
      { id: 'tg1', label: '50 Stars', amount: 50, price: 12000, group: 'Barchasi' },
      { id: 'tg2', label: '75 Stars', amount: 75, price: 18000, group: 'Barchasi' },
      { id: 'tg3', label: '100 Stars', amount: 100, price: 23000, group: 'Barchasi' },
      { id: 'tg4', label: '150 Stars', amount: 150, price: 33500, group: 'Barchasi' },
      { id: 'tg5', label: '250 Stars', amount: 250, price: 52500, group: 'Barchasi' },
      { id: 'tg6', label: '500 Stars', amount: 500, price: 100500, badge: 'top', group: 'Barchasi' },
      { id: 'tg7', label: '1000 Stars', amount: 1000, price: 199500, badge: 'top', group: 'Barchasi' }
    ]
  }
]

export function getGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id)
}

/** Balans kabi katta raqamlar uchun — "so'm" kichikroq yoziladi. */
export function somHtml(n: number): string {
  const suffix = state.language === 'ru' ? 'сум' : "so'm"
  return `${n.toLocaleString('ru-RU').replace(/,/g, ' ')} <small>${suffix}</small>`
}

export function formatSom(n: number): string {
  const suffix = state.language === 'ru' ? ' сум' : " so'm"
  return n.toLocaleString('ru-RU').replace(/,/g, ' ') + suffix
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

// ---------- Saved player IDs ----------

export function saveGameId(gameId: string, data: SavedId) {
  state = { ...state, savedIds: { ...state.savedIds, [gameId]: data } }
  persist()
}

export function removeSavedId(gameId: string) {
  const next = { ...state.savedIds }
  delete next[gameId]
  state = { ...state, savedIds: next }
  persist()
}

// ---------- Balance top-up ----------

export function createTopUp(amount: number, method: PayMethod): TopUpTx {
  const tx: TopUpTx = {
    id: genId('tup'),
    amount,
    method,
    status: method === 'balance' ? 'completed' : 'pending',
    createdAt: Date.now()
  }
  state = { ...state, topups: [tx, ...state.topups] }
  persist()
  return tx
}

export function resolveTopUp(id: string, success: boolean) {
  const topups = state.topups.map((t) => (t.id === id ? { ...t, status: (success ? 'completed' : 'cancelled') as Order['status'] } : t))
  let balance = state.balance
  const tx = state.topups.find((t) => t.id === id)
  if (success && tx) balance += tx.amount
  state = { ...state, topups, balance }
  persist()
}

// ---------- Orders / purchases ----------

export function purchaseWithBalance(params: {
  gameId: string
  gameName: string
  packageLabel: string
  price: number
  playerId?: string
  server?: string
}): { ok: boolean; order?: Order; reason?: string } {
  if (state.balance < params.price) {
    return { ok: false, reason: 'insufficient' }
  }
  const order: Order = {
    id: genId('ord'),
    gameId: params.gameId,
    gameName: params.gameName,
    packageLabel: params.packageLabel,
    playerId: params.playerId,
    server: params.server,
    price: params.price,
    method: 'balance',
    status: 'completed',
    createdAt: Date.now()
  }
  const cashbackEarned = Math.round(params.price * 0.01)
  state = {
    ...state,
    balance: state.balance - params.price,
    cashback: state.cashback + cashbackEarned,
    orders: [order, ...state.orders]
  }
  persist()
  return { ok: true, order }
}

export function createDirectOrder(params: {
  gameId: string
  gameName: string
  packageLabel: string
  price: number
  method: PayMethod
  playerId?: string
  server?: string
}): Order {
  const order: Order = {
    id: genId('ord'),
    gameId: params.gameId,
    gameName: params.gameName,
    packageLabel: params.packageLabel,
    playerId: params.playerId,
    server: params.server,
    price: params.price,
    method: params.method,
    status: 'pending',
    createdAt: Date.now()
  }
  state = { ...state, orders: [order, ...state.orders] }
  persist()
  return order
}

export function resolveOrder(id: string, success: boolean) {
  const orders = state.orders.map((o) => {
    if (o.id !== id) return o
    const status: Order['status'] = success ? 'completed' : 'cancelled'
    return { ...o, status }
  })
  let cashback = state.cashback
  const order = state.orders.find((o) => o.id === id)
  if (success && order) cashback += Math.round(order.price * 0.01)
  state = { ...state, orders, cashback }
  persist()
}

export function setLanguage(lang: 'uz' | 'ru') {
  state = { ...state, language: lang }
  persist()
}
