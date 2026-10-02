import { expect, test } from 'claude-code/testing'

import { DEFAULT_THEME, THEMES, themeNamed } from '../hooks/palettes'

// With no theme picked, replies are drawn in the default
const CLASSIC = themeNamed(DEFAULT_THEME)
const MONOKAI = CLASSIC.markdown
const code = (scope: string) => CLASSIC.scopes.get(scope)

const ENGINE = /^drawn by Claude Code$/

function reply(text: string, surface: 'terminal' | 'desktop' = 'terminal') {
  return {
    plugin: 'themes',
    component: 'AssistantMessage',
    requestId: 'msg-1',
    surface,
    viewport: { columns: 100, rows: 40, isFullscreen: false },
    props: { text, isFirstOfReply: true },
  } as const
}

// Stands for the engine's own drawing, for blocks the mod hands back.
// ui.find matches text by substring, so every expected text is anchored.
function engineStub(on) {
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['drawn by Claude Code'] }))
}

test('bold, italic and inline code get the default theme colors', async ($, on) => {
  engineStub(on)
  const ui = await $.ui.mount(reply('Plain, **bold words**, *slanted* and `pnpm test`.'))
  expect((await ui.find({ type: 'Text', text: /^bold words$/ }))?.props).toMatchObject({ bold: true, color: MONOKAI.strong })
  expect((await ui.find({ type: 'Text', text: /^slanted$/ }))?.props).toMatchObject({ italic: true, color: MONOKAI.em })
  expect((await ui.find({ type: 'Text', text: /^pnpm test$/ }))?.props).toMatchObject({ color: MONOKAI.code })
  expect(await ui.find({ type: 'Text', text: ENGINE })).toBeUndefined()
})

test('the desktop app keeps its own drawing', async ($, on) => {
  engineStub(on)
  const ui = await $.ui.mount(reply('Some **bold**.', 'desktop'))
  expect(await ui.find({ type: 'Text', text: ENGINE })).toBeDefined()
})

test('list markers match the engine, in the marker color', async ($, on) => {
  engineStub(on)
  const ui = await $.ui.mount(reply('**Steps:**\n1. **First.** go\n2. Second\n   1. inner\n   2. inner two\n- after'))
  for (const marker of [/^1\.$/, /^a\.$/, /^b\.$/, /^-$/]) {
    expect((await ui.find({ type: 'Text', text: marker }))?.props).toMatchObject({ color: MONOKAI.marker })
  }
  expect((await ui.find({ type: 'Text', text: /^First\.$/ }))?.props).toMatchObject({ bold: true, color: MONOKAI.strong })
})

test('headings get the heading color, with the engine weights', async ($, on) => {
  engineStub(on)
  const ui = await $.ui.mount(reply('# Top\n\n### 1. Names: `src/a.ts`\n\nPlain text.'))
  const top = await ui.find({ type: 'Text', text: /^Top$/ })
  expect(top?.props).toMatchObject({ bold: true, italic: true, underline: true, color: MONOKAI.heading })
  const sub = await ui.find({ type: 'Text', text: /^1\. Names: src\/a\.ts$/ })
  expect(sub?.props).toMatchObject({ bold: true, color: MONOKAI.heading })
  expect(sub?.props.italic).toBeUndefined()
  expect((await ui.find({ type: 'Text', text: /^src\/a\.ts$/ }))?.props).toMatchObject({ color: MONOKAI.code })
})

test('code blocks are highlighted by Monokai scope', async ($, on) => {
  engineStub(on)
  const ui = await $.ui.mount(reply('**Do this:**\n\n```ts\nconst name = "x"\nreturn 42 // done\n```'))
  expect((await ui.find({ type: 'Text', text: /^const$/ }))?.props).toMatchObject({ color: code('_storage') })
  expect((await ui.find({ type: 'Text', text: /^return$/ }))?.props).toMatchObject({ color: code('keyword') })
  expect((await ui.find({ type: 'Text', text: /^"x"$/ }))?.props).toMatchObject({ color: code('string') })
  expect((await ui.find({ type: 'Text', text: /^42$/ }))?.props).toMatchObject({ color: code('number') })
  expect((await ui.find({ type: 'Text', text: /^\/\/ done$/ }))?.props).toMatchObject({ color: code('comment') })
  expect(await ui.find({ type: 'Markdown' })).toBeUndefined()
})

test('a fence with no language takes the inline code color', async ($, on) => {
  engineStub(on)
  const ui = await $.ui.mount(reply('Output:\n\n```\nok 3 files\n```'))
  expect((await ui.find({ type: 'Text', text: /^ok 3 files$/ }))?.props).toMatchObject({ color: MONOKAI.code })
})

test('a language this mod does not bundle goes to the engine', async ($, on) => {
  engineStub(on)
  const ui = await $.ui.mount(reply('```haskell\nmain = print 1\n```'))
  expect((await ui.find({ type: 'Markdown' }))?.props.text).toBe('```haskell\nmain = print 1\n```')
})

test('only https links become Link elements, both in the link color', async ($, on) => {
  engineStub(on)
  const ui = await $.ui.mount(reply('See [docs](https://example.com/a) and [bad](javascript:alert(1)).'))
  expect((await ui.find({ type: 'Link' }))?.props.href).toBe('https://example.com/a')
  expect((await ui.find({ type: 'Text', text: /^docs$/ }))?.props).toMatchObject({ color: MONOKAI.link })
  expect((await ui.find({ type: 'Text', text: /^bad$/ }))?.props).toMatchObject({ color: MONOKAI.link })
})

test('a code block inside a list item is highlighted under the item', async ($, on) => {
  engineStub(on)
  const ui = await $.ui.mount(reply('1. **Run:**\n\n   ```sh\n   echo "hi"\n   ```\n'))
  expect((await ui.find({ type: 'Text', text: /^"hi"$/ }))?.props).toMatchObject({ color: code('string') })
  expect(await ui.find({ type: 'Text', text: ENGINE })).toBeUndefined()
})

test('a list item holding a quote is left to Claude Code', async ($, on) => {
  engineStub(on)
  const ui = await $.ui.mount(reply('- **Note:**\n\n  > quoted\n'))
  expect(await ui.find({ type: 'Text', text: ENGINE })).toBeDefined()
})

test('the theme picked in /plugin configure is used', { options: { theme: 'monokai-pro' } }, async ($, on) => {
  engineStub(on)
  const pro = themeNamed('monokai-pro')
  const ui = await $.ui.mount(reply('# Top\n\nSome **bold**.\n\n```ts\nreturn 1\n```'))
  expect((await ui.find({ type: 'Text', text: /^Top$/ }))?.props).toMatchObject({ color: pro.markdown.heading })
  expect((await ui.find({ type: 'Text', text: /^bold$/ }))?.props).toMatchObject({ color: pro.markdown.strong })
  expect((await ui.find({ type: 'Text', text: /^return$/ }))?.props).toMatchObject({ color: pro.scopes.get('keyword') })
  expect(pro.markdown.strong).not.toBe(MONOKAI.strong)
})

test('an unknown theme name falls back to the default', async () => {
  expect(themeNamed('no-such-theme').name).toBe(DEFAULT_THEME)
  expect(THEMES).toContain(DEFAULT_THEME)
})
