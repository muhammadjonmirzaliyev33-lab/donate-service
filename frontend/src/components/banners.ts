import { getBanners, type BannerDto } from '../api'

/** Bosh sahifa karuseli — bannerlar bo'lmasa (yoki backend javob bermasa) hech narsa ko'rsatilmaydi. */
export function mountBanners(holder: HTMLElement) {
  getBanners()
    .then((banners: BannerDto[]) => {
      if (banners.length === 0) return
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
    .catch(() => {
      /* backend ishlamasa banner ko'rsatilmaydi */
    })
}
