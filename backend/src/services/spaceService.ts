import { pool } from '../config/db';
import { v4 as uuid } from 'uuid';
import formidable, { File as FormidableFile } from 'formidable';
import fs from 'fs';
import { uploadFile, removeFile, downloadFile } from './s3-service';

export interface Space {
  id: string;
  branch_id: string;
  name: string;
  description?: string | null;
  capacity?: number | null;
  base_price_per_hour?: number | null;
  active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Photo {
  id: string;
  space_id: string;
  url: string;
  caption?: string | null;
  order?: number | null;
  created_at?: string | null;
}

export interface ListSpacesFilters {
  branchId?: string;
  minCapacity?: number;
  active?: boolean;
}

export interface CreateSpaceInput {
  branch_id: string;
  name: string;
  description?: string | null;
  capacity?: number | null;
  base_price_per_hour?: number | null;
  active?: boolean;
}

export interface UpdateSpaceInput {
  name?: string;
  description?: string | null;
  capacity?: number | null;
  base_price_per_hour?: number | null;
  active?: boolean | null;
}

export interface SearchSpacesFilters {
  city?: string;
  state?: string;
  capacity?: number;
  date?: string;
  start?: string;
  end?: string;
}

export interface SpaceSearchRow extends Space {
  branch_name: string;
  city: string;
  state: string;
}

export type AddPhotoResult =
  | { kind: 'SPACE_NOT_FOUND' }
  | { kind: 'BAD_REQUEST'; message: string }
  | { kind: 'OK'; photo: Photo };

export type DeletePhotoResult = 'OK' | 'PHOTO_NOT_FOUND';

export interface PhotoImageResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

export interface PhotoLinkItem {
  id: string;
  href: string;
}

export interface PhotoLinksResult {
  items: PhotoLinkItem[];
}

function guessContentType (key: string): string {
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

// ---- CRUD de espaços ----

export async function listSpaces (filters: ListSpacesFilters): Promise<Space[]> {
  const { branchId, minCapacity, active } = filters;

  const whereParts: string[] = [];
  const params: any[] = [];

  if (branchId) {
    params.push(branchId);
    whereParts.push(`branch_id = $${params.length}`);
  }

  if (typeof minCapacity === 'number' && Number.isFinite(minCapacity)) {
    params.push(minCapacity);
    whereParts.push(`capacity >= $${params.length}`);
  }

  if (typeof active === 'boolean') {
    params.push(active);
    whereParts.push(`active = $${params.length}`);
  }

  const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
  const sql = `SELECT * FROM spaces ${where} ORDER BY name ASC`;

  const { rows } = await pool.query<Space>(sql, params);
  return rows;
}

export async function createSpace (input: CreateSpaceInput): Promise<Space> {
  const {
    branch_id,
    name,
    description,
    capacity,
    base_price_per_hour,
    active = true
  } = input;

  const id = uuid();

  await pool.query(
    `INSERT INTO spaces (id,branch_id,name,description,capacity,base_price_per_hour,active)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      id,
      branch_id,
      name,
      description ?? null,
      capacity ?? null,
      base_price_per_hour ?? null,
      active
    ]
  );

  const { rows } = await pool.query<Space>('SELECT * FROM spaces WHERE id = $1', [id]);
  return rows[0];
}

export async function getSpaceWithPhotos (
  id: string
): Promise<{ space: Space; photos: Photo[] } | null> {
  const { rows } = await pool.query<Space>('SELECT * FROM spaces WHERE id = $1', [id]);
  const space = rows[0];
  if (!space) return null;

  const photosRes = await pool.query<Photo>(
    'SELECT * FROM photos WHERE space_id = $1 ORDER BY "order" ASC',
    [id]
  );

  return { space, photos: photosRes.rows };
}

export async function updateSpace (
  id: string,
  input: UpdateSpaceInput
): Promise<Space | null> {
  const { name, description, capacity, base_price_per_hour, active } = input;

  await pool.query(
    `UPDATE spaces SET
        name = COALESCE($2,name),
        description = COALESCE($3,description),
        capacity = COALESCE($4,capacity),
        base_price_per_hour = COALESCE($5,base_price_per_hour),
        active = COALESCE($6,active),
        updated_at = NOW()
       WHERE id = $1`,
    [
      id,
      name ?? null,
      description ?? null,
      capacity ?? null,
      base_price_per_hour ?? null,
      active ?? null
    ]
  );

  const { rows } = await pool.query<Space>('SELECT * FROM spaces WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function setSpaceActive (id: string, active: boolean): Promise<Space | null> {
  await pool.query(
    'UPDATE spaces SET active = $2, updated_at = NOW() WHERE id = $1',
    [id, active]
  );
  const { rows } = await pool.query<Space>('SELECT * FROM spaces WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function deleteSpace (id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM spaces WHERE id = $1', [id]);
  const rowCount = result.rowCount ?? 0;
  return rowCount > 0;
}

// ---- Fotos ----

export async function listPhotos (spaceId: string): Promise<Photo[]> {
  const { rows } = await pool.query<Photo>(
    'SELECT * FROM photos WHERE space_id = $1 ORDER BY "order" ASC',
    [spaceId]
  );
  return rows;
}

export async function addPhoto (spaceId: string, req: any): Promise<AddPhotoResult> {
  const exists = await pool.query('SELECT 1 FROM spaces WHERE id = $1', [spaceId]);
  const count = exists.rowCount ?? 0;
  if (!count) {
    return { kind: 'SPACE_NOT_FOUND' };
  }

  const form = formidable({ multiples: true, keepExtensions: true });

  const { fields, files } = await new Promise<{
    fields: formidable.Fields;
    files: formidable.Files;
  }>((resolve, reject) => {
    form.parse(req, (err, f, fl) => (err ? reject(err) : resolve({ fields: f, files: fl })));
  });

  const rawCaption = (fields as any).caption;
  const caption = rawCaption
    ? String(Array.isArray(rawCaption) ? rawCaption[0] : rawCaption)
    : '';

  const rawOrder = (fields as any).order;
  const order = rawOrder
    ? Number(Array.isArray(rawOrder) ? rawOrder[0] : rawOrder)
    : 0;

  const fileField = (files as any).image as FormidableFile | FormidableFile[] | undefined;
  if (!fileField) {
    return {
      kind: 'BAD_REQUEST',
      message: 'image file is required (multipart/form-data)'
    };
  }

  const singleFile: FormidableFile = Array.isArray(fileField) ? fileField[0] : fileField;

  if (!singleFile) {
    return { kind: 'BAD_REQUEST', message: 'Invalid image file.' };
  }

  if (singleFile.size > 4 * 1024 * 1024) {
    return { kind: 'BAD_REQUEST', message: 'file size larger than 4MBs' };
  }

  if (
    !singleFile.mimetype ||
    !['image/jpeg', 'image/png', 'image/jpg'].includes(singleFile.mimetype)
  ) {
    return { kind: 'BAD_REQUEST', message: 'file type not supported' };
  }

  const tmpPath = (singleFile as any).filepath || (singleFile as any).path;
  if (!tmpPath) {
    return { kind: 'BAD_REQUEST', message: 'Invalid image file path.' };
  }

  const fileContent = await fs.promises.readFile(tmpPath);
  const photoId = uuid();
  const bucket = String(
    process.env.S3_PHOTO_BUCKET || process.env.S3_IMAGE_BUCKET || 'images'
  );
  const s3Filename = `${spaceId}_${photoId}.jpg`;

  await uploadFile(bucket, s3Filename, fileContent);
  try {
    await fs.promises.unlink(tmpPath);
  } catch {
    // ignore
  }

  await pool.query(
    'INSERT INTO photos (id, space_id, url, caption, "order") VALUES ($1,$2,$3,$4,$5)',
    [photoId, spaceId, s3Filename, caption || null, order]
  );

  const { rows } = await pool.query<Photo>('SELECT * FROM photos WHERE id = $1', [
    photoId
  ]);

  return { kind: 'OK', photo: rows[0] };
}

export async function deletePhoto (
  spaceId: string,
  photoId: string
): Promise<DeletePhotoResult> {
  const q = await pool.query<{ url: string }>(
    'SELECT url FROM photos WHERE id = $1 AND space_id = $2',
    [photoId, spaceId]
  );
  const row = q.rows[0];

  if (!row) {
    return 'PHOTO_NOT_FOUND';
  }

  const key = row.url;
  const bucket = String(
    process.env.S3_PHOTO_BUCKET || process.env.S3_IMAGE_BUCKET || 'images'
  );

  try {
    await removeFile(bucket, key);
  } catch (e) {
    console.warn('[deletePhoto] S3 remove failed:', e);
  }

  const del = await pool.query(
    'DELETE FROM photos WHERE id = $1 AND space_id = $2',
    [photoId, spaceId]
  );
  const rowCount = del.rowCount ?? 0;
  if (!rowCount) {
    return 'PHOTO_NOT_FOUND';
  }

  return 'OK';
}

export async function getPhotoImage (
  spaceId: string,
  photoId: string
): Promise<PhotoImageResult | null> {
  const q = await pool.query<{ url: string }>(
    'SELECT url FROM photos WHERE id = $1 AND space_id = $2',
    [photoId, spaceId]
  );
  const row = q.rows[0];

  if (!row) {
    return null;
  }

  const key = row.url;
  const bucket = String(
    process.env.S3_PHOTO_BUCKET || process.env.S3_IMAGE_BUCKET || 'images'
  );
  const buf = await downloadFile(bucket, key);

  return {
    buffer: buf,
    contentType: guessContentType(key),
    filename: key
  };
}

export async function listPhotoLinks (spaceId: string): Promise<PhotoLinksResult> {
  const q = await pool.query<{ id: string; url: string }>(
    'SELECT id, url FROM photos WHERE space_id = $1 ORDER BY id',
    [spaceId]
  );

  if (q.rows.length === 0) {
    return { items: [] };
  }

  const items: PhotoLinkItem[] = q.rows.map((r) => ({
    id: r.id,
    href: `/spaces/${encodeURIComponent(spaceId)}/photos/${encodeURIComponent(
      r.id
    )}/image`
  }));

  return { items };
}

// ---- Disponibilidade e busca ----

export async function checkAvailability (
  spaceId: string,
  date: string,
  start: string,
  end: string
): Promise<boolean> {
  const q = `
    SELECT 1 FROM reservations
    WHERE space_id = $1 AND date = $2 AND status <> 'CANCELLED'
      AND NOT (end_time <= $3::time OR start_time >= $4::time)
    LIMIT 1`;

  const { rows } = await pool.query(q, [spaceId, date, start, end]);
  return rows.length === 0;
}

export async function searchSpaces (
  filters: SearchSpacesFilters
): Promise<SpaceSearchRow[]> {
  const { city, state, capacity, date, start, end } = filters;

  const params: any[] = [];
  const whereParts: string[] = ['s.active = TRUE'];

  if (typeof capacity === 'number' && Number.isFinite(capacity)) {
    params.push(capacity);
    whereParts.push(`s.capacity >= $${params.length}`);
  }

  if (state) {
    params.push(state);
    whereParts.push(`b.state = $${params.length}`);
  }

  if (city) {
    params.push(city);
    whereParts.push(`b.city = $${params.length}`);
  }

  let availabilityClause = '';

  if (date && start && end) {
    params.push(date, start, end);
    const baseIndex = params.length - 2;

    availabilityClause = `
        AND NOT EXISTS (
          SELECT 1 FROM reservations r
          WHERE r.space_id = s.id AND r.date = $${baseIndex} AND r.status <> 'CANCELLED'
            AND NOT (r.end_time <= $${baseIndex + 1}::time OR r.start_time >= $${baseIndex + 2}::time)
        )`;
  }

  const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  const sql = `
      SELECT s.*, b.name AS branch_name, b.city, b.state
      FROM spaces s
      JOIN branches b ON b.id = s.branch_id
      ${where} ${availabilityClause}
      ORDER BY s.name ASC`;

  const { rows } = await pool.query<SpaceSearchRow>(sql, params);
  return rows;
}
