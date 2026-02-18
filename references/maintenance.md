# Maintenance — Keeping the Graph Healthy

A knowledge graph degrades without maintenance. Notes written last month don't know about notes written today. Links break when titles change. Topic maps grow stale as topics evolve.

## Health Check Categories

### 1. Orphan Detection
Notes with no incoming links are invisible to traversal:
```bash
rg -l '.' notes/*.md | while read f; do
  title=$(basename "$f" .md)
  rg -q "\[\[$title\]\]" notes/ || echo "Orphan: $f"
done
```
Every orphan is either a gap (needs connections) or stale (needs archiving).

### 2. Dangling Links
Wiki links pointing to non-existent notes:
```bash
rg -o '\[\[([^\]]+)\]\]' notes/ -r '$1' --no-filename | sort -u | while read title; do
  find . -name "$title.md" -not -path "./.git/*" | grep -q . || echo "Dangling: [[$title]]"
done
```

### 3. Schema Validation
```bash
rg -L '^description:' notes/*.md    # missing descriptions
```

### 4. Topic Map Coherence
- Do all listed notes still exist?
- Are there notes on this topic NOT listed in the topic map?
- Has the topic grown large enough to warrant splitting?

### 5. Stale Content
Check modification dates and review oldest notes first.

## Reweaving — The Backward Pass

New notes create connections going forward. But older notes don't automatically know about newer ones. Reweaving is revisiting old notes and asking: "If I wrote this today, what would be different?"

**Reweaving can:**
- Add connections to newer notes that didn't exist when the original was written
- Sharpen a claim that's become clearer with more context
- Split a note that actually contains multiple ideas
- Challenge a claim that new evidence contradicts

## Condition-Based Maintenance

Maintenance triggers are condition-based, not time-based:

| Condition | Threshold | Action When True |
|-----------|-----------|-----------------|
| Orphan notes | Any detected | Surface for connection-finding |
| Dangling links | Any detected | Surface for resolution |
| Topic map size | >40 notes | Suggest sub-topic map split |
| Pending observations | >=10 | Suggest review |
| Pending tensions | >=5 | Suggest review |
| Inbox pressure | Items older than 3 days | Suggest processing |
| Stale pipeline batch | >2 sessions without progress | Surface as blocked |
| Schema violations | Any detected | Surface for correction |

## Session Maintenance Checklist

Before ending a work session:
- [ ] New notes are linked from at least one topic map
- [ ] Wiki links in new notes point to real files
- [ ] Descriptions add information beyond the title
- [ ] Changes are committed

## Consequence-Speed Priority

| Consequence Speed | Priority | Examples |
|-------------------|----------|----------|
| `session` | Highest | Orphan notes, dangling links, inbox pressure |
| `multi_session` | Medium | Pipeline batch completion, stale batches |
| `slow` | Lower | Topic map oversizing, rethink thresholds |

## Invariant-Based Task Creation

The reconciliation checks invariants that together define a healthy system:

| Invariant | What It Checks |
|-----------|---------------|
| Inbox pressure | Are inbox subdirectories accumulating unprocessed material? |
| Orphan notes | Are there notes with no incoming links? |
| Dangling links | Do wiki links point to non-existent notes? |
| Observation accumulation | Have pending observations exceeded the threshold? |
| Tension accumulation | Have pending tensions exceeded the threshold? |
| Topic map size | Has any topic map grown beyond its healthy range? |
| Stale batches | Are there processing batches sitting unfinished? |
| Schema compliance | Do all notes pass schema validation? |
