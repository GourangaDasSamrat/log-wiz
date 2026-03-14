/**
 * @file tests/unit/file-transport-unit.test.ts
 * @description Unit-level tests for FileTransport edge cases.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { FileTransport } from '../../src/transports/file';
import type { LogEntry } from '../../src/types';

function makeEntry(msg = 'hello'): LogEntry {
  return { timestamp: new Date().toISOString(), level: 'info', env: 'node', message: msg };
}

describe('FileTransport – sync (asyncBuffer: false)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-wiz-sync-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes immediately without buffering', async () => {
    const transport = new FileTransport({ dir: tmpDir, asyncBuffer: false });
    transport.write(makeEntry('sync-write'));
    // No close needed — stream is synchronous
    await transport.close();

    const today = new Date().toISOString().substring(0, 10);
    const content = fs.readFileSync(path.join(tmpDir, `${today}.log`), 'utf8');
    expect(content).toContain('sync-write');
  });

  it('multiple writes produce multiple lines', async () => {
    const transport = new FileTransport({ dir: tmpDir, asyncBuffer: false });
    for (let i = 0; i < 5; i++) transport.write(makeEntry(`line-${i}`));
    await transport.close();

    const today = new Date().toISOString().substring(0, 10);
    const lines = fs
      .readFileSync(path.join(tmpDir, `${today}.log`), 'utf8')
      .trim().split('\n').filter(Boolean);
    expect(lines).toHaveLength(5);
  });
});

describe('FileTransport – flush() drains async buffer', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-wiz-flush-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('flush() persists buffered entries to disk', async () => {
    const transport = new FileTransport({
      dir: tmpDir,
      asyncBuffer: true,
      bufferSize: 1000,
      flushIntervalMs: 60_000,
    });

    transport.write(makeEntry('buffered-1'));
    transport.write(makeEntry('buffered-2'));
    transport.flush(); // force drain before close

    await transport.close();

    const today = new Date().toISOString().substring(0, 10);
    const content = fs.readFileSync(path.join(tmpDir, `${today}.log`), 'utf8');
    expect(content).toContain('buffered-1');
    expect(content).toContain('buffered-2');
  });
});

describe('FileTransport – bufferSize auto-flush', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-wiz-autobuf-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('auto-flushes when buffer reaches bufferSize', async () => {
    const transport = new FileTransport({
      dir: tmpDir,
      asyncBuffer: true,
      bufferSize: 3,
      flushIntervalMs: 60_000,
    });

    transport.write(makeEntry('a'));
    transport.write(makeEntry('b'));
    transport.write(makeEntry('c')); // triggers auto-flush at count === bufferSize

    await transport.close();

    const today = new Date().toISOString().substring(0, 10);
    const content = fs.readFileSync(path.join(tmpDir, `${today}.log`), 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });
});

describe('FileTransport – creates nested directories', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-wiz-nested-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates deeply nested log directory', async () => {
    const logDir = path.join(tmpDir, 'a', 'b', 'c');
    const transport = new FileTransport({ dir: logDir, asyncBuffer: false });
    transport.write(makeEntry('nested'));
    await transport.close();
    expect(fs.existsSync(logDir)).toBe(true);
  });
});
