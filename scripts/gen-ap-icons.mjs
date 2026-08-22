import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const svg = readFileSync(join(publicDir, 'ap-icon.svg'), 'utf8')
const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 512 } })

for (const size of [128, 192, 512]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(join(publicDir, `ap${size}.png`), png)
  console.log(`wrote ap${size}.png`)
}
