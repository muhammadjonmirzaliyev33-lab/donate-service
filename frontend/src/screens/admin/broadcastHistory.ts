import { iconHtml } from '../../icons'
import { getBroadcastHistory, type BroadcastMessageDto } from '../../admin/api'
import { adminErrorHtml, adminShellHtml, ADMIN_LOADING_HTML, scrollActiveAdminTabIntoView } from '../../admin/layout'
import { currentLocale } from '../../store'

const STATUS_LABEL: Record<BroadcastMessageDto['status'], string> = {
  sending: 'Yuborilmoqda…',
  sent: 'Yuborildi',
  failed: 'Muvaffaqiyatsiz'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(currentLocale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function renderAdminBroadcastHistory(root: HTMLElement) {
  root.innerHTML = adminShellHtml('broadcast', ADMIN_LOADING_HTML)
  scrollActiveAdminTabIntoView(root)
  load(root)
}

async function load(root: HTMLElement) {
  const body = root.querySelector<HTMLElement>('#admin-body')!
  try {
    const items = await getBroadcastHistory()
    body.innerHTML = html(items)
    root.querySelector('#back-to-broadcast')?.addEventListener('click', (e) => {
      e.preventDefault()
      location.hash = '#/admin/broadcast'
    })
  } catch (err) {
    body.innerHTML = adminErrorHtml(err)
  }
}

function html(items: BroadcastMessageDto[]): string {
  return `
    <div class="back-header">
      <a class="back-btn" href="#/admin/broadcast" id="back-to-broadcast">${iconHtml('arrowLeft')} Xabar yuborish</a>
    </div>
    <div class="section-head"><h2>Xabarlar tarixi</h2></div>
    ${
      items.length === 0
        ? `<div class="empty-state"><div class="icon">${iconHtml('message')}</div><h3>Hali xabar yuborilmagan</h3></div>`
        : `<div class="list-card">
            ${items
              .map(
                (m) => `
              <div class="list-row" style="cursor:default">
                ${
                  m.imageUrls[0]
                    ? `<a href="${m.imageUrls[0]}" target="_blank" rel="noopener" class="list-row-icon" style="background:var(--card-2) center/cover url('${m.imageUrls[0]}')"></a>`
                    : `<div class="list-row-icon" style="background:var(--card-2)">${iconHtml('message')}</div>`
                }
                <div class="list-row-text">
                  <div class="list-row-title">${escapeHtml(m.message.slice(0, 60))}${m.message.length > 60 ? '…' : ''}</div>
                  <div class="list-row-sub">
                    ${STATUS_LABEL[m.status]} · ${m.sentCount}/${m.totalRecipients} yetdi${m.failedCount ? ` · ${m.failedCount} xato` : ''}
                    ${m.imageUrls.length ? ` · ${m.imageUrls.length} rasm` : ''}
                  </div>
                  <div class="list-row-sub">${formatDate(m.createdAt)}${m.createdByUsername ? ` · @${m.createdByUsername}` : ''}</div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>`
    }
  `
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
