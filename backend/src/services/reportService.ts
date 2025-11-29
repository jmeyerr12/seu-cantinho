import { pool } from '../config/db';

export interface RevenueFilters {
  from: string;
  to: string;
  branchId?: string;
}

export interface RevenueRow {
  branch_id: string;
  branch_name: string;
  space_id: string;
  space_name: string;
  revenue: string; // numeric(12,2) vem como string no driver do pg
}

export interface UtilizationFilters {
  from: string;
  to: string;
  branchId?: string;
  spaceId?: string;
}

export interface UtilizationRow {
  branch_id: string;
  branch_name: string;
  space_id: string;
  space_name: string;
  hours_reserved: number;
  hours_possible: number;
  utilization: number;
}

export async function getRevenue(
  filters: RevenueFilters,
): Promise<RevenueRow[]> {
  const { from, to, branchId } = filters;

  const params: any[] = [from, to];
  let branchFilter = '';

  if (branchId) {
    params.push(branchId);
    branchFilter = `AND r.branch_id = $${params.length}`;
  }

  const sql = `
      SELECT r.branch_id, b.name AS branch_name,
             r.space_id,  s.name AS space_name,
             SUM(p.amount)::numeric(12,2) AS revenue
      FROM payments p
      JOIN reservations r ON r.id = p.reservation_id
      JOIN branches b ON b.id = r.branch_id
      JOIN spaces   s ON s.id = r.space_id
      WHERE p.status = 'PAID'
        AND p.paid_at::date BETWEEN $1 AND $2
        ${branchFilter}
      GROUP BY r.branch_id, b.name, r.space_id, s.name
      ORDER BY branch_name, space_name
    `;

  const { rows } = await pool.query<RevenueRow>(sql, params);
  return rows;
}

export async function getUtilization(
  filters: UtilizationFilters,
): Promise<UtilizationRow[]> {
  const { from, to, branchId, spaceId } = filters;

  const params: any[] = [from, to];
  let joinFilter = '';

  if (branchId) {
    params.push(branchId);
    joinFilter += ` AND s.branch_id = $${params.length}`;
  }
  if (spaceId) {
    params.push(spaceId);
    joinFilter += ` AND s.id = $${params.length}`;
  }

  const sql = `
      WITH hours_reserved AS (
        SELECT r.space_id,
               SUM(EXTRACT(EPOCH FROM (r.end_time - r.start_time))/3600.0) AS hrs
        FROM reservations r
        WHERE r.date BETWEEN $1 AND $2 AND r.status <> 'CANCELLED'
        GROUP BY r.space_id
      ),
      spaces_set AS (
        SELECT s.id, s.branch_id FROM spaces s WHERE 1=1 ${joinFilter}
      )
      SELECT
        ss.branch_id,
        b.name AS branch_name,
        ss.id   AS space_id,
        s.name  AS space_name,
        COALESCE(hr.hrs, 0)               AS hours_reserved,
        ((DATE $2 - DATE $1) + 1) * 24.0  AS hours_possible,
        CASE
          WHEN ((DATE $2 - DATE $1) + 1) * 24.0 = 0 THEN 0
          ELSE COALESCE(hr.hrs,0) / (((DATE $2 - DATE $1) + 1) * 24.0)
        END AS utilization
      FROM spaces_set ss
      JOIN spaces s   ON s.id = ss.id
      JOIN branches b ON b.id = ss.branch_id
      LEFT JOIN hours_reserved hr ON hr.space_id = ss.id
      ORDER BY branch_name, space_name
    `;

  const { rows } = await pool.query<UtilizationRow>(sql, params);
  return rows;
}
