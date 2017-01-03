import { Request, Response, NextFunction } from "express";

export function ErrorHandler(error: any, req: Request, res: Response, next: NextFunction) {
    if (typeof error.code === "string")
        error.code = error.code.toLowerCase();

    res.status(error.statusCode || 500);
    res.send({
        status: error.code || error.name || "err_generic",
        error: error.message
    });
}
