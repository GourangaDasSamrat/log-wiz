/**
 * @file src/utils/error-parser.ts
 * @description Parses JavaScript Error objects into structured, readable stack frames.
 */

import type { ParsedError, StackFrame } from '../types/index.js';

const STACK_FRAME_RE =
  /^\s*at\s+(?:(.+?)\s+\((.+?):(\d+):(\d+)\)|(.+?):(\d+):(\d+))\s*$/;

function parseFrame(raw: string): StackFrame {
  const match = STACK_FRAME_RE.exec(raw);
  if (!match) return { raw: raw.trim() };

  const [, namedFn, namedFile, namedLine, namedCol, anonFile, anonLine, anonCol] = match;

  if (namedFn !== undefined) {
    const frame: StackFrame = { raw: raw.trim(), function: namedFn.trim(), file: namedFile };
    if (namedLine !== undefined) (frame as { line?: number }).line = parseInt(namedLine, 10);
    if (namedCol !== undefined) (frame as { column?: number }).column = parseInt(namedCol, 10);
    return frame;
  }

  const frame: StackFrame = { raw: raw.trim(), file: anonFile };
  if (anonLine !== undefined) (frame as { line?: number }).line = parseInt(anonLine, 10);
  if (anonCol !== undefined) (frame as { column?: number }).column = parseInt(anonCol, 10);
  return frame;
}

export function parseError(err: Error): ParsedError {
  const frames: StackFrame[] = [];

  if (err.stack) {
    const lines = err.stack.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line !== undefined && line.trim().startsWith('at ')) {
        frames.push(parseFrame(line));
      }
    }
  }

  return {
    name: err.name ?? 'Error',
    message: err.message ?? String(err),
    ...(frames.length > 0 && { stack: frames }),
  };
}
