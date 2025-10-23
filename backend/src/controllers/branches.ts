import { Request, Response } from 'express';
import { pool } from '../config/db';
import { v4 as uuid } from 'uuid';

/**
 * @openapi
 * /branches:
 *   get:
 *     summary: Lista filiais
 *     description: 'Retorna as filiais, com filtros opcionais por estado e cidade.'
 *     tags: [Branches]
 *     parameters:
 *       - in: query
 *         name: state
 *         required: false
 *         schema: { type: string, example: 'SP' }
 *         description: 'UF da filial.'
 *       - in: query
 *         name: city
 *         required: false
 *         schema: { type: string, example: 'São Paulo' }
 *         description: 'Cidade da filial.'
 *     responses:
 *       200:
 *         description: 'Lista de filiais.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Branch' }
 */
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

/**
 * @openapi
 * /branches:
 *   post:
 *     summary: Cria uma filial
 *     description: 'Cadastra uma nova filial.'
 *     tags: [Branches]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, state, city, address]
 *             properties:
 *               name: { type: string, example: 'Unidade Centro' }
 *               state: { type: string, example: 'SP' }
 *               city: { type: string, example: 'São Paulo' }
 *               address: { type: string, example: 'Av. Principal, 123' }
 *     responses:
 *       201:
 *         description: 'Filial criada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Branch' }
 *       400:
 *         description: 'Dados inválidos.'
 */
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

/**
 * @openapi
 * /branches/{id}:
 *   get:
 *     summary: Detalha uma filial
 *     tags: [Branches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 'Filial encontrada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Branch' }
 *       404:
 *         description: 'Filial não encontrada.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { error: { type: string, example: 'branch not found' } }
 */
export const getBranch = async (req: Request, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM branches WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'branch not found' });
  res.json(rows[0]);
};

/**
 * @openapi
 * /branches/{id}:
 *   put:
 *     summary: Atualiza uma filial
 *     description: 'Atualiza dados da filial. Campos não enviados permanecem inalterados.'
 *     tags: [Branches]
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
 *               name: { type: string, example: 'Unidade Centro' }
 *               state: { type: string, example: 'SP' }
 *               city: { type: string, example: 'São Paulo' }
 *               address: { type: string, example: 'Av. Principal, 123' }
 *     responses:
 *       200:
 *         description: 'Filial atualizada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Branch' }
 *       404:
 *         description: 'Filial não encontrada.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { error: { type: string, example: 'branch not found' } }
 */
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

/**
 * @openapi
 * /branches/{id}:
 *   delete:
 *     summary: Remove uma filial
 *     tags: [Branches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: 'Removida com sucesso.'
 *       404:
 *         description: 'Filial não encontrada.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { error: { type: string, example: 'branch not found' } }
 */
export const deleteBranch = async (req: Request, res: Response) => {
  const { rowCount } = await pool.query('DELETE FROM branches WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'branch not found' });
  res.status(204).send();
};

/**
 * @openapi
 * /branches/{id}/spaces:
 *   get:
 *     summary: Lista espaços de uma filial
 *     tags: [Branches, Spaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: 'ID da filial.'
 *     responses:
 *       200:
 *         description: 'Lista de espaços da filial.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Space' }
 */
export const listSpacesOfBranch = async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    'SELECT * FROM spaces WHERE branch_id = $1 ORDER BY name ASC',
    [req.params.id]
  );
  res.json(rows);
};


/**
 * @openapi
 * components:
 *   schemas:
 *     Branch:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         state: { type: string, example: 'SP' }
 *         city: { type: string, example: 'São Paulo' }
 *         address: { type: string }
 *         created_at: { type: string, format: date-time, nullable: true }
 *         updated_at: { type: string, format: date-time, nullable: true }
 */
export {};

