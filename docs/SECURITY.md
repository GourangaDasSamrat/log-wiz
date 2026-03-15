# Security Policy

## Supported Versions

| Version | Supported |
|---------|:---------:|
| 1.x     | ✅        |

Only the latest minor release of the current major version receives security patches.

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately by one of these methods:

- **GitHub Private Vulnerability Reporting** *(preferred)*
  [github.com/GourangaDasSamrat/log-wiz/security/advisories/new](https://github.com/GourangaDasSamrat/log-wiz/security/advisories/new)

- **Email**
  [gouranga.samrat@gmail.com](mailto:gouranga.samrat@gmail.com)
  Please encrypt sensitive reports using the PGP key linked in the GitHub profile.

### What to include

A useful report contains:

1. A clear description of the vulnerability and its potential impact
2. The affected version(s)
3. Step-by-step reproduction instructions or a minimal proof-of-concept
4. Any suggested fix or mitigation, if you have one

---

## Response Timeline

| Milestone | Target |
|-----------|--------|
| Acknowledgement | Within **48 hours** |
| Initial triage & severity assessment | Within **5 business days** |
| Patch release (critical / high) | Within **14 days** of confirmation |
| Patch release (medium / low) | Within **30 days** of confirmation |
| Public disclosure | After the patch is released and users have had time to upgrade |

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure).
You will be credited in the security advisory unless you prefer to remain anonymous.

---

## Scope

Vulnerabilities that are **in scope**:

- PII masking bypass — a crafted object that escapes the masker and leaks sensitive data to output
- Arbitrary code execution via a malicious log entry or configuration option
- Denial of service caused by the logger itself (e.g. infinite loop, memory leak in the masker or file transport)
- Path traversal in `FileTransport` allowing writes outside the configured `dir`

Vulnerabilities that are **out of scope**:

- Issues in your own application code that happen to use log-wiz
- Vulnerabilities in Node.js itself or in the operating system
- Social engineering attacks
- Theoretical vulnerabilities with no realistic attack vector

---

## Security Design Notes

log-wiz is designed with security as a first-class concern:

- **Zero runtime dependencies** — no third-party code executes at runtime, eliminating supply-chain risk from transitive dependencies.
- **PII masking by default** — sensitive keys (`password`, `token`, `secret`, `authorization`, `cookie`, `card_number`, and more) are redacted before any output is written.
- **Immutable log entries** — `LogEntry` objects are assembled once and never mutated, preventing post-assembly tampering.
- **Circular reference safety** — the masker uses a `WeakSet` to prevent stack-overflow attacks via crafted circular objects.
- **No `eval`, no dynamic code execution** — the entire codebase uses only static imports and standard TypeScript.
- **`sideEffects: false`** — bundlers can safely tree-shake unused code, reducing the attack surface in browser bundles.

---

## Dependency Audit

Because log-wiz has **zero runtime dependencies**, `npm audit` findings are
limited to development tooling (TypeScript, Jest, ESLint). These tools are
never included in published builds and pose no runtime risk to consumers.

To verify:

```bash
npm audit --omit=dev
# Should report: found 0 vulnerabilities
```
