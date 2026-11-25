// Host entry for @local/dsh-lot-map.
// Registers the pure `lotMap` session projection and optional `/lot-map` slash command.
import { createLotMapProjection } from './lib/projection.js'

export const name = 'lot-map'
export const inject = ['sessionProjections']

export async function apply(ctx, config = {}) {
  await ctx.sessionProjections.register(createLotMapProjection(config))

  ctx.inject(['commands'], (scope) => {
    scope.effect(() => scope.commands.register({
      name: 'lot-map',
      description: 'Open the live Lot Map pane / 打开实时工作地图',
      handler: () => ({
        kind: 'success',
        text: 'Lot Map opened in the right sidebar.',
      }),
    }), 'lot-map: command')
  })
}
