import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Masuk — Raja Aksesoris',
  description: 'Masuk ke dashboard manajemen Raja Aksesoris',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
