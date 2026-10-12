import { GAMES, t } from '../store'
import { gameArtHtml, iconHtml } from '../icons'
import { getGames, type GameDto } from '../api'

type GameTile = { id: string; name: string; category: string; gradient: string; icon?: string | null }

function tileHtml(g: GameTile) {
  return `
    <div class="game-tile" data-game="${g.id}">
      <div class="game-tile-art" style="background:${g.gradient}">
        ${gameArtHtml(g)}
      </div>
      <div class="game-tile-name">${g.name}</div>
    </div>`
}

export function renderGames(root: HTMLElement) {
  let query = ''
  let games: GameTile[] = GAMES

  function list() {
    return games.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()))
  }

  function html() {
    return `
      <div class="page-title">${t('gamesTitle')}</div>
      <div class="search-box">
        ${iconHtml('search')} <input id="search" placeholder="${t('searchPlaceholder')}" value="${query}" />
      </div>
      <div class="game-grid" id="grid">
        ${list().map(tileHtml).join('')}
      </div>
    `
  }

  function attach() {
    root.querySelector<HTMLInputElement>('#search')!.addEventListener('input', (e) => {
      query = (e.target as HTMLInputElement).value
      const grid = root.querySelector('#grid')!
      grid.innerHTML = list().map(tileHtml).join('')
      attachTiles()
    })
    attachTiles()
  }

  function attachTiles() {
    root.querySelectorAll<HTMLElement>('[data-game]').forEach((tile) => {
      tile.addEventListener('click', () => (location.hash = `#/game/${tile.dataset.game}`))
    })
  }

  root.innerHTML = html()
  attach()

  // Haqiqiy katalog backenddan — kelguncha lokal (demo) ro'yxat ko'rinib turadi.
  getGames()
    .then((real: GameDto[]) => {
      if (real.length === 0) return
      games = real
      const grid = root.querySelector<HTMLInputElement>('#search')
      query = grid ? grid.value : query
      root.innerHTML = html()
      attach()
    })
    .catch(() => {
      /* backend ishlamasa lokal demo ro'yxat bilan qolaveradi */
    })
}
