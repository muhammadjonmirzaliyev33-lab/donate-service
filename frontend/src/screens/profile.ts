import { formatSom, getState, setBalance, setIdentity, setLanguage, setTheme, somHtml, t } from '../store'
import { openReferralSheet } from '../components/referral'
import { openRatingSheet } from '../components/rating'
import { showToast } from '../components/sheet'
import { iconHtml } from '../icons'
import { ApiError, getMe, getSettings, redeemPromoCode } from '../api'
import { openTelegramLink, tg } from '../telegram'

const FAQ_COUNT = 8

export function renderProfile(root: HTMLElement) {
  let openFaq: number | null = null

  function faqHtml(): string {
    return Array.from({ length: FAQ_COUNT }, (_, i) => {
      const n = i + 1
      const open = openFaq === n
      return `
        <div class="faq-item ${open ? 'open' : ''}" data-faq="${n}">
          <div class="faq-q">
            <span class="faq-num">${String(n).padStart(2, '0')}</span>
            <span class="faq-text">${t(`faq${n}q`)}</span>
            ${iconHtml(open ? 'x' : 'plus', 'faq-toggle', 14)}
          </div>
          ${open ? `<div class="faq-a">${t(`faq${n}a`)}</div>` : ''}
        </div>`
    }).join('')
  }

  // Telegram profil rasmi (bor bo'lsa) — avatar o'rnida ko'rsatiladi.
  const photoUrl = tg?.initDataUnsafe?.user?.photo_url ?? ''

  function html(): string {
    const state = getState()
    const dark = state.theme === 'dark'
    return `
      <div class="profile-card">
        ${
          photoUrl
            ? `<div class="avatar big avatar-photo"><img src="${photoUrl}" alt="" referrerpolicy="no-referrer" /></div>`
            : `<div class="avatar big">${Array.from(state.username)[0]?.toUpperCase() ?? '?'}</div>`
        }
        <h3>${state.username}</h3>
        <button class="id-chip copyable" id="copy-id">${state.handle ? `${state.handle} ` : ''}ID: ${state.userId} ${iconHtml('copy', '', 12)}</button>
        <div class="balance-card inner">
          <div class="balance-info">
            <div class="balance-label">${t('balanceLabel')}</div>
            <div class="balance-amount">${somHtml(state.balance)}</div>
          </div>
          <button class="btn btn-accent" id="row-topup">${iconHtml('plus', '', 14)} ${t('topUp')}</button>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <span class="panel-icon">${iconHtml('phone', '', 16)}</span>
          <div><b>${t('phoneNumber')}</b><span>${t('phoneOptionalSub')}</span></div>
        </div>
        <button class="panel-btn" id="row-phone">${state.phone ? `✅ ${state.phone}` : t('sharePhone')}</button>
      </div>

      <div class="panel">
        <div class="panel-head">
          <span class="panel-icon">${iconHtml('ticket', '', 16)}</span>
          <b>${t('promoCodesBtn')}</b>
        </div>
        <div class="promo-row">
          <input class="input" id="promo-input" placeholder="${t('promoInputPlaceholder')}" style="text-transform:uppercase" />
          <button class="btn btn-accent" id="promo-btn">${t('activateBtn')}</button>
        </div>
      </div>

      <div class="duo">
        <div class="duo-card" id="row-invite">
          <span class="panel-icon">${iconHtml('userPlus', '', 18)}</span>
          <b>${t('inviteFriends')}</b>
          <span>${t('inviteFriendsSub')}</span>
        </div>
        <div class="duo-card" id="row-rating">
          <span class="panel-icon gold">${iconHtml('medal', '', 18)}</span>
          <b>${t('topDonors')}</b>
          <span>${t('topDonorsSub')}</span>
        </div>
      </div>

      <div class="panel rows">
        <div class="setting-row">
          <span class="setting-icon">${iconHtml('globe', '', 16)}</span>
          <b>${t('languageSection')}</b>
          <div class="toggle">
            <button class="${state.language === 'uz' ? 'active' : ''}" data-lang="uz">UZ</button>
            <button class="${state.language === 'ru' ? 'active' : ''}" data-lang="ru">RU</button>
          </div>
        </div>
        <div class="setting-row">
          <span class="setting-icon">${iconHtml(dark ? 'moon' : 'sun', '', 16)}</span>
          <b>${t('themeLabel')}</b>
          <div class="toggle">
            <button class="${dark ? 'active' : ''}" data-theme-set="dark">${iconHtml('moon', '', 14)}</button>
            <button class="${dark ? '' : 'active'}" data-theme-set="light">${iconHtml('sun', '', 14)}</button>
          </div>
        </div>
        <div class="setting-row tap" id="row-help">
          <span class="setting-icon">${iconHtml('headset', '', 16)}</span>
          <b>${t('helpCenter')}</b>
          ${iconHtml('chevronRight', 'guide-chevron', 16)}
        </div>
      </div>

      <div class="sub-head caps">${t('socialsHeader')}</div>
      <div class="panel social" id="row-social">
        ${iconHtml('send', '', 20)}
        <span>${t('supportLabel')}</span>
      </div>

      <div class="sub-head caps">${t('faqHeader')}</div>
      <div class="panel rows faq">${faqHtml()}</div>

      <div class="sub-head caps">${t('aboutHeader')}</div>
      <div class="panel rows about">
        <div class="about-row"><b>UZDI</b><span>${t('versionLabel')} 1.0.0</span></div>
      </div>
    `
  }

  let supportUsername: string | null = null

  function mount() {
    root.innerHTML = html()
    root.querySelectorAll<HTMLElement>('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setLanguage(btn.dataset.lang as 'uz' | 'ru')
        mount()
      })
    })
    root.querySelectorAll<HTMLElement>('[data-theme-set]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setTheme(btn.dataset.themeSet as 'dark' | 'light')
        mount()
      })
    })
    bindFaq()
    root.querySelector('#copy-id')?.addEventListener('click', async () => {
      const id = String(getState().userId)
      try {
        await navigator.clipboard.writeText(id)
      } catch {
        const ta = document.createElement('textarea')
        ta.value = id
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      }
      tg?.HapticFeedback?.notificationOccurred('success')
      showToast(t('idCopied'))
    })
    root.querySelector('.avatar-photo img')?.addEventListener('error', () => {
      const av = root.querySelector('.avatar-photo')
      if (av) av.outerHTML = `<div class="avatar big">${Array.from(getState().username)[0]?.toUpperCase() ?? '?'}</div>`
    })
    root.querySelector('#row-topup')!.addEventListener('click', () => (location.hash = '#/topup'))
    root.querySelector('#row-invite')!.addEventListener('click', () => openReferralSheet())
    root.querySelector('#row-rating')!.addEventListener('click', () => openRatingSheet())
    root.querySelector('#row-phone')!.addEventListener('click', () => showToast(t('phoneChangeSoon')))

    const promoInput = root.querySelector<HTMLInputElement>('#promo-input')!
    const promoBtn = root.querySelector<HTMLButtonElement>('#promo-btn')!
    promoInput.addEventListener('input', () => (promoInput.value = promoInput.value.toUpperCase()))
    promoBtn.addEventListener('click', async () => {
      const code = promoInput.value.trim()
      if (!code) return showToast(t('promoCodeEnterCode'))
      promoBtn.disabled = true
      try {
        const result = await redeemPromoCode(code)
        setBalance(result.balance, getState().cashback)
        showToast(`${t('promoCodeSuccess')} — +${formatSom(result.bonusAmount)}`)
        mount()
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : t('genericError'))
        promoBtn.disabled = false
      }
    })

    const openSupport = () => {
      if (supportUsername) openTelegramLink(supportUsername)
      else showToast(t('supportSoon'))
    }
    root.querySelector('#row-help')!.addEventListener('click', openSupport)
    root.querySelector('#row-social')!.addEventListener('click', openSupport)

    // Haqiqiy balans/ism backenddan — kelguncha lokal (eski) qiymat ko'rinib turadi.
    Promise.all([getMe(), getSettings().catch(() => null)])
      .then(([me, cfg]) => {
        setBalance(me.balance, me.cashback)
        // Admin paneldan berilgan profil qiymatlari bo'lsa, ular Telegram ma'lumotlaridan ustun turadi.
        const displayName = cfg?.profileName || me.firstName || me.username || t('defaultUsername')
        const handle = cfg?.profileHandle || (me.username ? `@${me.username}` : '')
        const userId = cfg?.profileId || me.telegramId
        setIdentity({ username: displayName, handle, userId, phone: me.phone })

        const card = root.querySelector('.profile-card')
        if (!card) return
        card.querySelector('.avatar')!.textContent = displayName.slice(0, 1).toUpperCase()
        card.querySelector('h3')!.textContent = displayName
        card.querySelector('.id-chip')!.textContent = `${handle ? `${handle} ` : ''}ID: ${me.telegramId}`
        card.querySelector('.balance-amount')!.innerHTML = somHtml(me.balance)
        const phoneBtn = root.querySelector('#row-phone')
        if (phoneBtn) phoneBtn.textContent = me.phone ? `✅ ${me.phone}` : t('sharePhone')
      })
      .catch(() => {
        /* Telegram tashqarisida (oddiy brauzer) initData yo'q — lokal qiymat bilan qolaveradi */
      })
  }

  function bindFaq() {
    root.querySelectorAll<HTMLElement>('[data-faq]').forEach((el) => {
      el.addEventListener('click', () => {
        const n = Number(el.dataset.faq)
        openFaq = openFaq === n ? null : n
        root.querySelector('.faq')!.innerHTML = faqHtml()
        bindFaq()
      })
    })
  }

  getSettings()
    .then((s) => {
      supportUsername = s.supportUsername
    })
    .catch(() => {
      /* sozlamalar yuklanmasa — "tez orada" holatida qoladi */
    })

  mount()
}
