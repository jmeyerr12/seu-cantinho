import { Request, Response } from 'express';
import * as branchService from '../services/branchService';

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
  try {
    const { state, city } = req.query as { state?: string; city?: string };
    const branches = await branchService.listBranches({ state, city });
    res.json(branches);
  } catch (err) {
    console.error('listBranches error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
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
  try {
    const { name, state, city, address } = req.body;

    // validação simples aqui mesmo (se quiser deixar no service, também dá)
    if (!name || !state || !city || !address) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }

    const branch = await branchService.createBranch({
      name,
      state,
      city,
      address,
    });

    res.status(201).json(branch);
  } catch (err) {
    console.error('createBranch error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
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
  try {
    const branch = await branchService.getBranchById(req.params.id);
    if (!branch) {
      return res.status(404).json({ error: 'branch not found' });
    }
    res.json(branch);
  } catch (err) {
    console.error('getBranch error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
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
  try {
    const { id } = req.params;
    const { name, state, city, address } = req.body;

    const branch = await branchService.updateBranch(id, {
      name,
      state,
      city,
      address,
    });

    if (!branch) {
      return res.status(404).json({ error: 'branch not found' });
    }

    res.json(branch);
  } catch (err) {
    console.error('updateBranch error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
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
  try {
    const deleted = await branchService.deleteBranch(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'branch not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('deleteBranch error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
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
  try {
    const spaces = await branchService.listSpacesOfBranch(req.params.id);
    res.json(spaces);
  } catch (err) {
    console.error('listSpacesOfBranch error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
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
