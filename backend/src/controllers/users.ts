import { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { v4 as uuid } from 'uuid';

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Lista usuários
 *     description: 'Retorna todos os usuários cadastrados, podendo filtrar por cargo (role).'
 *     tags:
 *       - Users
 *     parameters:
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *           example: admin
 *         description: 'Filtra usuários por cargo (ex.: admin, user).'
 *     responses:
 *       200:
 *         description: 'Lista de usuários retornada com sucesso.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: João Silva
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: joao@email.com
 *                   phone:
 *                     type: string
 *                     example: '+55 11 99999-0000'
 *                   role:
 *                     type: string
 *                     example: admin
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     example: '2025-10-23T10:20:30Z'
 */
export const listUsers = async (req: Request, res: Response) => {
  const { role } = req.query as { role?: string };
  const params: any[] = [];
  const where = role ? (params.push(role), `WHERE role = $1`) : '';
  const { rows } = await pool.query(`SELECT id,name,email,phone,role,created_at FROM users ${where} ORDER BY created_at DESC`, params);
  res.json(rows);
};

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Cria um novo usuário
 *     description: 'Cadastra um novo usuário no sistema.'
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: Maria Oliveira
 *               email:
 *                 type: string
 *                 format: email
 *                 example: maria@email.com
 *               phone:
 *                 type: string
 *                 example: '+55 21 98888-0000'
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
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                   example: '550e8400-e29b-41d4-a716-446655440000'
 *                 name:
 *                   type: string
 *                   example: Maria Oliveira
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: maria@email.com
 *                 phone:
 *                   type: string
 *                   example: '+55 21 98888-0000'
 *                 role:
 *                   type: string
 *                   example: CUSTOMER
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-10-23T10:20:30Z'
 */
export const createUser = async (req: Request, res: Response) => {
  const { name, email, phone, role } = req.body as {
    name?: string;
    email?: string;
    phone?: string | null;
    role?: string | null;
  };

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  const id = uuid();

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, name, email, phone, role, created_at`,
      [id, name, email, phone ?? null, role ?? 'CUSTOMER']
    );

    if (rows.length === 0) {
      return res.status(409).json({ error: 'email already exists' });
    }

    return res.status(201).json(rows[0]);
  } catch (err: any) {

    console.error('createUser error:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
};

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Busca um usuário pelo ID
 *     description: 'Retorna os dados de um usuário específico pelo seu ID.'
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: '550e8400-e29b-41d4-a716-446655440000'
 *         description: 'ID do usuário a ser buscado.'
 *     responses:
 *       200:
 *         description: 'Usuário encontrado com sucesso.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                   example: '550e8400-e29b-41d4-a716-446655440000'
 *                 name:
 *                   type: string
 *                   example: João da Silva
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: joao@email.com
 *                 phone:
 *                   type: string
 *                   example: '+55 11 99999-0000'
 *                 role:
 *                   type: string
 *                   example: ADMIN
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-10-23T10:20:30Z'
 *       404:
 *         description: 'Usuário não encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: user not found
 */
export const getUser = async (req: Request, res: Response) => {
  const { rows } = await pool.query('SELECT id,name,email,phone,role,created_at FROM users WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'user not found' });
  res.json(rows[0]);
};

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Atualiza um usuário existente
 *     description: 'Atualiza os dados de um usuário existente pelo seu ID. Campos não enviados permanecem inalterados.'
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: '550e8400-e29b-41d4-a716-446655440000'
 *         description: 'ID do usuário a ser atualizado.'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: João da Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@email.com
 *               phone:
 *                 type: string
 *                 example: '+55 11 98888-7777'
 *               role:
 *                 type: string
 *                 example: ADMIN
 *           example:
 *             name: João da Silva
 *             phone: '+55 11 98888-7777'
 *     responses:
 *       200:
 *         description: 'Usuário atualizado com sucesso.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                   example: '550e8400-e29b-41d4-a716-446655440000'
 *                 name:
 *                   type: string
 *                   example: João da Silva
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: joao@email.com
 *                 phone:
 *                   type: string
 *                   example: '+55 11 98888-7777'
 *                 role:
 *                   type: string
 *                   example: ADMIN
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-10-23T10:20:30Z'
 *       404:
 *         description: 'Usuário não encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: user not found
 */
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, role } = req.body;
  await pool.query(
    `UPDATE users SET
      name = COALESCE($2,name),
      email = COALESCE($3,email),
      phone = COALESCE($4,phone),
      role  = COALESCE($5,role)
     WHERE id = $1`,
    [id, name, email, phone, role]
  );
  const { rows } = await pool.query('SELECT id,name,email,phone,role,created_at FROM users WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'user not found' });
  res.json(rows[0]);
};

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Exclui um usuário
 *     description: 'Remove um usuário do sistema pelo seu ID.'
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: '550e8400-e29b-41d4-a716-446655440000'
 *         description: 'ID do usuário a ser removido.'
 *     responses:
 *       204:
 *         description: 'Usuário excluído com sucesso. Nenhum conteúdo retornado.'
 *       404:
 *         description: 'Usuário não encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: user not found
 */
export const deleteUser = async (req: Request, res: Response) => {
  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'user not found' });
  res.status(204).send();
};


/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string, example: 'Maria Oliveira' }
 *         email: { type: string, format: email, example: 'maria@email.com' }
 *         phone: { type: string, nullable: true, example: '+55 11 98888-0000' }
 *         role: { type: string, example: 'CUSTOMER' }
 *         created_at: { type: string, format: date-time, nullable: true }
 *         updated_at: { type: string, format: date-time, nullable: true }
 */
export {};