export class ServerError implements Error {
    name: string;
    message: string;
    statusCode: number;

    constructor(name: string, message: string = "Internal Server Error", statusCode: number = 500) {
        this.name = name;
        this.message = message;
        this.statusCode = statusCode;
    }
}
