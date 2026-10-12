import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { login } from '../lib/api'
import { errorMessage } from '../lib/errors'

export function LoginPage({ onLoggedIn }: { onLoggedIn: (username: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      const { username: confirmedUsername } = await login(username.trim(), password)
      onLoggedIn(confirmedUsername)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>UZDI Admin</h1>
        <p className="login-sub">Kirish uchun login va parolingizni kiriting</p>
        <label className="field-label">Login</label>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <label className="field-label">Parol</label>
        <div className="password-row">
          <input
            className="input"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-accent btn-block" type="submit" disabled={loading}>
          {loading ? 'Kirilmoqda…' : 'Kirish'}
        </button>
      </form>
    </div>
  )
}
