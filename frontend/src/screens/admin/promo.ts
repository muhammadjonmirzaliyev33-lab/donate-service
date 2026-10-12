import { formatSom } from '../../store'
import { iconHtml } from '../../icons'
import { openSheet, closeSheet, showToast, confirmSheet } from '../../components/sheet'
import {
  createPromoCode,
  deletePromoCode,
  getAdminPromoCodes,
  updatePromoCode,
  type AdminPromoCodeDto
} from '../../admin/api'
import { adminErrorHtml, adminShellHtml, ADMIN_LOADING_HTML, scrollActiveAdminTabIntoView } from '../../admin/layout'

export function renderAdminPromo(root: HTMLElement) {
  root.innerHTML = adminShellHtml('promo', ADMIN_LOADING_HTML)
  scrollActiveAdminTabIntoView(root)
  load(root)
}

async function load(root: HTMLElement) {
  const body = root.querySelector<HTMLElement>('#admin-body')!
  try {
    const codes = await getAdminPromoCodes()
    body.innerHTML = `
      <div class="section-head">
        <h2>Promokodlar (${codes.length})</h2>
        <button class="link-btn" id="add-promo">${iconHtml('plus')} Yangi</button>
      </div>
      ${listHtml(codes)}
    `
    attachActions(root, codes)
  } catch (err) {
    body.innerHTML = adminErrorHtml(err)
  }
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'Muddatsiz'
  const d = new Date(expiresAt)
  const expired = d.getTime() <= Date.now()
  const text = d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return expired ? `<span style="color:var(--danger)">Muddati tugagan (${text})</span>` : `${text} gacha`
}

function listHtml(codes: AdminPromoCodeDto[]): string {
  if (codes.length === 0) {
    return `<div class="empty-state" style="padding:30px"><p>Hali promokod yaratilmagan.</p></div>`
  }
  return `
    <div class="list-card">
      ${codes
        .map(
          (c) => `
        <div class="list-row" data-promo="${c.id}">
          <div class="list-row-icon" style="background:var(--card-2)">${iconHtml('ticket')}</div>
          <div class="list-row-text">
            <div class="list-row-title">${c.code} ${c.isActive ? '' : '<span style="color:var(--text-faint)">(nofaol)</span>'}</div>
            <div class="list-row-sub">+${formatSom(c.bonusAmount)} · ${c.redemptionsCount} marta ishlatilgan · ${formatExpiry(c.expiresAt)}</div>
          </div>
          <div class="list-row-chevron">›</div>
        </div>
      `
        )
        .join('')}
    </div>
  `
}

function attachActions(root: HTMLElement, codes: AdminPromoCodeDto[]) {
  root.querySelector('#add-promo')?.addEventListener('click', () => openPromoForm(root))
  root.querySelectorAll<HTMLElement>('[data-promo]').forEach((row) => {
    row.addEventListener('click', () => {
      const code = codes.find((c) => c.id === row.dataset.promo)
      if (code) openPromoForm(root, code)
    })
  })
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function openPromoForm(root: HTMLElement, existing?: AdminPromoCodeDto) {
  const html = `
    <div class="sheet-grabber"></div>
    <div class="sheet-title">${existing ? 'Promokodni tahrirlash' : 'Yangi promokod'}</div>
    <div class="field-group">
      ${
        !existing
          ? `<div class="field-label"><span>Kod</span></div>
             <input class="input" id="f-code" placeholder="WELCOME10000" style="margin-bottom:10px;text-transform:uppercase" />`
          : `<div class="field-label"><span>Kod</span></div>
             <input class="input" value="${existing.code}" disabled style="margin-bottom:10px;opacity:.6" />`
      }
      <div class="field-label"><span>Bonus summasi (so'm)</span></div>
      <input class="input" id="f-amount" type="number" min="1" value="${existing?.bonusAmount ?? ''}" style="margin-bottom:10px" />
      <div class="field-label"><span>Tugash sanasi (ixtiyoriy)</span></div>
      <input class="input" id="f-expires" type="date" value="${toDateInputValue(existing?.expiresAt ?? null)}" style="margin-bottom:10px" />
      ${
        existing
          ? `<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-dim);margin-bottom:10px">
              <input type="checkbox" id="f-active" ${existing.isActive ? 'checked' : ''} /> Faol
            </label>
            <button class="btn btn-soft btn-block" id="delete-promo" style="color:var(--danger)">${iconHtml('x')} O'chirish</button>`
          : `<div class="hint-box">Har bir foydalanuvchi bu kodni faqat bir marta ishlata oladi.</div>`
      }
    </div>
    <div class="sheet-actions">
      <button class="btn btn-accent btn-block" id="save-promo">Saqlash</button>
      <button class="btn btn-soft btn-block" id="close-sheet">Yopish</button>
    </div>
  `
  const overlay = openSheet(html)
  overlay.querySelector('#close-sheet')!.addEventListener('click', closeSheet)

  overlay.querySelector('#delete-promo')?.addEventListener('click', async () => {
    if (!existing) return
    const ok = await confirmSheet({ title: "Promokodni o'chirish kerakmi?", confirmLabel: "O'chirish", danger: true })
    if (!ok) return
    await deletePromoCode(existing.id)
    closeSheet()
    load(root)
  })

  overlay.querySelector('#save-promo')!.addEventListener('click', async () => {
    const amount = Number((overlay.querySelector('#f-amount') as HTMLInputElement).value)
    const expiresRaw = (overlay.querySelector('#f-expires') as HTMLInputElement).value
    const expiresAt = expiresRaw ? new Date(`${expiresRaw}T23:59:59`).toISOString() : null

    if (!amount || amount <= 0) {
      showToast("To'g'ri summa kiriting")
      return
    }

    try {
      if (existing) {
        const isActive = (overlay.querySelector('#f-active') as HTMLInputElement).checked
        await updatePromoCode(existing.id, { bonusAmount: amount, expiresAt, isActive })
      } else {
        const code = (overlay.querySelector('#f-code') as HTMLInputElement).value.trim()
        if (!/^[A-Za-z0-9_-]{3,40}$/.test(code)) {
          showToast("Kod 3-40 belgi, faqat harf/raqam/'_'/'-' bo'lishi kerak")
          return
        }
        await createPromoCode({ code, bonusAmount: amount, expiresAt })
      }
      closeSheet()
      load(root)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Xatolik yuz berdi")
    }
  })
}
