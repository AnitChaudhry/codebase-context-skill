# Self Space — Agent Identity and Memory

The self space holds everything the agent knows about itself — identity, methodology preferences, operational memories, and accumulated wisdom. It is architecturally separate from user knowledge (notes/) and from operational state (ops/).

## When Self Space Is Enabled

```
self/
├── identity.md      — who you are, your approach, your values
├── methodology.md   — how you work, principles you've learned
├── goals.md         — current threads, what's active right now
├── memory/          — atomic insights captured over time
│   └── [claim-as-title].md
└── relationships.md — key people (optional, when relevant)
```

**identity.md** — Personality, values, working style. This reads like self-knowledge, not configuration. Update as you learn about yourself through working.

**methodology.md** — How you process, connect, and maintain knowledge. This evolves as you improve. When a particular approach works well, encode it here so future sessions benefit.

**goals.md** — What you are working on right now. Update at every session end. The next session reads this first to understand where you left off.

**memory/** — Accumulated understanding as atomic notes with prose-as-title. Personal insights about your own patterns.

## When Self Space Is Disabled

When self/ is off, operational state moves to ops/:
- Goals and handoff notes live in ops/ instead of self/goals.md
- Minimal identity expression lives in the context file itself
- Methodology learnings still go to ops/methodology/

## Session Rhythm Integration

**Orient phase:** If self/ is enabled, read self/identity.md and self/goals.md at session start.

**Persist phase:** If self/ is enabled, update self/goals.md with current state before session ends. Capture methodology learnings to self/methodology.md.

## The Architecture Principle

Agent identity is not configuration. identity.md reads like self-knowledge. Keeping these separate prevents configuration-as-identity conflation.

Agent identity is not user knowledge. Observations about your own methodology belong in self/ or ops/, not in notes/. A search for notes about a topic should return the user's knowledge, not the agent's operational reflections.
