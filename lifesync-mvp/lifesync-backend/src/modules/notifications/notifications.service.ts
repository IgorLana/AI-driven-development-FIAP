import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    async sendNotification(userId: string, title: string, message: string) {
        // Stub implementation
        this.logger.log(`Notification sent to user ${userId}: ${title} - ${message}`);
        return { success: true };
    }
}
