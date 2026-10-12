import { useEffect, useState } from 'react'
import { getLowStock, getOverview, getTopGames, type LowStockDto, type OverviewDto, type TopGameDto } from '../lib/api'
import { formatSom } from '../lib/format'
import { EmptyState, ErrorState, Loading } from '../components/Status'

export function StatsPage() {
  const [overview, setOverview] = useState<OverviewDto | null>(null)
  const [topGames, setTopGames] = useState<TopGameDto[] | null>(null)
  const [lowStock, setLowStock] = useState<LowStockDto[] | null>(null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    Promise.all([getOverview(), getTopGames(7), getLowStock()])
      .then(([o, t, l]) => {
        setOverview(o)
        setTopGames(t)
        setLowStock(l)
      })
      .catch(setError)
  }, [])

  if (error) return <ErrorState error={error} />
  if (!overview || !topGames || !lowStock) return <Loading />

  return (
    <div>
      <div className="page-head">
        <h1>Statistika</h1>
      </div>
      <div className="stat-grid">
        <StatBox label="Bugungi daromad" value={formatSom(overview.todayRevenue)} />
        <StatBox label="Haftalik daromad" value={formatSom(overview.weekRevenue)} />
        <StatBox label="Jami daromad" value={formatSom(overview.totalRevenue)} />
        <StatBox label="Foydalanuvchilar" value={String(overview.totalUsers)} />
        <StatBox label="Bajarilgan buyurtma" value={String(overview.completedCount)} />
        <StatBox label="Bekor qilingan" value={String(overview.cancelledCount)} />
      </div>

      <div className="page-head">
        <h2>Ko'p sotilayotgan o'yinlar (7 kun)</h2>
      </div>
      {topGames.length === 0 ? (
        <EmptyState text="Bu davrda sotuv bo'lmagan" />
      ) : (
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>O'yin</th>
              <th>Buyurtma</th>
              <th>Dona</th>
              <th>Daromad</th>
            </tr>
          </thead>
          <tbody>
            {topGames.map((g) => (
              <tr key={g.gameId}>
                <td>{g.name}</td>
                <td>{g.orders}</td>
                <td>{g.unitsSold}</td>
                <td className="accent-text">{formatSom(g.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <div className="page-head">
        <h2>Zaxira kam/tugagan o'yinlar</h2>
      </div>
      {lowStock.length === 0 ? (
        <EmptyState text="Barcha o'yinlarda zaxira yetarli" />
      ) : (
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>O'yin</th>
              <th>Qoldiq</th>
            </tr>
          </thead>
          <tbody>
            {lowStock.map((i) => (
              <tr key={i.gameId}>
                <td>{i.name}</td>
                <td>
                  <span className="badge badge-danger">{i.balance}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-box">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  )
}
