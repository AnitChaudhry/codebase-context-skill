# Graph Analysis — Your Vault as a Queryable Database

Your wiki-linked vault is not just a folder of markdown files. It is a graph database:

- **Nodes** are markdown files (your notes)
- **Edges** are wiki links (`[[connections]]` between notes)
- **Properties** are YAML frontmatter fields (structured metadata on every node)
- **Query engine** is ripgrep (`rg`) operating over structured text

## Three Query Levels

### Level 1: Field-Level Queries (Property Inspection)

Query individual YAML fields across notes:

```bash
# Find all notes of a specific type
rg '^type: pattern' notes/

# Scan descriptions for a concept
rg '^description:.*friction' notes/

# Find notes missing required fields
rg -L '^description:' notes/*.md

# Find notes by topic map
rg '^topics:.*\[\[methodology\]\]' notes/

# Cross-field queries
rg -l '^type: tension' notes/ | xargs rg '^status: pending'
```

### Level 2: Node-Level Queries (Neighborhood Inspection)

Query a specific note's relationships — what it links to, what links to it:

```bash
# Find all outgoing links from a note
./ops/scripts/graph/extract-links.sh "note title"

# Find all incoming links (backlinks) to a note
./ops/scripts/backlinks.sh "note title"

# Count connections
./ops/scripts/backlinks.sh "note title" --count
```

### Level 3: Graph-Level Queries (Structural Analysis)

Query the graph's topology — clusters, bridges, synthesis opportunities:

```bash
# Find synthesis opportunities (open triangles)
./ops/scripts/graph/find-triangles.sh

# Detect isolated clusters
./ops/scripts/graph/find-clusters.sh

# Find structurally critical notes
./ops/scripts/graph/find-bridges.sh

# Measure overall graph health
./ops/scripts/link-density.sh
```

## Available Graph Operations

### Traversal Operations

| Operation | Script | What It Does |
|-----------|--------|-------------|
| Forward N-hop | `graph/n-hop-forward.sh "note" [depth]` | Find everything reachable within N links |
| Backward N-hop | `graph/recursive-backlinks.sh "note" [depth]` | Find everything that leads TO a note |
| Link extraction | `graph/extract-links.sh "note"` | List all wiki links in a specific note |

### Synthesis Operations

| Operation | Script | What It Does |
|-----------|--------|-------------|
| Triangle detection | `graph/find-triangles.sh` | Find open triadic closures — synthesis opportunities |
| Topic siblings | `graph/topic-siblings.sh "topic map"` | Find notes in same topic that don't link to each other |

### Structural Operations

| Operation | Script | What It Does |
|-----------|--------|-------------|
| Cluster detection | `graph/find-clusters.sh` | Find connected components — isolated knowledge islands |
| Bridge detection | `graph/find-bridges.sh` | Find bridge notes whose removal would disconnect the graph |

### Density Operations

| Operation | Script | What It Does |
|-----------|--------|-------------|
| Link density | `link-density.sh` | Average outgoing links per note. Target: 3+ |
| Orphan detection | `orphan-notes.sh` | Notes with zero incoming links |
| Dangling links | `dangling-links.sh` | Wiki links pointing to notes that don't exist |

### Centrality Operations

| Operation | Script | What It Does |
|-----------|--------|-------------|
| Hub/authority ranking | `graph/influence-flow.sh` | Ranks notes by link patterns (hubs, authorities, synthesizers) |

## When to Use Each Operation Type

| Situation | Operation | Why |
|-----------|-----------|-----|
| Just created new notes | Triangle detection + topic siblings | Find connections you missed |
| Graph feels disconnected | Cluster detection + bridge analysis | Understand structure |
| Preparing for synthesis | Forward N-hop from key notes | Map the neighborhood |
| Health check | Orphan detection + dangling links + density | Standard diagnostic |
| Prioritizing maintenance | Influence flow + bridge detection | Focus on important notes first |

## Limitations

Graph analysis scripts find structural patterns — they cannot assess whether a connection is intellectually warranted. Use structural analysis to find candidates, then apply judgment to evaluate them.
