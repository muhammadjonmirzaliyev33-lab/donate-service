import { iconHtml } from '../icons'
import { t } from '../store'

/** Mavjud bo'lmagan (yoki huquqsiz kirilgan — masalan admin bo'lmagan foydalanuvchi #/admin'ga kirsa) sahifa. */
export function renderNotFound(root: HTMLElement) {
  root.innerHTML = `
    <div class="empty-state" style="min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px">
      <div class="icon">${iconHtml('circleAlert')}</div>
      <h3>${t('notFoundTitle')}</h3>
      <p>${t('notFoundSub')}</p>
      <button class="btn btn-accent" id="go-home">${t('notFoundBackHome')}</button>
    </div>
  `
  root.querySelector('#go-home')!.addEventListener('click', () => (location.hash = '#/'))
}
