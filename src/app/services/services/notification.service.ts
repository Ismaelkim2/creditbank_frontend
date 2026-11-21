import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { AppNotification } from '../../../models/loan.model';
import { AuthService } from '../auth-service.service'; // adjust path
import { HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

private apiUrl = `${environment.apiUrl}/notifications`;

  private soundEnabledSubject = new BehaviorSubject<boolean>(true);

soundEnabled$ = this.soundEnabledSubject.asObservable();

setSoundEnabled(enabled: boolean) {
  this.soundEnabledSubject.next(enabled);
}

  // ✅ SINGLE SOURCE OF TRUTH
  private notificationsSubject =
    new BehaviorSubject<AppNotification[]>([]);

  notifications$ =
    this.notificationsSubject.asObservable();

  constructor(private httP: HttpClient,
    private http: HttpClient,
  private authService: AuthService

  ) {}

  // =========================
  // LOAD FROM BACKEND
  // =========================
 loadNotifications(): Observable<AppNotification[]> {
  return this.http
    .get<AppNotification[]>(`${this.apiUrl}/all`)
    .pipe(
      tap(list => {
        this.notificationsSubject.next(list);
      })
    );
}

  // =========================
  // GET STREAM
  // =========================
  getNotifications() {
    return this.notifications$;
  }

  // =========================
  // UNREAD COUNT (REACTIVE FIX)
  // =========================
  getUnreadCount(): number {
    return this.notificationsSubject.value
      .filter(n => !n.read).length;
  }

    unreadCount$ = this.notifications$.pipe(
    map(list => list.filter(n => !n.read).length)
  );

  // =========================
  // MARK AS READ
  // =========================
markAsRead(id: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/${id}/read`, {}).pipe(
    tap(() => {
      const updated = this.notificationsSubject.value.map(n =>
        n.id === id ? { ...n, read: true } : n
      );

      // 🔥 IMPORTANT: force new reference
      this.notificationsSubject.next([...updated]);
    })
  );
}

markAsReadLocal(id: number) {

  const updated = this.notificationsSubject.value.map(n =>
    n.id === id ? { ...n, read: true } : n
  );

  this.notificationsSubject.next(updated);
}

  // =========================
  // MARK ALL AS READ
  // =========================
  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        const updated = this.notificationsSubject.value.map(n => ({
          ...n,
          read: true
        }));

        this.notificationsSubject.next(updated);
      })
    );
  }

  // =========================
  // DELETE
  // =========================
  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const filtered = this.notificationsSubject.value
          .filter(n => n.id !== id);

        this.notificationsSubject.next(filtered);
      })
    );
  }

  // =========================
  // REAL-TIME INJECTION (FOR WEBSOCKET)
  // =========================
 pushNotification(notification: AppNotification) {

  const current = this.notificationsSubject.value;

  const exists = current.some(
    n => n.id === notification.id
  );

  if (exists) {
    return;
  }

  this.notificationsSubject.next([
    { ...notification, read: false }, 
    ...current
  ]);
}

deleteLocal(id: number) {
  const updated = this.notificationsSubject.value
    .filter(n => n.id !== id);

  this.notificationsSubject.next(updated);
}

private getAuthHeaders(): HttpHeaders {
  const token = sessionStorage.getItem('token');

  return new HttpHeaders({
    Authorization: `Bearer ${token}`
  });
}

getSoundPreference() {
  return this.http
    .get<boolean>(`${this.apiUrl}/preferences/sound`)
    .pipe(
      tap(enabled => {
        this.soundEnabledSubject.next(enabled);
      })
    );
}

updateSoundPreference(enabled: boolean) {

  // instant update
  this.soundEnabledSubject.next(enabled);

  return this.http.put(
    `${this.apiUrl}/preferences/sound`,
    enabled,
    {
      headers: this.getAuthHeaders(),
      responseType: 'text'
    }
  );
}



}