import { getBanners, type BannerDto } from '../api'
import { asset } from '../assets'

/**
 * Standart reklama bannerlari (frontend/public/banners) — admin paneldan hali banner qo'shilmagan
 * bo'lsa yoki backend javob bermasa shular ko'rsatiladi. Admin o'z bannerini qo'shsa, o'shalar chiqadi.
 */
const DEFAULT_BANNERS: Pick<BannerDto, 'imageUrl' | 'link'>[] = [
  { imageUrl: '/banners/uzdi.webp', link: '#/games' },
  { imageUrl: '/banners/mlbb.webp', link: '#/game/mlbb' },
  { imageUrl: '/banners/pubg-freefire.webp', link: '#/game/pubgm' },
  { imageUrl: '/banners/telegram.webp', link: '#/game/tgstars' },
]

/** Bosh sahifa karuseli. */
export function mountBanners(holder: HTMLElement) {
  getBanners()
    .catch(() => [] as BannerDto[])
    .then((fromAdmin: Pick<BannerDto, 'imageUrl' | 'link'>[]) => {
      const banners = (fromAdmin.length ? fromAdmin : DEFAULT_BANNERS).map((b) => ({ ...b, imageUrl: asset(b.imageUrl) }))
      holder.innerHTML = `
        <div class="banner-track">
          ${banners
            .map(
              (b) =>
                `<div class="banner-slide" ${b.link ? `data-link="${b.link}"` : ''}><img src="${b.imageUrl}" alt="" loading="lazy" /></div>`
            )
            .join('')}
        </div>
        ${banners.length > 1 ? `<div class="banner-dots">${banners.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('')}</div>` : ''}
      `
      const track = holder.querySelector<HTMLElement>('.banner-track')!
      const dots = Array.from(holder.querySelectorAll<HTMLElement>('.banner-dots span'))
      holder.classList.add('has-banners')

      track.querySelectorAll<HTMLElement>('[data-link]').forEach((slide) => {
        slide.addEventListener('click', () => {
          const link = slide.dataset.link!
          if (link.startsWith('#')) location.hash = link
          else window.open(link, '_blank')
        })
      })

      const syncDots = () => {
        const i = Math.round(track.scrollLeft / track.clientWidth)
        dots.forEach((d, idx) => d.classList.toggle('active', idx === i))
      }
      track.addEventListener('scroll', syncDots, { passive: true })

      if (banners.length > 1) {
        let i = 0
        const timer = window.setInterval(() => {
          if (!document.body.contains(holder)) return window.clearInterval(timer)
          i = (i + 1) % banners.length
          track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' })
        }, 4500)
      }
    })
}
