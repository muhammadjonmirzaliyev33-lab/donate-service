import { formatSom } from '../../store'
import { iconHtml } from '../../icons'
import { getLowStock, getOverview, getTopGames, type LowStockDto, type OverviewDto, type TopGameDto } from '../../admin/api'
import { adminErrorHtml, adminShellHtml, ADMIN_LOADING_HTML, scrollActiveAdminTabIntoView } from '../../admin/layout'

export function renderAdminStats(root: HTMLElement) {
  root.innerHTML = adminShellHtml('stats', ADMIN_LOADING_HTML)
  scrollActiveAdminTabIntoView(root)
  load(root)
}

async function load(root: HTMLElement) {
  const body = root.querySelector<HTMLElement>('#admin-body')!
  try {
    const [overview, topGames, lowStock] = await Promise.all([getOverview(), getTopGames(7), getLowStock()])
    body.innerHTML = `
      ${overviewHtml(overview)}
      <div class="section-head"><h2>Ko'p sotilayotgan o'yinlar (7 kun)</h2></div>
      ${topGamesHtml(topGames)}
      <div class="section-head"><h2>Zaxira kam/tugagan o'yinlar</h2></div>
      ${lowStockHtml(lowStock)}
    `
  } catch (err) {
    body.innerHTML = adminErrorHtml(err)
  }
}

function overviewHtml(o: OverviewDto): string {
  return `
    <div class="stat-grid" style="margin:14px 16px 16px">
      <div class="stat-box"><div class="label">Bugungi daromad</div><div class="value">${formatSom(o.todayRevenue)}</div></div>
      <div class="stat-box"><div class="label">Haftalik daromad</div><div class="value">${formatSom(o.weekRevenue)}</div></div>
      <div class="stat-box"><div class="label">Jami daromad</div><div class="value">${formatSom(o.totalRevenue)}</div></div>
      <div class="stat-box"><div class="label">Foydalanuvchilar</div><div class="value">${o.totalUsers}</div></div>
      <div class="stat-box"><div class="label">Bajarilgan buyurtma</div><div class="value">${o.completedCount}</div></div>
      <div class="stat-box"><div class="label">Bekor qilingan</div><div class="value">${o.cancelledCount}</div></div>
    </div>
  `
}

function topGamesHtml(games: TopGameDto[]): string {
  if (games.length === 0) {
    return `<div class="empty-state" style="padding:30px"><p>Bu davrda sotuv bo'lmagan</p></div>`
  }
  return `
    <div class="list-card">
      ${games
        .map(
          (g) => `
            <div class="list-row">
              <div class="list-row-icon" style="background:var(--card-2)">${iconHtml('trending')}</div>
              <div class="list-row-text">
                <div class="list-row-title">${g.name}</div>
                <div class="list-row-sub">${g.orders} ta buyurtma · ${g.unitsSold} dona</div>
              </div>
              <div style="font-weight:800;color:var(--accent)">${formatSom(g.revenue)}</div>
            </div>
          `
        )
        .join('')}
    </div>
  `
}

function lowStockHtml(items: LowStockDto[]): string {
  if (items.length === 0) {
    return `<div class="empty-state" style="padding:30px"><p>Barcha o'yinlarda zaxira yetarli</p></div>`
  }
  return `
    <div class="list-card">
      ${items
        .map(
          (i) => `
            <div class="list-row">
              <div class="list-row-icon" style="background:rgba(255,92,122,.14)">${iconHtml('boxes')}</div>
              <div class="list-row-text">
                <div class="list-row-title">${i.name}</div>
                <div class="list-row-sub">Qoldiq: ${i.balance}</div>
              </div>
              <span class="status-badge cancelled">To'ldirish kerak</span>
            </div>
          `
        )
        .join('')}
    </div>
  `
}
