import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Seção 4 (Fase 5) — Logging estruturado em JSON.
 * Substitui o log free-text por objeto JSON com campos consistentes.
 * Facilita indexação em ferramentas como Datadog, CloudWatch, Splunk, ELK.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request>();
        const { method, url, ip } = request;
        const userAgent = request.get('user-agent') ?? '';
        const startTime = Date.now();

        return next.handle().pipe(
            tap(() => {
                const response = context.switchToHttp().getResponse<Response>();
                const duration = Date.now() - startTime;

                // Seção 4 — Log estruturado JSON: cada campo é indexável
                this.logger.log(
                    JSON.stringify({
                        method,
                        url,
                        statusCode: response.statusCode,
                        duration: `${duration}ms`,
                        ip,
                        userAgent,
                    }),
                );
            }),
        );
    }
}
