import { Injectable } from '@nestjs/common';

/**
 * Seção 6 (Fase 4) — Testabilidade.
 * Abstrai `new Date()` e `Date.now()` para permitir mock determinístico nos testes.
 * Sem este serviço, testar lógica de "hoje" exigiria manipular o sistema global.
 */
@Injectable()
export class DateService {
    now(): Date {
        return new Date();
    }

    today(): Date {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

    timestamp(): number {
        return Date.now();
    }
}
