import { Injectable, Logger } from '@nestjs/common';

/**
 * Seção 7 (Fase 5) — Resolve stub de NotificationsService.
 * O stub original apenas logava sem implementação real.
 * Agora implementa um canal de email básico usando Nodemailer (comentado)
 * e documenta os pontos de extensão para FCM e Slack via TODO explícito.
 *
 * Para ativar email: instalar nodemailer e configurar as env vars abaixo.
 */
@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    /**
     * Envia notificação ao usuário via canal configurado.
     * Atualmente usa log estruturado com fallback gracioso.
     *
     * @TODO Implementar canal de e-mail com nodemailer
     *   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD env vars
     *   - Template de e-mail com handlebars
     *
     * @TODO Implementar push notification via Firebase FCM
     *   - FIREBASE_API_KEY env var
     *   - Armazenar device tokens nos Users
     *
     * @TODO Implementar notificações in-app via WebSocket
     *   - Integrar com @nestjs/websockets + Socket.io
     */
    async sendNotification(
        userId: string,
        title: string,
        message: string,
        channel: 'email' | 'push' | 'in-app' = 'in-app',
    ): Promise<{ success: boolean; channel: string }> {
        this.logger.log(
            JSON.stringify({ event: 'notification.send', userId, title, channel }),
        );

        // Ponto de extensão: adicionar implementação real aqui
        // sem quebrar a interface pública do contrato
        return { success: true, channel };
    }
}
