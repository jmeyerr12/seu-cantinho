import './globals.css';
import NavBar from '@/components/NavBar';
import AuthActions from '@/components/AuthActions';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='pt-BR'>
      <body>
        <header className='border-b'>
          <div className='max-w-5xl mx-auto flex items-center justify-between p-4'>
            <NavBar />
            <AuthActions />
          </div>
        </header>
        <main className='max-w-5xl mx-auto'>{children}</main>
      </body>
    </html>
  );
}
