import { Request, Response, NextFunction } from "express";

export function ErrorHandler(error: any, req: Request, res: Response, next: NextFunction) {
    res.status(error.statusCode || 500);
    res.send({
        status: error.status || "err_generic",
        error: error.details
    });
}
