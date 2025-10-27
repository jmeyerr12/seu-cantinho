import './globals.css';
import Link from 'next/link';
import AuthActions from '@/components/AuthActions';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='pt-BR'>
      <body>
        <header className='border-b'>
          <div className='max-w-5xl mx-auto flex items-center justify-between p-4'>
            <nav className='flex gap-4'>
              <Link href='/' className='font-semibold'>Seu Cantinho</Link>
              <Link href='/reservations'>Minhas Reservas</Link>
            </nav>
            <AuthActions />
          </div>
        </header>
        <main className='max-w-5xl mx-auto'>{children}</main>
      </body>
    </html>
  );
}
