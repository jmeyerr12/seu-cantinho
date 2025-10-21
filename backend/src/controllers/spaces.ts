import { Request, Response } from 'express';
import { pool } from '../db';
import { v4 as uuid } from 'uuid';

/* helpers */
const toBool = (v: any) => (typeof v === 'string' ? v === 'true' : !!v);

export const listSpaces = async (req: Request, res: Response) => {
  const { branchId, minCapacity, active } = req.query as {
    branchId?: string; minCapacity?: string; active?: string;
  };
  const filters: string[] = [];
  const params: any[] = [];
  if (branchId) { params.push(branchId); filters.push(`branch_id = $${params.length}`); }
  if (minCapacity) { params.push(Number(minCapacity)); filters.push(`capacity >= $${params.length}`); }
  if (active !== undefined) { params.push(toBool(active)); filters.push(`active = $${params.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT * FROM spaces ${where} ORDER BY name ASC`, params);
  res.json(rows);
};

export const createSpace = async (req: Request, res: Response) => {
  const { branch_id, name, description, capacity, base_price_per_hour, active = true } = req.body;
  const id = uuid();
  await pool.query(
    `INSERT INTO spaces (id,branch_id,name,description,capacity,base_price_per_hour,active)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, branch_id, name, description ?? null, capacity, base_price_per_hour, active]
  );
  const { rows } = await pool.query('SELECT * FROM spaces WHERE id = $1', [id]);
  res.status(201).json(rows[0]);
};

export const getSpace = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT * FROM spaces WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'space not found' });
  const photos = await pool.query('SELECT * FROM photos WHERE space_id = $1 ORDER BY "order" ASC', [id]);
  res.json({ ...rows[0], photos: photos.rows });
};

export const updateSpace = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, capacity, base_price_per_hour, active } = req.body;
  await pool.query(
    `UPDATE spaces SET
      name = COALESCE($2,name),
      description = COALESCE($3,description),
      capacity = COALESCE($4,capacity),
      base_price_per_hour = COALESCE($5,base_price_per_hour),
      active = COALESCE($6,active),
      updated_at = NOW()
     WHERE id = $1`,
    [id, name, description, capacity, base_price_per_hour, active]
  );
  const { rows } = await pool.query('SELECT * FROM spaces WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'space not found' });
  res.json(rows[0]);
};

export const activateSpace = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { active } = req.body as { active: boolean };
  await pool.query('UPDATE spaces SET active = $2, updated_at = NOW() WHERE id = $1', [id, active]);
  const { rows } = await pool.query('SELECT * FROM spaces WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'space not found' });
  res.json(rows[0]);
};

export const deleteSpace = async (req: Request, res: Response) => {
  const { rowCount } = await pool.query('DELETE FROM spaces WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'space not found' });
  res.status(204).send();
};

/* Photos */
export const listPhotos = async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    'SELECT * FROM photos WHERE space_id = $1 ORDER BY "order" ASC',
    [req.params.id]
  );
  res.json(rows);
};

export const addPhoto = async (req: Request, res: Response) => {
  const { id: spaceId } = req.params;
  const { url, caption, order = 0 } = req.body;
  const photoId = uuid();
  await pool.query(
    'INSERT INTO photos (id, space_id, url, caption, "order") VALUES ($1,$2,$3,$4,$5)',
    [photoId, spaceId, url, caption ?? null, order]
  );
  const { rows } = await pool.query('SELECT * FROM photos WHERE id = $1', [photoId]);
  res.status(201).json(rows[0]);
};

export const deletePhoto = async (req: Request, res: Response) => {
  const { id: spaceId, photoId } = req.params;
  const { rowCount } = await pool.query(
    'DELETE FROM photos WHERE id = $1 AND space_id = $2',
    [photoId, spaceId]
  );
  if (!rowCount) return res.status(404).json({ error: 'photo not found' });
  res.status(204).send();
};

/* Availability & Search */
export const checkAvailability = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, start, end } = req.query as { date: string; start: string; end: string };
  if (!date || !start || !end) return res.status(400).json({ error: 'date, start, end required' });

  const q = `
    SELECT 1 FROM reservations
    WHERE space_id = $1 AND date = $2 AND status <> 'CANCELLED'
      AND NOT (end_time <= $3::time OR start_time >= $4::time)
    LIMIT 1
  `;
  const { rows } = await pool.query(q, [id, date, start, end]);
  res.json({ available: rows.length === 0 });
};

export const searchSpaces = async (req: Request, res: Response) => {
  const { city, state, capacity, date, start, end } = req.query as any;
  const params: any[] = [];
  const filters: string[] = ['s.active = TRUE'];

  if (capacity) { params.push(Number(capacity)); filters.push(`s.capacity >= $${params.length}`); }
  if (state)    { params.push(state); filters.push(`b.state = $${params.length}`); }
  if (city)     { params.push(city);  filters.push(`b.city  = $${params.length}`); }

  // disponibilidade no intervalo se informados data/horários
  let availabilityClause = '';
  if (date && start && end) {
    params.push(date, start, end);
    availabilityClause = `
      AND NOT EXISTS (
        SELECT 1 FROM reservations r
        WHERE r.space_id = s.id AND r.date = $${params.length - 2} AND r.status <> 'CANCELLED'
          AND NOT (r.end_time <= $${params.length - 1}::time OR r.start_time >= $${params.length}::time)
      )
    `;
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const sql = `
    SELECT s.*, b.name AS branch_name, b.city, b.state
    FROM spaces s
    JOIN branches b ON b.id = s.branch_id
    ${where} ${availabilityClause}
    ORDER BY s.name ASC
  `;
  const { rows } = await pool.query(sql, params);
  res.json(rows);
};
