import { iconHtml } from '../../icons'
import { showToast, confirmSheet } from '../../components/sheet'
import { sendBroadcast } from '../../admin/api'
import { adminShellHtml, scrollActiveAdminTabIntoView } from '../../admin/layout'

const MAX_IMAGES = 5

export function renderAdminBroadcast(root: HTMLElement) {
  let images: File[] = []

  function html(): string {
    return `
      <div class="section-head">
        <h2>Barchaga xabar yuborish</h2>
        <a class="link-btn" href="#/admin/broadcast/history">${iconHtml('clock')} Tarix</a>
      </div>
      <div class="field-group">
        <div class="field-label"><span>Xabar matni</span></div>
        <textarea class="input" id="f-message" rows="6" placeholder="🔥 Aksiya! Bugun barcha PUBG paketlariga 10% chegirma." style="resize:vertical;min-height:120px"></textarea>
        <div class="field-label" style="margin-top:10px"><span>Rasmlar (ixtiyoriy, maksimum ${MAX_IMAGES} ta)</span></div>
        <input class="input" id="f-images" type="file" accept="image/*" multiple style="padding:10px" />
        ${
          images.length > 0
            ? `<div id="image-previews" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                ${images
                  .map(
                    (file, i) => `
                    <div style="position:relative;width:64px;height:64px">
                      <img src="${URL.createObjectURL(file)}" style="width:100%;height:100%;object-fit:cover;border-radius:10px" />
                      <button data-remove-image="${i}" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:999px;border:none;background:var(--danger);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer">${iconHtml('x', '', 12)}</button>
                    </div>
                  `
                  )
                  .join('')}
              </div>`
            : ''
        }
      </div>
      <div class="hint-box">${iconHtml('circleAlert')} Xabar botga ulangan BARCHA foydalanuvchilarga ketadi. Ehtiyot bo'ling — ortga qaytarib bo'lmaydi.</div>
      <div class="sheet-actions" style="padding:0 16px">
        <button class="btn btn-accent btn-block" id="send-broadcast">${iconHtml('message')} Yuborish</button>
      </div>
    `
  }

  function mount() {
    root.innerHTML = adminShellHtml('broadcast', html())
    scrollActiveAdminTabIntoView(root)

    const textarea = root.querySelector<HTMLTextAreaElement>('#f-message')!
    const imagesInput = root.querySelector<HTMLInputElement>('#f-images')!
    const btn = root.querySelector<HTMLButtonElement>('#send-broadcast')!

    imagesInput.addEventListener('change', () => {
      const picked = Array.from(imagesInput.files ?? [])
      if (images.length + picked.length > MAX_IMAGES) {
        showToast(`Ko'pi bilan ${MAX_IMAGES} ta rasm yuklash mumkin`)
      }
      images = [...images, ...picked].slice(0, MAX_IMAGES)
      const message = textarea.value
      mount()
      root.querySelector<HTMLTextAreaElement>('#f-message')!.value = message
    })

    root.querySelectorAll<HTMLElement>('[data-remove-image]').forEach((el) => {
      el.addEventListener('click', () => {
        const i = Number(el.dataset.removeImage)
        images = images.filter((_, idx) => idx !== i)
        const message = textarea.value
        mount()
        root.querySelector<HTMLTextAreaElement>('#f-message')!.value = message
      })
    })

    btn.addEventListener('click', async () => {
      const message = textarea.value.trim()
      if (!message) {
        showToast('Xabar matnini kiriting')
        return
      }
      const ok = await confirmSheet({
        title: 'Xabar yuborilsinmi?',
        message: "Xabar botga ulangan barcha foydalanuvchilarga yuboriladi. Bu amalni ortga qaytarib bo'lmaydi.",
        confirmLabel: 'Yuborish'
      })
      if (!ok) return

      btn.disabled = true
      btn.style.cursor = 'not-allowed'
      btn.textContent = 'Yuborilmoqda…'
      try {
        await sendBroadcast(message, images)
        showToast('Yuborish boshlandi — foydalanuvchilarga ketmoqda')
        images = []
        textarea.value = ''
        mount()
        return
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Xatolik yuz berdi')
      } finally {
        btn.disabled = false
        btn.style.cursor = ''
        btn.innerHTML = `${iconHtml('message')} Yuborish`
      }
    })
  }

  mount()
}
