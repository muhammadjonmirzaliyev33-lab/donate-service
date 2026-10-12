export function currentHash(): string {
  return location.hash || '#/';
}

export function parseRoute(hash: string): { name: string; param?: string } {
  if (hash === '#/' || hash === '') return { name: 'home' };
  if (hash === '#/games') return { name: 'games' };
  if (hash === '#/history') return { name: 'history' };
  if (hash === '#/profile') return { name: 'profile' }
  if (hash === '#/topup') return { name: 'topup' };
  if (hash === '#/admin') return { name: 'admin-queue' };
  if (hash === '#/admin/history') return { name: 'admin-history' };
  if (hash === '#/admin/stats') return { name: 'admin-stats' };
  if (hash === '#/admin/users') return { name: 'admin-users' };
  if (hash === '#/admin/catalog') return { name: 'admin-catalog' };
  if (hash === '#/admin/stock') return { name: 'admin-stock' };
  if (hash === '#/admin/cards') return { name: 'admin-cards' };
  if (hash === '#/admin/promo') return { name: 'admin-promo' };
  if (hash === '#/admin/broadcast') return { name: 'admin-broadcast' };
  if (hash === '#/admin/broadcast/history') return { name: 'admin-broadcast-history' };
  if (hash === '#/admin/settings') return { name: 'admin-settings' };
  const gameMatch = hash.match(/^#\/game\/(.+)$/);
  if (gameMatch) return { name: 'game', param: gameMatch[1] };
  return { name: 'home' };
}
