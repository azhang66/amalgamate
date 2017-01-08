import { Router, Request, Response, NextFunction } from "express";
import { mysqlPool } from "../App";
import { ServerError } from "../services/ServerError";
import { ErrorHandler } from "../services/ErrorHandler";
import { User } from "../services/User";
import { execFile } from "child_process";

export const Users = Router();

enum Status {
    STARTED,
    INSERTED_RECORD,
    CREATED_DATABASE,
    CREATED_MYSQL_USER,
    GRANTED_MYSQL_PERMISSIONS,
    GENERATED_PASSWORD_HASH,
    CREATED_SYSTEM_USER,
    COMPLETE
}

// CREATE
Users.post("/users", (req, res, next) => {
    req.checkBody("student_id", "Invalid student_id").notEmpty().isInt();
    req.checkBody("first_name", "Invalid first_name").notEmpty();
    req.checkBody("last_name", "Invalid last_name").notEmpty();
    req.checkBody("password", "Invalid password").notEmpty();
    req.checkBody("class_period", "Invalid class_period").notEmpty().isInt();

    req.getValidationResult().then((result) => {
        // Remember to update the length of the required object
        if (Object.keys(req.body).length !== 5 || !result.isEmpty()) {
            ErrorHandler(new ServerError("err_bad_params", "Incorrect supplied parameters", 400), req, res, next);
            return;
        }

        // Alright. Begin creating user!
        const user: User = req.body;

        const alphaFirstName = req.body.first_name.replace(/[^0-9a-z]/gi, "");
        const alphaLastNameFirstLetter = req.body.last_name.charAt(0).replace(/[^0-9a-z]/gi, "");
        if (!alphaFirstName || !alphaLastNameFirstLetter) {
            ErrorHandler(new ServerError("err_bad_params", "Incorrect supplied parameters", 400), req, res, next);
            return;
        }
        user.username = (alphaFirstName + alphaLastNameFirstLetter).toLowerCase();
        console.log(`Adding user ${user.username}...`);

        let status: number = Status.STARTED;

        new Promise((resolve, reject) => mysqlPool.query("INSERT INTO users SET ?", user, (err) => {
            if (err) return reject(err);
            status = Status.INSERTED_RECORD;
            return resolve();
        })).then(() => {
            return new Promise((resolve, reject) => mysqlPool.query(`CREATE DATABASE \`${user.username}\``, (err) => {
                if (err) return reject(err);
                status = Status.CREATED_DATABASE;
                return resolve();
            }));
        }).then(() => {
            return new Promise((resolve, reject) => mysqlPool.query("CREATE USER ?@'localhost' IDENTIFIED BY ?", [user.username, user.password], (err) => {
                if (err) return reject(err);
                status = Status.CREATED_MYSQL_USER;
                return resolve();
            }));
        }).then(() => {
            return new Promise((resolve, reject) => mysqlPool.query(`GRANT ALL PRIVILEGES ON \`${user.username}\`.* TO ?@'localhost'`, [user.username], (err) => {
                if (err) return reject(err);
                status = Status.GRANTED_MYSQL_PERMISSIONS;
                return resolve();
            }));
        }).then(() => {
            return new Promise((resolve, reject) => execFile("/usr/bin/mkpasswd", ["-m", "sha-512", user.password], (err, stdout) => {
                if (err) return reject(err);
                status = Status.GENERATED_PASSWORD_HASH;
                return resolve(stdout);
            }));
        }).then((hashedPW: String) => {
            return new Promise((resolve, reject) => execFile("/usr/sbin/useradd", ["-m", "-N", "-p", hashedPW.replace(/\r?\n|\r/g, ""), "-s", "/bin/bash", user.username], (err) => {
                if (err) return reject(err);
                status = Status.CREATED_SYSTEM_USER;
                return resolve();
            }));
        }).then(() => {
            status = Status.COMPLETE;
            res.status(201).send({ status: "success", username: user.username });
        }).catch((err) => {
            console.log(`Bailing out...initializing delete sequence from status ${Status[status]}`);
            deleteUser(user.student_id, status, req, res, next).then(() => {
                ErrorHandler(err, req, res, next);
            });
        });
    });
});

// READ
Users.get("/users", (req, res, next) => mysqlPool.query("SELECT first_name, last_name, username, class_period FROM users", (err, rows) => {
    if (err) {
        ErrorHandler(new ServerError(err.code.toLowerCase(), err.message, 500), req, res, next);
        return;
    }

    res.send({
        status: "success",
        data: rows
    });
}));

Users.get("/users/:student_id", (req, res, next) => mysqlPool.query("SELECT student_id, first_name, last_name, username, class_period, date_added FROM users WHERE student_id = ?", [req.params.student_id], (err, rows) => {
    if (err) {
        ErrorHandler(new ServerError(err.code.toLowerCase(), err.message, 500), req, res, next);
        return;
    }

    res.send({
        status: "success",
        data: rows
    });
}));

// UPDATE
Users.put("/users/:student_id", (req, res, next) => {
    req.checkBody("first_name", "Invalid first_name").notEmpty();
    req.checkBody("last_name", "Invalid last_name").notEmpty();
    req.checkBody("username", "Invalid username").notEmpty();
    req.checkBody("password", "Invalid password").notEmpty();
    req.checkBody("class_period", "Invalid class_period").notEmpty().isInt();

    req.getValidationResult().then((result) => {
        // Remember to update the length of the required object
        if (Object.keys(req.body).length !== 5 || !result.isEmpty()) {
            ErrorHandler(new ServerError("err_bad_params", "Incorrect supplied parameters", 400), req, res, next);
            return;
        }
    });
});

Users.put("/users/:student_id/:property", (req, res, next) => {
    // TEMPORARY
    ErrorHandler(new ServerError("err_not_implemented", "The server is currently unavailable.", 503), req, res, next);
    if (0 << 0 === 0) // Workaround typescript unreachable code checks
        return;

    switch (req.params.property) {
        case "first_name":
            break;
        case "last_name":
            break;
        case "username":
            break;
        case "password":
            break;
        case "class_period":
            break;
        default:
            ErrorHandler(new ServerError("err_bad_params", "Incorrect supplied parameters", 400), req, res, next);
            return;
    }
});

// DELETE
Users.delete("/users/:student_id", (req, res, next) => {
    req.checkParams("student_id", "Please specify a valid student_id").notEmpty().isInt();
    // req.checkBody("delete_home", "Please specify a valid value for delete_home").notEmpty().isBoolean();
    // req.checkBody("delete_database", "Please specify a valid value for delete_database").notEmpty().isBoolean();
    req.checkBody("magic_code", "???").notEmpty().equals("refact");

    req.getValidationResult().then((result) => {
        // Remember to update the length of the required object
        // if (Object.keys(req.body).length !== 3 || !result.isEmpty()) {
        if (Object.keys(req.body).length !== 1 || !result.isEmpty()) {
            ErrorHandler(new ServerError("err_bad_params", "Incorrect supplied parameters", 400), req, res, next);
            return;
        }

        deleteUser(req.params.student_id, Status.COMPLETE, req, res, next).then(() => {
            res.status(200).send({ status: "success" });
        });
    });
});

function deleteUser(studentID: number, status: Status, req: Request, res: Response, next: NextFunction): Promise<{}> {
    let username: String;

    return new Promise((resolve, reject) => mysqlPool.query("SELECT username FROM users WHERE student_id = ?", [studentID], (err, rows) => {
        if (err) return reject(err);

        // Only return 404 if the resource was created in the first place. If the account record was never created, just breeze through.
        if (status <= Status.STARTED) {
            rows = [{}];
        }

        if (rows.length === 0) {
            return reject(new ServerError("err_user_not_found", "The requested user does not exist", 404));
        }
        username = rows[0].username;

        console.log(`Deleting user ${username}...`);
        resolve();
    })).then(() => {
        if (status < Status.INSERTED_RECORD) return {};
        return new Promise((resolve, reject) => mysqlPool.query("DELETE FROM users WHERE student_id = ?", [studentID], (err) => {
            if (err) reject(err); else resolve();
        }));
    }).then(() => {
        if (status < Status.CREATED_DATABASE) return {};
        return new Promise((resolve, reject) => mysqlPool.query(`DROP DATABASE IF EXISTS \`${username}\``, (err) => {
            if (err) reject(err); else resolve();
        }));
    }).then(() => {
        if (status < Status.CREATED_MYSQL_USER) return {};
        return new Promise((resolve, reject) => mysqlPool.query("DROP USER IF EXISTS ?@'localhost'", [username], (err) => {
            if (err) reject(err); else resolve();
        }));
    }).then(() => {
        if (status < Status.CREATED_SYSTEM_USER) return {};
        return new Promise((resolve, reject) => execFile("/usr/sbin/userdel", ["-r", username], (err) => {
            // Error code 6 indicates that the specified user does not exist
            if (err && err.name !== "6") reject(err); else resolve();
        }));
    }).catch((err) => {
        console.log(err);
        ErrorHandler(err, req, res, next);
        return;
    });
}
