import jsonwebtoken from "jsonwebtoken";
import express, { Request, Response } from "express";

// gera e exporta o MW
export type Middleware = (req: Request, res: Response, next: express.NextFunction) => void;

// funcao que valida um token de uma secao de usuario, retorna 401 caso o token seja invalido ou ja tenha expirado e caso o token seja valido ele permite a proxima operacao
export function tokenValidation(): Middleware {
  return function (req, res, next) {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith("Bearer ")) throw new Error("no token");
      const payload = jsonwebtoken.verify(
        auth.split(" ")[1],
        String(process.env.JWT_KEY)
      );
      (req as any).body.userData = payload;
      (req as any).user = payload; 
      next();
    } catch (error) {
      res.status(401).json({
        message: "Unauthorized request",
        description: String(error),
      });
    }
  };
}


export function authorize(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}
