'use client'

export default function PayrollPage() {
  return (
    <div className="dashboard-page animate-fade-in">
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">Payroll</h1>
        <p className="dashboard-page-subtitle">Kelola gaji dan tunjangan karyawan</p>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="4 4" />
                <circle cx="28" cy="24" r="7" stroke="var(--color-primary)" strokeWidth="2" />
                <path d="M14 52C14 44.268 20.268 38 28 38H32C39.732 38 46 44.268 46 52" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
                <path d="M44 28V40M38 34H50" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="empty-state-title">Segera Hadir</h3>
            <p className="empty-state-description">
              Modul Payroll akan tersedia di Phase 3.
              <br />
              Hitung gaji pokok, uang makan, tunjangan, potongan, dan kasbon.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
