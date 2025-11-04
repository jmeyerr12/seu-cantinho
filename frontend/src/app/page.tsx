'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function HomePage() {
  const [spaces, setSpaces] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const data = await apiFetch('/spaces');
      setSpaces(data);
    })();
  }, []);

  return (
    <main className='p-8'>
      <h1 className='text-3xl font-bold mb-6'>Espaços disponíveis</h1>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {spaces.map(space => (
          <Link key={space.id} href={`/spaces/${space.id}`}>
            <div className='border rounded-lg p-4 shadow hover:shadow-lg transition'>
              <h2 className='text-xl font-semibold'>{space.name}</h2>
              <p>Capacidade: {space.capacity}</p>
              <p>Preço: R$ {space.base_price_per_hour}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
