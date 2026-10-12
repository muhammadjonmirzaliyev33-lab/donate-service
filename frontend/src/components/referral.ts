import { openSheet, closeSheet, showToast } from './sheet'
import { iconHtml } from '../icons'
import { t, formatSom, currentLocale } from '../store'
import { getMyReferrals, getSettings, ApiError, type ReferralSummaryDto } from '../api'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(currentLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function invitedRowHtml(u: ReferralSummaryDto['invited'][number]): string {
  const name = u.username ? `@${u.username}` : u.firstName || t('referralFriend')
  const status = u.rewarded
    ? `<span style="color:var(--success)">${t('referralRewarded')}</span>`
    : `<span style="color:var(--text-faint)">${t('referralPending')}</span>`
  return `
    <div class="list-row">
      <div class="list-row-icon" style="background:var(--card-2)">${iconHtml('users')}</div>
      <div class="list-row-text">
        <div class="list-row-title">${name}</div>
        <div class="list-row-sub">${formatDate(u.createdAt)} · ${status}</div>
      </div>
    </div>
  `
}

export async function openReferralSheet() {
  const html = `
    <div class="sheet-grabber"></div>
    <div class="sheet-title">${iconHtml('users')} ${t('inviteFriends')}</div>
    <div class="sheet-sub">${t('loadingText')}</div>
  `
  const overlay = openSheet(html)
  overlay.querySelector('#close-sheet')?.addEventListener('click', closeSheet)

  try {
    const [summary, settings] = await Promise.all([getMyReferrals(), getSettings()])
    renderSummary(overlay, summary, settings.referralFixedBonus, settings.referralPercent)
  } catch (err) {
    const sub = overlay.querySelector('.sheet-sub')
    if (sub) sub.textContent = err instanceof ApiError ? err.message : t('genericError')
  }
}

function renderSummary(overlay: HTMLDivElement, summary: ReferralSummaryDto, fixedBonus: number, percent: number) {
  const sheet = overlay.querySelector('.sheet') as HTMLElement

  const bonusLine = `${formatSom(fixedBonus)} + ${percent}%`
  const linkBlock = summary.link
    ? `
      <div class="hint-box" style="word-break:break-all;margin:12px 0 8px">${summary.link}</div>
      <button class="btn btn-soft btn-block" id="copy-ref-link">${iconHtml('copy')} ${t('copyLink')}</button>
    `
    : `<div class="hint-box" style="margin:12px 0">${t('referralLinkUnavailable')}</div>`

  sheet.innerHTML = `
    <div class="sheet-grabber"></div>
    <div class="sheet-title">${iconHtml('users')} ${t('inviteFriends')}</div>
    <div class="sheet-sub">${t('inviteFriendsSub')} (${bonusLine})</div>

    ${linkBlock}

    <div class="stat-grid" style="margin-top:14px">
      <div class="stat-box"><div class="label">${t('referralInvitedCount')}</div><div class="value">${summary.invitedCount}</div></div>
      <div class="stat-box"><div class="label">${t('referralTotalEarned')}</div><div class="value">${formatSom(summary.totalEarned)}</div></div>
    </div>

    ${
      summary.invited.length > 0
        ? `<div class="section-head" style="margin-top:14px"><h2>${t('referralInvitedList')}</h2></div>
           <div class="list-card">${summary.invited.map(invitedRowHtml).join('')}</div>`
        : `<div class="hint-box" style="margin-top:14px">${t('referralNoInvites')}</div>`
    }

    <div class="sheet-actions">
      <button class="btn btn-soft btn-block" id="close-sheet">${t('close')}</button>
    </div>
  `

  sheet.querySelector('#close-sheet')?.addEventListener('click', closeSheet)
  sheet.querySelector('#copy-ref-link')?.addEventListener('click', async () => {
    if (!summary.link) return
    try {
      await navigator.clipboard.writeText(summary.link)
      showToast(t('referralLinkCopied'))
    } catch {
      showToast(t('copyFailed'))
    }
  })
}
