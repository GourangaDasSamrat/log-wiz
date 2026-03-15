# PII & Sensitive Data Masking

log-wiz automatically masks sensitive values in every metadata object before
writing to any transport. No configuration is required for the built-in defaults.

---

## How It Works

```
wiz.info('event', { meta: { password: 'secret', userId: 42 } })
                                    │
                                    ▼
                     maskSensitiveData(meta, maskedKeys)
                                    │
                    ┌───────────────┴───────────────────┐
                    │  Deep clone — original NEVER mutated│
                    │                                    │
                    │  for each key (recursive):         │
                    │    normalise → lowercase, strip -_  │
                    │    if in maskedKeys → '[MASKED]'   │
                    │    else → recurse into value       │
                    │                                    │
                    │  WeakSet tracks visited objects    │
                    │  → circular refs become '[Circular]'│
                    └────────────────────────────────────┘
                                    │
                                    ▼
                    { password: '[MASKED]', userId: 42 }
```

---

## Default Masked Keys

The following keys are masked out of the box. Matching is **case-insensitive**
and ignores `-`, `_`, and whitespace separators.

| Key | Also matches |
|-----|-------------|
| `password` | `Password`, `PASSWORD` |
| `passwd` | `Passwd` |
| `token` | `Token`, `TOKEN` |
| `accesstoken` | `accessToken`, `access_token`, `access-token` |
| `refreshtoken` | `refreshToken`, `refresh_token` |
| `secret` | `Secret`, `SECRET` |
| `authorization` | `Authorization`, `AUTHORIZATION` |
| `cookie` | `Cookie` |
| `card_number` | `cardNumber`, `card-number`, `CardNumber` |
| `cardnumber` | — |
| `cvv` | `CVV` |
| `ssn` | `SSN` |
| `apikey` | `apiKey`, `api_key`, `api-key`, `API_KEY` |
| `api_key` | — |
| `privatekey` | `privateKey`, `private_key`, `private-key` |
| `private_key` | — |

---

## Nested & Array Masking

Masking is fully recursive — it descends into nested objects and arrays:

```typescript
wiz.info('checkout', {
  meta: {
    user: {
      name: 'Alice',
      payment: {
        card_number: '4111-1111-1111-1111', // → [MASKED]
        cvv: '123',                          // → [MASKED]
        expiry: '12/26',                     // visible
      },
    },
    items: [
      { sku: 'ABC', secret: 'x' }, // secret → [MASKED]
      { sku: 'DEF', price: 9.99 }, // visible
    ],
  },
});
```

---

## Circular Reference Safety

log-wiz uses a `WeakSet` to track visited objects and safely handles circular
references without throwing `RangeError: Maximum call stack size exceeded`:

```typescript
const req: Record<string, unknown> = { id: 'r-1', method: 'POST' };
req['self'] = req; // circular!

wiz.info('request', { meta: req });
// Output: { id: 'r-1', method: 'POST', self: '[Circular]' }
// Never throws, never hangs
```

---

## Adding Custom Masked Keys

Extra keys are **merged with** the built-in defaults:

```typescript
import { Wiz } from '@gouranga_samrat/log-wiz';

const logger = new Wiz({
  maskedKeys: ['nationalId', 'medicalRecordNumber', 'driverLicense'],
});

logger.info('patient', {
  meta: {
    name: 'Jane Doe',          // visible
    nationalId: '123-45-6789', // → [MASKED]
    token: 'abc',              // → [MASKED]  (built-in default still active)
  },
});
```

---

## Replacing Default Masked Keys

Set `replaceDefaultMaskedKeys: true` to **only** mask the keys you specify:

```typescript
const logger = new Wiz({
  maskedKeys: ['internalRef'],
  replaceDefaultMaskedKeys: true,
});

logger.info('audit', {
  meta: {
    internalRef: 'REF-999', // → [MASKED]
    token: 'still-visible', // visible — defaults were replaced
    action: 'EXPORT',       // visible
  },
});
```

---

## Runtime Key Update

Masked keys can be updated at runtime via `setConfig()`:

```typescript
logger.setConfig({ maskedKeys: ['newSecret', 'anotherField'] });
// Merges with defaults unless replaceDefaultMaskedKeys was already true
```

---

## What Is and Is Not Masked

```typescript
wiz.info('example', {
  meta: {
    // ✅ Visible — not in the masked-key list
    userId:    42,
    email:     'user@example.com',
    action:    'LOGIN',
    timestamp: '2024-05-15T14:32:01Z',

    // 🔴 Masked — default keys
    password:      'hunter2',     // → [MASKED]
    token:         'eyJhbGci…',   // → [MASKED]
    authorization: 'Bearer …',    // → [MASKED]
    cookie:        'sid=abc',     // → [MASKED]
    card_number:   '4111…',       // → [MASKED]

    // 🔴 Masked — nested
    session: {
      refreshToken: 'rt-xyz',     // → [MASKED]
      expiresAt: '2024-12-31',    // ✅ visible
    },
  },
});
```

---

## Performance Notes

- Masking runs a **deep clone** — the original metadata object is never mutated.
- In `level: 'none'` (no-op mode), masking is **never executed** — the method
  returns before reaching the masking step.
- The `WeakSet` is allocated once per top-level `maskSensitiveData` call and
  garbage-collected immediately after — no global state.
