import { iconHtml } from '../../icons'
import { openSheet, closeSheet, showToast, confirmSheet } from '../../components/sheet'
import { formatCardDisplay } from '../../components/paymentFlow'
import {
  createPaymentCard,
  deletePaymentCard,
  getAdminPaymentCards,
  updatePaymentCard,
  type AdminPaymentCardDto
} from '../../admin/api'
import { adminErrorHtml, adminShellHtml, ADMIN_LOADING_HTML, scrollActiveAdminTabIntoView } from '../../admin/layout'

export function renderAdminCards(root: HTMLElement) {
  root.innerHTML = adminShellHtml('cards', ADMIN_LOADING_HTML)
  scrollActiveAdminTabIntoView(root)
  load(root)
}

async function load(root: HTMLElement) {
  const body = root.querySelector<HTMLElement>('#admin-body')!
  try {
    const cards = await getAdminPaymentCards()
    body.innerHTML = `
      <div class="section-head">
        <h2>To'lov kartalari (${cards.length})</h2>
        <button class="link-btn" id="add-card">${iconHtml('plus')} Yangi</button>
      </div>
      ${listHtml(cards)}
    `
    attachActions(root, cards)
  } catch (err) {
    body.innerHTML = adminErrorHtml(err)
  }
}

function listHtml(cards: AdminPaymentCardDto[]): string {
  if (cards.length === 0) {
    return `<div class="empty-state" style="padding:30px"><p>Hali karta qo'shilmagan. Foydalanuvchi to'lov ekranida karta ko'rsatilmaydi.</p></div>`
  }
  return `
    <div class="list-card">
      ${cards
        .map(
          (c) => `
        <div class="list-row" data-card="${c.id}">
          <div class="list-row-icon" style="background:var(--card-2)">${iconHtml('creditCard')}</div>
          <div class="list-row-text">
            <div class="list-row-title">${c.bankName} ${c.isActive ? '' : '<span style="color:var(--text-faint)">(nofaol)</span>'}</div>
            <div class="list-row-sub">${formatCardDisplay(c.cardNumber)} · ${c.holderName}</div>
          </div>
          <div class="list-row-chevron">›</div>
        </div>
      `
        )
        .join('')}
    </div>
  `
}

function attachActions(root: HTMLElement, cards: AdminPaymentCardDto[]) {
  root.querySelector('#add-card')?.addEventListener('click', () => openCardForm(root))
  root.querySelectorAll<HTMLElement>('[data-card]').forEach((row) => {
    row.addEventListener('click', () => {
      const card = cards.find((c) => c.id === row.dataset.card)
      if (card) openCardForm(root, card)
    })
  })
}

function openCardForm(root: HTMLElement, existing?: AdminPaymentCardDto) {
  const html = `
    <div class="sheet-grabber"></div>
    <div class="sheet-title">${existing ? 'Kartani tahrirlash' : 'Yangi karta'}</div>
    <div class="field-group">
      <div class="field-label"><span>Bank/xizmat nomi</span></div>
      <input class="input" id="f-bank" placeholder="Kapitalbank" value="${existing?.bankName ?? ''}" style="margin-bottom:10px" />
      <div class="field-label"><span>Karta raqami (to'liq, 16 ta raqam)</span></div>
      <input class="input" id="f-number" placeholder="8600 1234 5678 9012" value="${existing ? formatCardDisplay(existing.cardNumber) : ''}" inputmode="numeric" style="margin-bottom:10px" />
      <div class="field-label"><span>Egasining ismi</span></div>
      <input class="input" id="f-holder" placeholder="Elbek X." value="${existing?.holderName ?? ''}" style="margin-bottom:10px" />
      ${
        existing
          ? `<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-dim);margin-bottom:10px">
              <input type="checkbox" id="f-active" ${existing.isActive ? 'checked' : ''} /> Faol (userga ko'rsatiladi)
            </label>
            <button class="btn btn-soft btn-block" id="delete-card" style="color:var(--danger)">${iconHtml('x')} O'chirish</button>`
          : ''
      }
    </div>
    <div class="sheet-actions">
      <button class="btn btn-accent btn-block" id="save-card">Saqlash</button>
      <button class="btn btn-soft btn-block" id="close-sheet">Yopish</button>
    </div>
  `
  const overlay = openSheet(html)
  overlay.querySelector('#close-sheet')!.addEventListener('click', closeSheet)

  overlay.querySelector('#delete-card')?.addEventListener('click', async () => {
    if (!existing) return
    const ok = await confirmSheet({ title: "Kartani o'chirish kerakmi?", confirmLabel: "O'chirish", danger: true })
    if (!ok) return
    await deletePaymentCard(existing.id)
    closeSheet()
    load(root)
  })

  overlay.querySelector('#save-card')!.addEventListener('click', async () => {
    const bankName = (overlay.querySelector('#f-bank') as HTMLInputElement).value.trim()
    const cardNumberRaw = (overlay.querySelector('#f-number') as HTMLInputElement).value.trim()
    const holderName = (overlay.querySelector('#f-holder') as HTMLInputElement).value.trim()
    const isActive = (overlay.querySelector('#f-active') as HTMLInputElement | null)?.checked ?? true

    if (!bankName || !cardNumberRaw || !holderName) {
      showToast("Barcha maydonlarni to'ldiring")
      return
    }

    const cardNumber = cardNumberRaw.replace(/\D/g, '')
    if (cardNumber.length !== 16) {
      showToast("Karta raqami 16 ta raqamdan iborat bo'lishi kerak (yulduzchasiz, to'liq)")
      return
    }

    try {
      if (existing) await updatePaymentCard(existing.id, { bankName, cardNumber, holderName, isActive })
      else await createPaymentCard({ bankName, cardNumber, holderName })
      closeSheet()
      load(root)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xatolik yuz berdi')
    }
  })
}
