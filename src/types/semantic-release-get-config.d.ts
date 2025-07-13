/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'semantic-release/lib/get-config.js' {
  export default function getConfig(
    context: any,
    cliOptions: any
  ): Promise<any>
}

declare module 'semantic-release/lib/plugins/index.js' {
  export default function plugins(
    context: any,
    pluginsPath: any
  ): Promise<any>
}
