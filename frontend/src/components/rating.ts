import { openSheet, closeSheet } from './sheet'
import { iconHtml } from '../icons'
import { t, formatSom } from '../store'
import { getRating, ApiError, type RatingEntryDto } from '../api'

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

function entryRowHtml(entry: RatingEntryDto): string {
  const medal = MEDALS[entry.rank]
  return `
    <div class="list-row" style="${entry.isMe ? 'background:rgba(200,255,77,.06)' : ''}">
      <div class="list-row-icon" style="background:var(--card-2);font-size:15px">${medal ?? `#${entry.rank}`}</div>
      <div class="list-row-text">
        <div class="list-row-title">${entry.displayName}${entry.isMe ? ` <span style="color:var(--accent)">(${t('ratingYou')})</span>` : ''}</div>
      </div>
      <div style="font-weight:800">${formatSom(entry.totalAmount)}</div>
    </div>
  `
}

export async function openRatingSheet() {
  const html = `
    <div class="sheet-grabber"></div>
    <div class="sheet-title">${iconHtml('crown')} ${t('rating')}</div>
    <div class="sheet-sub">${t('loadingText')}</div>
  `
  const overlay = openSheet(html)
  overlay.querySelector('#close-sheet')?.addEventListener('click', closeSheet)

  try {
    const data = await getRating()
    renderRating(overlay, data.top, data.me)
  } catch (err) {
    const sub = overlay.querySelector('.sheet-sub')
    if (sub) sub.textContent = err instanceof ApiError ? err.message : t('genericError')
  }
}

function renderRating(overlay: HTMLDivElement, top: RatingEntryDto[], me: RatingEntryDto | null) {
  const sheet = overlay.querySelector('.sheet') as HTMLElement
  const meInTop = me && top.some((e) => e.isMe)

  sheet.innerHTML = `
    <div class="sheet-grabber"></div>
    <div class="sheet-title">${iconHtml('crown')} ${t('rating')}</div>
    <div class="sheet-sub">${t('ratingSub')}</div>

    ${
      top.length > 0
        ? `<div class="list-card" style="margin-top:8px">${top.map(entryRowHtml).join('')}</div>`
        : `<div class="hint-box" style="margin-top:8px">${t('ratingEmpty')}</div>`
    }

    ${
      me && !meInTop
        ? `<div class="section-head" style="margin-top:14px"><h2>${t('ratingYourPlace')}</h2></div>
           <div class="list-card">${entryRowHtml(me)}</div>`
        : !me
          ? `<div class="hint-box" style="margin-top:14px">${t('ratingNoneYet')}</div>`
          : ''
    }

    <div class="sheet-actions">
      <button class="btn btn-soft btn-block" id="close-sheet">${t('close')}</button>
    </div>
  `

  sheet.querySelector('#close-sheet')?.addEventListener('click', closeSheet)
}
