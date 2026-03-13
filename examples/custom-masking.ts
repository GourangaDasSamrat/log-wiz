/**
 * @file examples/custom-masking.ts
 * @description Custom PII masking beyond the built-in defaults.
 * Run: npx ts-node examples/custom-masking.ts
 */
import { Wiz } from '../src/index.js';

// ── Add extra keys on top of the built-in defaults ────────────────────────────
const logger = new Wiz({
  level: 'debug',
  file: false,
  maskedKeys: ['nationalId', 'driverLicense', 'medicalRecordNumber'],
});

logger.info('Patient record accessed', {
  meta: {
    patientName: 'Jane Doe',
    nationalId: '123-45-6789',         // → [MASKED]
    medicalRecordNumber: 'MRN-00042',  // → [MASKED]
    diagnosis: 'common cold',          // visible
    // Built-in defaults still active:
    token: 'session-token-abc',        // → [MASKED]
  },
});

// ── Replace defaults entirely ─────────────────────────────────────────────────
const strictLogger = new Wiz({
  level: 'debug',
  file: false,
  maskedKeys: ['internalRef'],
  replaceDefaultMaskedKeys: true, // only 'internalRef' is masked
});

strictLogger.info('Audit event', {
  meta: {
    internalRef: 'REF-999',  // → [MASKED]
    token: 'still-visible',  // NOT masked — defaults replaced
    action: 'EXPORT',
  },
});
