import { closeSheet, openSheet } from './sheet'
import { getState, removeSavedId, t } from '../store'
import { GAMES } from '../store'
import { gameIconHtml, iconHtml } from '../icons'

export function openSavedIdsSheet(onPick: (gameId: string) => void) {
  const state = getState()
  const entries = Object.entries(state.savedIds)

  function html(): string {
    if (entries.length === 0) {
      return `
        <div class="sheet-grabber"></div>
        <div class="sheet-title">${iconHtml('save')} ${t('myIdsTitle')}</div>
        <div class="sheet-sub">${t('pickSavedIdSub')}</div>
        <div class="empty-state" style="padding:40px 30px">
          <div class="icon">${iconHtml('save')}</div>
          <h3>${t('noSavedIds')}</h3>
          <p>${t('savedIdsSub')}</p>
        </div>
        <div class="sheet-actions"><button class="btn btn-soft btn-block" id="close-sheet">${t('close')}</button></div>
      `
    }
    return `
      <div class="sheet-grabber"></div>
      <div class="sheet-title">${iconHtml('save')} ${t('myIdsTitle')}</div>
      <div class="sheet-sub">${t('pickSavedIdSub')}</div>
      <div class="list-card" style="margin:0 16px 14px">
        ${entries
        .map(([gameId, saved]) => {
          const game = GAMES.find((g) => g.id === gameId)
          return `
            <div class="list-row" data-pick="${gameId}">
              <div class="list-row-icon" style="background:${game?.gradient ?? '#222'}">${game ? gameIconHtml(game.id) : iconHtml('gamepad')}</div>
              <div class="list-row-text">
                <div class="list-row-title">${game?.name ?? gameId}</div>
                <div class="list-row-sub">ID: ${saved.playerId}${saved.server ? ' · ' + t('serverLabelShort') + ': ' + saved.server : ''}</div>
              </div>
              <button class="link-btn" data-remove="${gameId}">${t('remove')}</button>
            </div>
          `
        })
        .join('')}
      </div>
      <div class="sheet-actions"><button class="btn btn-soft btn-block" id="close-sheet">${t('close')}</button></div>
    `
  }

  function mount() {
    const overlay = openSheet(html())
    overlay.querySelector('#close-sheet')?.addEventListener('click', closeSheet)
    overlay.querySelectorAll<HTMLElement>('[data-pick]').forEach((row) => {
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).dataset.remove) return
        onPick(row.dataset.pick!)
        closeSheet()
      })
    })
    overlay.querySelectorAll<HTMLElement>('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        removeSavedId(btn.dataset.remove!)
        const idx = entries.findIndex(([id]) => id === btn.dataset.remove)
        if (idx >= 0) entries.splice(idx, 1)
        mount()
      })
    })
  }

  mount()
}
