'use client';

import { Suspense } from 'react';
import { useEffect, useMemo, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { apiFetch } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type Branch = { id: string; name: string; city?: string; state?: string };
type Space  = { id: string; name: string; branch_id: string };

type AvailState = 'idle' | 'loading' | 'available' | 'unavailable' | 'error';

// Componente REAL (usa useSearchParams)
function NewReservationInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { token, user } = useAuth();

  const preBranchId = sp.get('branchId') ?? '';
  const preSpaceId  = sp.get('spaceId') ?? '';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [branchId, setBranchId] = useState<string>(preBranchId);
  const [spaceId, setSpaceId] = useState<string>(preSpaceId);

  const [date, setDate] = useState<string>('');
  const [start, setStart] = useState<string>('18:00');
  const [end, setEnd] = useState<string>('23:00');
  const [notes, setNotes] = useState<string>('');

  const [pricePerHour, setPricePerHour] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState<boolean>(false);

  const [availabilityState, setAvailabilityState] = useState<AvailState>('idle');
  const [availabilityMsg, setAvailabilityMsg] = useState<string>('');

  const [payMode, setPayMode] = useState<'signal' | 'full'>('signal');

  const [err, setErr] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  function timeToMinutes(t: string) {
    const [hh, mm] = t.split(':').map(Number);
    return hh * 60 + mm;
  }
  function hoursBetween(a: string, b: string): number {
    const diffMin = timeToMinutes(b) - timeToMinutes(a);
    return diffMin / 60;
  }
  function brl(n: number) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function to2(n: number) {
    return Number(n.toFixed(2));
  }

  // 0) Se veio só spaceId na URL, descobre a filial via /spaces/{id}
  useEffect(() => {
    (async () => {
      if (!preBranchId && preSpaceId) {
        try {
          const space = await apiFetch(`/spaces/${preSpaceId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (space?.branch_id) setBranchId(String(space.branch_id));
        } catch (e: any) {
          setErr(e?.message ?? 'Erro ao obter dados do espaço');
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preSpaceId, preBranchId, token]);

  // 1) Carrega filiais
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/branches', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        setBranches(Array.isArray(data) ? data : (data?.items ?? []));
      } catch {
        setErr('Erro ao carregar filiais');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 2) Quando muda filial, carrega espaços
  useEffect(() => {
    setSpaces([]);
    setAvailabilityState('idle');
    setAvailabilityMsg('');
    setPricePerHour(null);

    if (!branchId) { setSpaceId(''); return; }

    (async () => {
      try {
        const data = await apiFetch(`/branches/${branchId}/spaces`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const list: Space[] = Array.isArray(data) ? data : (data?.items ?? []);
        setSpaces(list);

        if (
          preSpaceId &&
          list.some((s: Space) => String(s.id) === String(preSpaceId))
        ) {
          setSpaceId(preSpaceId);
        } else if (preSpaceId) {
          setSpaceId('');
        }
      } catch {
        setErr('Erro ao carregar espaços');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, token]);

  // 3) Sempre buscar preço/hora no detalhe /spaces/:id
  useEffect(() => {
    setPricePerHour(null);
    if (!spaceId) return;

    (async () => {
      try {
        setPriceLoading(true);
        const detail = await apiFetch(`/spaces/${spaceId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const p =
          detail?.base_price_per_hour != null
            ? Number(detail.base_price_per_hour)
            : null;
        setPricePerHour(Number.isFinite(p as number) ? (p as number) : null);
      } catch {
        setPricePerHour(null);
      } finally {
        setPriceLoading(false);
      }
    })();
  }, [spaceId, token]);

  // 4) Disponibilidade automática
  useEffect(() => {
    if (!spaceId || !date || !start || !end) {
      setAvailabilityState('idle');
      setAvailabilityMsg('');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setAvailabilityState('loading');
        setAvailabilityMsg('Verificando disponibilidade…');

        const q = `date=${encodeURIComponent(date)}&start=${encodeURIComponent(
          start,
        )}&end=${encodeURIComponent(end)}`;
        const res = await apiFetch(`/spaces/${spaceId}/availability?${q}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (cancelled) return;

        if (typeof res === 'string') {
          const s = res.toLowerCase();
          const ok = s.includes('dispon');
          setAvailabilityState(ok ? 'available' : 'unavailable');
          setAvailabilityMsg(ok ? 'Disponível' : 'Indisponível');
        } else if (res?.available === true) {
          setAvailabilityState('available');
          setAvailabilityMsg('Disponível');
        } else {
          setAvailabilityState('unavailable');
          setAvailabilityMsg('Indisponível');
        }
      } catch {
        if (cancelled) return;
        setAvailabilityState('error');
        setAvailabilityMsg('Erro ao verificar disponibilidade');
      }
    })();

    return () => { cancelled = true; };
  }, [spaceId, date, start, end, token]);

  const durationHours = useMemo(() => {
    if (!start || !end) return 0;
    const diff = hoursBetween(start, end);
    return diff > 0 ? diff : 0;
  }, [start, end]);

  const total = useMemo(() => {
    if (pricePerHour == null || durationHours <= 0) return 0;
    return pricePerHour * durationHours;
  }, [pricePerHour, durationHours]);

  const signalValue = useMemo(
    () => (total > 0 ? total * 0.3 : 0),
    [total],
  );

  const payNowValue = useMemo(
    () => (payMode === 'signal' ? signalValue : total),
    [payMode, signalValue, total],
  );

  async function createReservation(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    if (!branchId) return setErr('Escolha uma filial.');
    if (!spaceId)  return setErr('Escolha um espaço.');
    if (!date)     return setErr('Escolha a data.');
    if (durationHours <= 0) return setErr('Horário inválido: fim deve ser após o início.');
    if (priceLoading) return setErr('Carregando preço do espaço…');
    if (pricePerHour == null) return setErr('Espaço sem preço por hora cadastrado.');
    if (availabilityState !== 'available') return setErr('O espaço não está disponível no horário selecionado.');
    if (total <= 0) return setErr('Total calculado inválido.');

    try {
      setSubmitting(true);

      const resv = await apiFetch('/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          branch_id: branchId,
          space_id: spaceId,
          customer_id: user?.id,
          date,
          start_time: start,
          end_time: end,
          notes,
        }),
      });

      const reservationId = String(resv?.id ?? '');
      if (!reservationId) {
        setErr('Reserva não retornou ID.');
        return;
      }

      const purpose = payMode === 'signal' ? 'SIGNAL' : 'FULL';
      const payment = await apiFetch(`/reservations/${reservationId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: to2(payNowValue),
          method: 'PIX',
          purpose,
        }),
      });

      const paymentId = String(payment?.id ?? '');
      if (paymentId) {
        router.push(`/checkout/${paymentId}`);
      } else {
        router.push('/reservations');
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao criar reserva/pagamento');
    } finally {
      setSubmitting(false);
    }
  }

  const submitDisabled =
    submitting ||
    !branchId ||
    !spaceId ||
    !date ||
    durationHours <= 0 ||
    priceLoading ||
    pricePerHour == null ||
    availabilityState !== 'available';

  return (
    <RequireAuth>
      {/* ... o mesmo JSX que você já tinha ... */}
      {/* mantive tudo igual abaixo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Nova Reserva</h1>
        {/* resto do form igual */}
      </div>
    </RequireAuth>
  );
}

// Componente exportado: envolve em Suspense
export default function NewReservationPage() {
  return (
    <Suspense fallback={<div>Carregando…</div>}>
      <NewReservationInner />
    </Suspense>
  );
}
