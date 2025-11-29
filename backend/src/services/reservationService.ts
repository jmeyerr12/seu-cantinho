import { pool } from '../config/db';
import { v4 as uuid } from 'uuid';

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | string;

const parseTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

const durationHours = (start: string, end: string) =>
  Math.max(0, (parseTime(end) - parseTime(start)) / 60);

export interface Reservation {
  id: string;
  space_id: string;
  branch_id: string;
  customer_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  total_amount?: number | null;
  deposit_required_pct?: number | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  // colunas de join
  customer_name?: string;
  space_name?: string;
  branch_name?: string;
}

export interface Payment {
  id: string;
  reservation_id: string;
  amount: number;
  method: string;
  status: string;
  purpose?: string | null;
  external_ref?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ReservationFilters {
  branchId?: string;
  spaceId?: string;
  customerId?: string;
  status?: string;
  date?: string;
}

export interface CreateReservationInput {
  space_id: string;
  branch_id: string;
  customer_id: string;
  date: string;
  start_time: string;
  end_time: string;
  deposit_required_pct?: number;
  notes?: string | null;
}

export type CreateReservationResult =
  | { kind: 'OK'; reservation: Reservation }
  | { kind: 'INVALID_SPACE' }
  | { kind: 'TIME_SLOT_UNAVAILABLE' };

export interface UpdateReservationInput {
  date?: string;
  start_time?: string;
  end_time?: string;
  notes?: string | null;
  deposit_required_pct?: number;
}

export type UpdateReservationResult =
  | { kind: 'OK'; reservation: Reservation }
  | { kind: 'NOT_FOUND' }
  | { kind: 'TIME_SLOT_UNAVAILABLE' };

export interface ByDayFilters {
  date: string;
  branchId?: string;
}

// reservas com filtros e etc
export async function listReservations(
  filters: ReservationFilters,
): Promise<Reservation[]> {
  const { branchId, spaceId, customerId, status, date } = filters;

  const clauses: string[] = [];
  const params: any[] = [];

  if (branchId) {
    params.push(branchId);
    clauses.push(`r.branch_id = $${params.length}`);
  }
  if (spaceId) {
    params.push(spaceId);
    clauses.push(`r.space_id = $${params.length}`);
  }
  if (customerId) {
    params.push(customerId);
    clauses.push(`r.customer_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    clauses.push(`r.status = $${params.length}`);
  }
  if (date) {
    params.push(date);
    clauses.push(`r.date = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const sql = `
      SELECT r.*, u.name AS customer_name, s.name AS space_name, b.name AS branch_name
      FROM reservations r
      JOIN users u ON u.id = r.customer_id
      JOIN spaces s ON s.id = r.space_id
      JOIN branches b ON b.id = r.branch_id
      ${where}
      ORDER BY r.date DESC, r.start_time DESC
    `;

  const { rows } = await pool.query<Reservation>(sql, params);
  return rows;
}

// detalha reserva + pag
export async function getReservationWithPayments(
  id: string,
): Promise<{ reservation: Reservation; payments: Payment[] } | null> {
  const sql = `
      SELECT r.*, u.name AS customer_name, s.name AS space_name, b.name AS branch_name
      FROM reservations r
      JOIN users u ON u.id = r.customer_id
      JOIN spaces s ON s.id = r.space_id
      JOIN branches b ON b.id = r.branch_id
      WHERE r.id = $1
    `;

  const { rows } = await pool.query<Reservation>(sql, [id]);
  const reservation = rows[0];
  if (!reservation) return null;

  const pays = await pool.query<Payment>(
    'SELECT * FROM payments WHERE reservation_id = $1 ORDER BY created_at ASC',
    [id],
  );

  return { reservation, payments: pays.rows };
}


export async function createReservation(
  input: CreateReservationInput,
): Promise<CreateReservationResult> {
  const {
    space_id,
    branch_id,
    customer_id,
    date,
    start_time,
    end_time,
    deposit_required_pct,
    notes,
  } = input;

  // verifica conflito de horário
  const conflictSql = `
      SELECT 1 FROM reservations
      WHERE space_id = $1 AND date = $2 AND status <> 'CANCELLED'
        AND NOT (end_time <= $3::time OR start_time >= $4::time)
      LIMIT 1
    `;
  const conflict = await pool.query(conflictSql, [
    space_id,
    date,
    start_time,
    end_time,
  ]);
  const conflictCount = conflict.rowCount ?? 0;
  if (conflictCount > 0) {
    return { kind: 'TIME_SLOT_UNAVAILABLE' };
  }

  // pega preço por hora do espaço
  const space = await pool.query<{ base_price_per_hour: number | null }>(
    'SELECT base_price_per_hour FROM spaces WHERE id = $1',
    [space_id],
  );
  const spaceRow = space.rows[0];
  if (!spaceRow) {
    return { kind: 'INVALID_SPACE' };
  }

  const hours = durationHours(start_time, end_time);
  const pricePerHour = Number(spaceRow.base_price_per_hour);
  const total = pricePerHour * hours;

  const id = uuid();
  const sql = `
      INSERT INTO reservations
        (id, space_id, branch_id, customer_id, date, start_time, end_time,
         status, total_amount, deposit_required_pct, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',$8,$9,$10)
    `;

  await pool.query(sql, [
    id,
    space_id,
    branch_id,
    customer_id,
    date,
    start_time,
    end_time,
    total,
    deposit_required_pct ?? 0,
    notes ?? null,
  ]);

  const { rows } = await pool.query<Reservation>(
    'SELECT * FROM reservations WHERE id = $1',
    [id],
  );

  return { kind: 'OK', reservation: rows[0] };
}

export async function updateReservation(
  id: string,
  input: UpdateReservationInput,
): Promise<UpdateReservationResult> {
  const { date, start_time, end_time, notes, deposit_required_pct } = input;

  if (date && start_time && end_time) {
    const current = await pool.query<{ space_id: string }>(
      'SELECT space_id FROM reservations WHERE id = $1',
      [id],
    );
    const row = current.rows[0];
    if (!row) {
      return { kind: 'NOT_FOUND' };
    }

    const spaceId = row.space_id;
    const conflictSql = `
        SELECT 1 FROM reservations
        WHERE space_id = $1 AND date = $2 AND status <> 'CANCELLED' AND id <> $5
          AND NOT (end_time <= $3::time OR start_time >= $4::time)
        LIMIT 1
      `;
    const conflict = await pool.query(conflictSql, [
      spaceId,
      date,
      start_time,
      end_time,
      id,
    ]);
    const conflictCount = conflict.rowCount ?? 0;
    if (conflictCount > 0) {
      return { kind: 'TIME_SLOT_UNAVAILABLE' };
    }
  }

  await pool.query(
    `UPDATE reservations SET
        date = COALESCE($2,date),
        start_time = COALESCE($3,start_time),
        end_time = COALESCE($4,end_time),
        notes = COALESCE($5,notes),
        deposit_required_pct = COALESCE($6,deposit_required_pct),
        updated_at = NOW()
       WHERE id = $1`,
    [
      id,
      date ?? null,
      start_time ?? null,
      end_time ?? null,
      notes ?? null,
      deposit_required_pct ?? null,
    ],
  );

  const { rows } = await pool.query<Reservation>(
    'SELECT * FROM reservations WHERE id = $1',
    [id],
  );
  const updated = rows[0];
  if (!updated) {
    return { kind: 'NOT_FOUND' };
  }

  return { kind: 'OK', reservation: updated };
}

export async function confirmReservation(
  id: string,
): Promise<Reservation | null> {
  await pool.query(
    `UPDATE reservations SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1`,
    [id],
  );

  const { rows } = await pool.query<Reservation>(
    'SELECT * FROM reservations WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function cancelReservation(
  id: string,
): Promise<Reservation | null> {
  await pool.query(
    `UPDATE reservations SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
    [id],
  );

  const { rows } = await pool.query<Reservation>(
    'SELECT * FROM reservations WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function listPaymentsOfReservation(
  reservationId: string,
): Promise<Payment[]> {
  const { rows } = await pool.query<Payment>(
    'SELECT * FROM payments WHERE reservation_id = $1 ORDER BY created_at ASC',
    [reservationId],
  );
  return rows;
}

export async function getReservationsByDay(
  filters: ByDayFilters,
): Promise<Reservation[]> {
  const { date, branchId } = filters;
  const params: any[] = [date];
  const branchFilter = branchId
    ? (params.push(branchId), 'AND r.branch_id = $2')
    : '';

  const sql = `
      SELECT r.*, s.name AS space_name, u.name AS customer_name
      FROM reservations r
      JOIN spaces s ON s.id = r.space_id
      JOIN users u ON u.id = r.customer_id
      WHERE r.date = $1 ${branchFilter}
      ORDER BY r.start_time ASC
    `;

  const { rows } = await pool.query<Reservation>(sql, params);
  return rows;
}
