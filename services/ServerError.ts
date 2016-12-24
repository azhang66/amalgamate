export class ServerError {
    status: string;
    details: string;
    statusCode: number;

    constructor(status: string, details: string = "Internal Server Error", statusCode: number = 500) {
        this.status = status;
        this.details = details;
        this.statusCode = statusCode;
    }
}
