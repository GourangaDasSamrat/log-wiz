import { getTimestamp, formatTimestampPretty } from '../../src/utils/timestamp';

describe('getTimestamp', () => {
  it('returns a valid ISO-8601 string', () => {
    const ts = getTimestamp();
    expect(() => new Date(ts)).not.toThrow();
    expect(new Date(ts).toISOString()).toBe(ts);
  });
});

describe('formatTimestampPretty', () => {
  it('formats ISO string to human-readable form without T or Z', () => {
    const iso = '2024-05-15T14:32:01.123Z';
    const pretty = formatTimestampPretty(iso);
    expect(pretty).toBe('2024-05-15 14:32:01.123');
    expect(pretty).not.toContain('T');
    expect(pretty).not.toContain('Z');
  });
});
