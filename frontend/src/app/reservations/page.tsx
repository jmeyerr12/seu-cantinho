'use client';

import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | string;

type Reservation = {
  id: string;
  space_id?: string;
  space?: { name?: string; price?: number };
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: ReservationStatus;

  // quando seu back trouxer total da reserva:
  total_amount?: number; // esperado em CENTAVOS

  // fallbacks comuns:
  total?: number;
  amount?: number;
  price?: number;
  spaceName?: string;
  startDate?: string;
  when?: string;
};

type SpaceSummary = {
  id: string;
  name?: string;
  base_price_per_hour?: number;
  price?: number;
};

function centsToBRL(cents?: number) {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return '-';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDateBR(value?: string) {
  if (!value) return '-';
  const [datePart] = value.split('T'); // 2025-12-01 ou 2025-12-01T00:00:00.000Z
  const [yyyy, mm, dd] = datePart.split('-');
  if (!yyyy || !mm || !dd) return value;
  return `${dd}/${mm}/${yyyy}`;
}

function formatTimeHHMM(value?: string) {
  if (!value) return '';
  const [hh, mm] = value.split(':');
  if (!hh || !mm) return value;
  return `${hh}:${mm}`;
}

function timeToMinutes(t: string) {
  const [hh, mm] = t.split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return hh * 60 + mm;
}

function durationHours(r: Reservation): number {
  if (!r.start_time || !r.end_time) return 0;
  const diffMin = timeToMinutes(r.end_time) - timeToMinutes(r.start_time);
  const h = diffMin / 60;
  return h > 0 ? h : 0;
}

export default function ReservationsPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');
  const [spacesCache, setSpacesCache] = useState<Record<string, SpaceSummary>>(
    {},
  );

  // Carrega reservas
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr('');

        let url = '/reservations';
        if (user?.role === 'CUSTOMER' && user.id) {
          const qs = new URLSearchParams({ customerId: String(user.id) });
          url = `/reservations?${qs.toString()}`;
        }

        const data = await apiFetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        setItems(Array.isArray(data) ? data : data?.items ?? []);
      } catch (e: any) {
        setErr(e?.message ?? 'Erro ao carregar reservas');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, user?.id, user?.role]);

  // Busca detalhes dos espaços (nome / preço hora) quando só temos o id
  useEffect(() => {
    (async () => {
      if (!items.length) return;

      const missingIds = Array.from(
        new Set(
          items
            .map((r) => r.space_id)
            .filter(
              (id): id is string => Boolean(id && !spacesCache[id as string]),
            ),
        ),
      );

      if (!missingIds.length) return;

      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const newEntries: Record<string, SpaceSummary> = {};

      for (const id of missingIds) {
        try {
          const detail = await apiFetch(`/spaces/${id}`, { headers });
          if (!detail) continue;

          const sid = String(detail.id ?? id);
          newEntries[sid] = {
            id: sid,
            name: detail.name ?? undefined,
            base_price_per_hour:
              detail.base_price_per_hour != null
                ? Number(detail.base_price_per_hour)
                : undefined,
            price:
              detail.base_price_per_hour != null
                ? Number(detail.base_price_per_hour)
                : detail.price != null
                ? Number(detail.price)
                : undefined,
          };
        } catch {
          // se der erro num espaço específico, só ignora e segue
        }
      }

      if (Object.keys(newEntries).length) {
        setSpacesCache((prev) => ({ ...prev, ...newEntries }));
      }
    })();
  }, [items, token, spacesCache]);

  function renderSpaceName(r: Reservation) {
    if (r.space?.name) return r.space.name;
    if (r.space_id && spacesCache[r.space_id]?.name) {
      return spacesCache[r.space_id].name;
    }
    if (r.spaceName) return r.spaceName;
    if (r.space_id) return `Espaço #${r.space_id}`;
    return '-';
  }

  function renderDate(r: Reservation) {
    const rawDate = r.date ?? r.startDate ?? r.when;
    if (!rawDate) return '-';

    const dateBR = formatDateBR(rawDate);
    const start = formatTimeHHMM(r.start_time);
    const end = formatTimeHHMM(r.end_time);

    if (start && end) return `${dateBR}, ${start} - ${end}`;
    if (start) return `${dateBR}, ${start}`;
    return dateBR;
  }

  function renderTotalBRL(r: Reservation) {
    // 1) Se o back já mandar total em centavos
    if (
      typeof r.total_amount === 'number' &&
      Number.isFinite(r.total_amount) &&
      r.total_amount > 0
    ) {
      return centsToBRL(r.total_amount);
    }

    // 2) Se vier algum campo em reais
    const explicitReal = r.total ?? r.amount ?? r.price ?? r.space?.price;
    if (typeof explicitReal === 'number' && Number.isFinite(explicitReal)) {
      return explicitReal.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
    }

    // 3) Calcular a partir do preço/hora do espaço e duração
    let pricePerHour: number | undefined;

    if (typeof r.space?.price === 'number') {
      pricePerHour = r.space.price;
    } else if (r.space_id && spacesCache[r.space_id]) {
      const s = spacesCache[r.space_id];
      pricePerHour = s.base_price_per_hour ?? s.price;
    }

    const hours = durationHours(r);
    if (
      typeof pricePerHour === 'number' &&
      Number.isFinite(pricePerHour) &&
      hours > 0
    ) {
      const total = pricePerHour * hours;
      return total.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
    }

    return '-';
  }

  function renderStatus(status?: ReservationStatus) {
    if (!status) return '-';
    const s = status.toUpperCase();
    if (s === 'PENDING') return 'Pendente';
    if (s === 'CONFIRMED') return 'Confirmada';
    if (s === 'CANCELLED') return 'Cancelada';
    return status;
  }

  return (
    <RequireAuth>
      <div className='p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h1 className='text-2xl font-bold'>Minhas Reservas</h1>
          <Link
            href='/reservations/new'
            className='bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors whitespace-nowrap'
          >
            Nova Reserva
          </Link>
        </div>

        {loading && <p>Carregando…</p>}
        {err && <p className='text-red-600'>{err}</p>}

        {!loading && !err && (
          <div className='border rounded overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-700 text-white'>
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
                    <td className='p-2 align-middle'>{r.id}</td>
                    <td className='p-2 align-middle'>{renderSpaceName(r)}</td>
                    <td className='p-2 align-middle'>{renderDate(r)}</td>
                    <td className='p-2 align-middle'>{renderStatus(r.status)}</td>
                    <td className='p-2 align-middle'>{renderTotalBRL(r)}</td>
                    <td className='p-2 align-middle'>
                      <Link
                        href={`/reservations/${r.id}`}
                        className='inline-flex items-center px-3 py-1.5 border rounded hover:bg-gray-50 whitespace-nowrap'
                      >
                        Detalhes / Pagamentos
                      </Link>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className='p-3 text-center' colSpan={6}>
                      Nenhuma reserva.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
