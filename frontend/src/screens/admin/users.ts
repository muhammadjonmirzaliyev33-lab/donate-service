import { escapeHtml } from '../../escape'
import { formatSom } from '../../store'
import { getUsers, type AdminUserDto } from '../../admin/api'
import { adminErrorHtml, adminShellHtml, ADMIN_LOADING_HTML, scrollActiveAdminTabIntoView } from '../../admin/layout'

export function renderAdminUsers(root: HTMLElement) {
  root.innerHTML = adminShellHtml('users', ADMIN_LOADING_HTML)
  scrollActiveAdminTabIntoView(root)
  load(root)
}

async function load(root: HTMLElement) {
  const body = root.querySelector<HTMLElement>('#admin-body')!
  try {
    const users = await getUsers()
    body.innerHTML = `
      <div class="section-head"><h2>Foydalanuvchilar (${users.length})</h2></div>
      ${listHtml(users)}
    `
  } catch (err) {
    body.innerHTML = adminErrorHtml(err)
  }
}

function listHtml(users: AdminUserDto[]): string {
  if (users.length === 0) {
    return `<div class="empty-state" style="padding:30px"><p>Hali foydalanuvchi yo'q</p></div>`
  }
  return `
    <div class="list-card">
      ${users
        .map((u) => {
          const name = escapeHtml(u.firstName || u.username || u.telegramId)
          const sub = escapeHtml([u.username ? '@' + u.username : null, u.phone].filter(Boolean).join(' · '))
          return `
            <div class="list-row">
              <div class="avatar" style="flex:0 0 auto">${name.slice(0, 1).toUpperCase()}</div>
              <div class="list-row-text" style="margin-left:4px">
                <div class="list-row-title">${name}</div>
                <div class="list-row-sub">${sub || u.telegramId}</div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:800;font-size:13.5px">${formatSom(u.balance)}</div>
                <div class="list-row-sub">${u.ordersCount} buyurtma · ${formatSom(u.totalSpent)}</div>
              </div>
            </div>
          `
        })
        .join('')}
    </div>
  `
}
