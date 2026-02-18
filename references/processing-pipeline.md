# Processing Pipeline

**Depth over breadth. Quality over speed. Tokens are free.**

Every piece of content follows the same path: capture, then process, then connect, then verify. Each phase has a distinct purpose. Mixing them degrades both.

## The Four-Phase Skeleton

### Phase 1: Capture

Zero friction. Everything enters through inbox/. Speed of capture beats precision of filing. Your role here is passive: accept whatever arrives, no structuring at capture time.

Process happens later, in fresh context with full attention. Capture and process are temporally separated because context is freshest at capture but quality requires focused attention.

Capture everything. Process later.

### Phase 2: Process

This is where value is created. Raw content becomes structured notes through active transformation.

Read the source material through the mission lens: "Does this serve the knowledge domain?" Every extractable insight gets pulled out:

| Category | What to Find | Output |
|----------|--------------|--------|
| Core claims | Direct assertions about the domain | note |
| Patterns | Recurring structures across sources | note |
| Tensions | Contradictions or conflicts | Tension note |
| Enrichments | Content that improves existing notes | Enrichment task |
| Anti-patterns | What breaks, what to avoid | Problem note |

**The selectivity gate:** Not everything extracts. You must judge: does this add genuine insight, or is it noise? When in doubt, extract — it is easier to merge duplicates than recover missed insights.

**Quality bar for extracted notes:**
- Title works as prose when linked: `since [[note title]]` reads naturally
- Description adds information beyond the title
- Claim is specific enough to disagree with
- Reasoning is visible — shows the path to the conclusion

### Phase 3: Connect

After processing creates new notes, connection finding integrates them into the existing knowledge graph.

**Forward connections:** What existing notes relate to this new one? Search semantically (not just keyword) because connections often exist between notes that use different vocabulary for the same concept.

**Backward connections:** What older notes need updating now that this new one exists? A note written last week was written with last week's understanding. If today's note extends, challenges, or provides evidence for the older one, update the older one.

**Topic map updates:** Every new note belongs in at least one topic map. Add it with a context phrase explaining WHY it belongs — bare links without context are useless for navigation.

**Connection quality standard:** Not just "related to" but "extends X by adding Y" or "contradicts X because Z." Every connection must articulate the relationship.

### Phase 4: Verify

Three checks in one phase:

1. **Description quality (cold-read test)** — Read ONLY the title and description. Without reading the body, predict what the note contains. Then read the body. If your prediction missed major content, the description needs improvement.

2. **Schema compliance** — All required fields present, enum values valid, topic links exist, no unknown fields.

3. **Health check** — No broken wiki links (every `[[target]]` resolves to an existing file), no orphaned notes (every note appears in at least one topic map), link density within healthy range (2+ outgoing links per note).

## Inbox Processing

Everything enters through inbox/. Do not think about structure at capture time — just get it in.

**What goes to inbox:**
- URLs with a brief note about why they matter
- Quick ideas and observations
- Sources (PDFs, articles, research results)
- Anything where destination is unclear

**Processing inbox items:** Read the inbox item, extract insights worth keeping, create atomic notes in notes/, link new notes to relevant topic maps, then move or delete the inbox item.

## Processing Principles

- **Fresh context per phase** — Do not chain all phases in one session. Each phase benefits from focused attention.
- **Quality over speed** — One well-connected note is worth more than ten orphaned ones. The graph compounds quality, not quantity.
- **The generation effect** — Moving information is not processing. You must TRANSFORM it: generate descriptions, find connections, create synthesis.
- **Skills encode methodology** — If a skill exists for a processing step, use it. Do not manually replicate the workflow.

## Task Queue

The task queue tracks every note being processed through the pipeline. It lives at `ops/queue/queue.json`:

```json
{
  "tasks": [
    {
      "id": "source-name-001",
      "type": "claim",
      "status": "pending",
      "target": "note title here",
      "batch": "source-name",
      "created": "2026-02-13T10:00:00Z",
      "current_phase": "connect",
      "completed_phases": ["process", "create"]
    }
  ]
}
```

**Task types:**

| Type | Purpose | Phase Sequence |
|------|---------|---------------|
| extract | Extract notes from source | (single phase) |
| claim | Process a new note through all phases | create -> connect -> maintain -> verify |
| enrichment | Enrich an existing note then process | enrich -> connect -> maintain -> verify |

## Processing Depth Configuration

Not every source deserves the same attention.

| Level | Behavior | Use When |
|-------|----------|----------|
| Deep | Full pipeline, fresh context per phase | Important sources, research, initial building |
| Standard | Full pipeline, balanced attention | Regular processing (default) |
| Quick | Compressed pipeline, combine connect+verify | High volume catch-up, minor sources |

## Quality Gates Summary

| Phase | Gate | Failure Action |
|-------|------|---------------|
| Process | Selectivity — is this worth extracting? | Skip with logged reason |
| Process | Composability — does the title work as prose? | Rewrite title |
| Process | Description adds new info beyond title? | Rewrite description |
| Connect | Genuine relationship — can you say WHY? | Do not force the connection |
| Connect | Topic map updated | Add note to relevant topic maps |
| Verify | Description predicts content (cold-read test) | Improve description |
| Verify | Schema valid | Fix schema violations |
| Verify | No broken links | Fix or remove broken links |

## Session Discipline

Each session focuses on ONE task. Discoveries become future tasks, not immediate tangents.

Your attention degrades as context fills. The first ~40% of context is the "smart zone." Beyond that, context rot sets in. Structure each task so critical information lands early.
