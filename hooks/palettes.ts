// The themes replies can be drawn in. Each Monokai Pro filter is its
// published palette; Warp and most editors ship a matching terminal theme of
// the same name, so pick the one your terminal uses.
type Palette = {
  red: string
  orange: string
  yellow: string
  green: string
  blue: string
  purple: string
  comment: string
  foreground: string
}

const PALETTES: Record<string, Palette> = {
  'monokai-pro': {
    red: '#ff6188', orange: '#fc9867', yellow: '#ffd866', green: '#a9dc76',
    blue: '#78dce8', purple: '#ab9df2', comment: '#727072', foreground: '#fcfcfa',
  },
  'monokai-pro-classic': {
    red: '#f92672', orange: '#fd971f', yellow: '#e6db74', green: '#a6e22e',
    blue: '#66d9ef', purple: '#ae81ff', comment: '#6e7066', foreground: '#fdfff1',
  },
  'monokai-pro-machine': {
    red: '#ff6d7e', orange: '#ffb270', yellow: '#ffed72', green: '#a2e57b',
    blue: '#7cd5f1', purple: '#baa0f8', comment: '#6b7678', foreground: '#f2fffc',
  },
  'monokai-pro-octagon': {
    red: '#ff657a', orange: '#ff9b5e', yellow: '#ffd76d', green: '#bad761',
    blue: '#9cd1bb', purple: '#c39ac9', comment: '#696d77', foreground: '#eaf2f1',
  },
  'monokai-pro-ristretto': {
    red: '#fd6883', orange: '#f38d70', yellow: '#f9cc6c', green: '#adda78',
    blue: '#85dacc', purple: '#a8a9eb', comment: '#72696a', foreground: '#fff1f3',
  },
  'monokai-pro-spectrum': {
    red: '#fc618d', orange: '#fd9353', yellow: '#fce566', green: '#7bd88f',
    blue: '#5ad4e6', purple: '#948ae3', comment: '#69676c', foreground: '#f7f1ff',
  },
}

export const DEFAULT_THEME = 'monokai-pro-classic'

export type Theme = {
  name: string
  foreground: string
  // Markdown roles, as Monokai's standard editor theme assigns them
  markdown: { heading: string; strong: string; em: string; code: string; link: string; marker: string }
  // highlight.js scopes, as Claude Code's Monokai Extended table assigns them
  scopes: Map<string, string>
}

// The named theme, or the default for a name this version doesn't know
export function themeNamed(name: unknown): Theme {
  const key = typeof name === 'string' && name in PALETTES ? name : DEFAULT_THEME
  const p = PALETTES[key]!
  return {
    name: key,
    foreground: p.foreground,
    markdown: { heading: p.green, strong: p.blue, em: p.blue, code: p.orange, link: p.purple, marker: p.green },
    scopes: new Map([
      ['keyword', p.red],
      // keywords that declare something, as Monokai draws storage
      ['_storage', p.blue],
      ['built_in', p.green],
      ['type', p.green],
      ['literal', p.purple],
      ['number', p.purple],
      ['string', p.yellow],
      ['title', p.green],
      ['title.function', p.green],
      ['title.class', p.green],
      ['title.class.inherited', p.green],
      ['params', p.orange],
      ['comment', p.comment],
      ['meta', p.comment],
      ['attr', p.green],
      ['attribute', p.green],
      ['variable', p.foreground],
      ['variable.language', p.foreground],
      ['property', p.foreground],
      ['operator', p.red],
      ['punctuation', p.foreground],
      ['symbol', p.purple],
      ['regexp', p.yellow],
      ['subst', p.foreground],
    ]),
  }
}

export const THEMES = Object.keys(PALETTES)
