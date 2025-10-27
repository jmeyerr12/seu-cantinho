'use client';

import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { apiFetch } from '@/lib/api';

type AnyObj = Record<string, any>;

export default function ReservationsPage() {
  const [items, setItems] = useState<AnyObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // o backend normalmente retorna as reservas do usuário logado quando o role é CUSTOMER
        const data = await apiFetch('/reservations');
        setItems(Array.isArray(data) ? data : (data?.items ?? []));
      } catch (e: any) {
        setErr(e.message ?? 'Erro ao carregar reservas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <RequireAuth>
      <div className='p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h1 className='text-2xl font-bold'>Minhas Reservas</h1>
          <a href='/reservations/new' className='bg-green-600 text-white px-3 py-2 rounded'>
            Nova Reserva
          </a>
        </div>

        {loading && <p>Carregando…</p>}
        {err && <p className='text-red-600'>{err}</p>}

        {!loading && !err && (
          <div className='border rounded'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='text-left p-2'>#</th>
                  <th className='text-left p-2'>Espaço</th>
                  <th className='text-left p-2'>Data</th>
                  <th className='text-left p-2'>Status</th>
                  <th className='text-left p-2'>Valor</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r: AnyObj) => (
                  <tr key={r.id} className='border-t'>
                    <td className='p-2'>{r.id}</td>
                    <td className='p-2'>{r.spaceName ?? r.space?.name ?? r.space_id ?? '-'}</td>
                    <td className='p-2'>{r.date ?? r.startDate ?? r.when ?? '-'}</td>
                    <td className='p-2'>{r.status ?? '-'}</td>
                    <td className='p-2'>{r.total ?? r.amount ?? r.price ?? '-'}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td className='p-3' colSpan={5}>Nenhuma reserva.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
