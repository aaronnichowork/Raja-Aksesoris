'use client'

export default function KomisiPage() {
  return (
    <div className="dashboard-page animate-fade-in">
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">Komisi Sales</h1>
        <p className="dashboard-page-subtitle">Hitung komisi target dan komisi brand</p>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="4 4" />
                <circle cx="22" cy="22" r="6" stroke="var(--color-primary)" strokeWidth="2" />
                <circle cx="42" cy="42" r="6" stroke="var(--color-primary)" strokeWidth="2" />
                <path d="M48 16L16 48" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="empty-state-title">Segera Hadir</h3>
            <p className="empty-state-description">
              Modul Komisi Sales akan tersedia di Phase 3.
              <br />
              Hitung komisi target per team dan komisi brand per individu.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
