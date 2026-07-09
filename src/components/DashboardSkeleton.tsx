import React from 'react'

export function DashboardSkeleton() {
  return (
    <>
      <div className="page-header">
        <div>
          <div className="skeleton-pulse" style={{ width: 150, height: 32, marginBottom: 8, borderRadius: 6, background: 'var(--border-strong)' }}></div>
          <div className="skeleton-pulse" style={{ width: 200, height: 16, borderRadius: 4, background: 'var(--border-default)' }}></div>
        </div>
        <div className="flex gap-3">
          <div className="skeleton-pulse" style={{ width: 100, height: 36, borderRadius: 8, background: 'var(--border-strong)' }}></div>
          <div className="skeleton-pulse" style={{ width: 160, height: 36, borderRadius: 8, background: 'var(--accent-primary-glow)' }}></div>
        </div>
      </div>

      <div className="page-body">
        {/* Stat Cards Skeleton */}
        <div className="grid-cols-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ height: 160, display: 'flex', flexDirection: 'column' }}>
              <div className="skeleton-pulse" style={{ width: '40%', height: 12, marginBottom: 24, borderRadius: 4, background: 'var(--border-strong)' }}></div>
              <div className="skeleton-pulse" style={{ width: '60%', height: 42, marginBottom: 16, borderRadius: 8, background: 'var(--border-strong)' }}></div>
              <div className="skeleton-pulse" style={{ width: '80%', height: 12, marginTop: 'auto', borderRadius: 4, background: 'var(--border-default)' }}></div>
            </div>
          ))}
        </div>

        {/* Quick Actions Skeleton */}
        <div className="grid-cols-3 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card" style={{ height: 180 }}>
              <div className="skeleton-pulse" style={{ width: 48, height: 48, marginBottom: 20, borderRadius: 12, background: 'var(--border-strong)' }}></div>
              <div className="skeleton-pulse" style={{ width: '50%', height: 16, marginBottom: 12, borderRadius: 4, background: 'var(--border-strong)' }}></div>
              <div className="skeleton-pulse" style={{ width: '90%', height: 12, marginBottom: 8, borderRadius: 4, background: 'var(--border-default)' }}></div>
              <div className="skeleton-pulse" style={{ width: '70%', height: 12, borderRadius: 4, background: 'var(--border-default)' }}></div>
            </div>
          ))}
        </div>

        {/* Ledger Table Skeleton */}
        <div className="card" style={{ padding: 0 }}>
          <div className="flex items-center justify-between" style={{ padding: '24px 32px' }}>
            <div className="skeleton-pulse" style={{ width: 120, height: 16, borderRadius: 4, background: 'var(--border-strong)' }}></div>
            <div className="skeleton-pulse" style={{ width: 80, height: 28, borderRadius: 6, background: 'var(--border-default)' }}></div>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 32 }}>Item</th>
                  <th>Action</th>
                  <th>Source</th>
                  <th>Quantity</th>
                  <th>Timestamp</th>
                  <th style={{ paddingRight: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td style={{ paddingLeft: 32 }}><div className="skeleton-pulse" style={{ width: '80%', height: 14, borderRadius: 4, background: 'var(--border-default)' }}></div></td>
                    <td><div className="skeleton-pulse" style={{ width: 60, height: 20, borderRadius: 4, background: 'var(--border-default)' }}></div></td>
                    <td><div className="skeleton-pulse" style={{ width: 80, height: 14, borderRadius: 4, background: 'var(--border-default)' }}></div></td>
                    <td><div className="skeleton-pulse" style={{ width: 40, height: 14, borderRadius: 4, background: 'var(--border-default)' }}></div></td>
                    <td><div className="skeleton-pulse" style={{ width: 120, height: 14, borderRadius: 4, background: 'var(--border-default)' }}></div></td>
                    <td style={{ paddingRight: 32 }}><div className="skeleton-pulse" style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--border-default)', marginLeft: 'auto' }}></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .skeleton-pulse {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
      `}} />
    </>
  )
}
