import { Request, Response } from 'express';
import * as reservationService from '../services/reservationService';

/* 
 * As funções parseTime/durationHours foram movidas para o service.
 */

/**
 * @openapi
 * /reservations:
 *   get:
 *     summary: Lista reservas
 *     description: 'Retorna reservas com filtros opcionais.'
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema: { type: string, format: uuid }
 *         required: false
 *         description: 'ID da filial.'
 *       - in: query
 *         name: spaceId
 *         schema: { type: string, format: uuid }
 *         required: false
 *         description: 'ID do espaço.'
 *       - in: query
 *         name: customerId
 *         schema: { type: string, format: uuid }
 *         required: false
 *         description: 'ID do cliente.'
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, CONFIRMED, CANCELLED] }
 *         required: false
 *         description: 'Status da reserva.'
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date, example: '2025-10-23' }
 *         required: false
 *         description: 'Data da reserva (YYYY-MM-DD).'
 *     responses:
 *       200:
 *         description: 'Lista de reservas.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Reservation' }
 */
export const listReservations = async (req: Request, res: Response) => {
  try {
    const { branchId, spaceId, customerId, status, date } = req.query as {
      branchId?: string;
      spaceId?: string;
      customerId?: string;
      status?: string;
      date?: string;
    };

    const reservations = await reservationService.listReservations({
      branchId,
      spaceId,
      customerId,
      status,
      date,
    });

    res.json(reservations);
  } catch (err) {
    console.error('listReservations error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations/{id}:
 *   get:
 *     summary: Detalha uma reserva
 *     description: 'Retorna a reserva pelo ID, incluindo pagamentos.'
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 'Reserva encontrada.'
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Reservation'
 *                 - type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Payment' }
 *       404:
 *         description: 'Reserva não encontrada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorNotFound' }
 */
export const getReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await reservationService.getReservationWithPayments(id);

    if (!result) {
      return res.status(404).json({ error: 'reservation not found' });
    }

    const { reservation, payments } = result;
    res.json({ ...reservation, payments });
  } catch (err) {
    console.error('getReservation error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations:
 *   post:
 *     summary: Cria uma reserva
 *     description: 'Cria uma nova reserva após validar conflito de horário e espaço.'
 *     tags: [Reservations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [space_id, branch_id, customer_id, date, start_time, end_time]
 *             properties:
 *               space_id: { type: string, format: uuid }
 *               branch_id: { type: string, format: uuid }
 *               customer_id: { type: string, format: uuid }
 *               date: { type: string, format: date, example: '2025-10-23' }
 *               start_time: { type: string, example: '09:00' }
 *               end_time: { type: string, example: '11:00' }
 *               deposit_required_pct: { type: number, example: 0 }
 *               notes: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: 'Reserva criada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Reservation' }
 *       400:
 *         description: 'Dados inválidos (ex.: espaço inexistente).'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorBadRequest' }
 *       409:
 *         description: 'Conflito de horário (intervalo indisponível).'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorConflict' }
 */
export const createReservation = async (req: Request, res: Response) => {
  try {
    const {
      space_id,
      branch_id,
      customer_id,
      date,
      start_time,
      end_time,
      deposit_required_pct,
      notes,
    } = req.body;

    // validação mínima de campos obrigatórios
    if (
      !space_id ||
      !branch_id ||
      !customer_id ||
      !date ||
      !start_time ||
      !end_time
    ) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }

    const result = await reservationService.createReservation({
      space_id,
      branch_id,
      customer_id,
      date,
      start_time,
      end_time,
      deposit_required_pct,
      notes,
    });

    if (result.kind === 'TIME_SLOT_UNAVAILABLE') {
      return res.status(409).json({ error: 'time slot unavailable' });
    }

    if (result.kind === 'INVALID_SPACE') {
      return res.status(400).json({ error: 'invalid space' });
    }

    // OK
    res.status(201).json(result.reservation);
  } catch (err) {
    console.error('createReservation error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations/{id}:
 *   patch:
 *     summary: Atualiza agenda/anotações da reserva
 *     description: 'Atualiza campos da reserva; se alterar data/horário, revalida conflitos.'
 *     tags: [Reservations]
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
 *               date: { type: string, format: date, example: '2025-10-23' }
 *               start_time: { type: string, example: '10:00' }
 *               end_time: { type: string, example: '12:00' }
 *               notes: { type: string, nullable: true }
 *               deposit_required_pct: { type: number, example: 50 }
 *     responses:
 *       200:
 *         description: 'Reserva atualizada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Reservation' }
 *       404:
 *         description: 'Reserva não encontrada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorNotFound' }
 *       409:
 *         description: 'Conflito de horário.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorConflict' }
 */
export const updateReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, start_time, end_time, notes, deposit_required_pct } =
      req.body;

    const result = await reservationService.updateReservation(id, {
      date,
      start_time,
      end_time,
      notes,
      deposit_required_pct,
    });

    if (result.kind === 'NOT_FOUND') {
      return res.status(404).json({ error: 'reservation not found' });
    }

    if (result.kind === 'TIME_SLOT_UNAVAILABLE') {
      return res.status(409).json({ error: 'time slot unavailable' });
    }

    res.json(result.reservation);
  } catch (err) {
    console.error('updateReservation error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations/{id}/confirm:
 *   post:
 *     summary: Confirma a reserva
 *     description: 'Altera o status para CONFIRMED.'
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 'Reserva confirmada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Reservation' }
 *       404:
 *         description: 'Reserva não encontrada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorNotFound' }
 */
export const confirmReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reservation = await reservationService.confirmReservation(id);

    if (!reservation) {
      return res.status(404).json({ error: 'reservation not found' });
    }

    res.json(reservation);
  } catch (err) {
    console.error('confirmReservation error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations/{id}/cancel:
 *   post:
 *     summary: Cancela a reserva
 *     description: 'Altera o status para CANCELLED.'
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 'Reserva cancelada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Reservation' }
 *       404:
 *         description: 'Reserva não encontrada.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorNotFound' }
 */
export const cancelReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reservation = await reservationService.cancelReservation(id);

    if (!reservation) {
      return res.status(404).json({ error: 'reservation not found' });
    }

    res.json(reservation);
  } catch (err) {
    console.error('cancelReservation error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations/{id}/payments:
 *   get:
 *     summary: Lista pagamentos da reserva
 *     tags: [Reservations > Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 'Lista de pagamentos.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Payment' }
 */
export const listPaymentsOfReservation = async (
  req: Request,
  res: Response,
) => {
  try {
    const payments = await reservationService.listPaymentsOfReservation(
      req.params.id,
    );
    res.json(payments);
  } catch (err) {
    console.error('listPaymentsOfReservation error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /reservations/day:
 *   get:
 *     summary: Agenda do dia
 *     description: 'Lista reservas de um dia (opcional filtrar por filial).'
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date, example: '2025-10-23' }
 *         description: 'Data (YYYY-MM-DD).'
 *       - in: query
 *         name: branchId
 *         required: false
 *         schema: { type: string, format: uuid }
 *         description: 'Filtrar por filial.'
 *     responses:
 *       200:
 *         description: 'Reservas do dia.'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Reservation' }
 *       400:
 *         description: 'Parâmetro date é obrigatório.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorBadRequest' }
 */
export const byDay = async (req: Request, res: Response) => {
  try {
    const { date, branchId } = req.query as {
      date?: string;
      branchId?: string;
    };

    if (!date) {
      return res.status(400).json({ error: 'date required' });
    }

    const rows = await reservationService.getReservationsByDay({
      date,
      branchId,
    });

    res.json(rows);
  } catch (err) {
    console.error('byDay error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * components:
 *   schemas:
 *     Reservation:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         space_id: { type: string, format: uuid }
 *         branch_id: { type: string, format: uuid }
 *         customer_id: { type: string, format: uuid }
 *         date: { type: string, format: date, example: '2025-10-23' }
 *         start_time: { type: string, example: '09:00' }
 *         end_time: { type: string, example: '11:00' }
 *         status: { type: string, enum: [PENDING, CONFIRMED, CANCELLED], example: 'PENDING' }
 *         total_amount: { type: number, format: float, example: 240 }
 *         deposit_required_pct: { type: number, example: 50 }
 *         notes: { type: string, nullable: true, example: 'Requer projetor.' }
 *         created_at: { type: string, format: date-time, nullable: true }
 *         updated_at: { type: string, format: date-time, nullable: true }
 */
export {};
