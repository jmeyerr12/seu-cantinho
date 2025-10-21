import { Request, Response } from 'express';
import { pool } from '../config/db.js';

/**
 * receita: soma de pagamentos PAID no período (por filial/espaço opcional)
 */
export const revenue = async (req: Request, res: Response) => {
  const { from, to, branchId } = req.query as any;
  if (!from || !to) return res.status(400).json({ error: 'from & to required (YYYY-MM-DD)' });

  const params: any[] = [from, to];
  const branchFilter = branchId ? (params.push(branchId), 'AND r.branch_id = $3') : '';
  const sql = `
    SELECT r.branch_id, b.name AS branch_name,
           r.space_id,  s.name AS space_name,
           SUM(p.amount)::numeric(12,2) AS revenue
    FROM payments p
    JOIN reservations r ON r.id = p.reservation_id
    JOIN branches b ON b.id = r.branch_id
    JOIN spaces   s ON s.id = r.space_id
    WHERE p.status = 'PAID'
      AND p.paid_at::date BETWEEN $1 AND $2
      ${branchFilter}
    GROUP BY r.branch_id, b.name, r.space_id, s.name
    ORDER BY branch_name, space_name
  `;
  const { rows } = await pool.query(sql, params);
  res.json(rows);
};

/**
 * utilização: horas reservadas / horas disponíveis no período
 * simplificação: considera disponibilidade 24h/dia (sem horário comercial)
 */
export const utilization = async (req: Request, res: Response) => {
  const { from, to, branchId, spaceId } = req.query as any;
  if (!from || !to) return res.status(400).json({ error: 'from & to required (YYYY-MM-DD)' });

  const params: any[] = [from, to];
  let joinFilter = '';
  if (branchId) { params.push(branchId); joinFilter += ` AND s.branch_id = $${params.length}`; }
  if (spaceId)  { params.push(spaceId);  joinFilter += ` AND s.id        = $${params.length}`; }

  const sql = `
    WITH hours_reserved AS (
      SELECT r.space_id,
             SUM(EXTRACT(EPOCH FROM (r.end_time - r.start_time))/3600.0) AS hrs
      FROM reservations r
      WHERE r.date BETWEEN $1 AND $2 AND r.status <> 'CANCELLED'
      GROUP BY r.space_id
    ),
    spaces_set AS (
      SELECT s.id, s.branch_id FROM spaces s WHERE 1=1 ${joinFilter}
    )
    SELECT
      ss.branch_id,
      b.name AS branch_name,
      ss.id   AS space_id,
      s.name  AS space_name,
      COALESCE(hr.hrs, 0)               AS hours_reserved,
      ((DATE $2 - DATE $1) + 1) * 24.0  AS hours_possible,
      CASE
        WHEN ((DATE $2 - DATE $1) + 1) * 24.0 = 0 THEN 0
        ELSE COALESCE(hr.hrs,0) / (((DATE $2 - DATE $1) + 1) * 24.0)
      END AS utilization
    FROM spaces_set ss
    JOIN spaces s   ON s.id = ss.id
    JOIN branches b ON b.id = ss.branch_id
    LEFT JOIN hours_reserved hr ON hr.space_id = ss.id
    ORDER BY branch_name, space_name
  `;
  const { rows } = await pool.query(sql, params);
  res.json(rows);
};
