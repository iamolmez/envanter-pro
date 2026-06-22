import { Request, Response, NextFunction } from "express";

// Özel hata sınıfı
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Global hata yakalama middleware'i
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Beklenmeyen bir sunucu hatası oluştu";

  console.error(`[HATA] ${statusCode} - ${message}`);
  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
};

// 404 rotaları için middleware
export const notFoundHandler = (
  _req: Request,
  res: Response
): void => {
  res.status(404).json({
    success: false,
    error: {
      message: "İstenen kaynak bulunamadı",
    },
  });
};
