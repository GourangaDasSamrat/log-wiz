/**
 * @file tests/integration/file-transport.test.ts
 * @description Integration tests for FileTransport: creates real files on disk.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileTransport } from '../../src/transports/file';
import type { LogEntry } from '../../src/types';

function makeEntry(message: string): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: 'info',
    env: 'node',
    message,
  };
}

describe('FileTransport', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-wiz-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates the log directory if it does not exist', async () => {
    const logDir = path.join(tmpDir, 'nested', 'logs');
    const transport = new FileTransport({ dir: logDir, asyncBuffer: false });
    transport.write(makeEntry('hello'));
    await transport.close();
    expect(fs.existsSync(logDir)).toBe(true);
  });

  it('writes entries to a date-stamped log file', async () => {
    const transport = new FileTransport({ dir: tmpDir, asyncBuffer: false });
    transport.write(makeEntry('test message'));
    await transport.close();

    const today = new Date().toISOString().substring(0, 10);
    const logFile = path.join(tmpDir, `${today}.log`);
    expect(fs.existsSync(logFile)).toBe(true);

    const content = fs.readFileSync(logFile, 'utf8');
    expect(content).toContain('test message');
  });

  it('writes valid JSON per line', async () => {
    const transport = new FileTransport({ dir: tmpDir, asyncBuffer: false });
    transport.write(makeEntry('line one'));
    transport.write(makeEntry('line two'));
    await transport.close();

    const today = new Date().toISOString().substring(0, 10);
    const content = fs.readFileSync(path.join(tmpDir, `${today}.log`), 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('flushes the async buffer on close', async () => {
    const transport = new FileTransport({
      dir: tmpDir,
      asyncBuffer: true,
      bufferSize: 1000,
      flushIntervalMs: 60_000,
    });

    for (let i = 0; i < 5; i++) {
      transport.write(makeEntry(`msg-${i}`));
    }

    await transport.close();

    const today = new Date().toISOString().substring(0, 10);
    const content = fs.readFileSync(path.join(tmpDir, `${today}.log`), 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines).toHaveLength(5);
  });
});
