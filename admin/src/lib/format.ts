export function formatSom(amount: number): string {
  return `${Math.round(amount).toLocaleString('ru-RU')} so'm`
}

export function formatCardDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }): string {
  return new Date(iso).toLocaleString('ru-RU', opts)
}
