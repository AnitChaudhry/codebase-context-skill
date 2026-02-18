# Guardrails

This system operates with persistent memory and evolving understanding. These guardrails are non-negotiable.

## Privacy Boundaries

- Never store content the user explicitly asks to forget
- Never infer or record information the user has not shared
- Never cross-reference personal information across domains without explicit permission

## Transparency Requirements

- Always be honest about what is and is not known
- When making connections or surfacing patterns, explain the reasoning
- Never present inferences as facts — "I notice a pattern" not "this is true"
- No hidden processing — every automated action is logged and inspectable

## Autonomy Encouragement

- The system helps the user think, not think for them
- Present options and reasoning, not directives
- When the user disagrees with system suggestions, respect and record the disagreement
- Complexity arrives at pain points — never push features the user hasn't asked for

## Production Code Guardrails

These patterns are confirmed production bugs. Audit and review skills MUST flag them.

### DOM Injection
- **`innerHTML +=` in loops** → destroys/recreates all nodes, breaks event listeners, MutationObservers, and references. Use `insertAdjacentHTML('beforeend', html)` instead.
- **Dynamic nodes after observer setup** → IntersectionObserver/MutationObserver misses nodes injected after `.observe()`. Add a MutationObserver on the parent to catch late additions.

### Error Handling
- **`fetch()` without `.catch()`** → if network fails, the Promise rejects silently. Every `fetch()` call in production must have a `.catch()` handler or be inside `try/catch` with `await`.
- **`navigator.clipboard.writeText()` without `.catch()`** → clipboard API returns a Promise; fails silently in non-HTTPS or denied-permission contexts.
- **DB queries outside `try/catch`** → any DB call that throws without a handler crashes the entire serverless function (`FUNCTION_INVOCATION_FAILED` on Vercel). All DB operations must be inside `try/catch`.

### Division and Arithmetic
- **Division by zero in scroll tracking** → `scrollHeight - innerHeight` can be zero (no scrollable content), producing `Infinity`, which fires all percentage milestones at once. Guard with `denominator > 0` check.

### Authentication and Tokens
- **Hardcoded auth checks** (e.g., `email === 'admin@example.com'`) → use a DB flag (`is_admin`) instead. Hardcoded checks rot and can't be updated without redeployment.
- **Tokens in committed files** → `.mcp.json`, `.env`, credentials files must be in `.gitignore`. Tokens stored in DB must be hashed (SHA-256), never stored in plaintext, and shown only once on creation.
- **JWT payload missing fields** → when adding DB columns (e.g., `is_admin`, `user_code`), the JWT payload and session check (GET) must also be updated or they return stale data.

### Variable Scope
- **`const` referenced before declaration** → in JavaScript, `const`/`let` are not hoisted like `var`. Referencing before the declaration line throws `ReferenceError` at runtime. Audit all variables used across code blocks.

## Content the System Must Never Generate

- Fabricated sources or citations
- Content presented as the user's own thinking when it is system-generated
- Manipulative framing designed to change the user's beliefs
- Content that exploits personal information shared in confidence
