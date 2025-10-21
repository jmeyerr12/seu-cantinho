import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { v4 as uuid } from 'uuid';

export const listBranches = async (req: Request, res: Response) => {
  const { state, city } = req.query as { state?: string; city?: string };
  const filters: string[] = [];
  const params: any[] = [];
  if (state) { params.push(state); filters.push(`state = $${params.length}`); }
  if (city)  { params.push(city);  filters.push(`city  = $${params.length}`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT * FROM branches ${where} ORDER BY name ASC`, params);
  res.json(rows);
};

export const createBranch = async (req: Request, res: Response) => {
  const { name, state, city, address } = req.body;
  const id = uuid();
  await pool.query(
    `INSERT INTO branches (id,name,state,city,address) VALUES ($1,$2,$3,$4,$5)`,
    [id, name, state, city, address]
  );
  const { rows } = await pool.query('SELECT * FROM branches WHERE id = $1', [id]);
  res.status(201).json(rows[0]);
};

export const getBranch = async (req: Request, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM branches WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'branch not found' });
  res.json(rows[0]);
};

export const updateBranch = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, state, city, address } = req.body;
  await pool.query(
    `UPDATE branches SET name = COALESCE($2,name), state = COALESCE($3,state),
     city = COALESCE($4,city), address = COALESCE($5,address), updated_at = NOW() WHERE id = $1`,
    [id, name, state, city, address]
  );
  const { rows } = await pool.query('SELECT * FROM branches WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'branch not found' });
  res.json(rows[0]);
};

export const deleteBranch = async (req: Request, res: Response) => {
  const { rowCount } = await pool.query('DELETE FROM branches WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'branch not found' });
  res.status(204).send();
};

export const listSpacesOfBranch = async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    'SELECT * FROM spaces WHERE branch_id = $1 ORDER BY name ASC',
    [req.params.id]
  );
  res.json(rows);
};
