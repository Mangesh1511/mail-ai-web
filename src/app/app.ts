import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Schedule {
  id: string;
  type: 'FIXED' | 'RECURRENCE';
  state: string;
  recipients: string[];
  subject: string;
  body: string;
  timezone: string;
  startAt: string;
  endAt?: string;
  intervalSeconds?: number;
  createdAt: string;
}

type ScheduleMode = 'fixed' | 'recurrence';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, DatePipe],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  mode: ScheduleMode = 'fixed';
  schedules: Schedule[] = [];
  loading = false;
  submitting = false;
  authenticated = false;
  serviceStatus = 'Checking service…';
  notice = '';
  noticeType: 'success' | 'error' | '' = '';

  recipients = '';
  subject = '';
  body = '';
  sendAt = '';
  startAt = '';
  endAt = '';
  intervalSeconds = 3600;

  constructor() {
    if (new URLSearchParams(window.location.search).has('connected')) {
      this.notice = 'Gmail is connected. You can schedule an email.';
      this.noticeType = 'success';
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  ngOnInit(): void {
    this.checkHealth();
    this.loadSchedules();
  }

  setMode(mode: ScheduleMode): void {
    this.mode = mode;
    this.clearNotice();
  }

  connectGoogle(): void {
    window.location.assign(this.apiUrl('/auth/google'));
  }

  createSchedule(): void {
    if (this.submitting) return;
    this.submitting = true;
    this.clearNotice();
    const payload: Record<string, unknown> = {
      recipients: this.recipients.split(',').map((value) => value.trim()).filter(Boolean),
      subject: this.subject.trim(),
      body: this.body.trim(),
      timezone: this.timezone,
    };
    const url = this.mode === 'fixed' ? '/api/schedule/fixed' : '/api/schedule/recurrence';

    try {
      if (this.mode === 'fixed') {
        payload['sendAt'] = this.toIso(this.sendAt);
      } else {
        payload['startAt'] = this.toIso(this.startAt);
        payload['endAt'] = this.toIso(this.endAt);
        payload['intervalSeconds'] = Number(this.intervalSeconds);
      }
    } catch (error) {
      this.showNotice(error instanceof Error ? error.message : 'Choose valid schedule dates.', 'error');
      this.submitting = false;
      return;
    }

    this.http.post<Schedule>(this.apiUrl(url), payload, { withCredentials: true }).subscribe({
      next: () => {
        this.showNotice('Your email schedule has been created.', 'success');
        this.resetForm();
        this.submitting = false;
        this.changeDetector.markForCheck();
        this.loadSchedules();
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.authenticated = false;
          this.showNotice('Connect your Gmail account before scheduling an email.', 'error');
        } else {
          this.showNotice(this.errorMessage(error), 'error');
        }
        this.submitting = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  refreshSchedules(): void {
    this.loadSchedules();
  }

  formatInterval(seconds?: number): string {
    if (!seconds) return 'Recurring';
    const hours = seconds / 3600;
    return hours === 1 ? 'Every hour' : `Every ${hours} hours`;
  }

  private loadSchedules(): void {
    this.loading = true;
    this.http.get<Schedule[]>(this.apiUrl('/api/myschedules'), { withCredentials: true }).subscribe({
      next: (schedules) => {
        this.schedules = schedules;
        this.authenticated = true;
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        if (error.status === 401) {
          this.authenticated = false;
          this.schedules = [];
        } else {
          this.serviceStatus = 'Service unavailable';
        }
        this.changeDetector.markForCheck();
      },
    });
  }

  private checkHealth(): void {
    this.http.get<{ status: string }>(this.apiUrl('/api/health')).subscribe({
      next: (health) => {
        this.serviceStatus = health.status === 'UP' ? 'Service is ready' : 'Service is unavailable';
        this.changeDetector.markForCheck();
      },
      error: () => {
        this.serviceStatus = 'Service is unavailable';
        this.changeDetector.markForCheck();
      },
    });
  }

  private apiUrl(path: string): string {
    const baseUrl = window.mailAiConfig?.apiBaseUrl?.replace(/\/$/, '') ?? '';
    return `${baseUrl}${path}`;
  }

  private toIso(value: string): string {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) throw new Error('Choose a valid date and time.');
    return date.toISOString();
  }

  private resetForm(): void {
    this.recipients = '';
    this.subject = '';
    this.body = '';
    this.sendAt = '';
    this.startAt = '';
    this.endAt = '';
    this.intervalSeconds = 3600;
  }

  private showNotice(message: string, type: 'success' | 'error'): void {
    this.notice = message;
    this.noticeType = type;
  }

  private clearNotice(): void {
    this.notice = '';
    this.noticeType = '';
  }

  private errorMessage(error: HttpErrorResponse): string {
    const body = error.error as { message?: string; detail?: string; error?: string } | null;
    if (body?.message) return body.message;
    if (body?.detail) return body.detail;
    if (body?.error) return body.error;
    if (error.status === 0) return 'Could not reach the schedule service. Check that the backend is running.';
    return `Could not save the schedule (HTTP ${error.status}). Check the dates and try again.`;
  }
}

declare global {
  interface Window {
    mailAiConfig?: { apiBaseUrl?: string };
  }
}
