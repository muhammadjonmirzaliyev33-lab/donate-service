import { showToast } from '../../components/sheet'
import { getAdminSettings, updateSettings } from '../../admin/api'
import { adminErrorHtml, adminShellHtml, ADMIN_LOADING_HTML, scrollActiveAdminTabIntoView } from '../../admin/layout'

export function renderAdminSettings(root: HTMLElement) {
  root.innerHTML = adminShellHtml('settings', ADMIN_LOADING_HTML)
  scrollActiveAdminTabIntoView(root)
  load(root)
}

async function load(root: HTMLElement) {
  const body = root.querySelector<HTMLElement>('#admin-body')!
  try {
    const settings = await getAdminSettings()
    body.innerHTML = `
      <div class="section-head"><h2>Ilova sozlamalari</h2></div>
      <div class="field-group">
        <div class="field-label"><span>Support Telegram username (ixtiyoriy)</span></div>
        <input class="input" id="f-support" placeholder="@admin_support" value="${settings.supportUsername ?? ''}" style="margin-bottom:10px" />
        <div class="field-label"><span>Telegram kanal manzili (ixtiyoriy)</span></div>
        <input class="input" id="f-channel" placeholder="https://t.me/kanal" value="${settings.channelUrl ?? ''}" style="margin-bottom:10px" />
      </div>
      <div class="section-head"><h2>Referral (do'st taklif qilish)</h2></div>
      <div class="field-group">
        <div class="field-label"><span>Fiks bonus (so'm)</span></div>
        <input class="input" id="f-ref-fixed" type="number" min="0" value="${settings.referralFixedBonus}" style="margin-bottom:10px" />
        <div class="field-label"><span>+ foiz (taklif qilinganning birinchi to'lovidan)</span></div>
        <input class="input" id="f-ref-percent" type="number" min="0" max="100" step="0.5" value="${settings.referralPercent}" />
      </div>
      <div class="sheet-actions" style="padding:14px 16px 0">
        <button class="btn btn-accent btn-block" id="save-settings">Saqlash</button>
      </div>
    `
    root.querySelector('#save-settings')!.addEventListener('click', async () => {
      const support = (root.querySelector('#f-support') as HTMLInputElement).value.trim()
      const channel = (root.querySelector('#f-channel') as HTMLInputElement).value.trim()
      const refFixed = Number((root.querySelector('#f-ref-fixed') as HTMLInputElement).value)
      const refPercent = Number((root.querySelector('#f-ref-percent') as HTMLInputElement).value)
      if (refFixed < 0 || refPercent < 0 || refPercent > 100) {
        showToast("Referral qiymatlarini to'g'ri kiriting")
        return
      }
      try {
        await updateSettings({
          supportUsername: support || null,
          channelUrl: channel || null,
          referralFixedBonus: refFixed,
          referralPercent: refPercent
        })
        showToast('Sozlamalar saqlandi')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Xatolik yuz berdi')
      }
    })
  } catch (err) {
    body.innerHTML = adminErrorHtml(err)
  }
}
