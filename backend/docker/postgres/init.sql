-- Zaryad backend — boshlang'ich sxema
-- Barcha pul/miqdor ustunlari bigint (so'm/dona, tiyin emas — butun sonlar bilan ishlaymiz).

create extension if not exists "pgcrypto";

-- ---------- Users ----------
-- Telegram orqali avtomatik yaratiladi (birinchi initData tekshiruvida upsert qilinadi).
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null unique,
  username text,
  first_name text,
  phone text,
  language text not null default 'uz' check (language in ('uz', 'ru')),
  balance bigint not null default 0,
  cashback bigint not null default 0,
  referred_by uuid references users(id),         -- kim taklif qilgani (bir marta, ro'yxatdan o'tishda yoziladi)
  referral_rewarded_at timestamptz,              -- referrerga shu user uchun bonus berilgan payt (bir martalik himoya)
  referral_reward_amount bigint,                 -- referrerga shu user tufayli qancha berilgani (statistikada "jami topilgan" uchun)
  referral_reward_payment_id uuid,               -- bonusni ishga tushirgan to'lov — admin uni undo qilsa, bonus ham qaytariladi
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Catalog: games ----------
create table if not exists games (
  id text primary key,              -- slug, masalan 'pubgm', 'mlbb_ru'
  name text not null,
  category text not null default '',      -- ekranda ko'rinadigan qisqa tavsif
  currency_name text not null,            -- 'UC', 'Olmos', 'Jeton', 'Stars'...
  gradient text not null default 'linear-gradient(160deg,#222,#333)',
  icon text,                              -- ixtiyoriy: icon nomi yoki rasm URL
  requires_server boolean not null default false,
  server_options jsonb,                   -- null = erkin matn kiritiladi; array bo'lsa dropdown: [{"label":"America","value":"6"}, ...]
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Catalog: packages ----------
create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id) on delete cascade,
  label text not null,              -- "660 UC", "30 + Stars (Pro)"
  amount bigint not null,           -- asosiy miqdor (bonussiz)
  bonus bigint,                     -- ustama miqdor (bo'lsa)
  price bigint not null,            -- so'm
  badge text check (badge in ('x2', 'top')),
  group_name text not null default 'Barchasi',  -- filter chip: "Olmoslar", "Obunalar"...
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_packages_game on packages(game_id) where is_active;

-- Paket rasmi (Cloudinary URL) — ixtiyoriy
alter table packages add column if not exists icon text;

-- ---------- Bosh sahifa bannerlari ----------
create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  link text,                              -- ixtiyoriy: '#/game/pubgm' yoki tashqi havola
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Payments (purchase + topup birlashgan) ----------
-- CREATE TYPE'da IF NOT EXISTS yo'q — DO blok orqali qo'lda idempotent qilamiz
-- (bu fayl har server ishga tushganda avtomatik qayta ishlatiladi, xato bermasligi kerak).
do $$ begin
  create type payment_kind as enum ('purchase', 'topup');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending_review', 'completed', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('card', 'atm', 'foreign', 'balance');
exception when duplicate_object then null; end $$;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_no serial,                           -- userga/adminga ko'rsatiladigan qisqa raqam (masalan "#1024")
  user_id uuid not null references users(id),
  kind payment_kind not null,
  status payment_status not null default 'pending_review',
  method payment_method not null,
  amount bigint not null,                    -- foydalanuvchi to'lagan summa (so'm)

  -- faqat kind='purchase' bo'lganda to'ldiriladi:
  game_id text references games(id),
  package_id uuid references packages(id),
  player_info jsonb,                         -- {"playerId":"123456789","server":"6"} — o'yinga qarab moslashuvchan

  admin_id bigint,                           -- qaror qabul qilgan adminning telegram_id'si
  telegram_alert_message_id bigint,          -- admin chatidagi signal xabari (approve/reject tugmasi shu xabarni tahrirlaydi)
  telegram_alert_is_photo boolean not null default false, -- signal xabari rasm(chek)li xabarmi (editMessageCaption) yoki oddiy matnmi (editMessageText)
  receipt_message_id bigint,                 -- user yuborgan chek/screenshot admin chatiga forward qilingan xabar id'si
  receipt_url text,                          -- xuddi shu chek Cloudinary'da ham saqlanadi (admin panelida ko'rish uchun)
  reject_reason text,                        -- admin rad etganda yozgan sabab (userga shu ko'rsatiladi)

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_payments_status on payments(status);
create index if not exists idx_payments_user on payments(user_id);

-- ---------- Stock: har bir o'yin valyutasi zaxirasi ----------
create table if not exists game_stock (
  game_id text primary key references games(id) on delete cascade,
  balance bigint not null default 0,
  updated_at timestamptz not null default now()
);

do $$ begin
  create type stock_movement_kind as enum ('deposit', 'sale', 'adjustment');
exception when duplicate_object then null; end $$;

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  kind stock_movement_kind not null,
  amount bigint not null,           -- deposit/adjustment(+) musbat, sale manfiy bo'lishi mumkin (chiqim)
  note text,
  payment_id uuid references payments(id),   -- kind='sale' bo'lsa, qaysi to'lov sabab bo'lgani
  created_by bigint,                          -- admin telegram_id (deposit/adjustment uchun)
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_game on stock_movements(game_id, created_at desc);

-- ---------- To'lov kartalari (admin boshqaradi, userga to'lov ekranida ko'rsatiladi) ----------
create table if not exists payment_cards (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,          -- "Kapitalbank", "Click", "Payme"
  card_number text not null,        -- karta raqami yoki telefon (Click/Payme uchun)
  holder_name text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Promokodlar (admin yaratadi, foydalanuvchi bir marta ishlatib balansga bonus oladi) ----------
create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- har doim katta harflarda saqlanadi (normalize qilingan)
  bonus_amount bigint not null,       -- ishlatilganda balansga qo'shiladigan summa (so'm)
  expires_at timestamptz,             -- ixtiyoriy muddat — null bo'lsa muddatsiz
  is_active boolean not null default true,
  created_by bigint,                  -- yaratgan adminning telegram_id'si
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists promo_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references promo_codes(id) on delete cascade,
  user_id uuid not null references users(id),
  amount bigint not null,             -- ishlatilgan paytdagi bonus miqdori (tarixiy — kod keyin tahrirlansa ham o'zgarmaydi)
  created_at timestamptz not null default now(),
  unique (promo_code_id, user_id)     -- har user bitta kodni faqat bir marta ishlata oladi
);

create index if not exists idx_promo_redemptions_user on promo_code_redemptions(user_id);

-- ---------- Ilova sozlamalari (bitta qatorli jadval) ----------
create table if not exists app_settings (
  id boolean primary key default true,
  average_processing_minutes integer not null default 5,
  support_username text,
  channel_url text,
  referral_fixed_bonus bigint not null default 3000,   -- har bir referral uchun fiks bonus (so'm)
  referral_percent numeric(5, 2) not null default 5,   -- + taklif qilingan userning birinchi to'lovi summasidan foiz
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id)
);
insert into app_settings (id) values (true) on conflict (id) do nothing;

-- Admin panelda bu maydon endi tahrirlanmaydi (UI olib tashlangan), lekin oldin xato/sinov
-- qiymat kiritilgan bo'lishi mumkin (masalan "123213 daqiqa" kabi) — aqlga sig'maydigan
-- qiymatlarni bir martalik tozalab, oqilona standartga qaytaramiz.
update app_settings set average_processing_minutes = 15 where average_processing_minutes > 120;

-- ---------- Boshlang'ich katalog seed (idempotent — on conflict do nothing) ----------
-- init.sql har boot'da qayta ishga tushadi, shu sabab bu yerdagi INSERT'lar
-- xavfsiz takrorlanadi. Yangi o'yin/paket qo'shish uchun admin panel ishlating —
-- bu faqat DEPLOY qilingan har bir muhitda (local/Render) boshlang'ich katalog bo'lishini kafolatlaydi.
insert into games (id, name, category, currency_name, gradient, requires_server, sort_order) values ('freefire','Free Fire','Olmoslar / Diamonds','Olmoslar','linear-gradient(160deg,#4a1408,#8a3a10)',false,0) on conflict (id) do nothing;
insert into games (id, name, category, currency_name, gradient, requires_server, sort_order) values ('genshin','Genshin Impact','Crystals','Crystals','linear-gradient(160deg,#1a2a4a,#2a4a6a)',false,0) on conflict (id) do nothing;
insert into games (id, name, category, currency_name, gradient, requires_server, sort_order) values ('hok','Honor of Kings','Jetonlar / Tokens','Jetonlar','linear-gradient(160deg,#3a2a08,#6a4a10)',false,0) on conflict (id) do nothing;
insert into games (id, name, category, currency_name, gradient, requires_server, sort_order) values ('mcgg','Magic Chess GoGo','Diamonds','Diamonds','linear-gradient(160deg,#241a4a,#4a1a5a)',false,0) on conflict (id) do nothing;
insert into games (id, name, category, currency_name, gradient, requires_server, sort_order) values ('mlbb','Mobile Legends','Olmoslar / Diamonds — Global','Olmoslar','linear-gradient(160deg,#1b2a5e,#3a2e78)',true,0) on conflict (id) do nothing;
insert into games (id, name, category, currency_name, gradient, requires_server, sort_order) values ('mlbb_ru','Mobile Legends (RU)','Olmoslar / Diamonds — Russia','Olmoslar','linear-gradient(160deg,#2a1b5e,#4e2e78)',true,0) on conflict (id) do nothing;
insert into games (id, name, category, currency_name, gradient, requires_server, sort_order) values ('pubgm','PUBG Mobile','UC','UC','linear-gradient(160deg,#2a1c10,#5a3a12)',false,0) on conflict (id) do nothing;
insert into games (id, name, category, currency_name, gradient, requires_server, sort_order) values ('supersus','Super Sus','Goldstar','Goldstar','linear-gradient(160deg,#5a1414,#8a2a10)',false,0) on conflict (id) do nothing;
insert into games (id, name, category, currency_name, gradient, requires_server, sort_order) values ('tgpremium','Telegram Premium','Obuna','Obuna','linear-gradient(160deg,#142840,#1a3a6a)',false,0) on conflict (id) do nothing;
insert into games (id, name, category, currency_name, gradient, requires_server, sort_order) values ('tgstars','Telegram Stars','Stars','Stars','linear-gradient(160deg,#141414,#2a2418)',false,0) on conflict (id) do nothing;
insert into games (id, name, category, currency_name, gradient, requires_server, sort_order) values ('vpn','VPN','VPN xizmati','Oy','linear-gradient(160deg,#0f2a2a,#123a3a)',false,0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('465b5c44-366a-49d1-bbcd-30ddada6ea18','freefire','Newbie Bundle',1,null,5000,null,'Bundle',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('ad438a34-3aad-458a-adcc-850ca414cdf8','freefire','Level Up — Level 30',1,null,17700,null,'Level Up',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('09a27136-3a51-4295-b62f-f49d06bb626c','freefire','Level Up — Level 25',1,null,15000,null,'Level Up',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('91858d8b-ead4-499b-a21e-85198f8fe805','freefire','Level Up — Level 20',1,null,13900,null,'Level Up',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('acdd864a-6cbf-47eb-b377-d3142c1dc0bf','freefire','Level Up — Level 15',1,null,12000,null,'Level Up',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('1eaae6ef-a9d9-4b6a-b79c-6921fca09c1d','freefire','Level Up — Level 10',1,null,10000,null,'Level Up',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('0095ee5e-0b27-4c3b-a783-5b816de96b1c','freefire','Level Up — Level 6',1,null,6500,null,'Level Up',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('6688d7c9-56e1-4e20-851d-8ab35cc97369','freefire','Monthly Membership',1,null,83000,null,'Bundle',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('2654ae71-51d8-4090-9fe9-9a2379df7372','freefire','Weekly Membership',1,null,27900,null,'Bundle',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('2f5b7219-efbf-4e40-9962-932c25ed1f64','freefire','Weekly Lite',1,null,10000,null,'Bundle',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('0e63c8d4-03ec-4031-a07f-540240ff0cd8','freefire','Evo Access 30D',1,null,40000,null,'Bundle',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('2112023c-13b8-452b-bd72-562782397c4b','freefire','Evo Access 7D',1,null,15500,null,'Bundle',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('94b6459d-480f-4b5e-88d2-bb3700891c38','freefire','Evo Access 3D',1,null,8900,null,'Bundle',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('4b0f6813-bb3d-44ae-8ffa-f82ca595dead','freefire','110',110,null,16500,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('fa073261-dc4d-494d-a62c-c075a95bf734','freefire','341',341,null,31000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('6d05fcdd-9b39-4db3-ba5c-b35e57329cfb','freefire','572',572,null,57500,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('a3eb1833-439e-4437-878e-a79b0a0ced72','freefire','1166',1166,null,115000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('9711ef48-274e-4ecb-9eed-652ca3a333b8','freefire','2398',2398,null,213000,'top','Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('99d488de-0f75-4ac7-9464-064562fc3fa6','freefire','6160',6160,null,550000,'top','Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('36a400e3-50c5-4786-b08e-0c1a12402a04','genshin','300+30 Crystals',330,null,65000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('402dc69b-e51b-4c2b-8463-265eee8f3707','genshin','60 Crystals',60,null,14000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('a42eab67-f1c6-4732-8aee-babbee3d7a53','genshin','Welkin Moon',1,null,21000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('07946bf9-e70c-41b6-85d6-470f62204a00','genshin','980+110 Crystals',1090,null,199000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('963cf7ea-90b5-4cc1-bb25-dea879d46cb5','hok','Premium Purchase Rebate Pack',1,null,17000,null,'Bonus paketlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('cf058fd8-e599-4e0b-b98d-59c9eafce515','hok','Standard Purchase Rebate Pack',1,null,6000,null,'Bonus paketlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('4202bb96-7267-487a-849d-ef91894c27fd','hok','Honor Point Value Pack',1,null,5500,null,'Bonus paketlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('7886470b-bc34-4803-83c4-aad8fa35cff0','hok','Double Token Lucky Bag',1,null,5000,null,'Bonus paketlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('dcb78d33-d23a-433a-85f4-a66052db3006','hok','Weekly Card Plus',1,null,39000,null,'Haftalik',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('6d5fd43f-9350-4c3e-9c24-30cd53647083','hok','Weekly Card',1,null,16000,null,'Haftalik',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('f2c71810-6c82-4c0b-8785-56642ae80e47','hok','8360 Jeton',8360,null,1160000,'top','Jetonlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('371e968a-bfbf-414a-bf4b-7b055072be7a','hok','4180 Jeton',4180,null,578000,'top','Jetonlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('d0e6963d-c662-417a-b1db-f7ea3fc4ecff','hok','2508 Jeton',2508,null,350000,'top','Jetonlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('81d2ec99-79fa-4b07-b7b6-4cd1e6b9190b','hok','1245 Jeton',1245,null,175000,null,'Jetonlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('c1141b58-48fc-4832-b77e-f6f524a08613','hok','830 Jeton',830,null,115000,null,'Jetonlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('f84f4ab0-da89-42a7-ba80-eeb1b861d4dd','hok','560 Jeton',560,null,79000,null,'Jetonlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('d9bd777c-2776-42ef-b8cd-f318becb6783','hok','240 Jeton',240,null,37500,null,'Jetonlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('777aa87f-9435-4cc2-8f1c-612f015f072e','hok','400 Jeton',400,null,57500,null,'Jetonlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('fc7491d4-e3ba-44d4-a5fb-71ef1507d13e','hok','80 Jeton',80,null,13500,null,'Jetonlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('cea8fb1e-0e3e-4aa9-af78-dc1c0dd32287','hok','16 Jeton',16,null,4000,null,'Jetonlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('6158bd5a-2a8a-464b-9cf3-1dfc6bb97eac','hok','Crimson Skyblade Aoyin',1,null,12000,null,'Bonus paketlar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('1ce020dd-eb3e-4140-b73e-ce92ba312a23','mcgg','500 Diamonds',500,null,106000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('0cef560f-d199-4a47-8295-baff0c11a66d','mcgg','50 Diamonds',50,null,13000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('39c95155-81ba-4960-ac57-ec1a5abd5709','mcgg','150 Diamonds',150,null,35000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('e5e171d2-40d2-4300-8a36-d2fa218104c1','mlbb','875',875,null,170000,'top','Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('f7b3d128-d09d-499b-bd45-a0787dfca487','mlbb','408',408,null,85000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('522c94c7-3547-47e8-b1f2-77a143b72269','mlbb','296',296,null,61500,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('0e611b97-bf37-490a-b1a1-6d66a59aab0a','mlbb','240',240,null,51000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('20ce07dd-7aa4-47b6-9ae3-ac6d479513c5','mlbb','170',170,null,37000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('fe070b48-2f3d-4b09-8dfe-1da1b30fe415','mlbb','85',85,null,19500,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('1ad88e15-5b65-458f-b9ab-d1c0d27abc36','mlbb','59',59,null,16500,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('c1f066da-1f2f-4599-ba25-327b14ab831b','mlbb','44',44,null,14000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('6ffc8dcf-3a46-45ea-bb78-ab83b36ec319','mlbb','28',28,null,10500,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('8cc51cd2-ba06-4249-af43-a42ecb3b5b67','mlbb','19',19,null,8000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('6e02e35c-f648-4f03-a054-79f67f175a0f','mlbb','12',12,null,5000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('f2cd4aa7-31ed-49db-9b71-965b0ac4a29b','mlbb','5',5,null,2000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('35ed919e-c75f-4366-a38d-eb922cc933f6','mlbb','Twilight Pass',1,null,135000,null,'Obunalar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('0aa33686-c570-4e5f-94e6-3b2a93427aaa','mlbb','Monthly Elite Pack',1,null,60000,null,'Obunalar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('f9cd4876-899c-47db-903c-8adf784ddf31','mlbb','Weekly Elite Pack',1,null,13500,null,'Obunalar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('595815b7-b5f3-4c12-954f-496f3590ede5','mlbb','Weekly',1,null,22000,null,'Obunalar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('cbef2075-5c84-41f8-8045-a84d91d085c7','mlbb','4830',4830,null,940000,'top','Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('63b9b90d-eac0-4bba-8c33-6e1dc1f442e5','mlbb','2010',2010,null,385500,'top','Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('a20254ed-f40a-4eae-8912-0d48762d950e','mlbb_ru','55',55,null,18000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('c68834eb-d57f-440b-a8fb-0a45e1f021ab','mlbb_ru','Weekly Diamond Pass RU',1,null,29500,null,'Obunalar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('3183f6d5-d6b6-4e17-96d4-9d3147b207b3','mlbb_ru','6000',6000,null,1400000,'top','Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('77ea2a09-1cfc-4aa9-9a12-2d17cc5f789c','mlbb_ru','2975',2975,null,709000,'top','Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('5f901a2d-af0f-4c4b-9470-5495fa5bdec2','mlbb_ru','1765',1765,null,430000,'top','Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('b01b2c2f-0b2b-4bf8-a792-10cf496a04aa','mlbb_ru','1155',1155,null,289000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('410a9a1b-1a97-42a1-a24d-d74abd8769b4','mlbb_ru','565',565,null,142000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('da57d2a2-293e-4514-be73-8702c80682f1','mlbb_ru','275',275,null,71000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('ca7f2df5-e388-4139-a880-b86222b12671','mlbb_ru','165',165,null,45500,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('a8a4b938-fdd7-4d6a-a47f-44a36704233f','mlbb_ru','35',35,null,13000,null,'Olmoslar',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('eda0f08b-ce26-4d2f-95e1-6ae5f12759c4','pubgm','1800 UC',1800,null,285000,'top','Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('8a5b17e6-5bdf-44e8-b775-00cf55ea7852','pubgm','60 UC',60,null,15500,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('f1bb9258-af5f-40c2-8ab1-295da3c8039b','pubgm','660 UC',660,null,119000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('c00e35ac-e124-4715-81d7-044712543118','pubgm','325 UC',325,null,62000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('a1cab4ab-f19b-418c-8df4-730c71a4733b','pubgm','3850 UC',3850,null,571000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('5afdbb8d-2487-4fc7-8fd9-cbf8488c3cc8','pubgm','8100 UC',8100,null,1170000,'top','Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('0e0b95c7-17ac-4784-ae3f-249140dd369e','supersus','100 Goldstar',100,null,9900,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('75798e66-3b74-4e07-8e9c-5c4e6f28c54c','supersus','550 Goldstar',550,null,45000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('7cb047d3-407f-4af3-93d6-ce93465ea382','supersus','1200 Goldstar',1200,null,89000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('e479615d-317a-45b5-a569-b45aab74722e','tgpremium','6 oylik Premium',6,null,217000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('2d3dc28f-2bec-41db-9def-f5f27c73643c','tgpremium','12 oylik Premium',12,null,378000,'top','Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('af195516-e211-4616-9323-c65f8423ce00','tgpremium','3 oylik Premium',3,null,165000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('6d8a24ce-7a33-49d4-9349-ebcf2c90f8b9','tgstars','1000 Stars',1000,null,199500,'top','Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('3e83e5a8-38ff-41fc-b84d-b9946fa7f6f0','tgstars','500 Stars',500,null,100500,'top','Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('7676a9b7-81fa-495f-9a1f-da45bd860119','tgstars','100 Stars',100,null,23000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('1391420c-1be6-4e1e-a021-6adb5302ae5a','tgstars','150 Stars',150,null,33500,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('b6c46763-a6d3-4657-8514-cc323fcf8fb3','tgstars','250 Stars',250,null,52500,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('f9abffcd-3601-451e-950b-0208a7f54f75','tgstars','50 Stars',50,null,12000,null,'Barchasi',0) on conflict (id) do nothing;
insert into packages (id, game_id, label, amount, bonus, price, badge, group_name, sort_order) values ('a147d06c-afe7-49a0-a72b-ac63afa9dd58','tgstars','75 Stars',75,null,18000,null,'Barchasi',0) on conflict (id) do nothing;

-- ---------- Migratsiyalar (jadval allaqachon mavjud bo'lsa ham ustunlar qo'shiladi) ----------
alter table payments add column if not exists receipt_url text;
alter table payments add column if not exists telegram_alert_is_photo boolean not null default false;
alter table users add column if not exists referred_by uuid references users(id);
alter table users add column if not exists referral_rewarded_at timestamptz;
alter table users add column if not exists referral_reward_amount bigint;
alter table users add column if not exists referral_reward_payment_id uuid;
alter table app_settings add column if not exists referral_fixed_bonus bigint not null default 3000;
alter table app_settings add column if not exists referral_percent numeric(5, 2) not null default 5;

-- ---------- PayCore supplier integratsiyasi (avtomatik yetkazib berish) ----------
-- Kategoriya (masalan "free-fire") o'yinning o'zi uchun bitta — shuning uchun games'da;
-- slug (aniq nominal, masalan "diamonds-110") esa har bir paket uchun alohida. O'yin
-- kategoriyaga ega bo'lsa — xarid oldidan playerId shu orqali TEKSHIRILADI (checks/*);
-- paket ustiga slug ham qo'yilsa — tasdiqlangach avtomatik SOTIB OLINADI (orders).
alter table games add column if not exists supplier_category text;
alter table packages add column if not exists supplier_slug text;
alter table packages drop column if exists supplier_category; -- endi games'da (yuqoriga qarang)
-- VPN kategoriyasi uchun — PayCore'da bu parametrik (katalogda alohida mahsulot sifatida
-- ro'yxatlanmagan): buyurtma to'g'ridan-to'g'ri {months, devices} bilan yaratiladi.
-- `amount` ustuni oy sonini (months) saqlaydi, `extra_qty` esa qurilmalar sonini (devices).
alter table packages add column if not exists extra_qty integer;

-- Ikkita yetkazib beruvchi qo'llab-quvvatlanadi; qaysi biri ishlatilishi o'yin darajasida
-- tanlanadi. Yuqoridagi ikkita ustunning ma'nosi provayderga qarab farq qiladi:
--   games.supplier_category  → paycore: kategoriya slug'i  · moogold: product_id
--   packages.supplier_slug   → paycore: mahsulot slug'i    · moogold: variation_id
alter table games add column if not exists supplier_provider text not null default 'paycore'; -- 'paycore' | 'moogold'
alter table games add column if not exists supplier_order_category integer;  -- faqat moogold: 1 = direct top-up, 2 = eVoucher

alter table payments add column if not exists supplier_order_id bigint;
alter table payments add column if not exists supplier_provider text;        -- buyurtma qaysi provayderga yuborilgani (polling uchun)
alter table payments add column if not exists supplier_status text;   -- 'processing' | 'completed' | 'failed'
alter table payments add column if not exists supplier_details jsonb; -- PayCore javobidagi 'details' (kodlar, subscription_url va h.k.)
alter table payments add column if not exists supplier_error text;    -- muvaffaqiyatsiz bo'lsa — adminga ko'rsatiladigan sabab

-- PayCore mahsulot bog'lanishi (games/packages seed'idan keyin, idempotent UPDATE'lar) --
update games set supplier_category = 'free-fire' where id = 'freefire';
update games set supplier_category = 'mobile-legends-global' where id = 'mlbb';
update games set supplier_category = 'mobile-legends-ru' where id = 'mlbb_ru';
update games set supplier_category = 'honor-of-kings' where id = 'hok';
update games set supplier_category = 'pubg-uc-direct' where id = 'pubgm';
update games set supplier_category = 'telegram-premium' where id = 'tgpremium';
update games set supplier_category = 'telegram-stars' where id = 'tgstars';
update games set supplier_category = 'vpn' where id = 'vpn';

-- Free Fire
update packages set supplier_slug = 'ff_newbie' where id = '465b5c44-366a-49d1-bbcd-30ddada6ea18';
update packages set supplier_slug = 'ff_lvl_30' where id = 'ad438a34-3aad-458a-adcc-850ca414cdf8';
update packages set supplier_slug = 'ff_lvl_25' where id = '09a27136-3a51-4295-b62f-f49d06bb626c';
update packages set supplier_slug = 'ff_lvl_20' where id = '91858d8b-ead4-499b-a21e-85198f8fe805';
update packages set supplier_slug = 'ff_lvl_15' where id = 'acdd864a-6cbf-47eb-b377-d3142c1dc0bf';
update packages set supplier_slug = 'ff_lvl_10' where id = '1eaae6ef-a9d9-4b6a-b79c-6921fca09c1d';
update packages set supplier_slug = 'ff_lvl_6' where id = '0095ee5e-0b27-4c3b-a783-5b816de96b1c';
update packages set supplier_slug = 'ff_monthly' where id = '6688d7c9-56e1-4e20-851d-8ab35cc97369';
update packages set supplier_slug = 'ff_weekly' where id = '2654ae71-51d8-4090-9fe9-9a2379df7372';
update packages set supplier_slug = 'ff_weekly_lite' where id = '2f5b7219-efbf-4e40-9962-932c25ed1f64';
update packages set supplier_slug = 'ff_evo_30d' where id = '0e63c8d4-03ec-4031-a07f-540240ff0cd8';
update packages set supplier_slug = 'ff_evo_7d' where id = '2112023c-13b8-452b-bd72-562782397c4b';
update packages set supplier_slug = 'ff_evo_3d' where id = '94b6459d-480f-4b5e-88d2-bb3700891c38';
update packages set supplier_slug = 'ff_110' where id = '4b0f6813-bb3d-44ae-8ffa-f82ca595dead';
update packages set supplier_slug = 'ff_341' where id = 'fa073261-dc4d-494d-a62c-c075a95bf734';
update packages set supplier_slug = 'ff_572' where id = '6d05fcdd-9b39-4db3-ba5c-b35e57329cfb';
update packages set supplier_slug = 'ff_1166' where id = 'a3eb1833-439e-4437-878e-a79b0a0ced72';
update packages set supplier_slug = 'ff_2398' where id = '9711ef48-274e-4ecb-9eed-652ca3a333b8';
update packages set supplier_slug = 'ff_6160' where id = '99d488de-0f75-4ac7-9464-064562fc3fa6';

-- Honor of Kings
update packages set supplier_slug = 'hok_prem_rebate' where id = '963cf7ea-90b5-4cc1-bb25-dea879d46cb5';
update packages set supplier_slug = 'hok_std_rebate' where id = 'cf058fd8-e599-4e0b-b98d-59c9eafce515';
update packages set supplier_slug = 'hok_honor_vp' where id = '4202bb96-7267-487a-849d-ef91894c27fd';
update packages set supplier_slug = 'hok_dbl_token' where id = '7886470b-bc34-4803-83c4-aad8fa35cff0';
update packages set supplier_slug = 'hok_weekly_plus' where id = 'dcb78d33-d23a-433a-85f4-a66052db3006';
update packages set supplier_slug = 'hok_weekly_card' where id = '6d5fd43f-9350-4c3e-9c24-30cd53647083';
update packages set supplier_slug = 'hok_8360' where id = 'f2c71810-6c82-4c0b-8785-56642ae80e47';
update packages set supplier_slug = 'hok_4180' where id = '371e968a-bfbf-414a-bf4b-7b055072be7a';
update packages set supplier_slug = 'hok_2508' where id = 'd0e6963d-c662-417a-b1db-f7ea3fc4ecff';
update packages set supplier_slug = 'hok_1245' where id = '81d2ec99-79fa-4b07-b7b6-4cd1e6b9190b';
update packages set supplier_slug = 'hok_830' where id = 'c1141b58-48fc-4832-b77e-f6f524a08613';
update packages set supplier_slug = 'hok_560' where id = 'f84f4ab0-da89-42a7-ba80-eeb1b861d4dd';
update packages set supplier_slug = 'hok_240' where id = 'd9bd777c-2776-42ef-b8cd-f318becb6783';
update packages set supplier_slug = 'hok_400' where id = '777aa87f-9435-4cc2-8f1c-612f015f072e';
update packages set supplier_slug = 'hok_80' where id = 'fc7491d4-e3ba-44d4-a5fb-71ef1507d13e';
update packages set supplier_slug = 'hok_16' where id = 'cea8fb1e-0e3e-4aa9-af78-dc1c0dd32287';
update packages set supplier_slug = 'hok_skyblade' where id = '6158bd5a-2a8a-464b-9cf3-1dfc6bb97eac';

-- Mobile Legends (Global)
update packages set supplier_slug = 'mlbb_g_875' where id = 'e5e171d2-40d2-4300-8a36-d2fa218104c1';
update packages set supplier_slug = 'mlbb_g_408' where id = 'f7b3d128-d09d-499b-bd45-a0787dfca487';
update packages set supplier_slug = 'mlbb_g_296' where id = '522c94c7-3547-47e8-b1f2-77a143b72269';
update packages set supplier_slug = 'mlbb_g_240' where id = '0e611b97-bf37-490a-b1a1-6d66a59aab0a';
update packages set supplier_slug = 'mlbb_g_170' where id = '20ce07dd-7aa4-47b6-9ae3-ac6d479513c5';
update packages set supplier_slug = 'mlbb_g_85' where id = 'fe070b48-2f3d-4b09-8dfe-1da1b30fe415';
update packages set supplier_slug = 'mlbb_g_59' where id = '1ad88e15-5b65-458f-b9ab-d1c0d27abc36';
update packages set supplier_slug = 'mlbb_g_44' where id = 'c1f066da-1f2f-4599-ba25-327b14ab831b';
update packages set supplier_slug = 'mlbb_g_28' where id = '6ffc8dcf-3a46-45ea-bb78-ab83b36ec319';
update packages set supplier_slug = 'mlbb_g_19' where id = '8cc51cd2-ba06-4249-af43-a42ecb3b5b67';
update packages set supplier_slug = 'mlbb_g_12' where id = '6e02e35c-f648-4f03-a054-79f67f175a0f';
update packages set supplier_slug = 'mlbb_g_5' where id = 'f2cd4aa7-31ed-49db-9b71-965b0ac4a29b';
update packages set supplier_slug = 'mlbb_g_twilight' where id = '35ed919e-c75f-4366-a38d-eb922cc933f6';
update packages set supplier_slug = 'mlbb_g_monthly_elite' where id = '0aa33686-c570-4e5f-94e6-3b2a93427aaa';
update packages set supplier_slug = 'mlbb_g_weekly_elite' where id = 'f9cd4876-899c-47db-903c-8adf784ddf31';
update packages set supplier_slug = 'mlbb_g_weekly' where id = '595815b7-b5f3-4c12-954f-496f3590ede5';
update packages set supplier_slug = 'mlbb_g_4830' where id = 'cbef2075-5c84-41f8-8045-a84d91d085c7';
update packages set supplier_slug = 'mlbb_g_2010' where id = '63b9b90d-eac0-4bba-8c33-6e1dc1f442e5';

-- Mobile Legends (RU)
update packages set supplier_slug = 'mlbb_ru_55' where id = 'a20254ed-f40a-4eae-8912-0d48762d950e';
update packages set supplier_slug = 'mlbb_ru_weekly' where id = 'c68834eb-d57f-440b-a8fb-0a45e1f021ab';
update packages set supplier_slug = 'mlbb_ru_6000' where id = '3183f6d5-d6b6-4e17-96d4-9d3147b207b3';
update packages set supplier_slug = 'mlbb_ru_2975' where id = '77ea2a09-1cfc-4aa9-9a12-2d17cc5f789c';
update packages set supplier_slug = 'mlbb_ru_1765' where id = '5f901a2d-af0f-4c4b-9470-5495fa5bdec2';
update packages set supplier_slug = 'mlbb_ru_1155' where id = 'b01b2c2f-0b2b-4bf8-a792-10cf496a04aa';
update packages set supplier_slug = 'mlbb_ru_565' where id = '410a9a1b-1a97-42a1-a24d-d74abd8769b4';
update packages set supplier_slug = 'mlbb_ru_275' where id = 'da57d2a2-293e-4514-be73-8702c80682f1';
update packages set supplier_slug = 'mlbb_ru_165' where id = 'ca7f2df5-e388-4139-a880-b86222b12671';
update packages set supplier_slug = 'mlbb_ru_35' where id = 'a8a4b938-fdd7-4d6a-a47f-44a36704233f';

-- PUBG Mobile
update packages set supplier_slug = '1800' where id = 'eda0f08b-ce26-4d2f-95e1-6ae5f12759c4';
update packages set supplier_slug = '60' where id = '8a5b17e6-5bdf-44e8-b775-00cf55ea7852';
update packages set supplier_slug = '660' where id = 'f1bb9258-af5f-40c2-8ab1-295da3c8039b';
update packages set supplier_slug = '325' where id = 'c00e35ac-e124-4715-81d7-044712543118';
update packages set supplier_slug = '3850' where id = 'a1cab4ab-f19b-418c-8df4-730c71a4733b';
update packages set supplier_slug = '8100' where id = '5afdbb8d-2487-4fc7-8fd9-cbf8488c3cc8';

-- Telegram Premium
update packages set supplier_slug = 'premium_6' where id = 'e479615d-317a-45b5-a569-b45aab74722e';
update packages set supplier_slug = 'premium_12' where id = '2d3dc28f-2bec-41db-9def-f5f27c73643c';
update packages set supplier_slug = 'premium_3' where id = 'af195516-e211-4616-9323-c65f8423ce00';

-- Telegram Stars
update packages set supplier_slug = 'stars_1000' where id = '6d8a24ce-7a33-49d4-9349-ebcf2c90f8b9';
update packages set supplier_slug = 'stars_500' where id = '3e83e5a8-38ff-41fc-b84d-b9946fa7f6f0';
update packages set supplier_slug = 'stars_100' where id = '7676a9b7-81fa-495f-9a1f-da45bd860119';
update packages set supplier_slug = 'stars_150' where id = '1391420c-1be6-4e1e-a021-6adb5302ae5a';
update packages set supplier_slug = 'stars_250' where id = 'b6c46763-a6d3-4657-8514-cc323fcf8fb3';
update packages set supplier_slug = 'stars_50' where id = 'f9abffcd-3601-451e-950b-0208a7f54f75';
update packages set supplier_slug = 'stars_75' where id = 'a147d06c-afe7-49a0-a72b-ac63afa9dd58';

-- ---------- To'lovni avtomatik moslashtirish (SMS/notification) ----------
-- `amount` — mahsulotning HAQIQIY narxi (keshbek/referral shundan hisoblanadi, o'zgarmaydi).
-- `match_amount` — amount + tasodifiy offset (1-999 so'm), FAQAT SMS/notification'ni aniq
-- moslashtirish uchun ishlatiladi. Bir vaqtning o'zida ikkita "hali hal qilinmagan" to'lov
-- bir xil match_amount'ga ega bo'la olmaydi (pastdagi unique index) — shu bilan bir nechta
-- user bir xil summa to'lasa ham chalkashmaydi, izoh/comment'ga bog'liq bo'lmaydi.
alter table payments add column if not exists match_amount bigint;

create unique index if not exists idx_payments_active_match_amount
  on payments(match_amount)
  where status = 'pending_review' and match_amount is not null;

-- SMS/notification webhook'idan kelgan HAR bir xom signal — moslashgan-moslashmaganidan
-- qat'i nazar. Bank/Click/Payme SMS formati keyin o'zgarsa ham eski signallar saqlanib
-- qoladi, va parsing xato ishlaganda "nima kelgan edi" deb tekshirish uchun kerak.
create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,                    -- 'sms' | 'notification'
  raw_text text not null,
  parsed_amount bigint,
  parsed_order_no integer,
  matched_payment_id uuid references payments(id),
  outcome text not null,                   -- 'matched' | 'ambiguous' | 'not_found' | 'unparsed' | 'ignored_noise'
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_events_created on payment_events(created_at desc);

-- Standalone admin.komakpay.uz sayti uchun login/parol hisoblari — Telegram initData'ga
-- bog'liq emas. password_hash — bcrypt hash (asl parol matni hech qayerda saqlanmaydi,
-- env'da ham). Yangi hisob qo'shish yoki parolni almashtirish uchun quyidagi
-- `insert ... on conflict do update` qatorlarini tahrirlab qayta deploy qilish kifoya.
create table if not exists admin_accounts (
  id serial primary key,
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into admin_accounts (username, password_hash)
values ('komak@pay20!!!', '$2a$12$EVoUogdDVK7nweULrstf6u64jqLTDSfezwI5mCymhBmRIlV/Rl0v6')
on conflict (username) do update set password_hash = excluded.password_hash, updated_at = now();

-- Web-login sessiya tokenlarini imzolash uchun kalit — env'da qo'lda sozlanmaydi,
-- AdminSessionService birinchi ishga tushganda o'zi tasodifiy kalit generatsiya qilib
-- shu (bitta qatorli) jadvalga yozadi va shu yerdan o'qiydi.
create table if not exists admin_session_keys (
  id boolean primary key default true,
  secret text not null,
  constraint admin_session_keys_singleton check (id)
);

-- Refresh tokenlar (30 kun, har ishlatilganda rotatsiya qilinadi) — asl token emas, uning
-- sha256 hashi saqlanadi. `revoked_at` orqali logout/rotatsiyada eskisi bekor qilinadi.
create table if not exists admin_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id integer not null references admin_accounts(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_refresh_tokens_account on admin_refresh_tokens(account_id);

-- Barcha foydalanuvchilarga yuborilgan xabarlar tarixi (admin panel "Xabar tarixi").
create table if not exists broadcast_messages (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  image_urls text[] not null default '{}',
  status text not null default 'sending', -- 'sending' | 'sent' | 'failed'
  total_recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by bigint not null,          -- admin telegram_id (web-login uchun manfiy sun'iy id)
  created_by_username text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists idx_broadcast_messages_created on broadcast_messages(created_at desc);

-- Admin/tizim harakatlari tarixi: auth (admin login/logout), telefon ulashish, buyurtma
-- (order) qarorlari, o'yin/paket tahriri va h.k. target_* ustunlar "snapshot" sifatida
-- saqlanadi (voqea paytidagi username/telefon) — user keyinchalik o'zgartirsa ham,
-- audit yozuvi o'sha paytdagi holatni ko'rsatishda davom etadi.
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,                                    -- 'auth.admin_login' | 'user.phone_shared' | 'order.approved' | 'game.updated' va h.k.
  actor_type text not null,                                -- 'admin' | 'user' | 'system'
  actor_id text,                                            -- admin_accounts.id yoki telegram_id (matn sifatida)
  actor_username text,
  target_user_id uuid references users(id) on delete set null,
  target_telegram_id text,
  target_username text,
  target_phone text,
  entity_type text,                                         -- 'payment' | 'game' | 'package' | null
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_created on audit_logs(created_at desc);
create index if not exists idx_audit_logs_action on audit_logs(action);
create index if not exists idx_audit_logs_target_user on audit_logs(target_user_id);

-- ---------- O'yinlar tartibi (bir martalik) ----------
-- Bosh sahifada: 1 Free Fire, 2 PUBG Mobile, 3 Mobile Legends, 4 Mobile Legends (RU), keyin qolganlari.
-- Faqat admin hali hech qaysi o'yin tartibini o'zgartirmagan bo'lsa (hammasi 0) qo'llanadi —
-- keyinchalik admin panelda surib o'zgartirilgan tartib har qayta ishga tushishda buzilmaydi.
update games g set sort_order = o.pos
from (values ('freefire', 1), ('pubgm', 2), ('mlbb', 3), ('mlbb_ru', 4), ('genshin', 5), ('hok', 6),
             ('mcgg', 7), ('supersus', 8), ('tgstars', 9), ('tgpremium', 10), ('vpn', 11)) as o(id, pos)
where g.id = o.id
  and not exists (select 1 from games where sort_order <> 0);

-- ---------- To'lov kartasi (boshlang'ich) ----------
-- Foydalanuvchi to'lov ekranida ko'radigan asosiy karta. Idempotent: shu raqamli karta
-- allaqachon bo'lsa qayta qo'shilmaydi. Bank/egasining ismini admin panelda tahrirlash mumkin.
insert into payment_cards (bank_name, card_number, holder_name, is_active, sort_order)
select 'Humo', '9860 3501 4814 2986', 'UZDI ORG', true, 0
where not exists (
  select 1 from payment_cards where replace(card_number, ' ', '') = '9860350148142986'
);
