export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Noma'lum xatolik"
}
