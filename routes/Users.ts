import { Router } from "express";
import { mysqlPool } from "../App";
import { ServerError } from "../services/ServerError";
import { ErrorHandler } from "../services/ErrorHandler";

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
        if (Object.keys(req.body).length === 5 && result.isEmpty()) {
            mysqlPool.query(`INSERT INTO users SET ?`, req.body, (err, rows, fields) => {
                if (err) {
                    ErrorHandler(new ServerError(err.code.toLowerCase(), err.message, 500), req, res, next);
                    return;
                }

                res.status(201).send({
                    status: "success"
                });
            });
        } else {
            ErrorHandler(new ServerError("err_bad_params", "Incorrect supplied parameters", 400), req, res, next);
        }
    });
});

// READ
Users.get("/users", (req, res, next) => mysqlPool.query(`SELECT first_name, last_name, class_period FROM users`, (err, rows, fields) => {
    if (err) {
        ErrorHandler(new ServerError(err.code.toLowerCase(), err.message, 500), req, res, next);
        return;
    }

    res.send({
        status: "success",
        data: rows
    });
}));

Users.get("/users/:student_id", (req, res, next) => mysqlPool.query(`SELECT student_id, first_name, last_name, class_period, date_added FROM users WHERE student_id = ?`, [req.params.student_id], (err, rows, fields) => {
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
Users.post("/users/:student_id", (req, res, next) => {

});

// DELETE
Users.delete("/users/:student_id", (req, res, next) => {
    mysqlPool.query(`DELETE FROM users WHERE student_id = ?`, [req.params.student_id], (err, rows, fields) => {
        if (err) {
            ErrorHandler(new ServerError(err.code.toLowerCase(), err.message, 500), req, res, next);
            return;
        }

        res.send({
            status: "success"
        });
    });
});
