import type { UserConfigExport } from '@tarojs/cli'

export default {
  logger: {
    quiet: false,
    stats: true
  },
  mini: {},
  h5: {
    devServer: {
      port: Number(process.env.CLIENT_PORT ?? 10086)
    }
  }
} satisfies UserConfigExport
