import { Request, Response, NextFunction } from "express";
import { mysqlPool } from "../App";

export class User {
    student_id: number;
    first_name: string;
    last_name: string;
    username: string;
    password: string;
    class_period: number;

    constructor(obj: any) {
        for (let prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                (this as any)[prop] = obj[prop];
            }
        }
    }

    changeFirstName(newName: string): Promise<void> {
        return new Promise<void>((resolve, reject) => mysqlPool.query("UPDATE users SET first_name = ? WHERE student_id = ?", [newName, this.student_id], (err) => {
            if (err) reject(err); else resolve();
        }));
    }
}
