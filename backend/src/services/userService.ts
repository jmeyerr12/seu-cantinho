import { pool } from '../config/db';
import { v4 as uuid } from 'uuid';
import argon2 from 'argon2';
import jsonwebtoken from 'jsonwebtoken';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
  last_login_at?: Date | string | null;
  password_hash?: string;
}

export type PublicUser = Omit<UserRow, 'password_hash'>;

export interface ListUsersFilters {
  role?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  password: string;
}

export type CreateUserResult =
  | { kind: 'OK'; user: PublicUser }
  | { kind: 'EMAIL_EXISTS' };

export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string | null;
  role?: string | null;
  password?: string;
}

export type UpdateUserResult =
  | { kind: 'OK'; user: PublicUser }
  | { kind: 'NOT_FOUND' }
  | { kind: 'EMAIL_EXISTS' };

export type DeleteUserResult = 'OK' | 'NOT_FOUND';

export type LoginResult =
  | { kind: 'OK'; token: string; user: PublicUser }
  | { kind: 'INVALID_CREDENTIALS' };

export async function listUsers (
  filters: ListUsersFilters
): Promise<PublicUser[]> {
  const { role } = filters;
  const params: any[] = [];
  const where = role ? (params.push(role), 'WHERE role = $1') : '';

  const { rows } = await pool.query<UserRow>(
    `SELECT id,name,email,phone,role,created_at,updated_at,last_login_at
       FROM users
       ${where}
     ORDER BY created_at DESC`,
    params
  );

  return rows;
}

export async function createUser (
  input: CreateUserInput
): Promise<CreateUserResult> {
  const { name, email, phone, role, password } = input;

  const id = uuid();
  const passwordHash = await argon2.hash(password);

  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (id, name, email, phone, role, password_hash, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (email) DO NOTHING
       RETURNING id, name, email, phone, role, created_at, updated_at, last_login_at`,
    [id, name, email, phone ?? null, role ?? 'CUSTOMER', passwordHash]
  );

  if (rows.length === 0) {
    return { kind: 'EMAIL_EXISTS' };
  }

  return { kind: 'OK', user: rows[0] };
}

export async function getUserById (id: string): Promise<PublicUser | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT id,name,email,phone,role,created_at,updated_at,last_login_at
       FROM users
      WHERE id = $1`,
    [id]
  );

  return rows[0] ?? null;
}

export async function updateUser (
  id: string,
  input: UpdateUserInput
): Promise<UpdateUserResult> {
  const { name, email, phone, role, password } = input;

  const passwordHash = password ? await argon2.hash(password) : null;

  try {
    await pool.query(
      `UPDATE users SET
         name          = COALESCE($2, name),
         email         = COALESCE($3, email),
         phone         = COALESCE($4, phone),
         role          = COALESCE($5, role),
         password_hash = COALESCE($6, password_hash),
         updated_at    = NOW()
       WHERE id = $1`,
      [id, name ?? null, email ?? null, phone ?? null, role ?? null, passwordHash]
    );
  } catch (err: any) {
    if (err?.code === '23505') {
      // unique violation (email)
      return { kind: 'EMAIL_EXISTS' };
    }
    throw err;
  }

  const { rows } = await pool.query<UserRow>(
    `SELECT id,name,email,phone,role,created_at,updated_at,last_login_at
       FROM users
      WHERE id = $1`,
    [id]
  );

  if (!rows[0]) {
    return { kind: 'NOT_FOUND' };
  }

  return { kind: 'OK', user: rows[0] };
}

export async function deleteUser (id: string): Promise<DeleteUserResult> {
  const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
  const rowCount = result.rowCount ?? 0;

  if (!rowCount) return 'NOT_FOUND';
  return 'OK';
}

export async function login (
  email: string,
  password: string
): Promise<LoginResult> {
  const { rows } = await pool.query<UserRow>(
    `SELECT id, name, email, role, password_hash, created_at, updated_at, last_login_at
       FROM users
      WHERE email = $1
      LIMIT 1`,
    [email]
  );

  const user = rows[0];

  if (!user || !user.password_hash) {
    return { kind: 'INVALID_CREDENTIALS' };
  }

  const ok = await argon2.verify(user.password_hash, password);
  if (!ok) {
    return { kind: 'INVALID_CREDENTIALS' };
  }

  // atualiza o log
  await pool.query(
    `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [user.id]
  );

  const jwtKey = process.env.JWT_KEY;
  if (!jwtKey) {
    throw new Error('JWT_KEY not configured');
  }

  const token = jsonwebtoken.sign(
    { sub: user.id, role: user.role, email: user.email },
    String(jwtKey),
    { expiresIn: '1h' }
  );

  const { password_hash, ...publicUser } = user;

  return {
    kind: 'OK',
    token,
    user: publicUser
  };
}
