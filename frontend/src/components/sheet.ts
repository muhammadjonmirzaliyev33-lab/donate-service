let overlayEl: HTMLDivElement | null = null;

export function closeSheet() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

export function openSheet(html: string): HTMLDivElement {
  // Agar sheet allaqachon ochiq bo'lsa — faqat ichini yangilaymiz (kirish animatsiyasini
  // qayta ishga tushirmaymiz). Aks holda har bir fon-yangilanish (masalan balans/holat
  // pollingi) sheet'ni yopib-qayta ochganday "miltillab" ko'rinar edi.
  if (overlayEl) {
    const sheet = overlayEl.querySelector<HTMLDivElement>('.sheet')!;
    sheet.innerHTML = html;
    return overlayEl;
  }
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  overlay.innerHTML = `<div class="sheet">${html}</div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSheet();
  });
  document.body.appendChild(overlay);
  overlayEl = overlay;
  return overlay;
}

export function sheetRoot(): HTMLDivElement | null {
  return overlayEl;
}

export function showToast(message: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/**
 * Ilova ichidagi tasdiqlash oynasi — brauzerning nativ confirm()'i o'rniga. U ilova
 * uslubiga mos, va sheet ustiga sheet ochilganda ham (masalan buyurtma detali ustida)
 * to'g'ri ishlaydi (biror sheet ochiq bo'lsa uni vaqtincha yashirib, keyin qaytaradi).
 */
export function confirmSheet(opts: { title: string; message?: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    const previousOverlay = overlayEl;
    if (previousOverlay) previousOverlay.style.display = 'none';

    const confirmLabel = opts.confirmLabel ?? 'Tasdiqlash'
    const html = `
      <div class="sheet-grabber"></div>
      <div class="sheet-title">${opts.title}</div>
      ${opts.message ? `<div class="sheet-sub">${opts.message}</div>` : ''}
      <div class="sheet-actions">
        <button class="btn ${opts.danger ? 'btn-soft' : 'btn-accent'} btn-block" id="confirm-yes" ${opts.danger ? 'style="color:var(--danger)"' : ''}>${confirmLabel}</button>
        <button class="btn btn-soft btn-block" id="confirm-no">Bekor qilish</button>
      </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'sheet-overlay';
    overlay.innerHTML = `<div class="sheet">${html}</div>`;

    function finish(result: boolean) {
      overlay.remove();
      if (previousOverlay) previousOverlay.style.display = '';
      resolve(result);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish(false);
    });
    overlay.querySelector('#confirm-yes')!.addEventListener('click', () => finish(true));
    overlay.querySelector('#confirm-no')!.addEventListener('click', () => finish(false));

    document.body.appendChild(overlay);
  });
}
