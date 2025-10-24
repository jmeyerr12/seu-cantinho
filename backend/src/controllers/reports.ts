import { Request, Response } from 'express';
import { pool } from '../config/db';

/**
 * @openapi
 * /reports/revenue:
 *   get:
 *     summary: Receita por filial e espaço
 *     description: 'Soma os pagamentos com status PAID no período informado, agregando por filial e espaço.'
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema: { type: string, format: date, example: '2025-10-01' }
 *         description: 'Data inicial (YYYY-MM-DD).'
 *       - in: query
 *         name: to
 *         required: true
 *         schema: { type: string, format: date, example: '2025-10-31' }
 *         description: 'Data final (YYYY-MM-DD).'
 *       - in: query
 *         name: branchId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: 'Filtrar por filial.'
 *     responses:
 *       200:
 *         description: 'Lista de receitas agregadas.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   branch_id:   { type: string, format: uuid }
 *                   branch_name: { type: string, example: 'Unidade Centro' }
 *                   space_id:    { type: string, format: uuid }
 *                   space_name:  { type: string, example: 'Sala Multiuso' }
 *                   revenue:
 *                     type: string
 *                     description: 'Valor total no período (duas casas decimais).'
 *                     example: '1234.50'
 *       400:
 *         description: 'Parâmetros inválidos/ausentes (from, to).'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { error: { type: string, example: 'from & to required (YYYY-MM-DD)' } }
 */
export const revenue = async (req: Request, res: Response) => {
  try {
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
  } catch (err) {
    console.error('revenue error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reports/utilization:
 *   get:
 *     summary: Taxa de utilização (horas reservadas / horas possíveis)
 *     description: 'Calcula horas reservadas e horas possíveis no período (simplificação: 24h por dia).'
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema: { type: string, format: date, example: '2025-10-01' }
 *         description: 'Data inicial (YYYY-MM-DD).'
 *       - in: query
 *         name: to
 *         required: true
 *         schema: { type: string, format: date, example: '2025-10-31' }
 *         description: 'Data final (YYYY-MM-DD).'
 *       - in: query
 *         name: branchId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: 'Filtrar por filial.'
 *       - in: query
 *         name: spaceId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: 'Filtrar por espaço.'
 *     responses:
 *       200:
 *         description: 'Utilização por espaço (e filial).'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   branch_id:       { type: string, format: uuid }
 *                   branch_name:     { type: string, example: 'Unidade Centro' }
 *                   space_id:        { type: string, format: uuid }
 *                   space_name:      { type: string, example: 'Sala Multiuso' }
 *                   hours_reserved:  { type: number, format: float, example: 12.5 }
 *                   hours_possible:  { type: number, format: float, example: 72 }
 *                   utilization:
 *                     type: number
 *                     format: float
 *                     description: 'Proporção entre 0 e 1.'
 *                     example: 0.1736
 *       400:
 *         description: 'Parâmetros inválidos/ausentes (from, to).'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { error: { type: string, example: 'from & to required (YYYY-MM-DD)' } }
 */
export const utilization = async (req: Request, res: Response) => {
  try {
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
  } catch (err) {
    console.error('utilization error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};
