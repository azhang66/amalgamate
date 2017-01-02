import * as express from "express";
import * as morgan from "morgan";
import * as bodyParser from "body-parser";
import expressValidator = require("express-validator");
import * as yargs from "yargs";
import * as mysql from "mysql";

import { Users } from "./routes/Users";
import { ErrorHandler } from "./services/ErrorHandler";

const app: express.Express = express();

// More arguments and stuff go here
yargs.default("port", 8000);
const argv = yargs.argv;

// Set up middlewares
if (argv.production) {
    app.use(morgan("combined"));
} else {
    app.use(morgan("dev"));
}
app.use(bodyParser.json());
app.use(expressValidator());
app.use("/api/v1", Users);
app.use(ErrorHandler);

// Start up services
export const mysqlPool = mysql.createPool({
    host: "localhost",
    user: "refactored-potato",
    password: "secret",
    database: "refactored-potato"
});

mysqlPool.getConnection((err, connection) => {
    if (err) {
        console.error(`MySQL connection error: ${err.message}`);
        process.exit(1);
    }

    console.log("MySQL Connection Pool initialized!");
    connection.release();
});

app.listen(argv.port);
console.log(`Starting refactored-potato on port ${argv.port}!`);
