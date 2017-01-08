import { Request, Response, NextFunction } from "express";
import { execFile } from "child_process";
import { mysqlPool } from "../App";

export enum UserStatus {
    STARTED,
    INSERTED_RECORD,
    CREATED_DATABASE,
    CREATED_MYSQL_USER,
    GRANTED_MYSQL_PERMISSIONS,
    GENERATED_PASSWORD_HASH,
    CREATED_SYSTEM_USER,
    COMPLETE
}

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

    delete(status: UserStatus = UserStatus.COMPLETE): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (status < UserStatus.INSERTED_RECORD) return resolve();
            mysqlPool.query("DELETE FROM users WHERE student_id = ?", [this.student_id], (err) => {
                if (err) reject(err); else resolve();
            });
        }).then(() => {
            if (status < UserStatus.CREATED_DATABASE) return undefined;
            return new Promise<void>((resolve, reject) => mysqlPool.query(`DROP DATABASE IF EXISTS \`${this.username}\``, (err) => {
                if (err) reject(err); else resolve();
            }));
        }).then(() => {
            if (status < UserStatus.CREATED_MYSQL_USER) return undefined;
            return new Promise<void>((resolve, reject) => mysqlPool.query("DROP USER IF EXISTS ?@'localhost'", [this.username], (err) => {
                if (err) reject(err); else resolve();
            }));
        }).then(() => {
            if (status < UserStatus.CREATED_SYSTEM_USER) return undefined;
            return new Promise<void>((resolve, reject) => execFile("/usr/sbin/userdel", ["-r", this.username], (err) => {
                // Error code 6 indicates that the specified user does not exist
                if (err && err.name !== "6") reject(err); else resolve();
            }));
        });
    }
}
