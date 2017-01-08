import { Request, Response, NextFunction } from "express";
import { execFile } from "child_process";
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

    changeLastName(newName: string): Promise<void> {
        return new Promise<void>((resolve, reject) => mysqlPool.query("UPDATE users SET last_name = ? WHERE student_id = ?", [newName, this.student_id], (err) => {
            if (err) reject(err); else resolve();
        }));
    }

    changePassword(newPassword: string): Promise<void> {
        return new Promise<void>((resolve, reject) => mysqlPool.query("UPDATE users SET password = ? WHERE student_id = ?", [newPassword, this.student_id], (err) => {
            if (err) reject(err); else resolve();
        })).then(() => {
            return new Promise<void>((resolve, reject) => mysqlPool.query("ALTER USER ?@'localhost' IDENTIFIED BY ?", [this.username, newPassword], (err) => {
                if (err) reject(err); else resolve();
            }));
        }).then(() => {
            return new Promise<string>((resolve, reject) => execFile("/usr/bin/mkpasswd", ["-m", "sha-512", newPassword], (err, stdout) => {
                if (err) return reject(err);
                return resolve(stdout);
            }));
        }).then((hashedPW: string) => {
            return new Promise<void>((resolve, reject) => execFile("/usr/sbin/usermod", ["-p", hashedPW.replace(/\r?\n|\r/g, ""), this.username], (err) => {
                if (err) return reject(err);
                return resolve();
            }));
        });
    }

    changeClassPeriod(newPeriod: number): Promise<void> {
        return new Promise<void>((resolve, reject) => mysqlPool.query("UPDATE users SET class_period = ? WHERE student_id = ?", [newPeriod, this.student_id], (err) => {
            if (err) reject(err); else resolve();
        }));
    }
}
