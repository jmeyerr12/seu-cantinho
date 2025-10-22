import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import router from "./routes/index.js"; // <- mantém .js pois NodeNext exige

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// Rotas principais
app.use("/", router);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "NotFound",
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// Tratamento de erros
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as any)?.statusCode || 500;
  const message = (err as any)?.message || "Erro interno no servidor";
  res.status(status).json({ error: "InternalError", message });
});

export default app;
