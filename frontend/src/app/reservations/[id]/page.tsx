'use client';

import { useEffect, useMemo, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';

type Reservation = {
  id: string;
  space_id: string;
  branch_id: string;
  customer_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'PENDING'|'CONFIRMED'|'CANCELLED';
  total_amount?: number;
};

type Payment = {
  id: string;
  reservation_id: string;
  amount: number;
  method: string;
  status: 'PENDING'|'PAID'|'CANCELLED';
  purpose?: 'RESERVATION'|'SIGNAL'|'FULL'|string;
  external_ref?: string|null;
  paid_at?: string|null;
  created_at?: string;
  updated_at?: string;
};

type Space = {
  id: string|number;
  name: string;
  base_price_per_hour?: string;
};

function formatBRL(v: number) {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function hhmmToMinutes(hhmm: string) {
  const [h, m] = (hhmm ?? '0:0').split(':').map(Number);
  return (isFinite(h) ? h : 0) * 60 + (isFinite(m) ? m : 0);
}

export default function ReservationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();

  const [tab, setTab] = useState<'summary'|'payments'>('payments');
  const [resv, setResv] = useState<Reservation | null>(null);
  const [space, setSpace] = useState<Space | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isCustomer = user?.role === 'CUSTOMER';
  const isOwner = !!(
    isCustomer &&
    resv &&
    Number(user?.id) === Number(resv.customer_id)
  );  

  async function loadAll() {
    setLoading(true);
    try {
      const r = await apiFetch(`/reservations/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setResv(r);

      // detalhe do espaço para obter base_price_per_hour
      try {
        if (r?.space_id) {
          const s = await apiFetch(`/spaces/${r.space_id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          setSpace(s);
        } else {
          setSpace(null);
        }
      } catch {}

      const ps = await apiFetch(`/reservations/${id}/payments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setPayments(Array.isArray(ps) ? ps : (ps?.items ?? []));
      setErr('');
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao carregar reserva/pagamentos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll();}, [id, token]);

  useEffect(() => {
    if (!payments.some(p => p.status === 'PENDING')) return;
    const t = setInterval(loadAll, 7000);
    return () => clearInterval(t);
  }, [payments.map(p => p.status).join('|')]);

  // usa resv.total_amount se vier do back;
  // se nao calcula horas * base_price_per_hour (string) do espaco
  const totalReais = useMemo(() => {
    if (resv?.total_amount != null && !Number.isNaN(Number(resv.total_amount))) {
      return Number(resv.total_amount);
    }
    const priceStr = space?.base_price_per_hour;
    if (!priceStr) return 0;
    const pricePerHour = Number(priceStr);
    const minutes = Math.max(0, hhmmToMinutes(resv?.end_time ?? '0:0') - hhmmToMinutes(resv?.start_time ?? '0:0'));
    const hours = minutes / 60;
    return pricePerHour * hours;
  }, [resv?.total_amount, resv?.start_time, resv?.end_time, space?.base_price_per_hour]);

  // pago somando apenas status PAID
  const paidReais = useMemo(
    () => payments.filter(p => p.status === 'PAID').reduce((acc, p) => acc + Number(p.amount || 0), 0),
    [payments]
  );

  const remainingReais = useMemo(() => {
    if (!totalReais) return 0;
    return Math.max(0, totalReais - paidReais);
  }, [totalReais, paidReais]);

  async function onConfirm() {
    try {
      await apiFetch(`/reservations/${id}/confirm`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      await loadAll();
    } catch (e: any) { setErr(e.message ?? 'Erro ao confirmar'); }
  }

  async function onCancel() {
    try {
      await apiFetch(`/reservations/${id}/cancel`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      await loadAll();
    } catch (e: any) { setErr(e.message ?? 'Erro ao cancelar'); }
  }

  // criar pagamento apenas do restante
  async function onCreateRemainingPayment() {
    if (!isOwner) return;
    if (remainingReais <= 0) { setErr('Nada restante para pagar.'); return; }
    try {
      const newPay = await apiFetch(`/reservations/${id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: Number(remainingReais.toFixed(2)),
          method: 'PIX',
          purpose: 'RESERVATION',
        }),
      });
      if (newPay?.id) router.push(`/checkout/${newPay.id}`);
    } catch (e: any) {
      setErr(e.message ?? 'Falha ao criar pagamento');
    }
  }

  async function onMarkPaid(p: Payment) {
    if (!isManagerOrAdmin) return;
    try {
      await apiFetch(`/payments/${p.id}/mark-paid`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      await loadAll();
    } catch (e: any) {
      setErr(e.message ?? 'Falha ao aprovar pagamento');
    }
  }

  return (
    <RequireAuth>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Reserva #{id}</h1>
          <div className="flex gap-2">
            {resv?.status === 'PENDING' && isManagerOrAdmin && (
              <button onClick={onConfirm} className="bg-green-600 text-white px-3 py-2 rounded">Confirmar</button>
            )}
            {resv && resv.status !== 'CANCELLED' && (
              <button onClick={onCancel} className="px-3 py-2 border rounded">Cancelar</button>
            )}
          </div>
        </div>

        {err && <p className="text-red-600">{err}</p>}
        {loading && <p>Carregando…</p>}

        {resv && (
          <>
            <div className="flex gap-3">
              <button onClick={() => setTab('summary')}  className={tab==='summary'  ? 'font-bold' : ''}>Resumo</button>
              <button onClick={() => setTab('payments')} className={tab==='payments' ? 'font-bold' : ''}>Pagamentos</button>
            </div>

            {tab === 'summary' && (
              <div className="border rounded p-4 space-y-2">
                <div><strong>Status:</strong> {resv.status}</div>
                <div><strong>Data:</strong> {resv.date} {resv.start_time}–{resv.end_time}</div>
                <div><strong>Total:</strong> {formatBRL(totalReais)}</div>
                <div><strong>Pago:</strong> {formatBRL(paidReais)}</div>
                <div><strong>Restante:</strong> {formatBRL(remainingReais)}</div>
              </div>
            )}

            {tab === 'payments' && (
              <div className="space-y-4">
                {}
                {isOwner && resv.status !== 'CANCELLED' && (
                  <div className="border rounded p-4 space-y-3">
                    <h2 className="text-lg font-medium">Pagamento</h2>
                    <p className="text-sm text-gray-700">
                      Valor restante: <strong>{formatBRL(remainingReais)}</strong>
                    </p>
                    <div>
                      <button
                        onClick={onCreateRemainingPayment}
                        className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-60"
                        disabled={remainingReais <= 0}
                      >
                        Pagar restante
                      </button>
                    </div>
                  </div>
                )}

                {}
                <div className="border rounded p-4">
                  <h2 className="text-lg font-medium mb-2">Pagamentos da reserva</h2>
                  {payments.length === 0 ? (
                    <p className="text-sm text-gray-600">Nenhum pagamento ainda.</p>
                  ) : (
                    <ul className="divide-y">
                      {payments.map(p => {
                        const showCheckoutForThisUser = isOwner && p.status === 'PENDING';
                        const showApproveForAdmin = isManagerOrAdmin && p.status === 'PENDING';
                        return (
                          <li key={p.id} className="py-3 flex justify-between items-center">
                            <div>
                              <div className="font-medium">#{p.id} — {p.purpose ?? 'RESERVATION'}</div>
                              <div>{formatBRL(Number(p.amount))} · {p.method} · <span className="uppercase">{p.status}</span></div>
                            </div>
                            <div className="flex gap-2">
                              {showCheckoutForThisUser && (
                                <button onClick={() => router.push(`/checkout/${p.id}`)} className="px-3 py-2 border rounded">
                                  Abrir checkout
                                </button>
                              )}
                              {showApproveForAdmin && (
                                <button onClick={() => onMarkPaid(p)} className="bg-blue-600 text-white px-3 py-2 rounded">
                                  Marcar como pago
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </RequireAuth>
  );
}
