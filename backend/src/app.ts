import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import router from "./routes/index.js";

const app = express();

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use("/", router);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "NotFound",
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// trata erros
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as any)?.statusCode || 500;
  const message = (err as any)?.message || "Erro interno no servidor";
  res.status(status).json({ error: "InternalError", message });
});

export default app;
