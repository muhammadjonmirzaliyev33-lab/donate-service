import { closeSheet, openSheet, sheetRoot, showToast } from './sheet'
import { formatSom, getState, setBalance, t } from '../store'
import {
  ApiError,
  createPurchasePayment,
  createTopupPayment,
  getMe,
  getPayment,
  getPaymentCards,
  getSettings,
  uploadReceipt,
  type PayMethod,
  type PaymentCardDto,
  type PaymentDto
} from '../api'
import { haptic } from '../telegram'
import { iconHtml } from '../icons'

const AMOUNT_PRESETS = [5000, 25000, 50000, 100000, 200000, 500000]
const POLL_INTERVAL_MS = 4000

type Purpose =
  | { kind: 'topup' }
  | {
    kind: 'purchase'
    gameId: string
    gameName: string
    packageId: string
    packageLabel: string
    playerId?: string
    server?: string
  }

// ---------------------------------------------------------------
// STEP 1 — Top-up sheet (amount + method) — matches "Hisobni to'ldirish"
// ---------------------------------------------------------------

export function openTopUpSheet(initialMethod: Exclude<PayMethod, 'balance'> = 'card') {
  let amount = 25000
  let customMode = false
  let method: Exclude<PayMethod, 'balance'> | null = initialMethod
  let submitting = false

  function html(): string {
    return `
      <div class="sheet-grabber"></div>
      <div class="sheet-title">${iconHtml('creditCard')} ${t('topUpSheetTitle')}</div>
      <div class="sheet-sub">${t('chooseMethodSub')}</div>

      <div class="step-header">${t('step1Amount')}</div>
      <div class="step-sub">${t('minAmountHint')}</div>
      <div class="amount-grid">
        ${AMOUNT_PRESETS.map(
      (a) => `<div class="amount-chip ${!customMode && amount === a ? 'active' : ''}" data-amt="${a}">${a.toLocaleString('ru-RU')}</div>`
    ).join('')}
      </div>
      <div class="field-group">
        <input class="input" id="custom-amount" type="number" min="2000" placeholder="${t('customAmountPlaceholder')}" value="${customMode ? amount : ''}" />
      </div>

      <div class="step-header" style="margin-top:6px">${t('step2Method')}</div>
      <div class="step-sub">${t('step2Hint')}</div>
      ${payMethodHtml('card', method === 'card')}
      ${payMethodHtml('atm', method === 'atm')}
      ${payMethodHtml('foreign', method === 'foreign')}

      <div class="sheet-actions">
        <button class="btn btn-accent btn-block" id="go-pay" ${amount < 2000 || !method || submitting ? 'disabled' : ''}>${submitting ? '…' : t('payNow')}</button>
        <button class="btn btn-soft btn-block" id="close-sheet">${t('close')}</button>
      </div>
    `
  }

  function mount() {
    const overlay = openSheet(html())
    overlay.querySelectorAll<HTMLElement>('[data-amt]').forEach((chip) => {
      chip.addEventListener('click', () => {
        amount = Number(chip.dataset.amt)
        customMode = false
        mount()
      })
    })
    const customInput = overlay.querySelector<HTMLInputElement>('#custom-amount')!
    customInput.addEventListener('input', () => {
      customMode = true
      const v = Number(customInput.value)
      amount = isNaN(v) ? 0 : v
      overlay.querySelectorAll('[data-amt]').forEach((c) => c.classList.remove('active'))
      const goBtn = overlay.querySelector<HTMLButtonElement>('#go-pay')!
      goBtn.disabled = amount < 2000 || !method
    })
    overlay.querySelectorAll<HTMLElement>('[data-method]').forEach((row) => {
      row.addEventListener('click', () => {
        method = row.dataset.method as Exclude<PayMethod, 'balance'>
        mount()
      })
    })
    overlay.querySelector('#close-sheet')!.addEventListener('click', closeSheet)
    overlay.querySelector('#go-pay')!.addEventListener('click', async () => {
      if (amount < 2000 || !method || submitting) return
      haptic('medium')
      submitting = true
      mount()
      try {
        const payment = await createTopupPayment(amount, method)
        openWaitingScreen(payment, { kind: 'topup' })
      } catch (err) {
        submitting = false
        mount()
        showToast(err instanceof Error ? err.message : t('genericError'))
      }
    })
  }

  mount()
}

function payMethodHtml(method: PayMethod, active: boolean): string {
  const meta: Record<string, { icon: 'creditCard' | 'landmark' | 'globe'; title: string; sub: string; tag?: string }> = {
    card: { icon: 'creditCard', title: t('payMethodCardTitle'), sub: t('payMethodCardSub'), tag: t('payMethodCardTag') },
    atm: { icon: 'landmark', title: t('payMethodAtmTitle'), sub: t('payMethodAtmSub') },
    foreign: { icon: 'globe', title: t('payMethodForeignTitle'), sub: t('payMethodForeignSub') }
  }
  const m = meta[method]
  return `
    <div class="pay-method ${active ? 'active' : ''}" data-method="${method}">
      <div class="pay-method-icon">${iconHtml(m.icon)}</div>
      <div class="pay-method-text">
        <div class="pay-method-title">${m.title}</div>
        <div class="pay-method-sub">${m.sub}</div>
        ${m.tag ? `<div class="pay-method-tag">${m.tag}</div>` : ''}
      </div>
      <div class="radio-dot">${active ? '✓' : ''}</div>
    </div>
  `
}

// ---------------------------------------------------------------
// Generic method-selection sheet, used for direct (balance-free) purchases
// ---------------------------------------------------------------

export function openMethodSheetForPurchase(purpose: Extract<Purpose, { kind: 'purchase' }>, price: number) {
  let method: Exclude<PayMethod, 'balance'> = 'card'
  let submitting = false

  function html(): string {
    return `
      <div class="sheet-grabber"></div>
      <div class="sheet-title">${iconHtml('shieldCheck')} ${t('directPaymentTitle')}</div>
      <div class="sheet-sub">${purpose.gameName} · ${purpose.packageLabel} · ${formatSom(price)}</div>
      ${payMethodHtml('card', method === 'card')}
      ${payMethodHtml('atm', method === 'atm')}
      ${payMethodHtml('foreign', method === 'foreign')}
      <div class="sheet-actions">
        <button class="btn btn-accent btn-block" id="go-pay" ${submitting ? 'disabled' : ''}>${submitting ? '…' : t('payNow')}</button>
        <button class="btn btn-soft btn-block" id="close-sheet">${t('close')}</button>
      </div>
    `
  }

  function mount() {
    const overlay = openSheet(html())
    overlay.querySelectorAll<HTMLElement>('[data-method]').forEach((row) => {
      row.addEventListener('click', () => {
        method = row.dataset.method as Exclude<PayMethod, 'balance'>
        mount()
      })
    })
    overlay.querySelector('#close-sheet')!.addEventListener('click', closeSheet)
    overlay.querySelector('#go-pay')!.addEventListener('click', async () => {
      if (submitting) return
      haptic('medium')
      submitting = true
      mount()
      try {
        const payment = await createPurchasePayment({
          gameId: purpose.gameId,
          packageId: purpose.packageId,
          method,
          playerInfo: buildPlayerInfo(purpose)
        })
        openWaitingScreen(payment, purpose)
      } catch (err) {
        submitting = false
        mount()
        showToast(err instanceof Error ? err.message : t('genericError'))
      }
    })
  }

  mount()
}

function buildPlayerInfo(purpose: Extract<Purpose, { kind: 'purchase' }>): Record<string, string> {
  const info: Record<string, string> = {}
  if (purpose.playerId) info.playerId = purpose.playerId
  if (purpose.server) info.server = purpose.server
  return info
}

// ---------------------------------------------------------------
// STEP 2 — Kutish ekrani: haqiqiy karta, chek yuklash, jonli holat
// ---------------------------------------------------------------

function purposeAmountLine(purpose: Purpose, amount: number): string {
  if (purpose.kind === 'topup') return `${t('topUpOrderTitle')} · ${formatSom(amount)}`
  return `${purpose.gameName} · ${purpose.packageLabel}`
}

/** Karta raqamini 4talab guruhlab chiroyli ko'rsatadi ("4916 9903 4272 6855") — nusxalashda esa xom raqam ishlatiladi. */
export function formatCardDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits
}

/** Admin paneldan karta qo'shilmagan (yoki API javob bermagan) bo'lsa ko'rsatiladigan asosiy karta. */
const DEFAULT_CARD: PaymentCardDto = {
  id: 'default',
  bankName: 'HUMO',
  cardNumber: '9860606751486139',
  holderName: 'SADRIDDIN SHAYDULOV'
}

/** Shuncha vaqt kutib ham holat o'zgarmasa — "Pul topilmadi" holati va chek yuklash imkoni ko'rsatiladi. */
const SHOW_RECEIPT_OPTION_AFTER_MS = 60_000

function openWaitingScreen(payment: PaymentDto, purpose: Purpose) {
  let cards: PaymentCardDto[] = []
  let avgMinutes: number | null = null
  let current = payment
  let receiptBusy = false
  let showReceiptOption = false
  let checkingNow = false
  const startedAt = Date.now()

  function html(): string {
    if (current.status === 'completed') return doneHtml('completed')
    if (current.status === 'cancelled') return doneHtml('cancelled')
    if (current.status === 'expired') return doneHtml('expired')

    const card = cards[0] ?? DEFAULT_CARD
    const transferAmount = current.matchAmount ?? current.amount
    return `
      <div class="sheet-grabber"></div>
      <div class="sheet-title">${iconHtml('clock')} ${t('orderSheetTitle')}</div>
      <div class="sheet-sub">${purposeAmountLine(purpose, current.amount)}</div>

      ${current.method === 'foreign'
        ? `<div class="hint-box">${t('foreignHint')}</div>`
        : card
          ? `<div class="card-box">
              <div class="card-box-label">${card.bankName}</div>
              <div class="card-number">${formatCardDisplay(card.cardNumber)}</div>
              <div class="card-holder">${card.holderName}</div>
              <button class="copy-btn" id="copy-card">${iconHtml('copy')} ${t('copyBtn')}</button>
            </div>`
          : `<div class="hint-box">${t('atmWarning')}</div>`
      }

      <div class="amount-box">
        <div class="amount-box-label">${t('transferAmountLabel')}</div>
        <div class="timer-amount">${formatSom(transferAmount)}</div>
        <button class="copy-btn" id="copy-amount">${iconHtml('copy')} ${t('copyAmountBtn')}</button>
      </div>

      ${current.matchAmount
        ? `<div class="hint-box" style="margin:10px 16px 0">${t('exactAmountWarning')}</div>`
        : current.method === 'card' || current.method === 'atm'
          ? `<div class="hint-box" style="margin:10px 16px 0">${t('commentOrderNoHint').replace('{orderNo}', String(current.orderNo))}</div>`
          : ''
      }

      ${showReceiptOption
        ? `
          <div class="hint-box error" style="margin:10px 16px 0">${t('moneyNotFoundHint')}</div>
          <div class="field-group" style="margin-top:14px">
            <div class="field-label"><span>${current.hasReceipt ? t('receiptSentLabel') : t('receiptFieldLabel')}</span></div>
            <input class="input" id="receipt-file" type="file" accept="image/*" style="padding:10px" />
          </div>
          <div class="sheet-actions" style="padding-top:0;flex-direction:row">
            <button class="btn btn-soft" style="flex:1" id="check-again" ${checkingNow ? 'disabled' : ''}>${iconHtml('search')} ${t('checkAgainBtn')}</button>
            <button class="btn btn-soft" style="flex:1" id="send-receipt" ${receiptBusy ? 'disabled' : ''}>${receiptBusy ? '…' : (current.hasReceipt ? t('resendReceiptBtn') : t('sendReceiptBtn'))}</button>
          </div>
        `
        : `<div class="status-line"><span class="status-dot"></span> ${t('autoCheckingStatus')}</div>`
      }
      ${avgMinutes ? `<div class="demo-note">${t('avgProcessingTimeLabel').replace('{minutes}', String(avgMinutes))}</div>` : ''}

      <div class="sheet-actions">
        <button class="btn btn-soft btn-block" id="close-sheet">${t('waitInBackgroundBtn')}</button>
      </div>
    `
  }

  function doneHtml(kind: 'completed' | 'cancelled' | 'expired'): string {
    if (kind === 'expired') {
      return `
        <div class="sheet-grabber"></div>
        <div class="sheet-title">⏰ ${t('orderSheetTitle')}</div>
        <div class="sheet-sub">${t('orderExpiredSub').replace('{minutes}', t('paymentExpiryMinutesLabel'))}</div>
        <div class="hint-box">${t('orderExpiredHint')}</div>
        <div class="sheet-actions">
          <button class="btn btn-accent btn-block" id="close-sheet">${t('close')}</button>
        </div>
      `
    }
    const success = kind === 'completed'
    const title = success
      ? purpose.kind === 'topup'
        ? `${t('topUpSuccess')} ${formatSom(current.amount)}`
        : t('orderCompleted')
      : t('orderCancelled')
    return `
      <div class="sheet-grabber"></div>
      <div class="sheet-title">${success ? '🎉' : '❌'} ${t('orderSheetTitle')}</div>
      <div class="sheet-sub">${title}</div>
      ${!success && current.rejectReason ? `<div class="hint-box error">${t('rejectReasonLabel')}: ${current.rejectReason}</div>` : ''}
      <div class="sheet-actions">
        <button class="btn btn-accent btn-block" id="close-sheet">${t('close')}</button>
      </div>
    `
  }

  async function refresh() {
    checkingNow = true
    mount()
    try {
      const fresh = await getPayment(current.id)
      current = fresh
      if (fresh.status === 'completed' || fresh.status === 'cancelled') {
        haptic(fresh.status === 'completed' ? 'success' : 'error')
      }
    } catch {
      /* vaqtinchalik tarmoq xatosi — keyingi urinishda davom etadi */
    } finally {
      checkingNow = false
      mount()
    }
  }

  function mount() {
    const overlay = openSheet(html())
    const active = current.status !== 'completed' && current.status !== 'cancelled' && current.status !== 'expired'

    if (active) {
      const cardNumber = (cards[0] ?? DEFAULT_CARD).cardNumber
      overlay.querySelector('#copy-card')?.addEventListener('click', async () => {
        if (!cardNumber) return
        try {
          await navigator.clipboard.writeText(cardNumber.replace(/\D/g, ''))
          showToast(t('cardCopied'))
        } catch {
          showToast(t('copyFailed'))
        }
      })

      overlay.querySelector('#copy-amount')?.addEventListener('click', async () => {
        try {
          const transferAmount = current.matchAmount ?? current.amount
          await navigator.clipboard.writeText(String(transferAmount))
          showToast(t('amountCopied'))
        } catch {
          showToast(t('copyFailed'))
        }
      })

      overlay.querySelector('#check-again')?.addEventListener('click', () => void refresh())

      overlay.querySelector('#send-receipt')?.addEventListener('click', async () => {
        const input = overlay.querySelector<HTMLInputElement>('#receipt-file')!
        const file = input.files?.[0]
        if (!file) {
          showToast(t('selectImageFirst'))
          return
        }
        receiptBusy = true
        mount()
        try {
          current = await uploadReceipt(current.id, file)
          showToast(t('receiptSentToast'))
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : t('sendFailedError'))
        } finally {
          receiptBusy = false
          mount()
        }
      })
    }

    overlay.querySelector('#close-sheet')!.addEventListener('click', closeSheet)
  }

  mount()

  // Karta/sozlama ma'lumotlarini fonda yuklab, ekranni yangilaymiz.
  Promise.all([getPaymentCards().catch(() => []), getSettings().catch(() => null)]).then(([c, s]) => {
    cards = c
    avgMinutes = s?.averageProcessingMinutes ?? null
    if (document.body.contains(document.querySelector('.sheet-overlay'))) mount()
  })

  // To'lov holatini fonda kuzatib turamiz — admin/SMS tasdiqlasa/rad etsa ekran o'zi yangilanadi.
  const timer = window.setInterval(async () => {
    if (!document.querySelector('.sheet-overlay')) {
      window.clearInterval(timer)
      return
    }
    if (current.status === 'completed' || current.status === 'cancelled' || current.status === 'expired') {
      window.clearInterval(timer)
      return
    }
    if (!showReceiptOption && Date.now() - startedAt > SHOW_RECEIPT_OPTION_AFTER_MS) {
      showReceiptOption = true
      mount()
    }
    try {
      const fresh = await getPayment(current.id)
      if (fresh.status !== current.status || fresh.hasReceipt !== current.hasReceipt) {
        current = fresh
        mount()
      }
      if (fresh.status === 'completed' || fresh.status === 'cancelled' || fresh.status === 'expired') {
        window.clearInterval(timer)
        if (fresh.status !== 'expired') haptic(fresh.status === 'completed' ? 'success' : 'error')
      }
    } catch {
      /* vaqtinchalik tarmoq xatosi — keyingi urinishda davom etadi */
    }
  }, POLL_INTERVAL_MS)
}

// ---------------------------------------------------------------
// Checkout sheet — "hisobdan" vs "to'g'ridan-to'g'ri" (client's requirement)
// ---------------------------------------------------------------

export function openCheckoutSheet(params: {
  gameId: string
  gameName: string
  packageId: string
  packageLabel: string
  price: number
  playerId?: string
  server?: string
}) {
  let submitting = false

  function html(): string {
    const state = getState()
    const enough = state.balance >= params.price
    return `
      <div class="sheet-grabber"></div>
        <div class="sheet-title">${iconHtml('wallet')} ${t('chooseMethodTitle')}</div>
      <div class="sheet-sub">${params.gameName} · ${params.packageLabel} · ${formatSom(params.price)}</div>

      <div class="pay-method" id="pay-balance" style="${enough ? '' : 'opacity:.5'}">
        <div class="pay-method-icon">${iconHtml('wallet')}</div>
        <div class="pay-method-text">
          <div class="pay-method-title">${t('payFromBalance')}</div>
          <div class="pay-method-sub">${t('currentBalance')} ${formatSom(state.balance)}</div>
          ${!enough ? `<div class="pay-method-tag" style="color:var(--danger)">${t('insufficientBalance')}</div>` : ''}
        </div>
        <div class="radio-dot">→</div>
      </div>

      <div class="pay-method" id="pay-direct">
        <div class="pay-method-icon">${iconHtml('zap')}</div>
        <div class="pay-method-text">
          <div class="pay-method-title">${t('directPaymentTitle')}</div>
          <div class="pay-method-sub">${t('directPaySub')}</div>
        </div>
        <div class="radio-dot">→</div>
      </div>

      <div class="sheet-actions">
        <button class="btn btn-soft btn-block" id="close-sheet" ${submitting ? 'disabled' : ''}>${t('close')}</button>
      </div>
    `
  }

  function mount() {
    const overlay = openSheet(html())
    overlay.querySelector('#close-sheet')!.addEventListener('click', closeSheet)
    overlay.querySelector('#pay-balance')!.addEventListener('click', async () => {
      if (submitting) return
      submitting = true
      mount()
      try {
        const payment = await createPurchasePayment({
          gameId: params.gameId,
          packageId: params.packageId,
          method: 'balance',
          playerInfo: buildPlayerInfo({ kind: 'purchase', gameId: params.gameId, gameName: params.gameName, packageId: params.packageId, packageLabel: params.packageLabel, playerId: params.playerId, server: params.server })
        })
        closeSheet()
        if (payment.status === 'completed') showToast(t('purchaseDoneFromBalance'))
        // getState() balansi hali eskirgan bo'lishi mumkin — foydalanuvchi Profil sahifasida yangilanganini ko'radi.
      } catch (err) {
        submitting = false
        mount()
        showToast(err instanceof ApiError ? err.message : t('enoughBalance'))
      }
    })
    overlay.querySelector('#pay-direct')!.addEventListener('click', () => {
      openMethodSheetForPurchase(
        {
          kind: 'purchase',
          gameId: params.gameId,
          gameName: params.gameName,
          packageId: params.packageId,
          packageLabel: params.packageLabel,
          playerId: params.playerId,
          server: params.server
        },
        params.price
      )
    })
  }

  mount()

  // Balans ekranga chiqqan mahal eskirgan bo'lishi mumkin (masalan foydalanuvchi
  // to'g'ridan-to'g'ri o'yin sahifasiga kirib, hali Bosh sahifa/Profilga tegmagan bo'lsa) —
  // shu sabab checkout ochilganda ham yangi qiymatni serverdan so'rab olamiz. Butun
  // varaqni qayta ochmaymiz (openSheet yopib-qayta ochadi, miltillashga sabab bo'ladi) —
  // faqat balans matnini joyida yangilaymiz.
  getMe()
    .then((me) => {
      setBalance(me.balance, me.cashback)
      if (submitting) return
      const overlay = sheetRoot()
      if (!overlay) return
      const enough = me.balance >= params.price
      const sub = overlay.querySelector('#pay-balance .pay-method-sub')
      const payBalance = overlay.querySelector<HTMLElement>('#pay-balance')
      if (sub) sub.textContent = `${t('currentBalance')} ${formatSom(me.balance)}`
      if (payBalance) {
        payBalance.style.opacity = enough ? '' : '.5'
        const existingTag = payBalance.querySelector('.pay-method-tag')
        if (!enough && !existingTag) {
          payBalance.querySelector('.pay-method-text')!.insertAdjacentHTML(
            'beforeend',
            `<div class="pay-method-tag" style="color:var(--danger)">${t('insufficientBalance')}</div>`
          )
        } else if (enough && existingTag) {
          existingTag.remove()
        }
      }
    })
    .catch(() => {
      /* Telegram tashqarisida (oddiy brauzer) initData yo'q — lokal qiymat bilan qolaveradi */
    })
}
