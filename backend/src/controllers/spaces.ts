import { Request, Response } from 'express';
import { pool } from '../config/db';
import { v4 as uuid } from 'uuid';

/* helpers */
const toBool = (v: any) => (typeof v === 'string' ? v === 'true' : !!v);

/**
 * @openapi
 * /spaces:
 *   get:
 *     summary: Lista espaços
 *     description: 'Retorna espaços, com filtros opcionais por filial, capacidade mínima e status ativo.'
 *     tags: [Spaces]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 'ID da filial (branch) do espaço.'
 *       - in: query
 *         name: minCapacity
 *         required: false
 *         schema:
 *           type: integer
 *         description: 'Capacidade mínima.'
 *       - in: query
 *         name: active
 *         required: false
 *         schema:
 *           type: boolean
 *         description: 'Filtra por espaços ativos (true) ou inativos (false).'
 *     responses:
 *       200:
 *         description: 'Lista de espaços.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Space'
 */
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

/**
 * @openapi
 * /spaces:
 *   post:
 *     summary: Cria um espaço
 *     description: 'Cadastra um novo espaço.'
 *     tags: [Spaces]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [branch_id, name, capacity, base_price_per_hour]
 *             properties:
 *               branch_id: { type: string, format: uuid, example: '1f0e4c2e-7d6b-4b0d-99f9-8d3a4a2ab001' }
 *               name: { type: string, example: 'Sala Multiuso' }
 *               description: { type: string, nullable: true, example: 'Espaço amplo para eventos.' }
 *               capacity: { type: integer, example: 30 }
 *               base_price_per_hour: { type: number, format: float, example: 120.5 }
 *               active: { type: boolean, example: true }
 *     responses:
 *       201:
 *         description: 'Espaço criado.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Space'
 */
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

/**
 * @openapi
 * /spaces/{id}:
 *   get:
 *     summary: Detalha um espaço
 *     description: 'Retorna um espaço pelo ID, incluindo fotos.'
 *     tags: [Spaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: 'ID do espaço.'
 *     responses:
 *       200:
 *         description: 'Espaço encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Space'
 *                 - type: object
 *                   properties:
 *                     photos:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Photo' }
 *       404:
 *         description: 'Espaço não encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorNotFound'
 */
export const getSpace = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT * FROM spaces WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'space not found' });
  const photos = await pool.query('SELECT * FROM photos WHERE space_id = $1 ORDER BY "order" ASC', [id]);
  res.json({ ...rows[0], photos: photos.rows });
};

/**
 * @openapi
 * /spaces/{id}:
 *   put:
 *     summary: Atualiza um espaço
 *     description: 'Atualiza dados do espaço. Campos não enviados permanecem inalterados.'
 *     tags: [Spaces]
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
 *               name: { type: string, example: 'Sala Multiuso A' }
 *               description: { type: string, nullable: true, example: 'Com ar-condicionado.' }
 *               capacity: { type: integer, example: 40 }
 *               base_price_per_hour: { type: number, format: float, example: 150 }
 *               active: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: 'Espaço atualizado.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Space'
 *       404:
 *         description: 'Espaço não encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorNotFound'
 */
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

/**
 * @openapi
 * /spaces/{id}/active:
 *   patch:
 *     summary: Ativa/Desativa um espaço
 *     description: 'Altera o status ativo do espaço.'
 *     tags: [Spaces]
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
 *             required: [active]
 *             properties:
 *               active: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: 'Status atualizado.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Space'
 *       404:
 *         description: 'Espaço não encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorNotFound'
 */
export const activateSpace = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { active } = req.body as { active: boolean };
  await pool.query('UPDATE spaces SET active = $2, updated_at = NOW() WHERE id = $1', [id, active]);
  const { rows } = await pool.query('SELECT * FROM spaces WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'space not found' });
  res.json(rows[0]);
};

/**
 * @openapi
 * /spaces/{id}:
 *   delete:
 *     summary: Remove um espaço
 *     description: 'Exclui um espaço pelo ID.'
 *     tags: [Spaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: 'Removido com sucesso.'
 *       404:
 *         description: 'Espaço não encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorNotFound'
 */
export const deleteSpace = async (req: Request, res: Response) => {
  const { rowCount } = await pool.query('DELETE FROM spaces WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'space not found' });
  res.status(204).send();
};

/**
 * @openapi
 * /spaces/{id}/photos:
 *   get:
 *     summary: Lista fotos do espaço
 *     description: 'Retorna as fotos do espaço em ordem.'
 *     tags: [Spaces > Photos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 'Lista de fotos.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Photo' }
 */
export const listPhotos = async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    'SELECT * FROM photos WHERE space_id = $1 ORDER BY "order" ASC',
    [req.params.id]
  );
  res.json(rows);
};

/**
 * @openapi
 * /spaces/{id}/photos:
 *   post:
 *     summary: Adiciona foto ao espaço
 *     description: 'Cria um registro de foto associado ao espaço.'
 *     tags: [Spaces > Photos]
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
 *             required: [url]
 *             properties:
 *               url: { type: string, format: uri, example: 'https://cdn.exemplo.com/fotos/abc.jpg' }
 *               caption: { type: string, nullable: true, example: 'Vista frontal' }
 *               order: { type: integer, example: 0 }
 *     responses:
 *       201:
 *         description: 'Foto criada.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Photo'
 */
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

/**
 * @openapi
 * /spaces/{id}/photos/{photoId}:
 *   delete:
 *     summary: Remove foto do espaço
 *     tags: [Spaces > Photos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: 'Foto removida.'
 *       404:
 *         description: 'Foto não encontrada.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorNotFound'
 */
export const deletePhoto = async (req: Request, res: Response) => {
  const { id: spaceId, photoId } = req.params;
  const { rowCount } = await pool.query(
    'DELETE FROM photos WHERE id = $1 AND space_id = $2',
    [photoId, spaceId]
  );
  if (!rowCount) return res.status(404).json({ error: 'photo not found' });
  res.status(204).send();
};

/**
 * @openapi
 * /spaces/{id}/availability:
 *   get:
 *     summary: Verifica disponibilidade do espaço
 *     description: 'Retorna se o espaço está disponível no intervalo informado.'
 *     tags: [Spaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date, example: '2025-10-23' }
 *       - in: query
 *         name: start
 *         required: true
 *         schema: { type: string, example: '09:00' }
 *       - in: query
 *         name: end
 *         required: true
 *         schema: { type: string, example: '11:00' }
 *     responses:
 *       200:
 *         description: 'Resultado da disponibilidade.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available: { type: boolean, example: true }
 *       400:
 *         description: 'Parâmetros obrigatórios ausentes (date, start, end).'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorBadRequest'
 */
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

/**
 * @openapi
 * /spaces/search:
 *   get:
 *     summary: Busca espaços por filtros
 *     description: 'Busca espaços ativos por localização/capacidade e, opcionalmente, por disponibilidade no intervalo.'
 *     tags: [Spaces]
 *     parameters:
 *       - in: query
 *         name: city
 *         required: false
 *         schema: { type: string, example: 'São Paulo' }
 *       - in: query
 *         name: state
 *         required: false
 *         schema: { type: string, example: 'SP' }
 *       - in: query
 *         name: capacity
 *         required: false
 *         schema: { type: integer, example: 20 }
 *       - in: query
 *         name: date
 *         required: false
 *         schema: { type: string, format: date, example: '2025-10-23' }
 *       - in: query
 *         name: start
 *         required: false
 *         schema: { type: string, example: '09:00' }
 *       - in: query
 *         name: end
 *         required: false
 *         schema: { type: string, example: '11:00' }
 *     responses:
 *       200:
 *         description: 'Resultados da busca.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Space'
 *                   - type: object
 *                     properties:
 *                       branch_name: { type: string, example: 'Unidade Centro' }
 *                       city: { type: string, example: 'São Paulo' }
 *                       state: { type: string, example: 'SP' }
 */
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



/**
 * @openapi
 * components:
 *   schemas:
 *     Space:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         branch_id: { type: string, format: uuid }
 *         name: { type: string, example: 'Sala Multiuso' }
 *         description: { type: string, nullable: true, example: 'Espaço amplo e ventilado.' }
 *         capacity: { type: integer, example: 30 }
 *         base_price_per_hour: { type: number, format: float, example: 120.5 }
 *         active: { type: boolean, example: true }
 *         created_at: { type: string, format: date-time, nullable: true }
 *         updated_at: { type: string, format: date-time, nullable: true }
 *
 *     Photo:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         space_id: { type: string, format: uuid }
 *         url: { type: string, format: uri, example: 'https://cdn.exemplo.com/fotos/abc.jpg' }
 *         caption: { type: string, nullable: true, example: 'Vista frontal' }
 *         order: { type: integer, example: 0 }
 *         created_at: { type: string, format: date-time, nullable: true }
 */
export {};
