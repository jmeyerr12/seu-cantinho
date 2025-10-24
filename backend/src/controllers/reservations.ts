import { Request, Response } from 'express';
import { pool } from '../config/db';
import { v4 as uuid } from 'uuid';

/* utils */
const parseTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
const durationHours = (start: string, end: string) => Math.max(0, (parseTime(end) - parseTime(start)) / 60);
/**
 * @openapi
 * /reservations:
 *   get:
 *     summary: Lista reservas
 *     description: 'Retorna reservas com filtros opcionais.'
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema: { type: string, format: uuid }
 *         required: false
 *         description: 'ID da filial.'
 *       - in: query
 *         name: spaceId
 *         schema: { type: string, format: uuid }
 *         required: false
 *         description: 'ID do espaço.'
 *       - in: query
 *         name: customerId
 *         schema: { type: string, format: uuid }
 *         required: false
 *         description: 'ID do cliente.'
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, CONFIRMED, CANCELLED] }
 *         required: false
 *         description: 'Status da reserva.'
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date, example: '2025-10-23' }
 *         required: false
 *         description: 'Data da reserva (YYYY-MM-DD).'
 *     responses:
 *       200:
 *         description: 'Lista de reservas.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Reservation' }
 */
export const listReservations = async (req: Request, res: Response) => {
  try {
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
  } catch (err) {
    console.error('listReservations error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations/{id}:
 *   get:
 *     summary: Detalha uma reserva
 *     description: 'Retorna a reserva pelo ID, incluindo pagamentos.'
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 'Reserva encontrada.'
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Reservation'
 *                 - type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Payment' }
 *       404:
 *         description: 'Reserva não encontrada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorNotFound' }
 */
export const getReservation = async (req: Request, res: Response) => {
  try {
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
  } catch (err) {
    console.error('getReservation error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations:
 *   post:
 *     summary: Cria uma reserva
 *     description: 'Cria uma nova reserva após validar conflito de horário e espaço.'
 *     tags: [Reservations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [space_id, branch_id, customer_id, date, start_time, end_time]
 *             properties:
 *               space_id: { type: string, format: uuid }
 *               branch_id: { type: string, format: uuid }
 *               customer_id: { type: string, format: uuid }
 *               date: { type: string, format: date, example: '2025-10-23' }
 *               start_time: { type: string, example: '09:00' }
 *               end_time: { type: string, example: '11:00' }
 *               deposit_required_pct: { type: number, example: 0 }
 *               notes: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: 'Reserva criada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Reservation' }
 *       400:
 *         description: 'Dados inválidos (ex.: espaço inexistente).'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorBadRequest' }
 *       409:
 *         description: 'Conflito de horário (intervalo indisponível).'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorConflict' }
 */
export const createReservation = async (req: Request, res: Response) => {
  try {
    const {
      space_id, branch_id, customer_id, date, start_time, end_time,
      deposit_required_pct = 0, notes
    } = req.body;

    const conflictSql = `
      SELECT 1 FROM reservations
      WHERE space_id = $1 AND date = $2 AND status <> 'CANCELLED'
        AND NOT (end_time <= $3::time OR start_time >= $4::time)
      LIMIT 1
    `;
    const conflict = await pool.query(conflictSql, [space_id, date, start_time, end_time]);
    if (conflict.rowCount) return res.status(409).json({ error: 'time slot unavailable' });

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
  } catch (err) {
    console.error('createReservation error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations/{id}:
 *   patch:
 *     summary: Atualiza agenda/anotações da reserva
 *     description: 'Atualiza campos da reserva; se alterar data/horário, revalida conflitos.'
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date: { type: string, format: date, example: '2025-10-23' }
 *               start_time: { type: string, example: '10:00' }
 *               end_time: { type: string, example: '12:00' }
 *               notes: { type: string, nullable: true }
 *               deposit_required_pct: { type: number, example: 50 }
 *     responses:
 *       200:
 *         description: 'Reserva atualizada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Reservation' }
 *       404:
 *         description: 'Reserva não encontrada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorNotFound' }
 *       409:
 *         description: 'Conflito de horário.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorConflict' }
 */
export const updateReservation = async (req: Request, res: Response) => {
  try {
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
  } catch (err) {
    console.error('updateReservation error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations/{id}/confirm:
 *   post:
 *     summary: Confirma a reserva
 *     description: 'Altera o status para CONFIRMED.'
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 'Reserva confirmada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Reservation' }
 *       404:
 *         description: 'Reserva não encontrada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorNotFound' }
 */
export const confirmReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE reservations SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1`, [id]);
    const { rows } = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'reservation not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('confirmReservation error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations/{id}/cancel:
 *   post:
 *     summary: Cancela a reserva
 *     description: 'Altera o status para CANCELLED.'
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 'Reserva cancelada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Reservation' }
 *       404:
 *         description: 'Reserva não encontrada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorNotFound' }
 */
export const cancelReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE reservations SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`, [id]);
    const { rows } = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'reservation not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('cancelReservation error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations/{id}/payments:
 *   get:
 *     summary: Lista pagamentos da reserva
 *     tags: [Reservations > Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 'Lista de pagamentos.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Payment' }
 */
export const listPaymentsOfReservation = async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM payments WHERE reservation_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('listPaymentsOfReservation error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations/day:
 *   get:
 *     summary: Agenda do dia
 *     description: 'Lista reservas de um dia (opcional filtrar por filial).'
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date, example: '2025-10-23' }
 *         description: 'Data (YYYY-MM-DD).'
 *       - in: query
 *         name: branchId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: 'Filtrar por filial.'
 *     responses:
 *       200:
 *         description: 'Reservas do dia.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Reservation' }
 *       400:
 *         description: 'Parâmetro date é obrigatório.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorBadRequest' }
 */
export const byDay = async (req: Request, res: Response) => {
  try {
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
  } catch (err) {
    console.error('byDay error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};


/**
 * @openapi
 * components:
 *   schemas:
 *     Reservation:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         space_id: { type: string, format: uuid }
 *         branch_id: { type: string, format: uuid }
 *         customer_id: { type: string, format: uuid }
 *         date: { type: string, format: date, example: '2025-10-23' }
 *         start_time: { type: string, example: '09:00' }
 *         end_time: { type: string, example: '11:00' }
 *         status: { type: string, enum: [PENDING, CONFIRMED, CANCELLED], example: 'PENDING' }
 *         total_amount: { type: number, format: float, example: 240 }
 *         deposit_required_pct: { type: number, example: 50 }
 *         notes: { type: string, nullable: true, example: 'Requer projetor.' }
 *         created_at: { type: string, format: date-time, nullable: true }
 *         updated_at: { type: string, format: date-time, nullable: true }
 */
export {};
