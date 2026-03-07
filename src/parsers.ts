import { SymbolEntry, SymbolType } from './types';
import { IMPORT_SCAN_LINES, SYMBOL_SCAN_LINES } from './constants';

// ── Import Extraction ───────────────────────────────────────────────────────
// Regex-based import parsing. Covers 95%+ of real-world import patterns.
// No AST dependency = zero install footprint.

interface ParsedImports {
  imports: string[];
  exports: string[];
  symbols: SymbolEntry[];
}

export function parseFile(content: string, language: string, filePath: string): ParsedImports {
  const lines = content.split('\n');
  const importLines = lines.slice(0, IMPORT_SCAN_LINES);
  const symbolLines = lines.slice(0, Math.min(lines.length, SYMBOL_SCAN_LINES));

  const imports = extractImports(importLines, language, filePath);
  const exports = extractExports(lines, language);
  const symbols = extractSymbols(symbolLines, language);

  return { imports, exports, symbols };
}

// ── Import Extraction ───────────────────────────────────────────────────────

function extractImports(lines: string[], language: string, filePath: string): string[] {
  const imports: string[] = [];

  switch (language) {
    case 'typescript':
    case 'javascript':
    case 'vue':
    case 'svelte':
    case 'astro':
      extractJSImports(lines, imports);
      break;
    case 'python':
      extractPythonImports(lines, imports);
      break;
    case 'go':
      extractGoImports(lines, imports);
      break;
    case 'rust':
      extractRustImports(lines, imports);
      break;
    case 'java':
    case 'kotlin':
    case 'scala':
      extractJavaImports(lines, imports);
      break;
    case 'ruby':
      extractRubyImports(lines, imports);
      break;
    case 'php':
      extractPHPImports(lines, imports);
      break;
    case 'csharp':
      extractCSharpImports(lines, imports);
      break;
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      extractCSSImports(lines, imports);
      break;
  }

  return imports;
}

function extractJSImports(lines: string[], imports: string[]) {
  const joined = lines.join('\n');

  // Static imports: import X from 'path', import { X } from 'path'
  const staticRe = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = staticRe.exec(joined))) {
    imports.push(m[1]);
  }

  // Dynamic imports: import('path'), require('path')
  const dynamicRe = /(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dynamicRe.exec(joined))) {
    imports.push(m[1]);
  }

  // Re-exports: export { X } from 'path'
  const reExportRe = /export\s+(?:[\w*\s{},]*)\s+from\s+['"]([^'"]+)['"]/g;
  while ((m = reExportRe.exec(joined))) {
    imports.push(m[1]);
  }
}

function extractPythonImports(lines: string[], imports: string[]) {
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;

    // from X import Y
    const fromMatch = trimmed.match(/^from\s+([\w.]+)\s+import/);
    if (fromMatch) {
      imports.push(fromMatch[1]);
      continue;
    }

    // import X, Y
    const importMatch = trimmed.match(/^import\s+([\w.,\s]+)/);
    if (importMatch) {
      const modules = importMatch[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
      imports.push(...modules);
    }
  }
}

function extractGoImports(lines: string[], imports: string[]) {
  const joined = lines.join('\n');

  // Single import: import "path"
  const singleRe = /import\s+"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = singleRe.exec(joined))) {
    imports.push(m[1]);
  }

  // Block import: import ( "path1" "path2" )
  const blockRe = /import\s*\(([\s\S]*?)\)/g;
  while ((m = blockRe.exec(joined))) {
    const pathRe = /"([^"]+)"/g;
    let pm: RegExpExecArray | null;
    while ((pm = pathRe.exec(m[1]))) {
      imports.push(pm[1]);
    }
  }
}

function extractRustImports(lines: string[], imports: string[]) {
  for (const line of lines) {
    const trimmed = line.trim();
    // use crate::module, use std::io
    const useMatch = trimmed.match(/^(?:pub\s+)?use\s+([\w:]+)/);
    if (useMatch) {
      imports.push(useMatch[1]);
    }
    // mod module;
    const modMatch = trimmed.match(/^(?:pub\s+)?mod\s+(\w+)\s*;/);
    if (modMatch) {
      imports.push(modMatch[1]);
    }
  }
}

function extractJavaImports(lines: string[], imports: string[]) {
  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(/^import\s+(?:static\s+)?([\w.*]+)\s*;/);
    if (m) imports.push(m[1]);
  }
}

function extractRubyImports(lines: string[], imports: string[]) {
  for (const line of lines) {
    const trimmed = line.trim();
    const requireMatch = trimmed.match(/^require(?:_relative)?\s+['"]([^'"]+)['"]/);
    if (requireMatch) imports.push(requireMatch[1]);
  }
}

function extractPHPImports(lines: string[], imports: string[]) {
  for (const line of lines) {
    const trimmed = line.trim();
    const useMatch = trimmed.match(/^use\s+([\w\\]+)/);
    if (useMatch) imports.push(useMatch[1]);
    const requireMatch = trimmed.match(/(?:require|include)(?:_once)?\s+['"]([^'"]+)['"]/);
    if (requireMatch) imports.push(requireMatch[1]);
  }
}

function extractCSharpImports(lines: string[], imports: string[]) {
  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(/^using\s+([\w.]+)\s*;/);
    if (m) imports.push(m[1]);
  }
}

function extractCSSImports(lines: string[], imports: string[]) {
  for (const line of lines) {
    const m = line.match(/@(?:import|use)\s+['"]([^'"]+)['"]/);
    if (m) imports.push(m[1]);
  }
}

// ── Export Extraction ───────────────────────────────────────────────────────

function extractExports(lines: string[], language: string): string[] {
  const exports: string[] = [];

  switch (language) {
    case 'typescript':
    case 'javascript':
    case 'vue':
    case 'svelte':
      extractJSExports(lines, exports);
      break;
    case 'python':
      extractPythonExports(lines, exports);
      break;
    case 'go':
      extractGoExports(lines, exports);
      break;
    default:
      // For other languages, exported symbols are detected in symbol extraction
      break;
  }

  return exports;
}

function extractJSExports(lines: string[], exports: string[]) {
  for (const line of lines) {
    const trimmed = line.trim();

    // export default
    if (trimmed.startsWith('export default')) {
      exports.push('default');
      continue;
    }

    // export const/let/var/function/class NAME
    const namedMatch = trimmed.match(
      /^export\s+(?:const|let|var|function\*?|class|interface|type|enum|abstract\s+class)\s+(\w+)/
    );
    if (namedMatch) {
      exports.push(namedMatch[1]);
      continue;
    }

    // export { name1, name2 }
    const bracketMatch = trimmed.match(/^export\s*\{([^}]+)\}/);
    if (bracketMatch) {
      const names = bracketMatch[1].split(',').map(s => {
        const parts = s.trim().split(/\s+as\s+/);
        return parts[parts.length - 1].trim();
      });
      exports.push(...names.filter(Boolean));
    }

    // module.exports
    if (trimmed.includes('module.exports')) {
      exports.push('default');
    }
  }
}

function extractPythonExports(lines: string[], exports: string[]) {
  // In Python, __all__ defines exports
  const joined = lines.join('\n');
  const allMatch = joined.match(/__all__\s*=\s*\[([\s\S]*?)\]/);
  if (allMatch) {
    const names = allMatch[1].match(/['"](\w+)['"]/g);
    if (names) {
      exports.push(...names.map(n => n.replace(/['"]/g, '')));
    }
  }
}

function extractGoExports(lines: string[], exports: string[]) {
  // In Go, exported symbols start with uppercase
  for (const line of lines) {
    const funcMatch = line.match(/^func\s+(?:\(\w+\s+\*?\w+\)\s+)?([A-Z]\w*)/);
    if (funcMatch) exports.push(funcMatch[1]);
    const typeMatch = line.match(/^type\s+([A-Z]\w*)/);
    if (typeMatch) exports.push(typeMatch[1]);
    const varMatch = line.match(/^(?:var|const)\s+([A-Z]\w*)/);
    if (varMatch) exports.push(varMatch[1]);
  }
}

// ── Symbol Extraction ───────────────────────────────────────────────────────

function extractSymbols(lines: string[], language: string): SymbolEntry[] {
  const symbols: SymbolEntry[] = [];

  switch (language) {
    case 'typescript':
    case 'javascript':
    case 'vue':
    case 'svelte':
      extractJSSymbols(lines, symbols);
      break;
    case 'python':
      extractPythonSymbols(lines, symbols);
      break;
    case 'go':
      extractGoSymbols(lines, symbols);
      break;
    case 'rust':
      extractRustSymbols(lines, symbols);
      break;
    case 'java':
    case 'kotlin':
    case 'csharp':
      extractJavaSymbols(lines, symbols);
      break;
    default:
      extractGenericSymbols(lines, symbols);
      break;
  }

  return symbols;
}

function extractJSSymbols(lines: string[], symbols: SymbolEntry[]) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;
    const isExported = trimmed.startsWith('export');

    // function declarations
    const funcMatch = trimmed.match(
      /(?:export\s+)?(?:default\s+)?(?:async\s+)?function\*?\s+(\w+)/
    );
    if (funcMatch) {
      symbols.push({ name: funcMatch[1], type: 'function', line: lineNum, exported: isExported });
      continue;
    }

    // Arrow functions / const assignments
    const arrowMatch = trimmed.match(
      /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/
    );
    if (arrowMatch) {
      symbols.push({ name: arrowMatch[1], type: 'function', line: lineNum, exported: isExported });
      continue;
    }

    // Class declarations
    const classMatch = trimmed.match(
      /(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/
    );
    if (classMatch) {
      symbols.push({ name: classMatch[1], type: 'class', line: lineNum, exported: isExported });
      continue;
    }

    // Interface/Type declarations (TypeScript)
    const ifaceMatch = trimmed.match(/(?:export\s+)?interface\s+(\w+)/);
    if (ifaceMatch) {
      symbols.push({ name: ifaceMatch[1], type: 'interface', line: lineNum, exported: isExported });
      continue;
    }
    const typeMatch = trimmed.match(/(?:export\s+)?type\s+(\w+)\s*[=<]/);
    if (typeMatch) {
      symbols.push({ name: typeMatch[1], type: 'type', line: lineNum, exported: isExported });
      continue;
    }

    // Enum declarations
    const enumMatch = trimmed.match(/(?:export\s+)?(?:const\s+)?enum\s+(\w+)/);
    if (enumMatch) {
      symbols.push({ name: enumMatch[1], type: 'enum', line: lineNum, exported: isExported });
      continue;
    }

    // Const/let/var (non-arrow)
    const constMatch = trimmed.match(
      /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*\w[^=]*)?\s*=/
    );
    if (constMatch && !arrowMatch) {
      symbols.push({ name: constMatch[1], type: 'const', line: lineNum, exported: isExported });
    }
  }
}

function extractPythonSymbols(lines: string[], symbols: SymbolEntry[]) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;
    const indent = line.length - line.trimStart().length;

    // Top-level functions (no indent)
    if (indent === 0 || indent === 4) {
      const funcMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)/);
      if (funcMatch) {
        const exported = !funcMatch[1].startsWith('_');
        const type: SymbolType = indent === 4 ? 'method' : 'function';
        symbols.push({ name: funcMatch[1], type, line: lineNum, exported });
        continue;
      }

      const classMatch = trimmed.match(/^class\s+(\w+)/);
      if (classMatch) {
        symbols.push({ name: classMatch[1], type: 'class', line: lineNum, exported: !classMatch[1].startsWith('_') });
        continue;
      }
    }

    // Module-level constants (ALL_CAPS)
    if (indent === 0) {
      const constMatch = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
      if (constMatch) {
        symbols.push({ name: constMatch[1], type: 'const', line: lineNum, exported: true });
      }
    }
  }
}

function extractGoSymbols(lines: string[], symbols: SymbolEntry[]) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    const funcMatch = trimmed.match(/^func\s+(?:\(\w+\s+\*?(\w+)\)\s+)?(\w+)/);
    if (funcMatch) {
      const name = funcMatch[2];
      const type: SymbolType = funcMatch[1] ? 'method' : 'function';
      symbols.push({ name, type, line: lineNum, exported: /^[A-Z]/.test(name) });
      continue;
    }

    const typeMatch = trimmed.match(/^type\s+(\w+)\s+(struct|interface)/);
    if (typeMatch) {
      const type: SymbolType = typeMatch[2] === 'interface' ? 'interface' : 'class';
      symbols.push({ name: typeMatch[1], type, line: lineNum, exported: /^[A-Z]/.test(typeMatch[1]) });
      continue;
    }

    const varMatch = trimmed.match(/^(?:var|const)\s+(\w+)/);
    if (varMatch) {
      symbols.push({ name: varMatch[1], type: 'const', line: lineNum, exported: /^[A-Z]/.test(varMatch[1]) });
    }
  }
}

function extractRustSymbols(lines: string[], symbols: SymbolEntry[]) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;
    const isPublic = trimmed.startsWith('pub');

    const fnMatch = trimmed.match(/(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/);
    if (fnMatch) {
      symbols.push({ name: fnMatch[1], type: 'function', line: lineNum, exported: isPublic });
      continue;
    }
    const structMatch = trimmed.match(/(?:pub\s+)?struct\s+(\w+)/);
    if (structMatch) {
      symbols.push({ name: structMatch[1], type: 'class', line: lineNum, exported: isPublic });
      continue;
    }
    const enumMatch = trimmed.match(/(?:pub\s+)?enum\s+(\w+)/);
    if (enumMatch) {
      symbols.push({ name: enumMatch[1], type: 'enum', line: lineNum, exported: isPublic });
      continue;
    }
    const traitMatch = trimmed.match(/(?:pub\s+)?trait\s+(\w+)/);
    if (traitMatch) {
      symbols.push({ name: traitMatch[1], type: 'interface', line: lineNum, exported: isPublic });
    }
  }
}

function extractJavaSymbols(lines: string[], symbols: SymbolEntry[]) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;
    const isPublic = trimmed.includes('public');

    const classMatch = trimmed.match(
      /(?:public|private|protected)?\s*(?:static\s+)?(?:abstract\s+)?(?:final\s+)?(?:class|interface|enum)\s+(\w+)/
    );
    if (classMatch) {
      const type: SymbolType = trimmed.includes('interface') ? 'interface' :
        trimmed.includes('enum') ? 'enum' : 'class';
      symbols.push({ name: classMatch[1], type, line: lineNum, exported: isPublic });
      continue;
    }

    const methodMatch = trimmed.match(
      /(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\(/
    );
    if (methodMatch) {
      symbols.push({ name: methodMatch[1], type: 'method', line: lineNum, exported: isPublic });
    }
  }
}

function extractGenericSymbols(lines: string[], symbols: SymbolEntry[]) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Generic function pattern
    const funcMatch = trimmed.match(/^(?:(?:pub|public|export|def|func|fn|function)\s+)(\w+)\s*\(/);
    if (funcMatch) {
      symbols.push({ name: funcMatch[1], type: 'function', line: lineNum, exported: true });
    }
    // Generic class pattern
    const classMatch = trimmed.match(/^(?:(?:pub|public|export)\s+)?class\s+(\w+)/);
    if (classMatch) {
      symbols.push({ name: classMatch[1], type: 'class', line: lineNum, exported: true });
    }
  }
}
