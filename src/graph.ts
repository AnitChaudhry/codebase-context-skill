import { DependencyGraph, FileRank } from './types';

/**
 * Build a dependency graph from file import relationships.
 * Computes centrality scores and assigns file ranks.
 */
export function buildGraph(
  fileImports: Map<string, string[]>
): DependencyGraph {
  const adjacency: Record<string, string[]> = {};
  const reverseAdjacency: Record<string, string[]> = {};

  // Initialize all files
  for (const file of fileImports.keys()) {
    adjacency[file] = [];
    reverseAdjacency[file] = [];
  }

  // Build forward and reverse edges
  for (const [file, imports] of fileImports) {
    for (const imp of imports) {
      if (adjacency[imp] !== undefined) {
        // file imports imp → file depends on imp
        adjacency[file].push(imp);
        reverseAdjacency[imp].push(file);
      }
    }
  }

  // Compute centrality (in-degree: how many files import this one)
  const centrality: Record<string, number> = {};
  for (const file of fileImports.keys()) {
    centrality[file] = reverseAdjacency[file]?.length ?? 0;
  }

  return { adjacency, reverseAdjacency, centrality };
}

/**
 * Rank a file by how many files depend on it (centrality).
 * S: 10+, A: 5-9, B: 2-4, C: 1, D: 0
 */
export function rankByCentrality(importerCount: number): FileRank {
  if (importerCount >= 10) return 'S';
  if (importerCount >= 5) return 'A';
  if (importerCount >= 2) return 'B';
  if (importerCount >= 1) return 'C';
  return 'D';
}

/**
 * Get all files reachable from a starting file by following imports (BFS).
 * Direction: 'downstream' follows what this file imports.
 *            'upstream' follows what imports this file.
 */
export function walkDependencies(
  graph: DependencyGraph,
  startFile: string,
  direction: 'downstream' | 'upstream',
  maxDepth: number = 2
): string[] {
  const adj = direction === 'downstream' ? graph.adjacency : graph.reverseAdjacency;
  const visited = new Set<string>();
  const queue: Array<[string, number]> = [[startFile, 0]];

  while (queue.length > 0) {
    const [file, depth] = queue.shift()!;
    if (visited.has(file) || depth > maxDepth) continue;
    visited.add(file);

    const neighbors = adj[file] ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push([neighbor, depth + 1]);
      }
    }
  }

  visited.delete(startFile);
  return Array.from(visited);
}

/**
 * Find all files in the dependency chain between two files.
 */
export function findPath(
  graph: DependencyGraph,
  from: string,
  to: string
): string[] | null {
  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue: string[] = [from];
  visited.add(from);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === to) {
      // Reconstruct path
      const path: string[] = [];
      let node: string | undefined = to;
      while (node !== undefined) {
        path.unshift(node);
        node = parent.get(node);
      }
      return path;
    }

    for (const neighbor of graph.adjacency[current] ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  return null;
}

/**
 * Find connected components (clusters of related files).
 */
export function findClusters(graph: DependencyGraph): string[][] {
  const allFiles = new Set(Object.keys(graph.adjacency));
  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const file of allFiles) {
    if (visited.has(file)) continue;
    const cluster: string[] = [];
    const queue: string[] = [file];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      cluster.push(current);

      // Walk both directions (undirected connectivity)
      for (const neighbor of graph.adjacency[current] ?? []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
      for (const neighbor of graph.reverseAdjacency[current] ?? []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }

    if (cluster.length > 0) {
      clusters.push(cluster.sort());
    }
  }

  return clusters.sort((a, b) => b.length - a.length);
}
