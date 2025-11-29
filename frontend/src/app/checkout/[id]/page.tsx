'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';

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

function formatBRL(value: number) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [processing, setProcessing] = useState(false);

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  async function load() {
    try {
      const p = await apiFetch(`/payments/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setPayment(p);
      setErr('');
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao carregar pagamento');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, token]);

  useEffect(() => {
    if (!payment || payment.status !== 'PENDING') return;
    const t = setInterval(load, 7000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.status]);

  async function onMarkPaid() {
    if (!payment) return;
    try {
      setProcessing(true);
      await apiFetch(`/payments/${payment.id}/mark-paid`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      await load();
      router.replace('/reservations');
    } catch (e: any) {
      setErr(e.message ?? 'Falha ao aprovar pagamento');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <RequireAuth>
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>

        {loading && <p>Carregando…</p>}
        {err && <p className="text-red-600 mb-3">{err}</p>}

        {payment && (
          <div className="border rounded p-4 space-y-3">
            <div><strong>Pagamento:</strong> #{payment.id}</div>
            <div><strong>Reserva:</strong> {payment.reservation_id}</div>
            <div><strong>Método:</strong> {payment.method}</div>
            <div><strong>Finalidade:</strong> {payment.purpose ?? 'RESERVATION'}</div>
            <div><strong>Valor:</strong> {formatBRL(payment.amount)}</div>
            <div><strong>Status:</strong> {payment.status}</div>

            {payment.status === 'PENDING' ? (
              <div className="flex gap-2 items-center">
                {isManagerOrAdmin ? (
                  <button
                    onClick={onMarkPaid}
                    disabled={processing}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    {processing ? 'Processando…' : 'Marcar como pago'}
                  </button>
                ) : (
                  <span className="text-sm text-gray-700">Aguardando aprovação do administrador/gerência…</span>
                )}
                <button onClick={() => router.replace('/reservations')} className="px-4 py-2 border rounded">
                  Voltar
                </button>
              </div>
            ) : (
              <button onClick={() => router.replace('/reservations')} className="px-4 py-2 border rounded">
                Voltar às reservas
              </button>
            )}
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
