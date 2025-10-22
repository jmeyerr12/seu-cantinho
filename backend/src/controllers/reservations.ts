import { Request, Response } from 'express';
import { pool } from '../config/db';
import { v4 as uuid } from 'uuid';

/* utils */
const parseTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
const durationHours = (start: string, end: string) => Math.max(0, (parseTime(end) - parseTime(start)) / 60);

/* list & get */
export const listReservations = async (req: Request, res: Response) => {
  const { branchId, spaceId, customerId, status, date } = req.query as any;
  const filters: string[] = [];
  const params: any[] = [];
  if (branchId)   { params.push(branchId);   filters.push(`branch_id = $${params.length}`); }
  if (spaceId)    { params.push(spaceId);    filters.push(`space_id = $${params.length}`); }
  if (customerId) { params.push(customerId); filters.push(`customer_id = $${params.length}`); }
  if (status)     { params.push(status);     filters.push(`status = $${params.length}`); }
  if (date)       { params.push(date);       filters.push(`date = $${params.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const sql = `
    SELECT r.*, u.name AS customer_name, s.name AS space_name, b.name AS branch_name
    FROM reservations r
    JOIN users u ON u.id = r.customer_id
    JOIN spaces s ON s.id = r.space_id
    JOIN branches b ON b.id = r.branch_id
    ${where}
    ORDER BY r.date DESC, r.start_time DESC
  `;
  const { rows } = await pool.query(sql, params);
  res.json(rows);
};

export const getReservation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const sql = `
    SELECT r.*, u.name AS customer_name, s.name AS space_name, b.name AS branch_name
    FROM reservations r
    JOIN users u ON u.id = r.customer_id
    JOIN spaces s ON s.id = r.space_id
    JOIN branches b ON b.id = r.branch_id
    WHERE r.id = $1
  `;
  const { rows } = await pool.query(sql, [id]);
  if (!rows[0]) return res.status(404).json({ error: 'reservation not found' });

  const pays = await pool.query('SELECT * FROM payments WHERE reservation_id = $1 ORDER BY created_at ASC', [id]);
  res.json({ ...rows[0], payments: pays.rows });
};

/* create */
export const createReservation = async (req: Request, res: Response) => {
  const {
    space_id, branch_id, customer_id, date, start_time, end_time,
    deposit_required_pct = 0, notes
  } = req.body;

  // conflito (double-booking)
  const conflictSql = `
    SELECT 1 FROM reservations
    WHERE space_id = $1 AND date = $2 AND status <> 'CANCELLED'
      AND NOT (end_time <= $3::time OR start_time >= $4::time)
    LIMIT 1
  `;
  const conflict = await pool.query(conflictSql, [space_id, date, start_time, end_time]);
  if (conflict.rowCount) return res.status(409).json({ error: 'time slot unavailable' });

  // preço do espaço
  const space = await pool.query('SELECT base_price_per_hour FROM spaces WHERE id = $1', [space_id]);
  if (!space.rows[0]) return res.status(400).json({ error: 'invalid space' });

  const hours = durationHours(start_time, end_time);
  const total = Number(space.rows[0].base_price_per_hour) * hours;

  const id = uuid();
  const sql = `
    INSERT INTO reservations
      (id, space_id, branch_id, customer_id, date, start_time, end_time,
       status, total_amount, deposit_required_pct, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',$8,$9,$10)
  `;
  await pool.query(sql, [
    id, space_id, branch_id, customer_id, date, start_time, end_time,
    total, deposit_required_pct, notes ?? null
  ]);

  const { rows } = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
  res.status(201).json(rows[0]);
};

/* update schedule/notes (revalida conflito) */
export const updateReservation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, start_time, end_time, notes, deposit_required_pct } = req.body;

  if (date && start_time && end_time) {
    const { rows } = await pool.query('SELECT space_id FROM reservations WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'reservation not found' });
    const spaceId = rows[0].space_id;

    const conflictSql = `
      SELECT 1 FROM reservations
      WHERE space_id = $1 AND date = $2 AND status <> 'CANCELLED' AND id <> $5
        AND NOT (end_time <= $3::time OR start_time >= $4::time)
      LIMIT 1
    `;
    const conflict = await pool.query(conflictSql, [spaceId, date, start_time, end_time, id]);
    if (conflict.rowCount) return res.status(409).json({ error: 'time slot unavailable' });
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
    [id, date ?? null, start_time ?? null, end_time ?? null, notes ?? null, deposit_required_pct ?? null]
  );

  const { rows: out } = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
  if (!out[0]) return res.status(404).json({ error: 'reservation not found' });
  res.json(out[0]);
};

export const confirmReservation = async (req: Request, res: Response) => {
  const { id } = req.params;
  await pool.query(`UPDATE reservations SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1`, [id]);
  const { rows } = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'reservation not found' });
  res.json(rows[0]);
};

export const cancelReservation = async (req: Request, res: Response) => {
  const { id } = req.params;
  await pool.query(`UPDATE reservations SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`, [id]);
  const { rows } = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'reservation not found' });
  res.json(rows[0]);
};

export const listPaymentsOfReservation = async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    'SELECT * FROM payments WHERE reservation_id = $1 ORDER BY created_at ASC',
    [req.params.id]
  );
  res.json(rows);
};

export const byDay = async (req: Request, res: Response) => {
  const { date, branchId } = req.query as any;
  if (!date) return res.status(400).json({ error: 'date required' });
  const params: any[] = [date];
  const branchFilter = branchId ? (params.push(branchId), 'AND r.branch_id = $2') : '';
  const sql = `
    SELECT r.*, s.name AS space_name, u.name AS customer_name
    FROM reservations r
    JOIN spaces s ON s.id = r.space_id
    JOIN users u ON u.id = r.customer_id
    WHERE r.date = $1 ${branchFilter}
    ORDER BY r.start_time ASC
  `;
  const { rows } = await pool.query(sql, params);
  res.json(rows);
};
