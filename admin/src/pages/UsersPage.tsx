import { useEffect, useState } from 'react'
import { getUsers, type AdminUserDto } from '../lib/api'
import { formatSom } from '../lib/format'
import { EmptyState, ErrorState, Loading } from '../components/Status'

export function UsersPage() {
  const [users, setUsers] = useState<AdminUserDto[] | null>(null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    getUsers().then(setUsers).catch(setError)
  }, [])

  if (error) return <ErrorState error={error} />
  if (!users) return <Loading />

  return (
    <div>
      <div className="page-head">
        <h1>Foydalanuvchilar ({users.length})</h1>
      </div>
      {users.length === 0 ? (
        <EmptyState text="Hali foydalanuvchi yo'q" />
      ) : (
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Foydalanuvchi</th>
              <th>Telefon</th>
              <th>Balans</th>
              <th>Buyurtmalar</th>
              <th>Jami sarflagan</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <b>{u.firstName || u.username || u.telegramId}</b>
                  {u.username && <div className="cell-sub">@{u.username}</div>}
                </td>
                <td>{u.phone || '—'}</td>
                <td>{formatSom(u.balance)}</td>
                <td>{u.ordersCount}</td>
                <td>{formatSom(u.totalSpent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
