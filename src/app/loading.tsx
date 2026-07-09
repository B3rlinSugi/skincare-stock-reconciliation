export default function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', flexDirection: 'column', gap: 16 }}>
      <div className="spinner" style={{ 
        width: 40, 
        height: 40, 
        border: '3px solid var(--border-default)', 
        borderTopColor: 'var(--accent-primary)', 
        borderRadius: '50%', 
        animation: 'spin 1s linear infinite' 
      }} />
      <div className="text-secondary text-sm font-semibold">Memuat Data...</div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  )
}
