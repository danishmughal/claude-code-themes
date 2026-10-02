import type { Register } from 'claude-code'

import { draw } from './draw'
import { themeNamed } from './palettes'

export const register: Register = (on, options) => {
  // The theme picked with /plugin configure, read each time the mod loads
  const theme = themeNamed((options as { theme?: unknown } | undefined)?.theme)

  // Redraws each reply block in the theme's colors. Only the drawing changes:
  // the stored message, and what Claude reads next turn, stay as written.
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => {
    if (e.surface !== 'terminal') return next(e)
    return draw($.ui.resolve(e), e.props.text, e.props.isFirstOfReply, theme) ?? next(e)
  })
}
