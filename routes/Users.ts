import { Router, Request, Response, NextFunction } from "express";
import { mysqlPool } from "../App";
import { ServerError } from "../services/ServerError";
import { ErrorHandler } from "../services/ErrorHandler";
import { User, UserStatus } from "../services/User";
import { execFile } from "child_process";

export const Users = Router();

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
        const user = new User(req.body);

        const alphaFirstName = req.body.first_name.replace(/[^0-9a-z]/gi, "");
        const alphaLastNameFirstLetter = req.body.last_name.charAt(0).replace(/[^0-9a-z]/gi, "");
        if (!alphaFirstName || !alphaLastNameFirstLetter) {
            ErrorHandler(new ServerError("err_bad_params", "Incorrect supplied parameters", 400), req, res, next);
            return;
        }
        user.username = (alphaFirstName + alphaLastNameFirstLetter).toLowerCase();
        console.log(`Creating user ${user.username}...`);

        let status: number = UserStatus.STARTED;

        new Promise<void>((resolve, reject) => mysqlPool.query("INSERT INTO users SET ?", user, (err) => {
            if (err) return reject(err);
            status = UserStatus.INSERTED_RECORD;
            return resolve();
        })).then(() => {
            return new Promise<void>((resolve, reject) => mysqlPool.query(`CREATE DATABASE \`${user.username}\``, (err) => {
                if (err) return reject(err);
                status = UserStatus.CREATED_DATABASE;
                return resolve();
            }));
        }).then(() => {
            return new Promise<void>((resolve, reject) => mysqlPool.query("CREATE USER ?@'localhost' IDENTIFIED BY ?", [user.username, user.password], (err) => {
                if (err) return reject(err);
                status = UserStatus.CREATED_MYSQL_USER;
                return resolve();
            }));
        }).then(() => {
            return new Promise<void>((resolve, reject) => mysqlPool.query(`GRANT ALL PRIVILEGES ON \`${user.username}\`.* TO ?@'localhost'`, [user.username], (err) => {
                if (err) return reject(err);
                status = UserStatus.GRANTED_MYSQL_PERMISSIONS;
                return resolve();
            }));
        }).then(() => {
            return new Promise<string>((resolve, reject) => execFile("/usr/bin/mkpasswd", ["-m", "sha-512", user.password], (err, stdout) => {
                if (err) return reject(err);
                status = UserStatus.GENERATED_PASSWORD_HASH;
                return resolve(stdout);
            }));
        }).then((hashedPW: String) => {
            return new Promise<void>((resolve, reject) => execFile("/usr/sbin/useradd", ["-m", "-N", "-p", hashedPW.replace(/\r?\n|\r/g, ""), "-s", "/bin/bash", user.username], (err) => {
                if (err) return reject(err);
                status = UserStatus.CREATED_SYSTEM_USER;
                return resolve();
            }));
        }).then(() => {
            status = UserStatus.COMPLETE;
            res.status(201).send({ status: "success", username: user.username });
        }).catch((err) => {
            console.error(err);
            console.log(`Bailing out...initializing delete sequence from status ${UserStatus[status]}`);
            user.delete(status).then(() => {
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
    req.checkParams("student_id", "Invalid student_id").notEmpty().isInt();
    req.checkBody("first_name", "Invalid first_name").notEmpty();
    req.checkBody("last_name", "Invalid last_name").notEmpty();
    req.checkBody("password", "Invalid password").notEmpty();
    req.checkBody("class_period", "Invalid class_period").notEmpty().isInt();

    req.getValidationResult().then((result) => {
        // Remember to update the length of the required object
        if (Object.keys(req.body).length !== 4 || !result.isEmpty()) {
            ErrorHandler(new ServerError("err_bad_params", "Incorrect supplied parameters", 400), req, res, next);
            return;
        }

        let oldUser: User;
        let newUser = new User(req.body);

        new Promise<void>((resolve, reject) => mysqlPool.query("SELECT * FROM users WHERE student_id = ?", [req.params.student_id], (err, rows) => {
            if (err) return reject(err);

            if (rows.length === 0) {
                return reject(new ServerError("err_user_not_found", "The requested user does not exist", 404));
            }

            oldUser = new User(rows[0]);

            console.log(`Modifying user ${oldUser.username}...`);
            resolve();
        })).then(() => {
            if (oldUser.first_name === newUser.first_name) return undefined;
            return oldUser.changeFirstName(newUser.first_name);
        }).then(() => {
            if (oldUser.last_name === newUser.last_name) return undefined;
            return oldUser.changeLastName(newUser.last_name);
        }).then(() => {
            if (oldUser.password === newUser.password) return undefined;
            return oldUser.changePassword(newUser.password);
        }).then(() => {
            if (oldUser.class_period === newUser.class_period) return undefined;
            return oldUser.changeClassPeriod(newUser.class_period);
        }).catch((err) => {
            console.error(err);
            ErrorHandler(err, req, res, next);
            return;
        });
    });
});

Users.put("/users/:student_id/:property", (req, res, next) => {
    req.checkParams("student_id", "Invalid student_id").notEmpty().isInt();
    req.checkBody(req.params.property, `Invalid ${req.params.property}`).notEmpty();

    req.getValidationResult().then((result) => {
        if (Object.keys(req.body).length !== 1 || !result.isEmpty()) {
            ErrorHandler(new ServerError("err_bad_params", "Incorrect supplied parameters", 400), req, res, next);
            return;
        }

        let oldUser: User;
        let newProp: any = req.body[req.params.property];

        new Promise<void>((resolve, reject) => mysqlPool.query("SELECT * FROM users WHERE student_id = ?", [req.params.student_id], (err, rows) => {
            if (err) return reject(err);
            if (rows.length === 0) {
                return reject(new ServerError("err_user_not_found", "The requested user does not exist", 404));
            }

            oldUser = new User(rows[0]);

            console.log(`Updating user ${oldUser.username}...`);
            resolve();
        })).then(() => {
            switch (req.params.property) {
                case "first_name":
                    if (oldUser.first_name === newProp) return undefined; else return oldUser.changeFirstName(newProp);
                case "last_name":
                    if (oldUser.last_name === newProp) return undefined; else return oldUser.changeLastName(newProp);
                case "password":
                    if (oldUser.password === newProp) return undefined; else return oldUser.changePassword(newProp);
                case "class_period":
                    if (oldUser.class_period === newProp) return undefined; else return oldUser.changeClassPeriod(newProp);
                default:
                    ErrorHandler(new ServerError("err_bad_params", "Incorrect supplied parameters", 400), req, res, next);
                    return undefined;
            }
        }).then(() => {
            res.send({ status: "success" });
        }).catch((err) => {
            console.error(err);
            ErrorHandler(err, req, res, next);
            return;
        });
    });
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

        new Promise<User>((resolve, reject) => mysqlPool.query("SELECT * FROM users WHERE student_id = ?", [req.params.student_id], (err, rows) => {
            if (err) return reject(err);

            if (rows.length === 0) {
                return reject(new ServerError("err_user_not_found", "The requested user does not exist", 404));
            }

            let user = new User(rows[0]);
            console.log(`Deleting user ${user.username}...`);
            resolve(user);
        })).then((user) => {
            user.delete();
        }).then(() => {
            res.status(200).send({ status: "success" });
        }).catch((err) => {
            console.error(err);
            ErrorHandler(err, req, res, next);
            return;
        });
    });
});
