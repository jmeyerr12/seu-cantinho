import { Request, Response } from 'express';
import * as spaceService from '../services/spaceService';

/* helpers de query */
const parseBoolFromQuery = (v: unknown): boolean | undefined => {
  if (typeof v === 'string') {
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  return undefined;
};

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
      branchId?: string;
      minCapacity?: string;
      active?: string;
    };

    const minCapNum =
      typeof minCapacity === 'string' && minCapacity.trim() !== ''
        ? Number(minCapacity)
        : undefined;

    const activeBool = parseBoolFromQuery(active);

    const spaces = await spaceService.listSpaces({
      branchId,
      minCapacity: Number.isFinite(minCapNum ?? NaN) ? minCapNum : undefined,
      active: activeBool
    });

    res.json(spaces);
  } catch (err: any) {
    console.error('[listSpaces]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
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
    const {
      branch_id,
      name,
      description,
      capacity,
      base_price_per_hour,
      active
    } = req.body;

    if (!branch_id || !name) {
      return res.status(400).json({
        error: 'missing_required_fields',
        message: 'branch_id and name are required'
      });
    }

    const space = await spaceService.createSpace({
      branch_id,
      name,
      description,
      capacity,
      base_price_per_hour,
      active
    });

    res.status(201).json(space);
  } catch (err: any) {
    console.error('[createSpace]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
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

    const result = await spaceService.getSpaceWithPhotos(id);
    if (!result) {
      return res.status(404).json({ error: 'space not found' });
    }

    const { space, photos } = result;
    res.json({ ...space, photos });
  } catch (err: any) {
    console.error('[getSpace]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
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
    const {
      name,
      description,
      capacity,
      base_price_per_hour,
      active
    } = req.body;

    const updated = await spaceService.updateSpace(id, {
      name,
      description,
      capacity,
      base_price_per_hour,
      active
    });

    if (!updated) {
      return res.status(404).json({ error: 'space not found' });
    }

    res.json(updated);
  } catch (err: any) {
    console.error('[updateSpace]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
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
    const { active } = req.body as { active?: boolean };

    if (typeof active !== 'boolean') {
      return res
        .status(400)
        .json({ error: 'active must be boolean', message: 'active is required' });
    }

    const space = await spaceService.setSpaceActive(id, active);
    if (!space) {
      return res.status(404).json({ error: 'space not found' });
    }

    res.json(space);
  } catch (err: any) {
    console.error('[activateSpace]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
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
    const ok = await spaceService.deleteSpace(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: 'space not found' });
    }
    res.status(204).send();
  } catch (err: any) {
    console.error('[deleteSpace]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
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
    const photos = await spaceService.listPhotos(req.params.id);
    res.json(photos);
  } catch (err: any) {
    console.error('[listPhotos]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
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
 *         description: Foto criado.
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

    const result = await spaceService.addPhoto(spaceId, req);

    if (result.kind === 'SPACE_NOT_FOUND') {
      return res.status(404).json({ error: 'space not found' });
    }

    if (result.kind === 'BAD_REQUEST') {
      return res.status(400).json({ error: 'bad_request', message: result.message });
    }

    return res.status(201).json(result.photo);
  } catch (err: any) {
    console.error('[addPhoto]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
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

    const result = await spaceService.deletePhoto(spaceId, photoId);
    if (result === 'PHOTO_NOT_FOUND') {
      return res.status(404).json({ error: 'photo not found' });
    }

    res.status(204).send();
  } catch (err: any) {
    console.error('[deletePhoto]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
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
    const { date, start, end } = req.query as {
      date?: string;
      start?: string;
      end?: string;
    };

    if (!date || !start || !end) {
      return res
        .status(400)
        .json({ error: 'date, start, end required' });
    }

    const available = await spaceService.checkAvailability(id, date, start, end);
    res.json({ available });
  } catch (err: any) {
    console.error('[checkAvailability]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
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
    const { city, state, capacity, date, start, end } = req.query as {
      city?: string;
      state?: string;
      capacity?: string;
      date?: string;
      start?: string;
      end?: string;
    };

    const capacityNum =
      typeof capacity === 'string' && capacity.trim() !== ''
        ? Number(capacity)
        : undefined;

    const rows = await spaceService.searchSpaces({
      city,
      state,
      capacity: Number.isFinite(capacityNum ?? NaN) ? capacityNum : undefined,
      date,
      start,
      end
    });

    res.json(rows);
  } catch (err: any) {
    console.error('[searchSpaces]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
  }
};

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

    const result = await spaceService.getPhotoImage(spaceId, photoId);
    if (!result) {
      return res.status(404).json({ error: 'photo not found' });
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(result.filename)}"`
    );
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(result.buffer);
  } catch (err: any) {
    console.error('[viewPhotoImage]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
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
    // por enquanto ignoramos o mode e seguimos retornando links de proxy,
    // como já fazia a implementação anterior.
    const result = await spaceService.listPhotoLinks(spaceId);

    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.json(result);
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
export {};
