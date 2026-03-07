import * as path from 'path';
import { CCSIndex, SearchResult, FileNode } from './types';
import { walkDependencies } from './graph';

// ── Search Engine ───────────────────────────────────────────────────────────
// Searches the .ccs/ index for files relevant to a query.
// No file I/O during search — everything comes from the pre-built index.
// Zero tokens, zero API cost, instant results.

export function searchIndex(query: string, index: CCSIndex): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  const queryTokens = tokenize(queryLower);
  const seen = new Set<string>();

  // 1. Symbol-level exact match (highest priority)
  for (const token of queryTokens) {
    const symbolRefs = index.symbols[token];
    if (symbolRefs) {
      for (const ref of symbolRefs) {
        if (!seen.has(ref.file)) {
          seen.add(ref.file);
          const node = index.files[ref.file];
          if (node) {
            results.push({
              file: ref.file,
              score: 100 + node.centrality,
              matchType: 'symbol',
              matchDetail: `Symbol "${token}" at line ${ref.line} (${ref.type})`,
              node,
            });
          }
        }
      }
    }

    // Also check case-insensitive symbol matches
    for (const [symName, refs] of Object.entries(index.symbols)) {
      if (symName.toLowerCase() === token && !seen.has(refs[0]?.file)) {
        for (const ref of refs) {
          if (!seen.has(ref.file)) {
            seen.add(ref.file);
            const node = index.files[ref.file];
            if (node) {
              results.push({
                file: ref.file,
                score: 90 + node.centrality,
                matchType: 'symbol',
                matchDetail: `Symbol "${symName}" at line ${ref.line}`,
                node,
              });
            }
          }
        }
      }
    }
  }

  // 2. Path-level match (file/directory name contains query tokens)
  for (const [filePath, node] of Object.entries(index.files)) {
    if (seen.has(filePath)) continue;
    const pathLower = filePath.toLowerCase();
    const basename = path.basename(filePath, path.extname(filePath)).toLowerCase();

    let pathScore = 0;
    for (const token of queryTokens) {
      if (basename === token) pathScore += 60;
      else if (basename.includes(token)) pathScore += 40;
      else if (pathLower.includes(token)) pathScore += 20;
    }

    if (pathScore > 0) {
      seen.add(filePath);
      results.push({
        file: filePath,
        score: pathScore + node.centrality,
        matchType: 'path',
        matchDetail: `Path matches query tokens`,
        node,
      });
    }
  }

  // 3. Export-level match
  for (const [filePath, node] of Object.entries(index.files)) {
    if (seen.has(filePath)) continue;
    for (const exp of node.exports) {
      const expLower = exp.toLowerCase();
      for (const token of queryTokens) {
        if (expLower.includes(token)) {
          seen.add(filePath);
          results.push({
            file: filePath,
            score: 30 + node.centrality,
            matchType: 'import',
            matchDetail: `Exports "${exp}"`,
            node,
          });
          break;
        }
      }
      if (seen.has(filePath)) break;
    }
  }

  // 4. Role-based match (query mentions "test", "config", "api", etc.)
  const roleKeywords: Record<string, string[]> = {
    test: ['test', 'spec', 'testing', 'verify'],
    config: ['config', 'configuration', 'settings', 'env'],
    api: ['api', 'route', 'endpoint', 'handler', 'controller'],
    component: ['component', 'ui', 'widget', 'button', 'form', 'modal'],
    model: ['model', 'entity', 'schema', 'database', 'db'],
    service: ['service', 'logic', 'business'],
    middleware: ['middleware', 'interceptor', 'guard'],
    style: ['style', 'css', 'theme', 'design'],
    util: ['util', 'helper', 'utility', 'common'],
  };

  for (const [role, keywords] of Object.entries(roleKeywords)) {
    if (queryTokens.some(t => keywords.includes(t))) {
      for (const [filePath, node] of Object.entries(index.files)) {
        if (seen.has(filePath)) continue;
        if (node.role === role) {
          seen.add(filePath);
          results.push({
            file: filePath,
            score: 15 + node.centrality,
            matchType: 'content',
            matchDetail: `Role: ${role}`,
            node,
          });
        }
      }
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

// ── Expand results with dependency context ──────────────────────────────────

export function expandWithDependencies(
  results: SearchResult[],
  index: CCSIndex,
  maxExpansion: number = 5
): SearchResult[] {
  const expanded = [...results];
  const seen = new Set(results.map(r => r.file));
  const graph = {
    adjacency: buildAdjacency(index, 'imports'),
    reverseAdjacency: buildAdjacency(index, 'importedBy'),
    centrality: Object.fromEntries(
      Object.entries(index.files).map(([k, v]) => [k, v.centrality])
    ),
  };

  // For top results, include their immediate importers (upstream)
  // These are files that will likely need updating too
  const topResults = results.slice(0, 3);
  for (const result of topResults) {
    const upstream = walkDependencies(graph, result.file, 'upstream', 1);
    for (const dep of upstream) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      const node = index.files[dep];
      if (node) {
        expanded.push({
          file: dep,
          score: result.score * 0.3 + node.centrality,
          matchType: 'dependency',
          matchDetail: `Imports ${result.file}`,
          node,
        });
      }
      if (expanded.length - results.length >= maxExpansion) break;
    }
    if (expanded.length - results.length >= maxExpansion) break;
  }

  expanded.sort((a, b) => b.score - a.score);
  return expanded;
}

function buildAdjacency(
  index: CCSIndex,
  field: 'imports' | 'importedBy'
): Record<string, string[]> {
  const adj: Record<string, string[]> = {};
  for (const [filePath, node] of Object.entries(index.files)) {
    adj[filePath] = node[field];
  }
  return adj;
}

// ── Tokenizer ───────────────────────────────────────────────────────────────
// Splits a query into meaningful search tokens.
// Handles camelCase, PascalCase, kebab-case, snake_case, file paths.

function tokenize(query: string): string[] {
  const tokens = new Set<string>();

  // Split on whitespace, punctuation, path separators
  const words = query.split(/[\s,;:'"()\[\]{}<>\/\\|!?@#$%^&*+=~`]+/).filter(Boolean);

  for (const word of words) {
    tokens.add(word);

    // Split camelCase and PascalCase: loginUser → login, user
    const camelParts = word.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(' ');
    if (camelParts.length > 1) {
      for (const part of camelParts) tokens.add(part);
    }

    // Split kebab-case: auth-middleware → auth, middleware
    if (word.includes('-')) {
      for (const part of word.split('-')) tokens.add(part);
    }

    // Split snake_case: user_service → user, service
    if (word.includes('_')) {
      for (const part of word.split('_')) tokens.add(part);
    }
  }

  // Remove very short tokens (noise) unless they look like abbreviations
  return Array.from(tokens).filter(t => t.length > 1);
}
