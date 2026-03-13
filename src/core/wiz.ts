/**
 * @file src/core/wiz.ts
 * @description Core Wiz logger class — the heart of log-wiz.
 */

import type {
  IWiz,
  WizConfig,
  LogLevel,
  LogEntry,
  LogCallOptions,
  Transport,
} from '../types/index.js';
import { LOG_LEVEL_SEVERITY } from '../types/index.js';
import { maskSensitiveData, buildMaskedKeySet } from '../utils/masker.js';
import { parseError } from '../utils/error-parser.js';
import { getTimestamp } from '../utils/timestamp.js';
import { detectEnv, isProduction } from '../utils/env.js';
import { ConsolePrettyTransport } from '../transports/console-pretty.js';
import { ConsoleJsonTransport } from '../transports/console-json.js';
import { ConsoleBrowserTransport } from '../transports/console-browser.js';

const DEFAULT_CONFIG: Required<
  Pick<WizConfig, 'level' | 'maskedKeys' | 'replaceDefaultMaskedKeys' | 'omitTimestamp'>
> = {
  level: 'info',
  maskedKeys: [],
  replaceDefaultMaskedKeys: false,
  omitTimestamp: false,
};

export class Wiz implements IWiz {
  private config: WizConfig;
  private transports: Transport[];
  private maskedKeys: ReadonlySet<string>;
  private readonly env: 'node' | 'browser';

  constructor(config: WizConfig = {}) {
    this.env = detectEnv();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.maskedKeys = buildMaskedKeySet(
      this.config.maskedKeys as string[] | undefined,
      this.config.replaceDefaultMaskedKeys,
    );
    this.transports = this.buildTransports();
  }

  trace(message: string, options?: LogCallOptions): void {
    this.log('trace', message, options);
  }

  debug(message: string, options?: LogCallOptions): void {
    this.log('debug', message, options);
  }

  info(message: string, options?: LogCallOptions): void {
    this.log('info', message, options);
  }

  warn(message: string, options?: LogCallOptions): void {
    this.log('warn', message, options);
  }

  error(message: string, options?: LogCallOptions): void {
    this.log('error', message, options);
  }

  fatal(message: string, options?: LogCallOptions): void {
    this.log('fatal', message, options);
  }

  setConfig(updates: Partial<WizConfig>): void {
    this.config = { ...this.config, ...updates };
    this.maskedKeys = buildMaskedKeySet(
      this.config.maskedKeys as string[] | undefined,
      this.config.replaceDefaultMaskedKeys,
    );
    if ('format' in updates || 'file' in updates) {
      this.transports = this.buildTransports();
    }
  }

  flush(): void {
    for (const t of this.transports) t.flush?.();
  }

  async close(): Promise<void> {
    await Promise.all(this.transports.map((t) => t.close?.()));
  }

  private log(
    level: Exclude<LogLevel, 'none'>,
    message: string,
    options: LogCallOptions = {},
  ): void {
    if (this.config.level === 'none') return;

    const configSeverity = LOG_LEVEL_SEVERITY[this.config.level ?? 'info'];
    if (LOG_LEVEL_SEVERITY[level] < configSeverity) return;

    const rawMeta = options.meta ?? {};
    const maskedMeta = maskSensitiveData(rawMeta, this.maskedKeys) as Record<string, unknown>;
    const parsedErr = options.error ? parseError(options.error) : undefined;
    const correlationId = options.correlationId ?? this.config.correlationId;

    const entry: LogEntry = {
      timestamp: this.config.omitTimestamp ? '' : getTimestamp(),
      level,
      env: this.env,
      message,
      ...(this.config.scope !== undefined && { scope: this.config.scope }),
      ...(correlationId !== undefined && { correlationId }),
      ...(Object.keys(maskedMeta).length > 0 && { meta: maskedMeta }),
      ...(parsedErr !== undefined && { error: parsedErr }),
    };

    for (const transport of this.transports) {
      transport.write(entry);
    }
  }

  private buildTransports(): Transport[] {
    const result: Transport[] = [];
    const format = this.resolveFormat();

    switch (format) {
      case 'browser':
        result.push(new ConsoleBrowserTransport());
        break;
      case 'json':
        result.push(new ConsoleJsonTransport());
        break;
      case 'pretty':
      default:
        result.push(new ConsolePrettyTransport());
        break;
    }

    if (this.env === 'node' && this.config.file !== false) {
      this.attachFileTransport(this.config.file ?? {});
    }

    return result;
  }

  private resolveFormat(): 'pretty' | 'json' | 'browser' {
    if (this.config.format) return this.config.format;
    if (this.env === 'browser') return 'browser';
    if (isProduction()) return 'json';
    return 'pretty';
  }

  private attachFileTransport(options: NonNullable<WizConfig['file']>): void {
    import('../transports/file.js')
      .then(({ FileTransport }) => {
        this.transports.push(new FileTransport(options as object));
      })
      .catch(() => {
        // Silently skip when fs is unavailable (browser bundlers)
      });
  }
}
