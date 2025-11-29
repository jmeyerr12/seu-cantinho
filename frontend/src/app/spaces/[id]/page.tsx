'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

type PhotoItem = {
  id: string;
  href: string;
};

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

export default function SpacePage() {
  const { id } = useParams<{ id: string }>();
  const [space, setSpace] = useState<any>(null);
  const [err, setErr] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const { user, isLogged } = useAuth();
  const isAdmin = isLogged && user?.role === 'ADMIN';

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/spaces/${id}`);
        setSpace(data);

        const resp = await apiFetch(`/spaces/${id}/photos/links`);
        setPhotos(resp.items || []);
      } catch (e: any) {
        setErr(e.message || 'Erro ao carregar espaço');
      }
    })();
  }, [id]);

  if (err) return <p className="p-8 text-red-600">{err}</p>;
  if (!space) return <p className="p-8">Carregando…</p>;

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-3">{space.name}</h1>
      <p className="mb-2">{space.description}</p>
      <p className="mb-1">Capacidade: {space.capacity}</p>
      <p className="mb-6">Preço: R$ {space.base_price_per_hour}</p>

      <div className="flex gap-3">
        <Link
          href={`/reservations/new?spaceId=${space.id}`}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Reservar este espaço
        </Link>

        {isAdmin && (
          <Link
            href={`/spaces/${space.id}/newPhoto`}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Adicionar fotos
          </Link>
        )}
      </div>

      {photos.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold mb-2">Fotos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((p) => (
              <img
                key={p.id}
                src={`${backendUrl}${p.href}`}
                alt=""
                className="rounded border border-gray-200"
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
