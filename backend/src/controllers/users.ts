import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { v4 as uuid } from 'uuid';

export const listUsers = async (req: Request, res: Response) => {
  const { role } = req.query as { role?: string };
  const params: any[] = [];
  const where = role ? (params.push(role), `WHERE role = $1`) : '';
  const { rows } = await pool.query(`SELECT id,name,email,phone,role,created_at FROM users ${where} ORDER BY created_at DESC`, params);
  res.json(rows);
};

export const createUser = async (req: Request, res: Response) => {
  const { name, email, phone, role } = req.body;
  const id = uuid();
  await pool.query(
    `INSERT INTO users (id,name,email,phone,role) VALUES ($1,$2,$3,$4,$5)`,
    [id, name, email, phone ?? null, role ?? 'CUSTOMER']
  );
  const { rows } = await pool.query('SELECT id,name,email,phone,role,created_at FROM users WHERE id = $1', [id]);
  res.status(201).json(rows[0]);
};

export const getUser = async (req: Request, res: Response) => {
  const { rows } = await pool.query('SELECT id,name,email,phone,role,created_at FROM users WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'user not found' });
  res.json(rows[0]);
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, role } = req.body;
  await pool.query(
    `UPDATE users SET
      name = COALESCE($2,name),
      email = COALESCE($3,email),
      phone = COALESCE($4,phone),
      role  = COALESCE($5,role)
     WHERE id = $1`,
    [id, name, email, phone, role]
  );
  const { rows } = await pool.query('SELECT id,name,email,phone,role,created_at FROM users WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'user not found' });
  res.json(rows[0]);
};

export const deleteUser = async (req: Request, res: Response) => {
  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'user not found' });
  res.status(204).send();
};
