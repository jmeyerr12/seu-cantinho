import { Request, Response } from 'express';
import * as userService from '../services/userService';

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Lista usuários
 *     description: 'Retorna todos os usuários cadastrados, podendo filtrar por cargo (role).'
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: role
 *         required: false
 *         schema: { type: string, example: ADMIN }
 *         description: 'Filtra usuários por cargo (ex.: ADMIN, MANAGER, CUSTOMER).'
 *     responses:
 *       200:
 *         description: 'Lista de usuários retornada com sucesso.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
export const listUsers = async (req: Request, res: Response) => {
  try {
    const { role } = req.query as { role?: string };
    const users = await userService.listUsers({ role });
    res.json(users);
  } catch (err: any) {
    console.error('[listUsers]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
  }
};

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Cria um novo usuário
 *     description: 'Cadastra um novo usuário no sistema.'
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:  { type: string, example: Maria Oliveira }
 *               email: { type: string, format: email, example: maria@email.com }
 *               password: { type: string, format: password, example: 'S3nh@Fort3!' }
 *               phone: { type: string, example: '+55 21 98888-0000' }
 *               role:
 *                 type: string
 *                 description: 'Cargo do usuário (padrão: CUSTOMER).'
 *                 example: ADMIN
 *     responses:
 *       201:
 *         description: 'Usuário criado com sucesso.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: 'Requisição inválida.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorBadRequest'
 *       409:
 *         description: 'Conflito (email já existe).'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const createUser = async (req: Request, res: Response) => {
  const { name, email, phone, role, password } = req.body as {
    name?: string;
    email?: string;
    phone?: string | null;
    role?: string | null;
    password?: string;
  };

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: 'name, email and password are required' });
  }

  try {
    const result = await userService.createUser({
      name,
      email,
      phone: phone ?? null,
      role: role ?? null,
      password
    });

    if (result.kind === 'EMAIL_EXISTS') {
      return res.status(409).json({ error: 'email already exists' });
    }

    return res.status(201).json(result.user);
  } catch (err: any) {
    console.error('[createUser]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
  }
};

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Busca um usuário pelo ID
 *     description: 'Retorna os dados de um usuário específico pelo seu ID.'
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid, example: '550e8400-e29b-41d4-a716-446655440000' }
 *     responses:
 *       200:
 *         description: 'Usuário encontrado com sucesso.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       404:
 *         description: 'Usuário não encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorNotFound'
 */
export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }
    res.json(user);
  } catch (err: any) {
    console.error('[getUser]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
  }
};

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Atualiza um usuário existente
 *     description: 'Atualiza os dados de um usuário existente pelo seu ID. Campos não enviados permanecem inalterados. Se enviar password, a senha será re-hashada com argon2.'
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid, example: '550e8400-e29b-41d4-a716-446655440000' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:  { type: string, example: João da Silva }
 *               email: { type: string, format: email, example: joao@email.com }
 *               phone: { type: string, example: '+55 11 98888-7777' }
 *               role:  { type: string, example: ADMIN }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: 'Usuário atualizado com sucesso.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       404:
 *         description: 'Usuário não encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorNotFound'
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, password } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      password?: string;
    };

    const result = await userService.updateUser(id, {
      name,
      email,
      phone,
      role,
      password
    });

    if (result.kind === 'EMAIL_EXISTS') {
      return res.status(409).json({ error: 'email already exists' });
    }

    if (result.kind === 'NOT_FOUND') {
      return res.status(404).json({ error: 'user not found' });
    }

    res.json(result.user);
  } catch (err: any) {
    console.error('[updateUser]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
  }
};

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Exclui um usuário
 *     description: 'Remove um usuário do sistema pelo seu ID.'
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid, example: '550e8400-e29b-41d4-a716-446655440000' }
 *     responses:
 *       204: { description: 'Usuário excluído com sucesso. Nenhum conteúdo retornado.' }
 *       404:
 *         description: 'Usuário não encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { error: { type: string, example: user not found } }
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const result = await userService.deleteUser(req.params.id);
    if (result === 'NOT_FOUND') {
      return res.status(404).json({ error: 'user not found' });
    }
    res.status(204).send();
  } catch (err: any) {
    console.error('[deleteUser]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
  }
};

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login
 *     description: 'Valida credenciais e retorna um JWT (Bearer).'
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: 'maria@email.com' }
 *               password: { type: string, format: password, example: 'S3nh@Fort3!' }
 *     responses:
 *       200:
 *         description: 'Login realizado com sucesso.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token: { type: string }
 *                 token_type: { type: string, example: Bearer }
 *                 expires_in: { type: string, example: '1h' }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: 'Requisição inválida.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorBadRequest'
 *       401:
 *         description: 'Credenciais inválidas.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'email and password are required' });
  }

  try {
    const result = await userService.login(email, password);

    if (result.kind === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    return res.json({
      access_token: result.token,
      user: result.user
    });
  } catch (err: any) {
    console.error('[loginUser]', err);
    res
      .status(500)
      .json({ error: 'internal_error', message: err?.message || String(err) });
  }
};

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         email: { type: string, format: email }
 *         phone: { type: string, nullable: true }
 *         role: { type: string }
 *         created_at: { type: string, format: date-time, nullable: true }
 *         updated_at: { type: string, format: date-time, nullable: true }
 *         last_login_at: { type: string, format: date-time, nullable: true }
 *     ErrorResponse:
 *       type: object
 *       required: [error, message]
 *       properties:
 *         error: { type: string, example: bad_request }
 *         message: { type: string, example: "campo obrigatório ausente" }
 *         status: { type: integer, example: 400 }
 *         path: { type: string, example: "/users" }
 *         timestamp: { type: string, format: date-time, example: "2025-10-23T10:20:30Z" }
 *     ErrorBadRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             error: { type: string, enum: [bad_request], example: bad_request }
 *             status: { type: integer, example: 400 }
 *     ErrorNotFound:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             error: { type: string, enum: [not_found], example: not_found }
 *             status: { type: integer, example: 404 }
 */
export {};
