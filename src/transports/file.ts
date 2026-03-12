/**
 * @file src/transports/file.ts
 * @description Stream-based, daily-rotating file transport for Node.js.
 * Uses fs.createWriteStream for non-blocking I/O with an async write buffer.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Transport, LogEntry, FileTransportOptions } from '../types/index.js';

const DEFAULT_OPTIONS: Required<FileTransportOptions> = {
  dir: 'logs',
  maxFiles: 7,
  asyncBuffer: true,
  bufferSize: 100,
  flushIntervalMs: 1000,
};

export class FileTransport implements Transport {
  private readonly opts: Required<FileTransportOptions>;
  private currentDate: string = '';
  private stream: fs.WriteStream | null = null;
  private buffer: string[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: FileTransportOptions = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...options };
    this.ensureDir();
    this.openStream();

    if (this.opts.asyncBuffer) {
      this.flushTimer = setInterval(() => this.flushBuffer(), this.opts.flushIntervalMs);
      // Allow process to exit naturally even if timer is pending
      if (this.flushTimer.unref) this.flushTimer.unref();
    }
  }

  write(entry: LogEntry): void {
    const line = JSON.stringify(entry) + '\n';

    // Check for day rollover
    const today = this.getDateString();
    if (today !== this.currentDate) {
      this.rotateTo(today);
    }

    if (this.opts.asyncBuffer) {
      this.buffer.push(line);
      if (this.buffer.length >= this.opts.bufferSize) {
        this.flushBuffer();
      }
    } else {
      this.stream?.write(line);
    }
  }

  flush(): void {
    this.flushBuffer();
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushBuffer();
    await this.closeStream();
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private flushBuffer(): void {
    if (this.buffer.length === 0 || !this.stream) return;
    const chunk = this.buffer.join('');
    this.buffer = [];
    this.stream.write(chunk);
  }

  private getDateString(): string {
    return new Date().toISOString().substring(0, 10); // YYYY-MM-DD
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.opts.dir)) {
      fs.mkdirSync(this.opts.dir, { recursive: true });
    }
  }

  private openStream(): void {
    this.currentDate = this.getDateString();
    const filePath = path.join(this.opts.dir, `${this.currentDate}.log`);
    this.stream = fs.createWriteStream(filePath, { flags: 'a', encoding: 'utf8' });
    this.stream.on('error', (err) => {
      console.error('[log-wiz] FileTransport write error:', err.message);
    });
  }

  private rotateTo(newDate: string): void {
    this.flushBuffer();
    this.stream?.end();
    this.stream = null;
    this.currentDate = newDate;
    const filePath = path.join(this.opts.dir, `${this.currentDate}.log`);
    this.stream = fs.createWriteStream(filePath, { flags: 'a', encoding: 'utf8' });
    this.pruneOldFiles();
  }

  private async closeStream(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.stream) { resolve(); return; }
      this.stream.end(() => resolve());
    });
  }

  private pruneOldFiles(): void {
    try {
      const files = fs
        .readdirSync(this.opts.dir)
        .filter((f) => /^\d{4}-\d{2}-\d{2}\.log$/.test(f))
        .sort()
        .reverse();

      for (const file of files.slice(this.opts.maxFiles)) {
        try {
          fs.unlinkSync(path.join(this.opts.dir, file));
        } catch {
          // Best-effort: ignore individual file deletion errors
        }
      }
    } catch {
      // Best-effort: ignore directory read errors
    }
  }
}
