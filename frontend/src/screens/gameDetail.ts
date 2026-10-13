import { formatSom, saveGameId, t, tCategory } from '../store'
import { openCheckoutSheet } from '../components/paymentFlow'
import { showToast } from '../components/sheet'
import { gameArtHtml, iconHtml } from '../icons'
import { getGameDetail, verifyPlayer, type GameWithPackagesDto, type PackageDto } from '../api'

export function renderGameDetail(root: HTMLElement, gameId: string) {
  root.innerHTML = `<div class="empty-state"><p>${t('loadingText')}</p></div>`

  getGameDetail(gameId)
    .then((game) => mountGame(root, game))
    .catch(() => {
      root.innerHTML = `<div class="empty-state"><div class="icon">${iconHtml('circleOff')}</div><h3>${t('gameNotFound')}</h3></div>`
    })
}

function mountGame(root: HTMLElement, g: GameWithPackagesDto) {
  // Telegram Stars/Premium — raqamli player_id emas, Telegram username yuboriladi
  // (masalan "@durov"). VPN'da esa umuman identifikator so'ralmaydi (faqat oy/qurilma
  // soni). Qaysi turi kerakligini server `playerIdKind`da aytib yuboradi.
  const usesUsername = g.playerIdKind === 'username'
  const noAccount = g.playerIdKind === 'none'
  const groups = Array.from(new Set(g.packages.map((p) => p.groupName))).filter((x) => x !== 'Barchasi')
  // Kategoriyalar tartibi: Olmoslar -> Voucher -> Level Up -> Bundle -> qolganlari -> Barchasi (oxirida).
  const groupRank = (name: string): number => {
    const n = name.toLowerCase()
    if (n.startsWith('olmos') || n.startsWith('almaz') || n.includes('diamond')) return 0
    if (n.includes('voucher') || n.includes('vaucher')) return 1
    if (n.includes('level')) return 2
    if (n.includes('bundle')) return 3
    return 4
  }
  const ordered = groups
    .map((name, i) => ({ name, i }))
    .sort((a, b) => groupRank(a.name) - groupRank(b.name) || a.i - b.i)
    .map((x) => x.name)
  const filters = ordered.length > 1 ? [...ordered, 'Barchasi'] : []

  // Sahifa ochilganda birinchi kategoriya (odatda Olmoslar) tanlangan bo'ladi.
  let filter = filters[0] ?? 'Barchasi'
  let playerId = ''
  let server = ''
  let saveId = true
  let selectedPkg: PackageDto | null = null
  let checkState: 'idle' | 'checking' | 'ok' | 'error' = 'idle'
  let foundNickname: string | null = null
  let alreadyPremium = false
  let missingServer = false

  const packages = () => (filter === 'Barchasi' ? g.packages : g.packages.filter((p) => p.groupName === filter))

  function bottomLabel(): { label: string; disabled: boolean } {
    if (!selectedPkg) return { label: t('selectPackage'), disabled: true }
    if (!noAccount && !playerId.trim()) return { label: t('enterIdShort'), disabled: true }
    return { label: `${t('payWith')} ${formatSom(selectedPkg.price)}`, disabled: false }
  }

  function html(): string {
    const bl = bottomLabel()
    return `
      <div class="game-hero" style="background:${g.gradient}">
        ${g.icon && /^https?:\/\//.test(g.icon) ? `<img src="${g.icon}" alt="" />` : ''}
        <div class="game-hero-fade"></div>
        <button class="round-btn" id="back" aria-label="${t('backPlain')}">${iconHtml('arrowLeft', '', 18)}</button>
        <h1 class="game-hero-name">${g.name}</h1>
      </div>

      ${
        filters.length > 1
          ? `<div class="chip-row">
              ${filters.map((f) => `<div class="chip ${f === filter ? 'active' : ''}" data-filter="${f}">${tCategory(f)}</div>`).join('')}
            </div>`
          : ''
      }

      <div class="sub-head">${t('chooseDenomination')}</div>
      <div class="pkg-grid">
        ${packages()
        .map(
          (p) => `
          <div class="pkg-card ${selectedPkg?.id === p.id ? 'selected' : ''} ${p.badge === 'top' ? 'top' : ''}" data-pkg="${p.id}">
            <div class="pkg-art">${p.icon ? `<img src="${p.icon}" alt="" loading="lazy" />` : iconHtml('gem', '', 22)}</div>
            <div class="pkg-info">
              <div class="pkg-amount">${tCategory(p.label)}${p.badge === 'x2' ? ' <span class="pkg-tag">×2</span>' : ''}${p.badge === 'top' ? ' <span class="pkg-tag top">TOP</span>' : ''}</div>
              ${p.bonus ? `<div class="pkg-bonus">${p.amount - p.bonus} + ${p.bonus} ${t('bonusSuffix')}</div>` : ''}
              <div class="pkg-price">${formatSom(p.price)}</div>
            </div>
          </div>`
        )
        .join('')}
      </div>

      ${
        noAccount || !selectedPkg
          ? ''
          : `
      <div class="field-group" id="account-section" style="margin-top:20px">
        <div class="field-label">
          <span>${usesUsername ? t('telegramUsernameLabel') : t('accountLabel')}</span>
          <button class="save-toggle ${saveId ? '' : 'off'}" id="save-toggle">${iconHtml('save')} ${saveId ? t('idSave') : t('idNoSave')}</button>
        </div>
        <div class="id-row">
          ${
            usesUsername
              ? `<input class="input" id="player-id" placeholder="username" value="${playerId}" autocapitalize="off" autocorrect="off" />`
              : `<input class="input" id="player-id" placeholder="123456789" value="${playerId}" inputmode="numeric" pattern="[0-9]*" />`
          }
          ${
            g.requiresServer
              ? g.serverOptions
                ? `<select class="input" id="server-id">${g.serverOptions.map((o) => `<option value="${o.value}" ${o.value === server ? 'selected' : ''}>${o.label}</option>`).join('')}</select>`
                : `<input class="input" id="server-id" placeholder="${t('serverLabel')}" value="${server}" inputmode="numeric" pattern="[0-9]*" />`
              : ''
          }
        </div>
      </div>

      <button class="check-btn" id="check-account" ${checkState === 'checking' ? 'disabled' : ''}>${iconHtml('search')} ${t('checkAccountPlain')}</button>

      ${checkHintHtml()}
      `
      }

      <div class="sticky-bar">
        <button class="btn btn-accent btn-block" id="pay-btn" ${bl.disabled ? 'disabled' : ''}>${bl.label}</button>
      </div>
    `
  }

  function checkHintHtml(): string {
    if (checkState === 'idle') return `<div class="hint-box">${t(usesUsername ? 'enterUsernameHint' : g.requiresServer ? 'enterIdHint' : 'enterIdHintNoServer')}</div>`
    if (checkState === 'checking') return `<div class="hint-box">${t('checkingHint')}</div>`
    if (checkState === 'error') return `<div class="hint-box error">${t(missingServer ? 'missingServerError' : 'errorHint')}</div>`
    if (alreadyPremium) {
      return `<div class="hint-box error">${t('premiumAlreadyActive').replace('{nickname}', `<b>${foundNickname}</b>`)}</div>`
    }
    return `<div class="hint-box success">${foundNickname ? `✅ ${t('foundLabel')}: <b>${foundNickname}</b>` : t('successHint')}</div>`
  }

  function mount() {
    root.innerHTML = html()

    root.querySelector('#back')!.addEventListener('click', () => (location.hash = '#/games'))

    root.querySelectorAll<HTMLElement>('[data-filter]').forEach((chip) => {
      chip.addEventListener('click', () => {
        filter = chip.dataset.filter!
        selectedPkg = null
        mount()
      })
    })

    const idInput = root.querySelector<HTMLInputElement>('#player-id')
    idInput?.addEventListener('input', () => {
      if (usesUsername) {
        // Telegram username: harflar/raqam/'_' , boshidagi '@' ni o'zi kiritsa ham qabul qilamiz.
        const cleaned = idInput.value.replace(/[^A-Za-z0-9_@]/g, '')
        if (cleaned !== idInput.value) idInput.value = cleaned
        playerId = cleaned.replace(/^@/, '')
      } else {
        const digits = idInput.value.replace(/\D/g, '')
        if (digits !== idInput.value) idInput.value = digits
        playerId = digits
      }
      checkState = 'idle'
      updateBottomBar()
    })

    const serverInput = root.querySelector<HTMLInputElement>('#server-id')
    const serverIsFreeText = serverInput?.tagName === 'INPUT'
    serverInput?.addEventListener('input', () => {
      if (serverIsFreeText) {
        const digits = serverInput.value.replace(/\D/g, '')
        if (digits !== serverInput.value) serverInput.value = digits
        server = digits
      } else {
        server = serverInput.value
      }
    })
    serverInput?.addEventListener('change', () => {
      server = serverInput.value
    })

    root.querySelector('#save-toggle')?.addEventListener('click', () => {
      saveId = !saveId
      mount()
    })

    root.querySelector('#check-account')?.addEventListener('click', async () => {
      if (checkState === 'checking') return // javob kelmaguncha qayta-qayta bosilmasin
      missingServer = false
      if (!playerId.trim()) {
        checkState = 'error'
        mount()
        return
      }
      if (g.requiresServer && !server.trim()) {
        checkState = 'error'
        missingServer = true
        mount()
        return
      }
      checkState = 'checking'
      foundNickname = null
      alreadyPremium = false
      mount()

      // Agar o'yin PayCore'ga bog'langan bo'lsa — playerId REAL tekshiriladi (nickname
      // bilan). Bog'lanmagan bo'lsa (yoki tarmoq xatosi) — faqat format (uzunlik)
      // tekshiriladi, admin xarid vaqtida o'zi ko'rib chiqadi.
      let ok: boolean
      try {
        const result = await verifyPlayer(g.id, playerId, g.requiresServer ? server : undefined)
        if (result.supported) {
          ok = result.found
          foundNickname = result.found ? result.nickname ?? null : null
          alreadyPremium = result.found && !!result.alreadyPremium
        } else {
          ok = playerId.trim().length >= 5
        }
      } catch {
        ok = playerId.trim().length >= 5
      }

      checkState = ok ? 'ok' : 'error'
      if (ok && saveId) {
        saveGameId(g.id, { playerId, server, region: '' })
        showToast(t('idSaved'))
      }
      mount()
    })

    root.querySelectorAll<HTMLElement>('[data-pkg]').forEach((card) => {
      card.addEventListener('click', () => {
        const pkg = g.packages.find((p) => p.id === card.dataset.pkg) ?? null
        const firstPick = !selectedPkg
        selectedPkg = pkg
        mount()
        // Paket tanlangach Player ID qismi pastda ochiladi — o'sha yerga silliq tushiramiz.
        if (firstPick) {
          root.querySelector('#account-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    })

    root.querySelector('#pay-btn')?.addEventListener('click', () => submitPayment())
  }

  function updateBottomBar() {
    const bar = root.querySelector('.sticky-bar')
    if (!bar) return
    const bl = bottomLabel()
    bar.innerHTML = `<button class="btn btn-accent btn-block" id="pay-btn" ${bl.disabled ? 'disabled' : ''}>${bl.label}</button>`
    root.querySelector('#pay-btn')?.addEventListener('click', () => submitPayment())
  }

  function submitPayment() {
    if (!selectedPkg) return
    openCheckoutSheet({
      gameId: g.id,
      gameName: g.name,
      packageId: selectedPkg.id,
      packageLabel: selectedPkg.label,
      price: selectedPkg.price,
      playerId,
      server: g.requiresServer ? server : undefined
    })
  }

  mount()
}
 