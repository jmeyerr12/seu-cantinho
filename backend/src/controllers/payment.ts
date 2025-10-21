import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { v4 as uuid } from 'uuid';

export const createPayment = async (req: Request, res: Response) => {
  const { id: reservationId } = req.params;
  const { amount, method, purpose, external_ref } = req.body;
  const id = uuid();
  await pool.query(
    `INSERT INTO payments (id, reservation_id, amount, method, status, purpose, external_ref)
     VALUES ($1,$2,$3,$4,'PENDING',$5,$6)`,
    [id, reservationId, amount, method, purpose, external_ref ?? null]
  );
  const { rows } = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
  res.status(201).json(rows[0]);
};

export const getPayment = async (req: Request, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'payment not found' });
  res.json(rows[0]);
};

export const markPaid = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { external_ref } = req.body;
  await pool.query(
    `UPDATE payments SET status = 'PAID', paid_at = NOW(), external_ref = COALESCE($2, external_ref) WHERE id = $1`,
    [id, external_ref ?? null]
  );
  const { rows } = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'payment not found' });
  res.json(rows[0]);
};

export const deletePayment = async (req: Request, res: Response) => {
  // regra simples: só pode apagar se NÃO pago
  const check = await pool.query('SELECT status FROM payments WHERE id = $1', [req.params.id]);
  if (!check.rows[0]) return res.status(404).json({ error: 'payment not found' });
  if (check.rows[0].status === 'PAID') return res.status(400).json({ error: 'cannot delete a paid payment' });

  await pool.query('DELETE FROM payments WHERE id = $1', [req.params.id]);
  res.status(204).send();
};

export const webhook = async (_req: Request, res: Response) => {
  // trate provedor externo aqui (verifique assinatura, etc.)
  res.status(200).send('ok');
};
