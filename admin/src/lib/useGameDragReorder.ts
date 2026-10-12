import { useEffect, type RefObject } from 'react'

const LONG_PRESS_MS = 300
const MOVE_CANCEL_THRESHOLD = 10

/**
 * `frontend/src/screens/admin/catalog.ts`dagi long-press + pointer-drag + FLIP animatsiya
 * mantig'ining aynan o'zi — lekin bu yerda to'g'ridan-to'g'ri DOM'ga (`[data-game]`
 * qatorlariga) ishlaydi, React state orqali emas (sudrash paytida qayta render bo'lsa
 * animatsiya buziladi). Faqat drag tugab, "Saqlash" bosilganda joriy DOM tartibi o'qiladi.
 */
export function useGameDragReorder(
  containerRef: RefObject<HTMLElement | null>,
  itemIds: string[],
  onSelect: (gameId: string) => void,
  onOrderChange: () => void,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function computeInsertBefore(clientY: number, exclude: HTMLElement): HTMLElement | null {
      const rows = Array.from(container!.querySelectorAll<HTMLElement>('[data-game]')).filter((r) => r !== exclude);
      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) return row;
      }
      return null;
    }

    function moveRowAnimated(row: HTMLElement, before: HTMLElement | null) {
      const rows = Array.from(container!.querySelectorAll<HTMLElement>('[data-game]'));
      const firstTops = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));

      if (before) container!.insertBefore(row, before);
      else container!.appendChild(row);

      for (const r of rows) {
        if (r === row) continue;
        const delta = (firstTops.get(r) ?? 0) - r.getBoundingClientRect().top;
        if (!delta) continue;
        r.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], {
          duration: 180,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        });
      }
    }

    const cleanups: (() => void)[] = [];

    container.querySelectorAll<HTMLElement>('[data-game]').forEach((row) => {
      const handle = row.querySelector<HTMLElement>('.drag-handle');
      if (!handle) return;
      const gameId = row.dataset.game!;

      let longPressTimer: number | null = null;
      let dragging = false;
      let suppressNextClick = false;

      function clearTimer() {
        if (longPressTimer) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }

      function onPointerDown(e: PointerEvent) {
        if (e.button !== undefined && e.button !== 0) return;
        const startY = e.clientY;
        clearTimer();

        longPressTimer = window.setTimeout(() => {
          longPressTimer = null;
          dragging = true;
          suppressNextClick = true;
          row.classList.add('dragging');
          try {
            handle!.setPointerCapture(e.pointerId);
          } catch {
            /* ba'zi brauzerlarda pointer capture ishlamasligi mumkin — sudrash baribir ishlayveradi */
          }
        }, LONG_PRESS_MS);

        const onMove = (ev: PointerEvent) => {
          if (dragging) {
            const before = computeInsertBefore(ev.clientY, row);
            if (before !== row.nextElementSibling) {
              moveRowAnimated(row, before);
              onOrderChange();
            }
            return;
          }
          if (Math.abs(ev.clientY - startY) > MOVE_CANCEL_THRESHOLD) {
            clearTimer();
          }
        };

        const onUp = () => {
          clearTimer();
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          if (dragging) {
            row.classList.remove('dragging');
            dragging = false;
          }
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      }

      function onHandleClick(e: MouseEvent) {
        e.stopPropagation();
      }

      function onRowClick() {
        if (suppressNextClick) {
          suppressNextClick = false;
          return;
        }
        onSelect(gameId);
      }

      handle.addEventListener('pointerdown', onPointerDown);
      handle.addEventListener('click', onHandleClick);
      row.addEventListener('click', onRowClick);

      cleanups.push(() => {
        handle.removeEventListener('pointerdown', onPointerDown);
        handle.removeEventListener('click', onHandleClick);
        row.removeEventListener('click', onRowClick);
        clearTimer();
      });
    });

    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, itemIds.join(','), onSelect, onOrderChange]);
}
