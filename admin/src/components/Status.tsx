import { ApiError } from '../lib/api'

export function Loading() {
  return <div className="empty-state">Yuklanmoqda…</div>
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>
}

export function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Noma'lum xatolik"
  return <div className="empty-state error">{message}</div>
}
