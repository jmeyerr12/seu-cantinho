import { Request, Response } from 'express';
import * as paymentService from '../services/paymentService';

/**
 * @openapi
 * /reservations/{id}/payments:
 *   post:
 *     summary: Cria um pagamento para a reserva
 *     description: 'Cria um pagamento com status inicial PENDING.'
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: 'ID da reserva.'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, method]
 *             properties:
 *               amount: { type: number, format: float, example: 200.5 }
 *               method: { type: string, example: 'PIX' }
 *               purpose: { type: string, example: 'DEPÓSITO' }
 *               external_ref: { type: string, nullable: true, example: 'MPAY-123' }
 *     responses:
 *       201:
 *         description: 'Pagamento criado.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Payment' }
 *       400:
 *         description: 'Dados inválidos.'
 */
export const createPayment = async (req: Request, res: Response) => {
  try {
    const { id: reservationId } = req.params;
    const { amount, method, purpose, external_ref } = req.body;

    // validação básica aqui no controller
    if (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({ error: 'invalid_amount' });
    }

    if (!method || typeof method !== 'string') {
      return res.status(400).json({ error: 'invalid_method' });
    }

    const payment = await paymentService.createPayment({
      reservationId,
      amount,
      method,
      purpose,
      external_ref,
    });

    res.status(201).json(payment);
  } catch (err) {
    console.error('createPayment error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /payments/{id}:
 *   get:
 *     summary: Busca pagamento pelo ID
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: 'Pagamento encontrado.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Payment' }
 *       404:
 *         description: 'Pagamento não encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { error: { type: string, example: 'payment not found' } }
 */
export const getPayment = async (req: Request, res: Response) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);

    if (!payment) {
      return res.status(404).json({ error: 'payment not found' });
    }

    res.json(payment);
  } catch (err) {
    console.error('getPayment error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /payments/{id}/paid:
 *   post:
 *     summary: Marca pagamento como PAID
 *     description: 'Atualiza status para PAID e define paid_at com NOW().'
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               external_ref: { type: string, nullable: true, example: 'gateway-abc-999' }
 *     responses:
 *       200:
 *         description: 'Pagamento atualizado para PAID.'
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Payment' }
 *       404:
 *         description: 'Pagamento não encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { error: { type: string, example: 'payment not found' } }
 */
export const markPaid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { external_ref } = req.body ?? {};

    const payment = await paymentService.markPaymentPaid(id, {
      external_ref,
    });

    if (!payment) {
      return res.status(404).json({ error: 'payment not found' });
    }

    res.json(payment);
  } catch (err) {
    console.error('markPaid error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /payments/{id}:
 *   delete:
 *     summary: Remove pagamento (apenas se não pago)
 *     description: 'Só permite excluir pagamentos cujo status não seja PAID.'
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: 'Pagamento removido.'
 *       400:
 *         description: 'Regra de negócio impede a exclusão.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { error: { type: string, example: 'cannot delete a paid payment' } }
 *       404:
 *         description: 'Pagamento não encontrado.'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { error: { type: string, example: 'payment not found' } }
 */
export const deletePayment = async (req: Request, res: Response) => {
  try {
    const result = await paymentService.deletePaymentWithRules(req.params.id);

    if (result === 'NOT_FOUND') {
      return res.status(404).json({ error: 'payment not found' });
    }

    if (result === 'CANNOT_DELETE_PAID') {
      return res
        .status(400)
        .json({ error: 'cannot delete a paid payment' });
    }

    // DELETED
    res.status(204).send();
  } catch (err) {
    console.error('deletePayment error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
};

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     summary: Webhook de pagamentos
 *     description: 'Endpoint para receber notificações do provedor externo (verificação de assinatura, etc.).'
 *     tags: [Payments]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 'OK'
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: ok
 */
export const webhook = async (_req: Request, res: Response) => {
  try {
    res.status(200).send('ok');
  } catch (err) {
    console.error('webhook error:', err);
    res.status(500).send('internal_error');
  }
};

/**
 * @openapi
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         reservation_id: { type: string, format: uuid }
 *         amount: { type: number, format: float, example: 200.5 }
 *         method: { type: string, example: 'PIX' }
 *         status: { type: string, enum: [PENDING, PAID], example: 'PAID' }
 *         purpose: { type: string, example: 'RESERVATION' }
 *         external_ref: { type: string, nullable: true, example: 'MPAY-123' }
 *         paid_at: { type: string, format: date-time, nullable: true }
 *         created_at: { type: string, format: date-time, nullable: true }
 *         updated_at: { type: string, format: date-time, nullable: true }
 */
export {};
