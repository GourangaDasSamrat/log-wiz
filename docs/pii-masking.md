# PII & Sensitive Data Masking

## How It Works

log-wiz performs **recursive deep masking** on every metadata object before writing.

```
Input meta object
      │
      ▼
┌─────────────────────────────┐
│   maskSensitiveData()       │
│                             │
│  for each key:              │
│    normalise key            │  strip -, _, spaces → lowercase
│    check against maskedKeys │
│    if match → '[MASKED]'   │
│    else → recurse into val  │
│                             │
│  WeakSet tracks seen objs   │  circular reference guard
└─────────────────────────────┘
      │
      ▼
Clean, masked clone (original untouched)
```

## Key Normalisation

Keys are matched **case-insensitively**, ignoring separators:

| Original key | Normalised | Matches? |
|---|---|:---:|
| `password` | `password` | ✅ |
| `Password` | `password` | ✅ |
| `PASSWORD` | `password` | ✅ |
| `api_key` | `apikey` | ✅ |
| `API-KEY` | `apikey` | ✅ |
| `ApiKey` | `apikey` | ✅ |

## Circular Reference Safety

```typescript
const obj: any = { userId: 1 };
obj.self = obj;  // circular!

// log-wiz handles this gracefully:
wiz.info('event', { meta: obj });
// Output: { userId: 1, self: '[Circular]' }
// Never throws RangeError: Maximum call stack size exceeded
```

## Default Masked Keys

```
password    passwd      token       accesstoken  refreshtoken
secret      authorization           cookie
card_number cardnumber  cvv         ssn
apikey      api_key     privatekey  private_key
```

## Customisation

```typescript
// Add extra keys (built-in defaults remain active)
const logger = new Wiz({
  maskedKeys: ['nationalId', 'driverLicense', 'medicalRecordNumber'],
});

// Replace defaults entirely
const strictLogger = new Wiz({
  maskedKeys: ['internalRef'],
  replaceDefaultMaskedKeys: true,
});
```

## What Is and Isn't Masked

```typescript
wiz.info('example', {
  meta: {
    userId: 42,                   // ✅ visible — not a sensitive key
    email: 'user@example.com',    // ✅ visible — not in defaults
    password: 'secret',           // 🔴 → [MASKED]
    nested: {
      token: 'abc',               // 🔴 → [MASKED] (recursive)
      label: 'safe',              // ✅ visible
    },
    items: [
      { secret: 'x', name: 'y' } // 🔴 secret → [MASKED], name visible
    ],
  },
});
```

## Performance Notes

- Deep clone is performed on every log call (only the meta object)
- For no-op mode (`level: 'none'`) masking is **never executed** — returns immediately
- `WeakSet` is allocated per top-level `maskSensitiveData` call, not globally
- The original object is **never mutated**
