import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject } from 'rxjs';
import { AppNotification } from '../../models/loan.model';

export interface NotificationEvent {
  type: 'NEW' | 'READ' | 'DELETE';
  payload: any;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {

  private client!: Client;
  private connected = false;

  private eventSubject =
    new BehaviorSubject<NotificationEvent | null>(null);

  events$ = this.eventSubject.asObservable();

  connect(): void {

    if (this.connected) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000
    });

    this.client.onConnect = () => {

      this.connected = true;
      console.log('✅ WebSocket Connected');

      // =========================
      // NEW NOTIFICATIONS
      // =========================
      this.client.subscribe('/topic/notifications', (msg: IMessage) => {

        const notification: AppNotification =
          JSON.parse(msg.body);

        this.eventSubject.next({
          type: 'NEW',
          payload: notification
        });
      });

      // =========================
      // READ NOTIFICATIONS
      // =========================
      this.client.subscribe('/topic/notifications/read', (msg: IMessage) => {

        const id: number = JSON.parse(msg.body);

        this.eventSubject.next({
          type: 'READ',
          payload: id
        });
      });

      // =========================
      // DELETE NOTIFICATIONS
      // =========================
      this.client.subscribe('/topic/notifications/delete', (msg: IMessage) => {

        const id: number = JSON.parse(msg.body);

        this.eventSubject.next({
          type: 'DELETE',
          payload: id
        });
      });
    };

    this.client.activate();
  }
}