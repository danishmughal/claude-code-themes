// Draws one assistant reply block the way Claude Code's own renderer does,
// in the chosen theme's colors. Paragraphs, lists, headings and code blocks
// are drawn here from marked's tokens; every other block (tables, quotes,
// rules) goes to Claude Code's own Markdown element unchanged.
import type { Elements, RenderElement, RenderNode } from 'claude-code'

import { highlight, languageOf } from './highlight'
import { lex } from './lexer'
import type { Token } from './lexer'
import type { Theme } from './palettes'

type Table = Elements['terminal']

// The theme of the draw in progress; draw() runs start to finish without
// awaiting, so no other draw can change it midway
let theme: Theme

// Element string and Markdown text limits
const MAX_CHARS = 10000
// The reply bullet: BLACK CIRCLE FOR RECORD, U+23FA, which Claude Code draws on
// macOS. Elsewhere it draws U+25CF; a mod has no way to read the platform.
const BULLET = String.fromCodePoint(0x23fa)
// Claude Code caps a nested list's indent at this many columns
const MAX_INDENT = 32

class Unsupported extends Error {}

// Returns null when Claude Code should draw the block itself
export function draw(t: Table, text: string, isFirstOfReply: boolean, active: Theme): RenderElement | null {
  theme = active
  let body: RenderElement[]
  try {
    body = blocks(t, lex(text))
  } catch (err) {
    if (err instanceof Unsupported) return null
    throw err
  }
  if (body.length === 0) return null
  const dot = isFirstOfReply
    ? [t.Box({ minWidth: 2, flexShrink: 0, children: [t.Text({ color: 'text', children: [BULLET] })] })]
    : []
  return t.Box({
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginTop: isFirstOfReply ? 1 : 0,
    children: [...dot, t.Box({ flexDirection: 'column', flexGrow: 1, flexShrink: 1, children: body })],
  })
}

// Top-level blocks, spaced as the engine's string output spaces them: a blank
// line wherever the source had one, and always after a heading
function blocks(t: Table, tokens: Token[]): RenderElement[] {
  const out: RenderElement[] = []
  let gap = false
  for (const tok of tokens) {
    if (tok.type === 'space') {
      gap = true
      continue
    }
    const el = block(t, tok)
    out.push(out.length > 0 && gap ? t.Box({ marginTop: 1, children: [el] }) : el)
    gap = tok.type === 'heading'
  }
  return out
}

function block(t: Table, tok: Token): RenderElement {
  if (tok.type === 'paragraph') return prose(t, tok.tokens ?? [])
  if (tok.type === 'list') return list(t, tok, 0)
  if (tok.type === 'heading') return heading(t, tok)
  if (tok.type === 'code') return code(t, tok) ?? engine(t, tok.raw)
  return engine(t, tok.raw)
}

// A code block: the theme's code colors for a language this mod bundles, the
// inline code color for a fence with no language, plain for indented code, as
// the engine draws that. Null for a language only the engine knows.
function code(t: Table, tok: Token): RenderElement | null {
  const text = tok.text ?? ''
  if (tok.codeBlockStyle === 'indented') return t.Text({ children: pieces(text) })
  const info = (tok.lang ?? '').trim()
  if (!info) return t.Text({ color: theme.markdown.code, children: pieces(text) })
  const language = languageOf(info)
  const spans = language ? highlight(text, language, theme) : null
  if (!spans) return null
  return t.Text({
    children: spans.flatMap((s) =>
      s.color === theme.foreground ? pieces(s.text) : [t.Text({ color: s.color, children: pieces(s.text) })],
    ),
  })
}

// A string as Text children within the per-string limit
function pieces(s: string): string[] {
  const out: string[] = []
  for (let i = 0; i < s.length; i += MAX_CHARS) out.push(s.slice(i, i + MAX_CHARS))
  return out
}

// The engine's heading weights (# bold, italic and underlined; the rest
// bold), in the heading color
function heading(t: Table, tok: Token): RenderElement {
  const top = tok.depth === 1
  return t.Text({
    bold: true,
    color: theme.markdown.heading,
    ...(top ? { italic: true, underline: true } : {}),
    children: inline(t, tok.tokens ?? []),
  })
}

function engine(t: Table, raw: string): RenderElement {
  const text = raw.replace(/\n+$/, '')
  if (text.length > MAX_CHARS) throw new Unsupported()
  return t.Markdown({ text })
}

function prose(t: Table, tokens: Token[]): RenderElement {
  return t.Text({ children: inline(t, tokens) })
}

// A list, with the engine's markers: "-" for bullets, and for numbers 1. at
// the top level, a. one level down, i. two levels down
function list(t: Table, tok: Token, depth: number): RenderElement {
  const items = tok.items ?? []
  const first = tok.start === '' || tok.start === undefined ? 1 : tok.start
  const last = first + items.length - 1
  const rows = items.map((item, i) => {
    const marker = tok.ordered ? `${number(first + i, depth, first, last)}.` : '-'
    const content = itemBody(t, item, depth)
    const row = t.Box({
      flexDirection: 'row',
      children: [
        t.Box({
          minWidth: Math.min(marker.length + 1, MAX_INDENT),
          flexShrink: 0,
          children: [t.Text({ color: theme.markdown.marker, children: [marker] })],
        }),
        t.Box({ flexDirection: 'column', flexGrow: 1, flexShrink: 1, children: content }),
      ],
    })
    return i > 0 && tok.loose ? t.Box({ marginTop: 1, children: [row] }) : row
  })
  return t.Box({ flexDirection: 'column', children: rows })
}

function number(n: number, depth: number, first: number, last: number): string {
  if (depth === 1 && first >= 1) return letters(n)
  if (depth === 2 && first >= 1 && last <= 3999) return roman(n)
  return String(n)
}

function letters(n: number): string {
  let s = ''
  while (n > 0) {
    n--
    s = String.fromCharCode(97 + (n % 26)) + s
    n = Math.floor(n / 26)
  }
  return s
}

const ROMAN: [number, string][] = [
  [1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'],
  [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i'],
]

function roman(n: number): string {
  let s = ''
  for (const [v, r] of ROMAN) while (n >= v) (s += r), (n -= v)
  return s
}

// An item holds text (tight lists), paragraphs (loose lists), nested lists
// and code, which sits under the item's text. Tables and quotes inside an
// item get layout this mod doesn't reproduce, so such a reply is left to the
// engine.
function itemBody(t: Table, item: Token, depth: number): RenderElement[] {
  const out: RenderElement[] = []
  for (const tok of item.tokens ?? []) {
    if (tok.type === 'space') continue
    if (tok.type === 'text' || tok.type === 'paragraph') out.push(prose(t, tok.tokens ?? [{ type: 'text', raw: tok.raw, text: tok.text }]))
    else if (tok.type === 'list') out.push(list(t, tok, depth + 1))
    else if (tok.type === 'code') out.push(code(t, tok) ?? t.Text({ children: pieces(tok.text ?? '') }))
    else if (tok.type === 'checkbox') continue
    else throw new Unsupported()
  }
  if (item.task) {
    const box = t.Text({ children: [item.checked ? '[x] ' : '[ ] '] })
    if (out.length > 0) out[0] = t.Box({ flexDirection: 'row', children: [box, out[0]] })
  }
  return out
}

// Inline tokens as Text children, styled as the engine styles them, in the
// theme's colors
function inline(t: Table, tokens: Token[]): RenderNode[] {
  const out: RenderNode[] = []
  for (const tok of tokens) {
    switch (tok.type) {
      case 'text':
        if (tok.tokens) out.push(...inline(t, tok.tokens))
        else out.push(chars(tok.text ?? tok.raw))
        break
      case 'strong':
        out.push(t.Text({ bold: true, color: theme.markdown.strong, children: inline(t, tok.tokens ?? []) }))
        break
      case 'em':
        out.push(t.Text({ italic: true, color: theme.markdown.em, children: inline(t, tok.tokens ?? []) }))
        break
      case 'del':
        out.push(t.Text({ strikethrough: true, children: inline(t, tok.tokens ?? []) }))
        break
      case 'codespan':
        out.push(t.Text({ color: theme.markdown.code, children: [chars(tok.text ?? '')] }))
        break
      case 'link':
        out.push(link(t, tok))
        break
      case 'br':
        out.push('\n')
        break
      case 'checkbox':
        break
      case 'image':
        out.push(chars(tok.text ? `${tok.text} (${tok.href})` : tok.href ?? tok.raw))
        break
      default:
        out.push(chars(tok.text ?? tok.raw))
    }
  }
  return out
}

function chars(s: string): string {
  if (s.length > MAX_CHARS) throw new Unsupported()
  return s
}

// The Link element refuses the whole tree over a bad href, so anything but a
// plain https link is drawn as text
function link(t: Table, tok: Token): RenderNode {
  const label = t.Text({ color: theme.markdown.link, children: inline(t, tok.tokens ?? []) })
  const href = safeHref(tok.href ?? '')
  return href ? t.Link({ href, children: [label] }) : label
}

function safeHref(href: string): string | null {
  try {
    const u = new URL(href)
    if (u.protocol !== 'https:' || u.username || u.password) return null
    if (u.href.length > 2048 || !/^[\x21-\x7e]+$/.test(u.href)) return null
    return u.href
  } catch {
    return null
  }
}
