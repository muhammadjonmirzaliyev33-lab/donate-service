import { formatSom } from '../../store'
import { gameArtHtml, iconHtml } from '../../icons'
import { openSheet, closeSheet, showToast, confirmSheet } from '../../components/sheet'
import {
  createGame,
  createPackage,
  deleteGame,
  deletePackage,
  getAdminGame,
  getAdminGames,
  getSupplierAccount,
  getSupplierCatalog,
  getSupplierCategories,
  getMoogoldAccount,
  getMoogoldProducts,
  getMoogoldVariations,
  getCoinDropAccount,
  getCoinDropGames,
  getCoinDropProducts,
  updateGame,
  updatePackage,
  uploadGameImage,
  MOOGOLD_CATEGORIES,
  type AdminGameDto,
  type AdminPackageDto
} from '../../admin/api'
import { adminErrorHtml, adminShellHtml, ADMIN_LOADING_HTML, scrollActiveAdminTabIntoView } from '../../admin/layout'
import { haptic } from '../../telegram'

let selectedGameId: string | null = null

export function renderAdminCatalog(root: HTMLElement) {
  selectedGameId = null
  root.innerHTML = adminShellHtml('catalog', ADMIN_LOADING_HTML)
  scrollActiveAdminTabIntoView(root)
  load(root)
}

async function load(root: HTMLElement) {
  const body = root.querySelector<HTMLElement>('#admin-body')!
  try {
    if (selectedGameId) {
      const game = await getAdminGame(selectedGameId)
      body.innerHTML = gameDetailHtml(game)
      attachGameDetailActions(root, game)
    } else {
      const games = await getAdminGames()
      body.innerHTML = gamesListHtml(games)
      attachGamesListActions(root, games)
      loadSupplierBalance(root)
    }
  } catch (err) {
    body.innerHTML = adminErrorHtml(err)
  }
}

// ---------- O'yinlar ro'yxati ----------

/** Har ikkala yetkazib beruvchi balansini o'yinlar ro'yxati ustida ko'rsatadi. */
async function loadSupplierBalance(root: HTMLElement) {
  const el = root.querySelector<HTMLElement>('#supplier-balance')
  if (!el) return
  const [paycore, moogold, coindrop] = await Promise.all([
    getSupplierAccount().catch(() => null),
    getMoogoldAccount().catch(() => null),
    getCoinDropAccount().catch(() => null)
  ])
  el.textContent = `${describeSupplier('PayCore', paycore)} · ${describeSupplier('MooGold', moogold)} · ${describeSupplier('CoinDrop', coindrop)}`
}

function describeSupplier(name: string, account: { enabled: boolean; balance?: string; currency?: string; error?: string } | null): string {
  if (!account) return `${name}: holatini olib bo'lmadi`
  if (!account.enabled) return `${name}: ulanmagan`
  if (account.error) return `${name}: xato — ${account.error}`
  return `${name}: ${account.balance} ${account.currency}`
}

function gamesListHtml(games: AdminGameDto[]): string {
  return `
    <div class="section-head">
      <h2>O'yinlar (${games.length})</h2>
      <button class="link-btn" id="add-game">${iconHtml('plus')} Yangi</button>
    </div>
    <div class="hint-box" id="supplier-balance" style="margin-bottom:10px">PayCore holati tekshirilmoqda…</div>
    <div class="hint-box" style="margin-bottom:10px">O'yinni bosib ~yarim soniya ushlab turing, keyin tepaga/pastga sudrab tartibini o'zgartiring</div>
    <div class="list-card" id="games-list">
      ${gameRowsHtml(games)}
    </div>
    <div class="sheet-actions" style="padding:14px 16px 0">
      <button class="btn btn-accent btn-block" id="save-order" disabled>${iconHtml('save')} Tartibni saqlash</button>
    </div>
  `
}

function gameRowsHtml(games: AdminGameDto[]): string {
  return games
    .map(
      (g) => `
    <div class="list-row" data-game="${g.id}">
      <div class="list-row-icon" style="background:${g.gradient}">${gameArtHtml(g)}</div>
      <div class="list-row-text">
        <div class="list-row-title">${g.name} ${g.isActive ? '' : '<span style="color:var(--text-faint)">(nofaol)</span>'}</div>
        <div class="list-row-sub">${g.category || g.currencyName}</div>
      </div>
      <div class="drag-handle">${iconHtml('gripVertical')}</div>
    </div>
  `
    )
    .join('')
}

const LONG_PRESS_MS = 300
const MOVE_CANCEL_THRESHOLD = 10

function attachGamesListActions(root: HTMLElement, games: AdminGameDto[]) {
  root.querySelector('#add-game')?.addEventListener('click', () => openGameForm(root))

  const originalOrder = games.map((g) => g.id).join(',')
  const listEl = root.querySelector<HTMLElement>('#games-list')!
  const saveBtn = root.querySelector<HTMLButtonElement>('#save-order')!

  let longPressTimer: number | null = null
  let dragging = false
  let draggedId: string | null = null
  let suppressNextClick = false

  function clearTimer() {
    if (longPressTimer) {
      window.clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  function isDirty(): boolean {
    return Array.from(listEl.querySelectorAll<HTMLElement>('[data-game]'))
      .map((r) => r.dataset.game)
      .join(',') !== originalOrder
  }

  function updateSaveBar() {
    // Tugma doim ko'rinib turadi — tartib o'zgarmaguncha o'chirilgan (xira, cursor: not-allowed).
    saveBtn.disabled = !isDirty()
  }

  function computeInsertBefore(clientY: number, exclude: HTMLElement): HTMLElement | null {
    const rows = Array.from(listEl.querySelectorAll<HTMLElement>('[data-game]')).filter((r) => r !== exclude)
    for (const row of rows) {
      const rect = row.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) return row
    }
    return null
  }

  /**
   * FLIP animatsiyasi: joy almashganda boshqa qatorlar "sakrab" emas, silliq surilib
   * o'z o'rniga boradi — avval eski pozitsiyalar o'lchanadi, DOM o'zgargach har bir
   * qator eski joyidan yangi joyiga transform bilan yurgiziladi.
   */
  function moveRowAnimated(row: HTMLElement, before: HTMLElement | null) {
    const rows = Array.from(listEl.querySelectorAll<HTMLElement>('[data-game]'))
    const firstTops = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]))

    if (before) listEl.insertBefore(row, before)
    else listEl.appendChild(row)

    for (const r of rows) {
      if (r === row) continue // sudralayotgan qator barmoq ostida — uni animatsiya qilmaymiz
      const delta = (firstTops.get(r) ?? 0) - r.getBoundingClientRect().top
      if (!delta) continue
      r.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
        { duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      )
    }
  }

  function startPress(row: HTMLElement, handle: HTMLElement, e: PointerEvent) {
    if (e.button !== undefined && e.button !== 0) return
    const startY = e.clientY
    const gameId = row.dataset.game!
    clearTimer()

    longPressTimer = window.setTimeout(() => {
      longPressTimer = null
      dragging = true
      draggedId = gameId
      suppressNextClick = true
      haptic('medium') // Telegram ichida — "ko'tarildi" his qilinsin
      row.classList.add('dragging')
      try {
        handle.setPointerCapture(e.pointerId)
      } catch {
        /* ba'zi brauzerlarda pointer capture ishlamasligi mumkin — sudrash baribir ishlayveradi */
      }
    }, LONG_PRESS_MS)

    const onMove = (ev: PointerEvent) => {
      if (dragging && draggedId === gameId) {
        const before = computeInsertBefore(ev.clientY, row)
        // Joy haqiqatan o'zgargandagina qo'zg'atamiz — har pixel harakatida emas
        if (before !== row.nextElementSibling) {
          moveRowAnimated(row, before)
          updateSaveBar()
        }
        return
      }
      if (Math.abs(ev.clientY - startY) > MOVE_CANCEL_THRESHOLD) {
        clearTimer() // scroll qilish niyati — uzoq bosishni bekor qilamiz
      }
    }

    const onUp = () => {
      clearTimer()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      if (dragging && draggedId === gameId) {
        row.classList.remove('dragging')
        dragging = false
        draggedId = null
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  root.querySelectorAll<HTMLElement>('[data-game]').forEach((row) => {
    const handle = row.querySelector<HTMLElement>('.drag-handle')!
    handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
      startPress(row, handle, e)
    })
    handle.addEventListener('click', (e) => e.stopPropagation())
    row.addEventListener('click', () => {
      if (suppressNextClick) {
        suppressNextClick = false
        return
      }
      selectedGameId = row.dataset.game!
      load(root)
    })
  })

  saveBtn.addEventListener('click', async () => {
    const orderedIds = Array.from(listEl.querySelectorAll<HTMLElement>('[data-game]')).map((r) => r.dataset.game!)
    saveBtn.disabled = true
    saveBtn.textContent = 'Saqlanmoqda…'
    try {
      await Promise.all(orderedIds.map((id, i) => updateGame(id, { sortOrder: i })))
      showToast('Tartib saqlandi')
      load(root)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Xatolik yuz berdi")
      saveBtn.disabled = false
      saveBtn.innerHTML = `${iconHtml('save')} Tartibni saqlash`
    }
  })
}

// ---------- Bitta o'yin: ma'lumot + paketlar ----------

function gameDetailHtml(game: Awaited<ReturnType<typeof getAdminGame>>): string {
  return `
    <div class="back-header">
      <button class="back-btn" id="back-to-games">${iconHtml('arrowLeft')} O'yinlar</button>
    </div>
    <div class="game-header">
      <div class="game-header-art" style="background:${game.gradient}">${gameArtHtml(game)}</div>
      <div>
        <div class="game-header-name">${game.name} ${game.isActive ? '' : '(nofaol)'}</div>
        <div class="game-header-cat">${game.category || game.currencyName}</div>
      </div>
    </div>
    <div class="sheet-actions" style="flex-direction:row;padding:0 16px 14px">
      <button class="btn btn-soft" style="flex:1" id="edit-game">${iconHtml('save')} Tahrirlash</button>
      <button class="btn btn-soft" style="flex:1" id="toggle-game">${game.isActive ? "O'chirish" : 'Yoqish'}</button>
    </div>

    <div class="section-head">
      <h2>Paketlar (${game.packages.length})</h2>
      <button class="link-btn" id="add-package">${iconHtml('plus')} Yangi</button>
    </div>
    <div class="pkg-grid">
      ${game.packages
        .map(
          (p) => `
        <div class="pkg-card ${p.isActive ? '' : 'top'}" data-pkg="${p.id}" style="${p.isActive ? '' : 'opacity:.5'}">
          <div class="pkg-amount">${iconHtml('gem')} ${p.label}</div>
          ${p.bonus ? `<div class="pkg-bonus">+${p.bonus} bonus</div>` : ''}
          <div class="pkg-price">${formatSom(p.price)}</div>
        </div>
      `
        )
        .join('')}
    </div>
  `
}

function attachGameDetailActions(root: HTMLElement, game: Awaited<ReturnType<typeof getAdminGame>>) {
  root.querySelector('#back-to-games')?.addEventListener('click', () => {
    selectedGameId = null
    load(root)
  })
  root.querySelector('#edit-game')?.addEventListener('click', () => openGameForm(root, game))
  root.querySelector('#toggle-game')?.addEventListener('click', async () => {
    await updateGame(game.id, { isActive: !game.isActive })
    load(root)
  })
  root.querySelector('#add-package')?.addEventListener('click', () => openPackageForm(root, game))
  root.querySelectorAll<HTMLElement>('[data-pkg]').forEach((card) => {
    card.addEventListener('click', () => {
      const pkg = game.packages.find((p) => p.id === card.dataset.pkg)
      if (pkg) openPackageForm(root, game, pkg)
    })
  })
}

// ---------- Forma: o'yin qo'shish/tahrirlash ----------

function openGameForm(root: HTMLElement, existing?: AdminGameDto) {
  const html = `
    <div class="sheet-grabber"></div>
    <div class="sheet-title">${existing ? "O'yinni tahrirlash" : 'Yangi o\'yin'}</div>
    <div class="field-group">
      ${!existing ? `<div class="field-label"><span>ID (slug, masalan "pubgm")</span></div><input class="input" id="f-id" placeholder="pubgm" style="margin-bottom:10px" />` : ''}
      <div class="field-label"><span>Nomi</span></div>
      <input class="input" id="f-name" placeholder="PUBG Mobile" value="${existing?.name ?? ''}" style="margin-bottom:10px" />
      <div class="field-label"><span>Kategoriya (ekranda ko'rinadi)</span></div>
      <input class="input" id="f-category" placeholder="UC / Diamonds" value="${existing?.category ?? ''}" style="margin-bottom:10px" />
      <div class="field-label"><span>Valyuta nomi</span></div>
      <input class="input" id="f-currency" placeholder="UC" value="${existing?.currencyName ?? ''}" style="margin-bottom:10px" />
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-dim)">
        <input type="checkbox" id="f-server" ${existing?.requiresServer ? 'checked' : ''} /> Server ID talab qilinadi
      </label>
      <div class="field-label" style="margin-top:10px"><span>Yetkazib beruvchi</span></div>
      <select class="input" id="f-provider" style="margin-bottom:10px">
        <option value="paycore" ${(existing?.supplierProvider ?? 'paycore') === 'paycore' ? 'selected' : ''}>PayCore</option>
        <option value="moogold" ${existing?.supplierProvider === 'moogold' ? 'selected' : ''}>MooGold</option>
        <option value="coindrop" ${existing?.supplierProvider === 'coindrop' ? 'selected' : ''}>CoinDrop</option>
      </select>

      <div id="paycore-fields">
        <div class="field-label"><span>PayCore kategoriyasi (ixtiyoriy)</span></div>
        <select class="input" id="f-supplier-category" style="margin-bottom:10px">
          <option value="">Yuklanmoqda…</option>
        </select>
      </div>

      <div id="moogold-fields">
        <div class="field-label"><span>MooGold bo'limi</span></div>
        <select class="input" id="f-mg-category" style="margin-bottom:10px">
          ${MOOGOLD_CATEGORIES.map((c) => `<option value="${c.id}">${c.title}</option>`).join('')}
        </select>
        <div class="field-label"><span>MooGold o'yini (mahsulot)</span></div>
        <select class="input" id="f-mg-product" style="margin-bottom:10px">
          <option value="">Yuklanmoqda…</option>
        </select>
        <div class="field-label"><span>Buyurtma turi</span></div>
        <select class="input" id="f-mg-order-category" style="margin-bottom:10px">
          <option value="1" ${(existing?.supplierOrderCategory ?? 1) === 1 ? 'selected' : ''}>1 — Direct Top Up</option>
          <option value="2" ${existing?.supplierOrderCategory === 2 ? 'selected' : ''}>2 — eVoucher</option>
        </select>
      </div>

      <div id="coindrop-fields">
        <div class="field-label"><span>CoinDrop o'yini</span></div>
        <select class="input" id="f-cd-game" style="margin-bottom:10px">
          <option value="">Yuklanmoqda…</option>
        </select>
      </div>

      <div class="hint-box" style="margin-bottom:10px">Tanlansa — xarid oldidan playerId shu orqali tekshiriladi. Paketlarga alohida mahsulot qo'shish uchun avval shuni tanlab saqlang.</div>
      <div class="field-label" style="margin-top:10px"><span>Muqova rasmi (ixtiyoriy)</span></div>
      ${existing?.icon && existing.icon.startsWith('http') ? `<img src="${existing.icon}" style="width:100%;max-height:120px;object-fit:cover;border-radius:12px;margin-bottom:8px" />` : ''}
      <input class="input" id="f-image" type="file" accept="image/*" style="padding:10px" />
      ${existing ? `<button class="btn btn-soft btn-block" id="remove-game" style="margin-top:10px;color:var(--danger)">${iconHtml('x')} Butunlay o'chirish</button>` : ''}
    </div>
    <div class="sheet-actions">
      <button class="btn btn-accent btn-block" id="save-game">Saqlash</button>
      <button class="btn btn-soft btn-block" id="close-sheet">Yopish</button>
    </div>
  `
  const overlay = openSheet(html)
  overlay.querySelector('#close-sheet')!.addEventListener('click', closeSheet)

  const categorySelect = overlay.querySelector<HTMLSelectElement>('#f-supplier-category')!
  getSupplierCategories()
    .then(({ categories }) => {
      categorySelect.innerHTML =
        `<option value="">— Bog'lanmagan (qo'lda yetkaziladi) —</option>` +
        categories
          .map((c) => `<option value="${c.slug}" ${c.slug === existing?.supplierCategory ? 'selected' : ''}>${c.title}</option>`)
          .join('')
    })
    .catch(() => {
      categorySelect.innerHTML = `<option value="">PayCore ulanmagan</option>`
    })

  // ---- Provayder almashtirish + MooGold/CoinDrop mahsulot ro'yxati ----
  const providerSelect = overlay.querySelector<HTMLSelectElement>('#f-provider')!
  const paycoreFields = overlay.querySelector<HTMLElement>('#paycore-fields')!
  const moogoldFields = overlay.querySelector<HTMLElement>('#moogold-fields')!
  const coindropFields = overlay.querySelector<HTMLElement>('#coindrop-fields')!
  const mgCategorySelect = overlay.querySelector<HTMLSelectElement>('#f-mg-category')!
  const mgProductSelect = overlay.querySelector<HTMLSelectElement>('#f-mg-product')!
  const mgOrderCategorySelect = overlay.querySelector<HTMLSelectElement>('#f-mg-order-category')!
  const cdGameSelect = overlay.querySelector<HTMLSelectElement>('#f-cd-game')!

  function applyProviderVisibility() {
    const provider = providerSelect.value
    paycoreFields.style.display = provider === 'paycore' ? '' : 'none'
    moogoldFields.style.display = provider === 'moogold' ? '' : 'none'
    coindropFields.style.display = provider === 'coindrop' ? '' : 'none'
  }
  providerSelect.addEventListener('change', () => {
    applyProviderVisibility()
    if (providerSelect.value === 'moogold') loadMoogoldProducts()
    if (providerSelect.value === 'coindrop') loadCoinDropGames()
  })
  applyProviderVisibility()

  function loadMoogoldProducts() {
    mgProductSelect.innerHTML = `<option value="">Yuklanmoqda…</option>`
    getMoogoldProducts(Number(mgCategorySelect.value))
      .then(({ products }) => {
        mgProductSelect.innerHTML =
          `<option value="">— Bog'lanmagan (qo'lda yetkaziladi) —</option>` +
          products
            .map((p) => `<option value="${p.ID}" ${p.ID === existing?.supplierCategory ? 'selected' : ''}>${p.post_title}</option>`)
            .join('')
      })
      .catch(() => {
        mgProductSelect.innerHTML = `<option value="">Ro'yxatni olib bo'lmadi</option>`
      })
  }
  mgCategorySelect.addEventListener('change', loadMoogoldProducts)
  if (providerSelect.value === 'moogold') loadMoogoldProducts()

  function loadCoinDropGames() {
    cdGameSelect.innerHTML = `<option value="">Yuklanmoqda…</option>`
    getCoinDropGames()
      .then(({ games }) => {
        cdGameSelect.innerHTML =
          `<option value="">— Bog'lanmagan (qo'lda yetkaziladi) —</option>` +
          games
            .map(
              (g) =>
                `<option value="${g.key}" ${g.key === existing?.supplierCategory ? 'selected' : ''}>${g.name}${g.requires_server ? ` (${g.server_label || 'server'})` : ''}</option>`
            )
            .join('')
      })
      .catch(() => {
        cdGameSelect.innerHTML = `<option value="">Ro'yxatni olib bo'lmadi</option>`
      })
  }
  if (providerSelect.value === 'coindrop') loadCoinDropGames()

  overlay.querySelector('#remove-game')?.addEventListener('click', async () => {
    const ok = await confirmSheet({
      title: "Butunlay o'chirilsinmi?",
      message: `"${existing!.name}" va uning barcha paketlari butunlay o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi.`,
      confirmLabel: "O'chirish",
      danger: true
    })
    if (!ok) return
    await deleteGame(existing!.id)
    selectedGameId = null
    closeSheet()
    load(root)
  })
  overlay.querySelector('#save-game')!.addEventListener('click', async () => {
    const name = (overlay.querySelector('#f-name') as HTMLInputElement).value.trim()
    const category = (overlay.querySelector('#f-category') as HTMLInputElement).value.trim()
    const currencyName = (overlay.querySelector('#f-currency') as HTMLInputElement).value.trim()
    const requiresServer = (overlay.querySelector('#f-server') as HTMLInputElement).checked
    const supplierProvider = providerSelect.value as 'paycore' | 'moogold' | 'coindrop'
    const supplierCategory =
      (supplierProvider === 'moogold' ? mgProductSelect.value : supplierProvider === 'coindrop' ? cdGameSelect.value : categorySelect.value) ||
      null
    const supplierOrderCategory = supplierProvider === 'moogold' ? Number(mgOrderCategorySelect.value) : null

    if (!name || !currencyName) {
      showToast("Nomi va valyuta nomini kiriting")
      return
    }

    const imageFile = (overlay.querySelector('#f-image') as HTMLInputElement | null)?.files?.[0]

    try {
      if (existing) {
        await updateGame(existing.id, { name, category, currencyName, requiresServer, supplierCategory, supplierProvider, supplierOrderCategory })
        if (imageFile) await uploadGameImage(existing.id, imageFile)
      } else {
        const id = (overlay.querySelector('#f-id') as HTMLInputElement).value.trim()
        if (!/^[a-z0-9_]+$/.test(id)) {
          showToast("ID faqat kichik lotin harflar, raqam va '_' bo'lishi kerak")
          return
        }
        await createGame({ id, name, category, currencyName, requiresServer, supplierCategory, supplierProvider, supplierOrderCategory })
        // Rasm ham tanlangan bo'lsa — yaratilgan zahoti darhol yuklaymiz (alohida
        // "tahrirlash orqali qo'shish" bosqichi endi shart emas).
        if (imageFile) await uploadGameImage(id, imageFile)
        selectedGameId = id
      }
      closeSheet()
      load(root)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Xatolik yuz berdi")
    }
  })
}

// ---------- Forma: paket qo'shish/tahrirlash ----------

function openPackageForm(root: HTMLElement, game: AdminGameDto, existing?: AdminPackageDto) {
  // VPN'da PayCore katalogida alohida slug yo'q (parametrik: oy+qurilma bilan buyurtma
  // qilinadi) — shuning uchun bu o'yin uchun "Miqdor" maydoni oy sonini bildiradi va
  // qo'shimcha "Qurilmalar soni" maydoni chiqadi, PayCore mahsulot tanlovi esa yashiriladi.
  const isVpn = game.supplierCategory === 'vpn'
  const html = `
    <div class="sheet-grabber"></div>
    <div class="sheet-title">${existing ? 'Paketni tahrirlash' : 'Yangi paket'}</div>
    <div class="field-group">
      <div class="field-label"><span>Nomi (masalan "${isVpn ? '3 oy / 2 qurilma' : '60 UC'}")</span></div>
      <input class="input" id="f-label" value="${existing?.label ?? ''}" style="margin-bottom:10px" />
      <div class="id-row" style="margin-bottom:10px">
        <input class="input" id="f-amount" type="number" placeholder="${isVpn ? 'Oy soni (1/3/6/12)' : 'Miqdor'}" value="${existing?.amount ?? ''}" />
        <input class="input" id="f-price" type="number" placeholder="Narx (so'm)" value="${existing?.price ?? ''}" />
      </div>
      ${
        isVpn
          ? `<div class="field-label"><span>Qurilmalar soni</span></div>
             <input class="input" id="f-extra-qty" type="number" min="1" placeholder="1" value="${existing?.extraQty ?? 1}" style="margin-bottom:10px" />`
          : ''
      }
      <div class="field-label"><span>Guruh (filter chip nomi)</span></div>
      <input class="input" id="f-group" placeholder="Barchasi" value="${existing?.groupName ?? 'Barchasi'}" style="margin-bottom:10px" />
      ${
        isVpn
          ? ''
          : `<div class="field-label"><span>${game.supplierProvider === 'moogold' ? 'MooGold varianti' : game.supplierProvider === 'coindrop' ? 'CoinDrop mahsuloti' : 'PayCore mahsuloti'} (ixtiyoriy)</span></div>
      ${
        game.supplierCategory
          ? `<select class="input" id="f-supplier-slug" style="margin-bottom:10px"><option value="">Yuklanmoqda…</option></select>`
          : `<div class="hint-box" style="margin-bottom:10px">Avval o'yin sozlamalarida yetkazib beruvchi va mahsulotni tanlang (Tahrirlash → Yetkazib beruvchi)</div>`
      }`
      }
      ${
        existing
          ? `<button class="btn btn-soft btn-block" id="delete-package" style="color:var(--danger)">${iconHtml('x')} Paketni o'chirish</button>`
          : ''
      }
    </div>
    <div class="sheet-actions">
      <button class="btn btn-accent btn-block" id="save-package">Saqlash</button>
      <button class="btn btn-soft btn-block" id="close-sheet">Yopish</button>
    </div>
  `
  const overlay = openSheet(html)
  overlay.querySelector('#close-sheet')!.addEventListener('click', closeSheet)

  const slugSelect = overlay.querySelector<HTMLSelectElement>('#f-supplier-slug')
  const emptyOption = `<option value="">— Bog'lanmagan (qo'lda yetkaziladi) —</option>`
  if (slugSelect && game.supplierCategory) {
    const loadFailed = () => {
      slugSelect.innerHTML = `<option value="">Ro'yxatni olib bo'lmadi</option>`
    }
    if (game.supplierProvider === 'moogold') {
      // MooGold'da paket = mahsulotning varianti (variation_id).
      getMoogoldVariations(game.supplierCategory)
        .then(({ variations }) => {
          slugSelect.innerHTML =
            emptyOption +
            variations
              .map((v) => {
                const id = String(v.variation_id)
                const outOfStock = v.stock_status && v.stock_status !== 'instock' ? ' (tugagan)' : ''
                return `<option value="${id}" ${id === existing?.supplierSlug ? 'selected' : ''}>${v.variation_name} — ${v.variation_price} USD${outOfStock}</option>`
              })
              .join('')
        })
        .catch(loadFailed)
    } else if (game.supplierProvider === 'coindrop') {
      getCoinDropProducts(game.supplierCategory)
        .then(({ products }) => {
          slugSelect.innerHTML =
            emptyOption +
            products
              .map((p) => `<option value="${p.id}" ${p.id === existing?.supplierSlug ? 'selected' : ''}>${p.name} — ${p.price_usd} USD</option>`)
              .join('')
        })
        .catch(loadFailed)
    } else {
      getSupplierCatalog(game.supplierCategory)
        .then(({ products }) => {
          slugSelect.innerHTML =
            emptyOption +
            products
              .map(
                (p) =>
                  `<option value="${p.slug}" ${p.slug === existing?.supplierSlug ? 'selected' : ''}>${p.title} — ${p.price_usdt} USDT${p.in_stock <= 0 ? " (tugagan)" : ''}</option>`
              )
              .join('')
        })
        .catch(loadFailed)
    }
  }

  overlay.querySelector('#delete-package')?.addEventListener('click', async () => {
    if (!existing) return
    const ok = await confirmSheet({ title: "Paketni o'chirish kerakmi?", confirmLabel: "O'chirish", danger: true })
    if (!ok) return
    await deletePackage(existing.id)
    closeSheet()
    load(root)
  })

  overlay.querySelector('#save-package')!.addEventListener('click', async () => {
    const label = (overlay.querySelector('#f-label') as HTMLInputElement).value.trim()
    const amount = Number((overlay.querySelector('#f-amount') as HTMLInputElement).value)
    const price = Number((overlay.querySelector('#f-price') as HTMLInputElement).value)
    const groupName = (overlay.querySelector('#f-group') as HTMLInputElement).value.trim() || 'Barchasi'
    const supplierSlug = slugSelect ? slugSelect.value || null : null
    const extraQtyInput = overlay.querySelector<HTMLInputElement>('#f-extra-qty')
    const extraQty = extraQtyInput ? Number(extraQtyInput.value) || 1 : null

    if (!label || !amount || !price) {
      showToast("Nomi, miqdor va narxni to'g'ri kiriting")
      return
    }

    try {
      if (existing) {
        await updatePackage(existing.id, { label, amount, price, groupName, supplierSlug, extraQty })
      } else {
        await createPackage(game.id, { label, amount, price, groupName, supplierSlug, extraQty })
      }
      closeSheet()
      load(root)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Xatolik yuz berdi")
    }
  })
}
