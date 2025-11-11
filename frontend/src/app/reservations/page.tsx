'use client';

import { useEffect, useState, useMemo } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

type Reservation = {
  id: string;
  space_id?: string;
  space?: { name?: string; price?: number };
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | string;
  // quando seu back trouxer total da reserva:
  total_amount?: number; // esperado em CENTAVOS
  // fallback comuns que às vezes vêm:
  total?: number; amount?: number; price?: number;
  spaceName?: string; startDate?: string; when?: string;
};

function centsToBRL(cents?: number) {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return '-';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ReservationsPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        let url = '/reservations';
        if (user?.role === 'CUSTOMER' && user.id) {
          const qs = new URLSearchParams({ customerId: user.id });
          url = `/reservations?${qs.toString()}`;
        }

        const data = await apiFetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        setItems(Array.isArray(data) ? data : (data?.items ?? []));
      } catch (e: any) {
        setErr(e.message ?? 'Erro ao carregar reservas');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, user?.id, user?.role]);

  function renderSpaceName(r: Reservation) {
    return r.spaceName ?? r.space?.name ?? r.space_id ?? '-';
  }

  function renderDate(r: Reservation) {
    const base = r.date ?? r.startDate ?? r.when ?? '-';
    const hours = r.start_time && r.end_time ? ` ${r.start_time}–${r.end_time}` : '';
    return `${base}${hours}`;
  }

  function renderTotalBRL(r: Reservation) {
    // prioridade: total_amount (centavos). Fallbacks: total/amount/price (reais) ou space.price (reais)
    if (typeof r.total_amount === 'number') return centsToBRL(r.total_amount);
    const realLike = r.total ?? r.amount ?? r.price ?? r.space?.price;
    if (typeof realLike === 'number' && Number.isFinite(realLike)) {
      return (realLike).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return '-';
  }

  return (
    <RequireAuth>
      <div className='p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h1 className='text-2xl font-bold'>Minhas Reservas</h1>
          <Link href='/reservations/new' className='bg-green-600 text-white px-3 py-2 rounded'>
            Nova Reserva
          </Link>
        </div>

        {loading && <p>Carregando…</p>}
        {err && <p className='text-red-600'>{err}</p>}

        {!loading && !err && (
          <div className='border rounded overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-500'>
                <tr>
                  <th className='text-left p-2'>#</th>
                  <th className='text-left p-2'>Espaço</th>
                  <th className='text-left p-2'>Data</th>
                  <th className='text-left p-2'>Status</th>
                  <th className='text-left p-2'>Valor</th>
                  <th className='text-left p-2'>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className='border-t'>
                    <td className='p-2'>{r.id}</td>
                    <td className='p-2'>{renderSpaceName(r)}</td>
                    <td className='p-2'>{renderDate(r)}</td>
                    <td className='p-2'>{r.status ?? '-'}</td>
                    <td className='p-2'>{renderTotalBRL(r)}</td>
                    <td className='p-2'>
                      {/* Direto para a tela onde o usuário pode pagar sinal/restante */}
                      <Link
                        href={`/reservations/${r.id}`}
                        className='px-3 py-1.5 border rounded hover:bg-gray-50'
                      >
                        Detalhes / Pagamentos
                      </Link>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td className='p-3' colSpan={6}>Nenhuma reserva.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
