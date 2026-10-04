import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, Pipe, PipeTransform, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

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

interface ChatMessage {
  role: 'USER' | 'ASSISTANT';
  content: string;
  proposal?: {
    id: string;
    status: string;
    emails: Array<{ recipients: string[]; subject: string; body: string; sendAt: string; timezone: string }>;
    recurrence?: { recipients: string[]; subject: string; body: string; startAt: string; endAt: string; intervalSeconds: number; timezone: string } | null;
  };
}

type ScheduleMode = 'fixed' | 'recurrence';

@Pipe({ name: 'markdown', standalone: true })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const escaped = value
      .replace(/\\\n/g, '\n')
      .replace(/\r\n?/g, '\n')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    return escaped.split(/\n{2,}/).map((block) => {
      const lines = block.split('\n');
      if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(block)) return '<hr>';
      const ordered = lines.every((line) => /^\s*\d+\\?\.\s+/.test(line));
      const unordered = lines.every((line) => /^\s*[-*+]\s+/.test(line));
      if (ordered || unordered) {
        const tag = ordered ? 'ol' : 'ul';
        const items = lines.map((line) => line.replace(ordered ? /^\s*\d+\\?\.\s+/ : /^\s*[-*+]\s+/, ''));
        return `<${tag}>${items.map((item) => `<li>${this.inline(item)}</li>`).join('')}</${tag}>`;
      }
      if (lines.every((line) => /^\s*&gt;\s?/.test(line))) {
        return `<blockquote>${lines.map((line) => `<p>${this.inline(line.replace(/^\s*&gt;\s?/, ''))}</p>`).join('')}</blockquote>`;
      }
      return `<p>${lines.map((line) => this.inline(line)).join('<br>')}</p>`;
    }).join('');
  }

  private inline(value: string): string {
    return value
      .replace(/\\([*_`>])/g, '$1')
      .replace(/\\\./g, '.')
      .replace(/\\-/g, '-')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }
}

@Component({
  selector: 'app-chat-page',
  imports: [CommonModule, FormsModule, DatePipe, MarkdownPipe],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class ChatPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  mode: ScheduleMode = 'fixed';
  schedules: Schedule[] = [];
  loading = false;
  submitting = false;
  authenticated = false;
  notice = '';
  noticeType: 'success' | 'error' | '' = '';

  recipients = '';
  subject = '';
  body = '';
  sendAt = '';
  startAt = '';
  endAt = '';
  intervalSeconds = 3600;
  chatMessages: ChatMessage[] = [];
  chatInput = '';
  chatBusy = false;
  showLoginPrompt = false;
  private conversationId = '';
  private backendBaseUrl = '';

  constructor() {
    if (new URLSearchParams(window.location.search).has('connected')) {
      this.notice = 'Gmail is connected. You can schedule an email.';
      this.noticeType = 'success';
      this.chatInput = sessionStorage.getItem('mail-ai-pending-message') ?? '';
      sessionStorage.removeItem('mail-ai-pending-message');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  ngOnInit(): void {
    void this.initializeBackend();
  }

  setMode(mode: ScheduleMode): void {
    this.mode = mode;
    this.clearNotice();
  }

  connectGoogle(): void {
    if (this.chatInput.trim()) sessionStorage.setItem('mail-ai-pending-message', this.chatInput.trim());
    window.location.assign(this.apiUrl('/auth/google'));
  }

  signOut(): void {
    this.http.post<void>(this.apiUrl('/auth/logout'), {}, { withCredentials: true }).subscribe({
      next: () => {
        this.authenticated = false;
        this.schedules = [];
        this.notice = 'You have been signed out.';
        this.noticeType = 'success';
        this.changeDetector.markForCheck();
      },
      error: () => this.showNotice('Could not sign out. Please try again.', 'error'),
    });
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

  handleChatKeydown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key !== 'Enter' || keyboardEvent.shiftKey || keyboardEvent.isComposing) return;
    keyboardEvent.preventDefault();
    void this.sendChatMessage();
  }

  async sendChatMessage(): Promise<void> {
    const message = this.chatInput.trim();
    if (!message || this.chatBusy) return;
    if (!this.authenticated) {
      this.showLoginPrompt = true;
      this.notice = '';
      this.changeDetector.markForCheck();
      return;
    }
    this.showLoginPrompt = false;
    this.chatInput = '';
    this.chatMessages.push({ role: 'USER', content: message });
    const responseMessage: ChatMessage = { role: 'ASSISTANT', content: '' };
    this.chatMessages.push(responseMessage);
    this.chatBusy = true;
    this.changeDetector.markForCheck();
    try {
      if (!this.conversationId) {
        const created = await fetch(this.apiUrl('/api/chat/conversations'), {
          method: 'POST', credentials: 'include', headers: { Accept: 'application/json' },
        });
        if (!created.ok) throw new Error(await this.readApiError(created));
        this.conversationId = ((await created.json()) as { id: string }).id;
      }
      const response = await fetch(this.apiUrl(`/api/chat/conversations/${this.conversationId}/messages`), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ message, timezone: this.timezone }),
      });
      if (!response.ok) throw new Error(await this.readApiError(response));
      if (!response.body) throw new Error('The chat response stream was empty.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const raw of events) {
          const eventName = raw.split('\n').find((line) => line.startsWith('event:'))?.slice(6).trim();
          const data = raw.split('\n').find((line) => line.startsWith('data:'))?.slice(5).trim();
          if (!data) continue;
          const payload = JSON.parse(data) as {
            reply?: string;
            proposal?: ChatMessage['proposal'];
            errorCode?: string;
            retryable?: boolean;
          };
          if (eventName === 'error') {
            responseMessage.content = payload.reply ?? 'The assistant could not complete that request.';
            responseMessage.proposal = undefined;
          } else if (eventName === 'replace') {
            responseMessage.content = payload.reply ?? 'Please review the email details and try again.';
            responseMessage.proposal = undefined;
          } else if (eventName === 'confirmed') {
            responseMessage.content = payload.reply ?? 'Confirmed. Your email has been scheduled.';
            responseMessage.proposal = undefined;
            for (const previousMessage of this.chatMessages) {
              if (previousMessage !== responseMessage) previousMessage.proposal = undefined;
            }
            this.loadSchedules();
          } else if (eventName === 'text_delta') responseMessage.content += payload.reply ?? '';
          else if (payload.reply) responseMessage.content += `\n\n${payload.reply}`;
          if (eventName !== 'error') responseMessage.proposal = payload.proposal;
          this.changeDetector.markForCheck();
        }
      }
    } catch (error) {
      responseMessage.content = error instanceof Error ? error.message : 'Could not reach the assistant.';
    } finally {
      this.chatBusy = false;
      this.changeDetector.markForCheck();
    }
  }

  confirmProposal(message: ChatMessage): void {
    const proposalId = message.proposal?.id;
    if (!proposalId || this.submitting) return;
    this.submitting = true;
    this.http.post<{ scheduleIds: string[]; alreadyConfirmed: boolean }>(this.apiUrl(`/api/chat/proposals/${proposalId}/confirm`), {}, { withCredentials: true }).subscribe({
      next: () => {
        message.proposal = undefined;
        message.content += '\n\nSchedule confirmed. You can see it in your scheduled list.';
        this.submitting = false;
        this.loadSchedules();
        this.changeDetector.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        message.content += `\n\n${this.errorMessage(error)}`;
        this.submitting = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  private async readApiError(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { message?: string; error?: string; detail?: string };
      return body.message ?? body.error ?? body.detail ?? `Assistant request failed (HTTP ${response.status}).`;
    } catch {
      return `Assistant request failed (HTTP ${response.status}).`;
    }
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
        }
        this.changeDetector.markForCheck();
      },
    });
  }

  private async initializeBackend(): Promise<void> {
    const configuredBaseUrl = window.mailAiConfig?.apiBaseUrl?.replace(/\/$/, '') ?? '';
    if (configuredBaseUrl) {
      this.backendBaseUrl = configuredBaseUrl;
      this.loadSchedules();
      return;
    }

    let backendFound = false;
    for (const port of [8080, 8081, 8082]) {
      const baseUrl = `http://localhost:${port}`;
      try {
        const response = await fetch(`${baseUrl}/api/health`, { headers: { Accept: 'application/json' } });
        const health = response.ok ? (await response.json()) as { status?: string } : null;
        if (health?.status === 'UP') {
          this.backendBaseUrl = baseUrl;
          backendFound = true;
          break;
        }
      } catch {
        // The scheduler may be using the next available development port.
      }
    }
    if (!backendFound) {
      this.loading = false;
      this.showNotice('Could not reach the schedule service. Start Spring Boot, then refresh this page.', 'error');
      this.changeDetector.markForCheck();
      return;
    }
    this.loadSchedules();
  }

  private apiUrl(path: string): string {
    return `${this.backendBaseUrl}${path}`;
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

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}

declare global {
  interface Window {
    mailAiConfig?: { apiBaseUrl?: string };
  }
}
