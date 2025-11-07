import { Request, Response } from "express";
import { pool } from "../config/db";
import { v4 as uuid } from "uuid";
import formidable, { File as FormidableFile } from "formidable";
import fs from "fs";
import { uploadFile, removeFile, downloadFile, generatePresignedUrl } from "../services/s3-service";

/* helpers */
const toBool = (v: any) => (typeof v === "string" ? v === "true" : !!v);

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
  try {
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
  } catch (err: any) {
    console.error('[listSpaces]', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
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
  try {
    const { branch_id, name, description, capacity, base_price_per_hour, active = true } = req.body;
    const id = uuid();
    await pool.query(
      `INSERT INTO spaces (id,branch_id,name,description,capacity,base_price_per_hour,active)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, branch_id, name, description ?? null, capacity, base_price_per_hour, active]
    );
    const { rows } = await pool.query('SELECT * FROM spaces WHERE id = $1', [id]);
    res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error('[createSpace]', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
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
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM spaces WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'space not found' });
    const photos = await pool.query('SELECT * FROM photos WHERE space_id = $1 ORDER BY "order" ASC', [id]);
    res.json({ ...rows[0], photos: photos.rows });
  } catch (err: any) {
    console.error('[getSpace]', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
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
  try {
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
  } catch (err: any) {
    console.error('[updateSpace]', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
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
  try {
    const { id } = req.params;
    const { active } = req.body as { active: boolean };
    await pool.query('UPDATE spaces SET active = $2, updated_at = NOW() WHERE id = $1', [id, active]);
    const { rows } = await pool.query('SELECT * FROM spaces WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'space not found' });
    res.json(rows[0]);
  } catch (err: any) {
    console.error('[activateSpace]', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
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
  try {
    const { rowCount } = await pool.query('DELETE FROM spaces WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'space not found' });
    res.status(204).send();
  } catch (err: any) {
    console.error('[deleteSpace]', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
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
  try {
    const { rows } = await pool.query('SELECT * FROM photos WHERE space_id = $1 ORDER BY "order" ASC', [req.params.id]);
    res.json(rows);
  } catch (err: any) {
    console.error('[listPhotos]', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
};

/**
 * @openapi
 * /spaces/{id}/photos:
 *   post:
 *     summary: Adiciona foto ao espaço
 *     description: Aceita multipart/form-data com campo **image** (arquivo) e campos opcionais **caption** e **order**. Também aceita JSON com `url` já hospedada.
 *     tags: [Spaces > Photos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID do espaço
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo de imagem (JPEG/PNG, até 4MB)
 *               caption:
 *                 type: string
 *                 example: "Vista frontal"
 *               order:
 *                 type: integer
 *                 example: 0
 *           encoding:
 *             image:
 *               contentType: 
 *                 - image/jpeg
 *                 - image/png
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: "https://cdn.exemplo.com/fotos/abc.jpg"
 *               caption:
 *                 type: string
 *                 example: "Vista frontal"
 *               order:
 *                 type: integer
 *                 example: 0
 *     responses:
 *       201:
 *         description: Foto criada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Photo'
 *       400:
 *         description: Requisição inválida.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorBadRequest'
 *       404:
 *         description: Espaço não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorNotFound'
 */
export const addPhoto = async (req: Request, res: Response) => {
  try {
    const { id: spaceId } = req.params;

    const exists = await pool.query('SELECT 1 FROM spaces WHERE id = $1', [spaceId]);
    if (!exists.rowCount) return res.status(404).json({ error: 'space not found' });

    const form = formidable({ multiples: true, keepExtensions: true });
    const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
      form.parse(req, (err: any, f: any, fl: any) => (err ? reject(err) : resolve({ fields: f, files: fl })));
    });

    const caption = String(Array.isArray((fields as any).caption) ? (fields as any).caption[0] : (fields as any).caption || '');
    const orderRaw = Array.isArray((fields as any).order) ? (fields as any).order[0] : (fields as any).order;
    const order = orderRaw ? Number(orderRaw) : 0;

    const fileArray = (files as any).image as FormidableFile[] | FormidableFile | undefined;
    if (!fileArray) return res.status(400).json({ message: 'image file is required (multipart/form-data)' });

    const singleFile = Array.isArray(fileArray) ? fileArray[0] : fileArray;
    if (!singleFile) return res.status(400).json({ message: 'Invalid image file.' });

    if (singleFile.size > 4 * 1024 * 1024) throw new Error('file size larger than 4MBs');
    if (!singleFile.mimetype || !['image/jpeg', 'image/png', 'image/jpg'].includes(singleFile.mimetype))
      throw new Error('file type not supported');

    const tmpPath = (singleFile as any).filepath || (singleFile as any).path;
    if (!tmpPath) return res.status(400).json({ message: 'Invalid image file path.' });

    const fileContent = await fs.promises.readFile(tmpPath);
    const photoId = uuid();
    const bucket = String(process.env.S3_PHOTO_BUCKET || process.env.S3_IMAGE_BUCKET || 'images');
    const s3Filename = `${spaceId}_${photoId}.jpg`;

    await uploadFile(bucket, s3Filename, fileContent);
    try { await fs.promises.unlink(tmpPath); } catch { }

    await pool.query(
      'INSERT INTO photos (id, space_id, url, caption, "order") VALUES ($1,$2,$3,$4,$5)',
      [photoId, spaceId, s3Filename, caption || null, order]
    );

    const { rows } = await pool.query('SELECT * FROM photos WHERE id = $1', [photoId]);
    return res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error('[addPhoto]', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
};

/**
 * @openapi
 * /spaces/{id}/photos/{photoId}:
 *   delete:
 *     summary: Remove foto do espaço
 *     description: Remove o registro da foto e o arquivo correspondente do bucket S3/MinIO (se aplicável).
 *     tags: [Spaces > Photos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID do espaço
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID da foto
 *     responses:
 *       204:
 *         description: Foto removida com sucesso (sem conteúdo).
 *       404:
 *         description: Foto não encontrada para o espaço informado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorNotFound'
 *             examples:
 *               notFound:
 *                 value:
 *                   error: "photo not found"
 *       400:
 *         description: Requisição inválida (IDs malformados ou parâmetros incorretos).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorBadRequest'
 */
export const deletePhoto = async (req: Request, res: Response) => {
  try {
    const { id: spaceId, photoId } = req.params;

    const q = await pool.query('SELECT url FROM photos WHERE id = $1 AND space_id = $2', [photoId, spaceId]);
    if (!q.rows[0]) return res.status(404).json({ error: 'photo not found' });

    const key = q.rows[0].url;
    const bucket = String(process.env.S3_PHOTO_BUCKET || process.env.S3_IMAGE_BUCKET || 'images');

    try { await removeFile(bucket, key); } catch (e) { console.warn('[deletePhoto] S3 remove failed:', e); }

    const { rowCount } = await pool.query('DELETE FROM photos WHERE id = $1 AND space_id = $2', [photoId, spaceId]);
    if (!rowCount) return res.status(404).json({ error: 'photo not found' });

    res.status(204).send();
  } catch (err: any) {
    console.error('[deletePhoto]', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
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
  try {
    const { id } = req.params;
    const { date, start, end } = req.query as { date: string; start: string; end: string };
    if (!date || !start || !end) return res.status(400).json({ error: 'date, start, end required' });

    const q = `
      SELECT 1 FROM reservations
      WHERE space_id = $1 AND date = $2 AND status <> 'CANCELLED'
        AND NOT (end_time <= $3::time OR start_time >= $4::time)
      LIMIT 1`;
    const { rows } = await pool.query(q, [id, date, start, end]);
    res.json({ available: rows.length === 0 });
  } catch (err: any) {
    console.error('[checkAvailability]', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
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
  try {
    const { city, state, capacity, date, start, end } = req.query as any;
    const params: any[] = [];
    const filters: string[] = ['s.active = TRUE'];

    if (capacity) { params.push(Number(capacity)); filters.push(`s.capacity >= $${params.length}`); }
    if (state) { params.push(state); filters.push(`b.state = $${params.length}`); }
    if (city) { params.push(city); filters.push(`b.city  = $${params.length}`); }

    let availabilityClause = '';
    if (date && start && end) {
      params.push(date, start, end);
      availabilityClause = `
        AND NOT EXISTS (
          SELECT 1 FROM reservations r
          WHERE r.space_id = s.id AND r.date = $${params.length - 2} AND r.status <> 'CANCELLED'
            AND NOT (r.end_time <= $${params.length - 1}::time OR r.start_time >= $${params.length}::time)
        )`;
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const sql = `
      SELECT s.*, b.name AS branch_name, b.city, b.state
      FROM spaces s
      JOIN branches b ON b.id = s.branch_id
      ${where} ${availabilityClause}
      ORDER BY s.name ASC`;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err: any) {
    console.error('[searchSpaces]', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
};

function guessContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

/**
 * @openapi
 * /spaces/{id}/photos/{photoId}/image:
 *   get:
 *     summary: Exibe a imagem da foto (inline)
 *     description: 'Faz o streaming do arquivo do S3/MinIO para visualização inline.'
 *     tags: [Spaces > Photos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID do espaço
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID da foto
 *     responses:
 *       200:
 *         description: Imagem exibida.
 *         content:
 *           image/jpeg: {}
 *           image/png: {}
 *           image/webp: {}
 *       404:
 *         description: Foto não encontrada.
 */
export const viewPhotoImage = async (req: Request, res: Response) => {
  try {
    const { id: spaceId, photoId } = req.params;

    // Busca a key (armazenada no campo "url")
    const q = await pool.query(
      'SELECT url FROM photos WHERE id = $1 AND space_id = $2',
      [photoId, spaceId]
    );
    if (!q.rows[0]) return res.status(404).json({ error: 'photo not found' });

    const key = q.rows[0].url as string;
    const bucket = String(process.env.S3_PHOTO_BUCKET || process.env.S3_IMAGE_BUCKET || 'images');

    const buf = await downloadFile(bucket, key);

    res.setHeader('Content-Type', guessContentType(key));
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(key)}"`);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(buf);
  } catch (err: any) {
    console.error('[viewPhotoImage]', err);
    res.status(500).json({ error: 'internal_error', message: err?.message || String(err) });
  }
};

/**
 * @openapi
 * /spaces/{id}/photos/links:
 *   get:
 *     summary: Lista links de acesso às fotos do espaço
 *     description: |
 *       Retorna um vetor de objetos com links de acesso para exibição das imagens no frontend.
 *       Se `mode=presigned`, retorna URLs pré-assinadas do S3/MinIO (com expiração).
 *       Caso contrário, retorna links internos da API que fazem proxy da imagem.
 *     tags: [Spaces > Photos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID do espaço
 *       - in: query
 *         name: mode
 *         required: false
 *         schema: { type: string, enum: [proxy, presigned], default: proxy }
 *         description: Tipo de link retornado.
 *     responses:
 *       200:
 *         description: Vetor de links de imagem.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       href: { type: string }
 *                       contentType: { type: string }
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                         description: Presente apenas quando `mode=presigned`.
 *       404:
 *         description: Espaço ou fotos não encontrados.
 */

export const listPhotoLinks = async (req: Request, res: Response) => {
  try {
    const { id: spaceId } = req.params;

    // Busca id e url (onde url é a key armazenada no bucket)
    const q = await pool.query(
      'SELECT id, url FROM photos WHERE space_id = $1 ORDER BY id',
      [spaceId]
    );

    // Pode ser que não haja fotos — devolve lista vazia mesmo assim
    if (q.rows.length === 0) {
      return res.json({ items: [] });
    }

    // Monta links internos (proxy):
    // /spaces/{id}/photos/{photoId}/image
    const items = q.rows.map((r: { id: string; url: string }) => {
      return {
        id: r.id,
        href: `/spaces/${encodeURIComponent(spaceId)}/photos/${encodeURIComponent(r.id)}/image`,
      };
    });

    // Cache leve
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.json({ items });
  } catch (err: any) {
    console.error('[listPhotoLinks]', err);
    return res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
  }
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
export { };
