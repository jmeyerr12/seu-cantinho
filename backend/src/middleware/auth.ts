import jsonwebtoken from "jsonwebtoken";
import express, { Request, Response } from "express";

/* gera e exporta o tipo Middlewate */
export type Middleware = (req: Request, res: Response, next: express.NextFunction) => void;

/*
    Funcao que valida um token de uma secao de usuario, retorna 401 caso o token seja invalido ou ja tenha expirado
    E caso o token seja valido ele permite a proxima operacao
*/
export function tokenValidation(): Middleware {

    return function (req, res, next) {
        try {
            if (req.headers.authorization === undefined) {
                throw new Error("no token")
            }
            req.body.userData = jsonwebtoken.verify(req.headers.authorization.split(" ")[1], String(process.env.JWT_KEY));
            next();
        } catch (error) {
            res.status(401).json({
                message: "Unauthorized request",
                description: String(error)
            });
            return;
        }
    }
};
