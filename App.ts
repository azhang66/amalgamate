import * as express from "express";
import * as morgan from "morgan";
import * as bodyParser from "body-parser";

const app: express.Express = express();

app.use(morgan("dev"));
app.use(bodyParser.json());

export default app;
