import { Response } from 'express';

class ApiResponse<T> {
    statusCode: number;
    data: T;
    message: string;
    success: boolean;

    constructor(statusCode: number, data: T, message = "Success") {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
    }
}

const sendResponse = <T>(res: Response, statusCode: number, data: T, message: string = "Success") => {
    return res.status(statusCode).json(new ApiResponse(statusCode, data, message));
};

export { sendResponse, ApiResponse };
