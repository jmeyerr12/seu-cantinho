import { Request, Response } from 'express';
import * as reportService from '../services/reportService';

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
    const { from, to, branchId } = req.query as {
      from?: string;
      to?: string;
      branchId?: string;
    };

    if (!from || !to) {
      return res
        .status(400)
        .json({ error: 'from & to required (YYYY-MM-DD)' });
    }

    const rows = await reportService.getRevenue({ from, to, branchId });
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
    const { from, to, branchId, spaceId } = req.query as {
      from?: string;
      to?: string;
      branchId?: string;
      spaceId?: string;
    };

    if (!from || !to) {
      return res
        .status(400)
        .json({ error: 'from & to required (YYYY-MM-DD)' });
    }

    const rows = await reportService.getUtilization({
      from,
      to,
      branchId,
      spaceId,
    });

    res.json(rows);
  } catch (err) {
    console.error('utilization error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};
