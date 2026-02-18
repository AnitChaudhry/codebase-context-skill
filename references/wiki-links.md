# Wiki-Links — Your Knowledge Graph

Notes connect via `[[wiki links]]`. Each link is an edge in your knowledge graph. Wiki links are the INVARIANT reference form — every internal reference uses wiki link syntax, never bare file paths.

## How Links Work

- `[[note title]]` links to the note with that filename
- Links resolve by filename, not path — every filename must be unique across the workspace
- Links work as prose: "Since [[context degrades as sessions run long]], split complex tasks"
- Wiki links are bidirectionally discoverable — search for a title in double brackets to find all references

## The Link Philosophy

Links are not citations. They are propositional connections — each link carries semantic weight because the surrounding prose explains the relationship.

When you write `because [[the first 40% of context is the smart zone]], load critical information early`, you are making an argument. The link is part of the reasoning chain.

## Inline vs Footer Links

**Inline links** are woven into prose — richer because the sentence explains the connection.

**Footer links** appear at the bottom of the note:

```markdown
---

Relevant Notes:
- [[related note]] — extends this by adding the temporal dimension
- [[another note]] — provides the evidence this builds on

Topics:
- [[methodology]]
```

**Prefer inline links.** Every footer link should still have a context phrase.

## Propositional Semantics

Every connection must articulate the relationship. Not "are these related?" but "HOW are these related?"

Standard relationship types:
- **extends** — builds on an idea by adding a new dimension
- **foundation** — provides the evidence or reasoning this depends on
- **contradicts** — conflicts with this claim
- **enables** — makes this possible or practical
- **example** — illustrates or demonstrates this concept in practice

Bad: `[[note]] — related`
Good: `[[note]] — extends this by adding the temporal dimension`

## Dangling Link Policy

Every `[[link]]` must point to a real file:
- **Before creating a link:** Verify the target exists
- **If the target should exist but does not:** Create it, then link
- **During health checks:** Dangling links are flagged as high-priority issues

## Filename Uniqueness

Every filename must be unique across the entire workspace. Wiki links resolve by name, not path. Use claim-as-title pattern — natural language titles are inherently unique because they express specific ideas.
