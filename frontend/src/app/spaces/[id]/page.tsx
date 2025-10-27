import { serverApi } from '@/lib/server-api';
import Link from 'next/link';

export default async function SpacePage({ params }: { params: { id: string } }) {
  const space = await serverApi(`/spaces/${params.id}`);

  return (
    <main className='p-8'>
      <h1 className='text-3xl font-bold mb-3'>{space.name}</h1>
      <p className='mb-2'>{space.description}</p>
      <p className='mb-1'>Capacidade: {space.capacity}</p>
      <p className='mb-6'>Preço: R$ {space.price}</p>
      <Link href={`/reservations/new?spaceId=${space.id}`} className='bg-green-600 text-white px-4 py-2 rounded'>
        Reservar este espaço
      </Link>
    </main>
  );
}
