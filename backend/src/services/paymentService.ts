import { pool } from '../config/db';
import { v4 as uuid } from 'uuid';

export type PaymentStatus = 'PENDING' | 'PAID' | string;

export interface Payment {
  id: string;
  reservation_id: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  purpose?: string | null;
  external_ref?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreatePaymentInput {
  reservationId: string;
  amount: number;
  method: string;
  purpose?: string;
  external_ref?: string | null;
}

export interface MarkPaidInput {
  external_ref?: string | null;
}

export type DeletePaymentResult =
  | 'NOT_FOUND'
  | 'CANNOT_DELETE_PAID'
  | 'DELETED';

export async function createPayment(
  input: CreatePaymentInput,
): Promise<Payment> {
  const id = uuid();
  const { reservationId, amount, method, purpose, external_ref } = input;

  await pool.query(
    `INSERT INTO payments (id, reservation_id, amount, method, status, purpose, external_ref)
     VALUES ($1, $2, $3, $4, 'PENDING', $5, $6)`,
    [id, reservationId, amount, method, purpose ?? null, external_ref ?? null],
  );

  const { rows } = await pool.query<Payment>(
    'SELECT * FROM payments WHERE id = $1',
    [id],
  );

  return rows[0];
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const { rows } = await pool.query<Payment>(
    'SELECT * FROM payments WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function markPaymentPaid(
  id: string,
  input: MarkPaidInput,
): Promise<Payment | null> {
  const { external_ref } = input;

  await pool.query(
    `UPDATE payments
       SET status = 'PAID',
           paid_at = NOW(),
           external_ref = COALESCE($2, external_ref)
     WHERE id = $1`,
    [id, external_ref ?? null],
  );

  const { rows } = await pool.query<Payment>(
    'SELECT * FROM payments WHERE id = $1',
    [id],
  );

  return rows[0] ?? null;
}

export async function deletePaymentWithRules(
  id: string,
): Promise<DeletePaymentResult> {
  const check = await pool.query<{ status: PaymentStatus }>(
    'SELECT status FROM payments WHERE id = $1',
    [id],
  );

  const row = check.rows[0];
  if (!row) return 'NOT_FOUND';
  if (row.status === 'PAID') return 'CANNOT_DELETE_PAID';

  const { rowCount } = await pool.query(
    'DELETE FROM payments WHERE id = $1',
    [id],
  );
  const count = rowCount ?? 0;

  return count > 0 ? 'DELETED' : 'NOT_FOUND';
}
