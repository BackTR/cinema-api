import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { Subject } from 'rxjs';

export interface SseEvent {
    type: string;
    data: unknown;
    }

    @Injectable()
    export class SseService {
    private readonly logger = new Logger(SseService.name);
    private readonly clients = new Map<string, Response[]>();

    // Daftarkan client SSE
    addClient(userId: string, res: Response): void {
        const existing = this.clients.get(userId) ?? [];
        this.clients.set(userId, [...existing, res]);
        this.logger.debug(`SSE client connected: ${userId} (total: ${existing.length + 1})`);

        // Cleanup saat client disconnect
        res.on('close', () => {
        this.removeClient(userId, res);
        this.logger.debug(`SSE client disconnected: ${userId}`);
        });
    }

    // Hapus client saat disconnect
    private removeClient(userId: string, res: Response): void {
        const existing = this.clients.get(userId) ?? [];
        const updated = existing.filter((r) => r !== res);
        if (updated.length === 0) {
        this.clients.delete(userId);
        } else {
        this.clients.set(userId, updated);
        }
    }

    // Kirim event ke user tertentu
    sendToUser(userId: string, event: SseEvent): void {
        const userClients = this.clients.get(userId) ?? [];
        if (userClients.length === 0) return;

        const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;

        userClients.forEach((res) => {
        try {
            res.write(payload);
        } catch (err) {
            this.logger.error(`Failed to send SSE to ${userId}:`, err);
            this.removeClient(userId, res);
        }
        });

        this.logger.debug(`SSE sent to ${userId}: ${event.type}`);
    }

    // Kirim heartbeat ke semua client (keep-alive)
    sendHeartbeat(): void {
        this.clients.forEach((clients, userId) => {
        clients.forEach((res) => {
            try {
            res.write(':heartbeat\n\n');
            } catch {
            this.removeClient(userId, res);
            }
        });
        });
    }

    getConnectedCount(): number {
        let total = 0;
        this.clients.forEach((clients) => { total += clients.length; });
        return total;
    }
}