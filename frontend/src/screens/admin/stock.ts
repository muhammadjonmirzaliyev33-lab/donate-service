import { iconHtml } from '../../icons'
import { openSheet, closeSheet, showToast } from '../../components/sheet'
import { depositStock, getStockBalances, getStockMovements, type GameStockDto, type StockMovementDto } from '../../admin/api'
import { adminErrorHtml, adminShellHtml, ADMIN_LOADING_HTML, scrollActiveAdminTabIntoView } from '../../admin/layout'

const MOVEMENT_LABEL: Record<StockMovementDto['kind'], string> = {
  deposit: 'Kirim',
  sale: 'Sotildi',
  adjustment: "Tuzatish"
}

export function renderAdminStock(root: HTMLElement) {
  root.innerHTML = adminShellHtml('stock', ADMIN_LOADING_HTML)
  scrollActiveAdminTabIntoView(root)
  load(root)
}

async function load(root: HTMLElement) {
  const body = root.querySelector<HTMLElement>('#admin-body')!
  try {
    const balances = await getStockBalances()
    body.innerHTML = `
      <div class="section-head"><h2>O'yin zaxiralari</h2></div>
      ${listHtml(balances)}
    `
    attachActions(root)
  } catch (err) {
    body.innerHTML = adminErrorHtml(err)
  }
}

function listHtml(balances: GameStockDto[]): string {
  if (balances.length === 0) {
    return `<div class="empty-state" style="padding:30px"><p>Hali o'yin qo'shilmagan</p></div>`
  }
  return `
    <div class="list-card">
      ${balances
        .map(
          (b) => `
        <div class="list-row" data-game="${b.gameId}">
          <div class="list-row-icon" style="background:${b.balance <= 0 ? 'rgba(255,92,122,.14)' : 'var(--card-2)'}">${iconHtml('boxes')}</div>
          <div class="list-row-text">
            <div class="list-row-title">${b.gameId}</div>
            <div class="list-row-sub">Qoldiq: ${b.balance}</div>
          </div>
          <button class="link-btn" data-deposit="${b.gameId}">${iconHtml('plus')} Kirim</button>
        </div>
      `
        )
        .join('')}
    </div>
  `
}

function attachActions(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-deposit]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      openDepositForm(root, btn.dataset.deposit!)
    })
  })
  root.querySelectorAll<HTMLElement>('[data-game]').forEach((row) => {
    row.addEventListener('click', () => openHistory(row.dataset.game!))
  })
}

function openDepositForm(root: HTMLElement, gameId: string) {
  const html = `
    <div class="sheet-grabber"></div>
    <div class="sheet-title">${iconHtml('boxes')} Zaxira kirim — ${gameId}</div>
    <div class="sheet-sub">Yangi sotib olingan miqdorni kiriting</div>
    <div class="field-group">
      <div class="field-label"><span>Miqdor (dona)</span></div>
      <input class="input" id="f-amount" type="number" placeholder="50000" style="margin-bottom:10px" />
      <div class="field-label"><span>Izoh (ixtiyoriy)</span></div>
      <input class="input" id="f-note" placeholder="1 000 000 so'mga olindi" />
    </div>
    <div class="sheet-actions">
      <button class="btn btn-accent btn-block" id="save-deposit">Saqlash</button>
      <button class="btn btn-soft btn-block" id="close-sheet">Yopish</button>
    </div>
  `
  const overlay = openSheet(html)
  overlay.querySelector('#close-sheet')!.addEventListener('click', closeSheet)
  overlay.querySelector('#save-deposit')!.addEventListener('click', async () => {
    const amount = Number((overlay.querySelector('#f-amount') as HTMLInputElement).value)
    const note = (overlay.querySelector('#f-note') as HTMLInputElement).value.trim()
    if (!amount || amount <= 0) {
      showToast("To'g'ri miqdor kiriting")
      return
    }
    try {
      await depositStock(gameId, amount, note || undefined)
      closeSheet()
      showToast('Zaxira to’ldirildi')
      load(root)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xatolik yuz berdi')
    }
  })
}

async function openHistory(gameId: string) {
  const html = `
    <div class="sheet-grabber"></div>
    <div class="sheet-title">${iconHtml('clock')} Tarix — ${gameId}</div>
    <div id="history-body" style="padding:0 16px"><p>Yuklanmoqda…</p></div>
    <div class="sheet-actions"><button class="btn btn-soft btn-block" id="close-sheet">Yopish</button></div>
  `
  const overlay = openSheet(html)
  overlay.querySelector('#close-sheet')!.addEventListener('click', closeSheet)

  try {
    const movements = await getStockMovements(gameId, 30)
    const body = overlay.querySelector('#history-body')!
    body.innerHTML =
      movements.length === 0
        ? `<p style="color:var(--text-dim)">Hali harakat yo'q</p>`
        : movements
            .map(
              (m) => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span>${MOVEMENT_LABEL[m.kind]}${m.note ? ' · ' + m.note : ''}</span>
          <b style="color:${m.amount >= 0 ? 'var(--success)' : 'var(--danger)'}">${m.amount >= 0 ? '+' : ''}${m.amount}</b>
        </div>
      `
            )
            .join('')
  } catch {
    overlay.querySelector('#history-body')!.innerHTML = `<p style="color:var(--danger)">Yuklanmadi</p>`
  }
}
