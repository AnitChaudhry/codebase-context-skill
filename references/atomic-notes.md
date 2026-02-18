# Atomic Notes — One Insight Per File

Each note captures exactly one insight, titled as a prose proposition. This is the foundational design constraint that makes everything else work: wiki links compose because each node is a single idea. Topic maps navigate because each entry is one claim.

## The Prose-as-Title Pattern

Title your notes as complete thoughts that work in sentences. The title IS the concept.

Good titles (specific claims that work as prose when linked):
- "context degrades as sessions run long"
- "fresh context per phase prevents quality rot"
- "three parallel reads beat six sequential ones"

Bad titles (topic labels, not claims):
- "session management" (what about it?)
- "context" (too vague to link meaningfully)
- "file reading" (a filing label, not an idea)

**The claim test:** Can you complete this sentence?
> This note argues that [title]

## The Composability Test

Three checks before saving any note:

1. **Standalone sense** — Does the note make sense without reading three other notes first?

2. **Specificity** — Could someone disagree with this? If not, it is too vague.

3. **Clean linking** — Would linking to this note drag unrelated content along?

## When to Split

Split a note when:
- It makes multiple distinct claims
- Linking to one part would drag unrelated content from another part
- The title is too vague because the note tries to cover too much ground

## Title Rules

- Lowercase with spaces
- No punctuation that breaks filesystems: . * ? + [ ] ( ) { } | \ ^
- Use proper grammar
- Express the concept fully — there is no character limit
- Each title must be unique across the entire workspace
- Composability over brevity — a full sentence is fine if it captures the idea precisely

## YAML Schema

Every note has structured metadata in YAML frontmatter:

```yaml
---
description: One sentence adding context beyond the title (~150 chars)
---
```

The `description` field is required. It must add NEW information beyond the title.

Bad (restates the title):
- Title: `context degrades as sessions run long`
- Description: Sessions get worse as they grow longer

Good (adds scope and mechanism):
- Title: `context degrades as sessions run long`
- Description: The degradation is non-linear — the first 40% is "smart zone," and quality drops sharply beyond that threshold, not gradually

Optional fields:
```yaml
type: insight | pattern | preference | fact | decision | question
status: preliminary | active | archived
created: YYYY-MM-DD
```

## Inline Link Patterns

Note titles work as prose when linked. Use them AS arguments:

Good:
- "Since [[context degrades as sessions run long]], split complex tasks across sessions"
- "The insight is that [[fresh context per phase prevents quality rot]]"

Bad:
- "See [[context degrades as sessions run long]] for more"
- "This relates to [[fresh context per phase prevents quality rot]]"

If you catch yourself writing "this relates to" or "see also," stop and restructure so the claim does the work.
