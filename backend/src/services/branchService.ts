import { pool } from '../config/db';
import { v4 as uuid } from 'uuid';

export interface Branch {
  id: string;
  name: string;
  state: string;
  city: string;
  address: string;
  created_at?: string;
  updated_at?: string;
}

export interface BranchFilters {
  state?: string;
  city?: string;
}

export interface BranchInput {
  name: string;
  state: string;
  city: string;
  address: string;
}

export interface BranchUpdateInput {
  name?: string;
  state?: string;
  city?: string;
  address?: string;
}

export interface Space {
  id: string;
  branch_id: string;
  name: string;
  description?: string;
  capacity?: number;
  base_price_per_hour?: number;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function listBranches(filters: BranchFilters = {}): Promise<Branch[]> {
  const { state, city } = filters;
  const whereClauses: string[] = [];
  const params: any[] = [];

  if (state) {
    params.push(state);
    whereClauses.push(`state = $${params.length}`);
  }

  if (city) {
    params.push(city);
    whereClauses.push(`city = $${params.length}`);
  }

  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const { rows } = await pool.query<Branch>(
    `SELECT * FROM branches ${where} ORDER BY name ASC`,
    params,
  );
  return rows;
}

export async function createBranch(input: BranchInput): Promise<Branch> {
  const { name, state, city, address } = input;
  const id = uuid();

  await pool.query(
    `INSERT INTO branches (id, name, state, city, address)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, name, state, city, address],
  );

  const { rows } = await pool.query<Branch>(
    'SELECT * FROM branches WHERE id = $1',
    [id],
  );
  return rows[0];
}

export async function getBranchById(id: string): Promise<Branch | null> {
  const { rows } = await pool.query<Branch>(
    'SELECT * FROM branches WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function updateBranch(
  id: string,
  input: BranchUpdateInput,
): Promise<Branch | null> {
  const { name, state, city, address } = input;

  await pool.query(
    `UPDATE branches
       SET name    = COALESCE($2, name),
           state   = COALESCE($3, state),
           city    = COALESCE($4, city),
           address = COALESCE($5, address),
           updated_at = NOW()
     WHERE id = $1`,
    [id, name, state, city, address],
  );

  const { rows } = await pool.query<Branch>(
    'SELECT * FROM branches WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function deleteBranch(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM branches WHERE id = $1',
    [id],
  );

  const count = rowCount ?? 0;
  return count > 0;
}

export async function listSpacesOfBranch(branchId: string): Promise<Space[]> {
  const { rows } = await pool.query<Space>(
    'SELECT * FROM spaces WHERE branch_id = $1 ORDER BY name ASC',
    [branchId],
  );
  return rows;
}
