// Syntax highlighting for code blocks. Claude Code highlights reply code with
// a fixed 16-color table and keeps Monokai Extended for its diff view; this
// uses that diff view's scope rules, in the theme's colors, over the same
// highlighter (highlight.js).
import hljs from './vendor/hljs/core.js'
import bash from './vendor/hljs/languages/bash.js'
import c from './vendor/hljs/languages/c.js'
import cpp from './vendor/hljs/languages/cpp.js'
import csharp from './vendor/hljs/languages/csharp.js'
import css from './vendor/hljs/languages/css.js'
import diff from './vendor/hljs/languages/diff.js'
import dockerfile from './vendor/hljs/languages/dockerfile.js'
import go from './vendor/hljs/languages/go.js'
import graphql from './vendor/hljs/languages/graphql.js'
import ini from './vendor/hljs/languages/ini.js'
import java from './vendor/hljs/languages/java.js'
import javascript from './vendor/hljs/languages/javascript.js'
import json from './vendor/hljs/languages/json.js'
import kotlin from './vendor/hljs/languages/kotlin.js'
import makefile from './vendor/hljs/languages/makefile.js'
import markdown from './vendor/hljs/languages/markdown.js'
import php from './vendor/hljs/languages/php.js'
import plaintext from './vendor/hljs/languages/plaintext.js'
import python from './vendor/hljs/languages/python.js'
import ruby from './vendor/hljs/languages/ruby.js'
import rust from './vendor/hljs/languages/rust.js'
import scss from './vendor/hljs/languages/scss.js'
import shell from './vendor/hljs/languages/shell.js'
import sql from './vendor/hljs/languages/sql.js'
import swift from './vendor/hljs/languages/swift.js'
import typescript from './vendor/hljs/languages/typescript.js'
import xml from './vendor/hljs/languages/xml.js'
import yaml from './vendor/hljs/languages/yaml.js'

import type { Theme } from './palettes'

const GRAMMARS = {
  bash, c, cpp, csharp, css, diff, dockerfile, go, graphql, ini, java, javascript, json, kotlin,
  makefile, markdown, php, plaintext, python, ruby, rust, scss, shell, sql, swift, typescript, xml, yaml,
}
for (const [name, grammar] of Object.entries(GRAMMARS)) hljs.registerLanguage(name, grammar)

// Keywords that declare something take the storage color, as in Monokai
const STORAGE = new Set([
  'const', 'let', 'var', 'function', 'class', 'type', 'interface', 'enum', 'namespace', 'module',
  'def', 'fn', 'func', 'struct', 'trait', 'impl',
])

export type Span = { text: string; color: string }

type Node = { scope?: string; children: (string | Node)[] }

// A code block's language as Claude Code reads it: the whole info string,
// else its first word
export function languageOf(info: string): string | null {
  const word = info.match(/^[\w.+#-]+/)?.[0] ?? ''
  if (info && hljs.getLanguage(info)) return info
  if (word && hljs.getLanguage(word)) return word
  return null
}

const cache = new Map<string, Span[]>()
const CACHE_SIZE = 64

// Colored runs for the code, or null when highlight.js can't read it
export function highlight(code: string, language: string, theme: Theme): Span[] | null {
  const key = theme.name + '\0' + language + '\0' + code
  const hit = cache.get(key)
  if (hit) return hit
  let root: Node | undefined
  try {
    const result = hljs.highlight(code, { language, ignoreIllegals: true })
    root = result._emitter?.rootNode
  } catch {
    return null
  }
  if (!root || !Array.isArray(root.children)) return null
  const spans: Span[] = []
  walk(root, undefined, theme, spans)
  if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!)
  cache.set(key, spans)
  return spans
}

function walk(node: Node, inherited: string | undefined, theme: Theme, out: Span[]) {
  const scope = node.scope ?? inherited
  for (const child of node.children) {
    if (typeof child !== 'string') {
      walk(child, scope, theme, out)
      continue
    }
    const color = colorOf(scope, child, theme)
    const last = out[out.length - 1]
    if (last && last.color === color) last.text += child
    else out.push({ text: child, color })
  }
}

function colorOf(scope: string | undefined, text: string, theme: Theme): string {
  if (!scope) return theme.foreground
  if (scope === 'keyword' && STORAGE.has(text.trim())) return theme.scopes.get('_storage')!
  let s = scope
  for (;;) {
    const color = theme.scopes.get(s)
    if (color) return color
    const dot = s.lastIndexOf('.')
    if (dot < 0) return theme.foreground
    s = s.slice(0, dot)
  }
}
