import { openSheet, closeSheet, showToast } from './sheet'
import { iconHtml } from '../icons'
import { t, formatSom, setBalance, getState } from '../store'
import { redeemPromoCode, ApiError } from '../api'

export function openPromoCodeSheet() {
  const html = `
    <div class="sheet-grabber"></div>
    <div class="sheet-title">${iconHtml('ticket')} ${t('promoCode')}</div>
    <div class="sheet-sub">${t('promoCodeSheetSub')}</div>
    <div class="field-group">
      <input class="input" id="f-promo-code" placeholder="${t('promoCodePlaceholder')}" style="text-transform:uppercase" />
    </div>
    <div class="sheet-actions">
      <button class="btn btn-accent btn-block" id="redeem-promo">${t('promoCodeRedeemBtn')}</button>
      <button class="btn btn-soft btn-block" id="close-sheet">${t('close')}</button>
    </div>
  `
  const overlay = openSheet(html)
  overlay.querySelector('#close-sheet')!.addEventListener('click', closeSheet)

  const input = overlay.querySelector<HTMLInputElement>('#f-promo-code')!
  const btn = overlay.querySelector<HTMLButtonElement>('#redeem-promo')!

  input.addEventListener('input', () => {
    input.value = input.value.toUpperCase()
  })

  btn.addEventListener('click', async () => {
    const code = input.value.trim()
    if (!code) {
      showToast(t('promoCodeEnterCode'))
      return
    }
    btn.disabled = true
    try {
      const result = await redeemPromoCode(code)
      setBalance(result.balance, getState().cashback)
      showToast(`${t('promoCodeSuccess')} — +${formatSom(result.bonusAmount)}`)
      closeSheet()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : t('genericError'))
    } finally {
      btn.disabled = false
    }
  })
}
