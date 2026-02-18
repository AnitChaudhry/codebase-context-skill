# Self-Evolution — How This System Grows

This system is not static. It evolves based on your actual experience using it. The principle: complexity arrives at pain points, not before.

## Friction-Driven Module Adoption

Every feature in this system is a module you can toggle. The pattern:
1. Work with your current setup
2. Notice friction — something repeatedly takes too long, breaks, or gets forgotten
3. Capture the friction signal
4. Identify which module addresses that friction
5. Activate it and adapt it to your domain
6. Monitor — did the friction decrease?

**What NOT to do:** Activate everything at once. Each module adds cognitive overhead.

## Methodology Folder

Your system maintains its own self-knowledge as linked notes in `ops/methodology/`:
- **Derivation rationale** — Why each configuration choice was made
- **Friction captures** — Observations from sessions and automatic mining
- **Configuration state** — Active features, thresholds, processing preferences

## Rule Zero: Methodology as Canonical Specification

ops/methodology/ is the source of truth for system behavior:
- Changes to system behavior update methodology FIRST
- Drift between methodology and actual behavior is automatically detected
- Drift observations feed back into the standard learning loop

## The Seed-Evolve-Reseed Lifecycle

1. **Seed** — Start with a minimal system (atomic notes, topic maps, wiki links, inbox, basic schema)
2. **Evolve** — Adapt based on experience. Add modules, adjust schemas, split topic maps.
3. **Reseed** — Reassess when accumulated complexity warrants it. Ask: "If I started fresh today, what would I keep?"

## Observation Capture Protocol

**Where:** `ops/observations/`

**What to capture:**
- Friction experienced (what was hard, slow, or confusing)
- Surprises (what worked better or worse than expected)
- Process gaps (steps that should exist but don't)
- Methodology insights (why something works the way it does)

**Format:** Each observation is an atomic note:
```markdown
---
description: What happened and what it suggests
category: friction | surprise | process-gap | methodology
status: pending
observed: YYYY-MM-DD
---
# the observation as a sentence

What happened, why it matters, and what might change.
```

## Operational Learning Loop

Two types of signals during normal operation:

**Observations** — friction, surprises, process gaps, methodology insights. Go to `ops/observations/`.

**Tensions** — contradictions between notes, conflicting methodology claims. Go to `ops/tensions/`.

Both accumulate over time. Thresholds trigger review:
- **10+ pending observations** — suggest review
- **5+ pending tensions** — suggest review

## Tension Capture Protocol

**Where:** `ops/tensions/`

```markdown
---
description: What conflicts and why it matters
status: pending | resolved | dissolved
observed: YYYY-MM-DD
involves: ["[[note A]]", "[[note B]]"]
---
# the tension as a sentence

What conflicts, why both sides seem valid, and what resolution might look like.
```

## Complexity Curve Monitoring

**Signs of healthy complexity:**
- Every active module addresses a real friction point
- You can explain why each feature exists in one sentence
- Maintenance doesn't take more than 10% of your work time

**Signs of unhealthy complexity:**
- Modules you activated but never use
- Templates with fields you never fill in
- You spend more time organizing than thinking

**The intervention:** List every active feature. For each: when did you last use it? Deactivate anything that hasn't earned its place.

## Configuration Changelog

Track what changed and why in `ops/changelog.md`:
```markdown
## YYYY-MM-DD: Brief description

**Changed:** What was modified
**Reason:** What friction triggered this
**Outcome:** What improved (fill in after living with the change)
```
