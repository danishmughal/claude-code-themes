import { Marked } from './vendor/marked.js'

// Claude Code lexes replies with marked plus two tokenizer overrides. Using
// the same ones here keeps this mod's blocks identical to the engine's:
// strikethrough needs a double tilde, and reference definitions stay text.
const DOUBLE_TILDE = /^~~(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))~~(?=[^~]|$)/

const md = new Marked({ gfm: true })
md.use({
  tokenizer: {
    del(src: string) {
      const m = DOUBLE_TILDE.exec(src)
      if (!m || m[1] === undefined) return undefined
      return { type: 'del', raw: m[0], text: m[1], tokens: this.lexer.inlineTokens(m[1]) }
    },
    def() {
      return undefined
    },
  },
})

export type Token = {
  type: string
  raw: string
  text?: string
  tokens?: Token[]
  items?: Token[]
  ordered?: boolean
  start?: number | ''
  loose?: boolean
  task?: boolean
  checked?: boolean
  href?: string
  depth?: number
  lang?: string
  codeBlockStyle?: string
}

export function lex(text: string): Token[] {
  return md.lexer(text) as Token[]
}
