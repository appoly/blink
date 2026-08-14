// Generates samples/BoxBuddy.vue — a committed proof of the export pipeline.
// Run with: npm run generate:sample
import { mkdirSync, writeFileSync } from 'node:fs'
import { defaultProject } from '../src/types/avatar'
import { generateComponent, generateSvgSnapshot } from '../src/lib/exporter'

const project = defaultProject()
project.name = 'BoxBuddy'

// A smiling cardboard box: tape strip across the top, a wee label, blush marks.
project.parts = [
  {
    id: 'tape',
    name: 'Tape line',
    kind: 'strip',
    x: 0,
    y: -62,
    width: 180,
    height: 14,
    rotation: 0,
    cornerRadius: 2,
    fill: { type: 'solid', color: '#c98d52' },
    stroke: null,
    opacity: 1,
    hidden: false,
    locked: false,
    mirror: false,
    behindBody: false,
  },
  {
    id: 'label',
    name: 'Label',
    kind: 'rect',
    x: 52,
    y: 52,
    width: 44,
    height: 28,
    rotation: -6,
    cornerRadius: 4,
    fill: { type: 'solid', color: '#f2e6d4' },
    stroke: { color: '#b07d4a', width: 2 },
    opacity: 1,
    hidden: false,
    locked: false,
    mirror: false,
    behindBody: false,
  },
  {
    id: 'blush',
    name: 'Blush',
    kind: 'ellipse',
    x: -52,
    y: 8,
    width: 22,
    height: 12,
    rotation: 0,
    cornerRadius: 0,
    fill: { type: 'solid', color: '#e8917c' },
    stroke: null,
    opacity: 0.65,
    hidden: false,
    locked: false,
    mirror: true,
    behindBody: false,
  },
]

for (const name of ['happy', 'curious', 'surprised', 'sleepy', 'wink'] as const) {
  project.expressions[name].include = true
}
project.expressions.wink.loop = 'once'

mkdirSync('samples', { recursive: true })
writeFileSync('samples/BoxBuddy.vue', generateComponent(project))
writeFileSync('samples/BoxBuddy.svg', generateSvgSnapshot(project))
writeFileSync('samples/BoxBuddy.avatar', JSON.stringify(project, null, 2))
console.log('Wrote samples/BoxBuddy.vue, samples/BoxBuddy.svg and samples/BoxBuddy.avatar')
