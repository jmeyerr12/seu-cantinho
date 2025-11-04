'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

export default function SpacePage() {
  const { id } = useParams<{ id: string }>();
  const [space, setSpace] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/spaces/${id}`);
        setSpace(data);
      } catch (e: any) {
        setErr(e.message || 'Erro ao carregar espaço');
      }
    })();
  }, [id]);

  if (err) return <p className="p-8 text-red-600">{err}</p>;
  if (!space) return <p className="p-8">Carregando…</p>;

  return (
    <main className='p-8'>
      <h1 className='text-3xl font-bold mb-3'>{space.name}</h1>
      <p className='mb-2'>{space.description}</p>
      <p className='mb-1'>Capacidade: {space.capacity}</p>
      <p className='mb-6'>Preço: R$ {space.base_price_per_hour}</p>
      <Link href={`/reservations/new?spaceId=${space.id}`} className='bg-green-600 text-white px-4 py-2 rounded'>
        Reservar este espaço
      </Link>
    </main>
  );
}
