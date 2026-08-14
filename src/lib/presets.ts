// Starter characters for the New Avatar dialog. Deliberately wide-ranging:
// Sunny shows how far a single shape goes, Robo how far layering goes.
import { defaultProject, newId, type AvatarProject, type Part } from '../types/avatar'

export interface Preset {
  name: string
  tagline: string
  build: () => AvatarProject
}

function part(overrides: Partial<Part> & Pick<Part, 'name' | 'kind' | 'x' | 'y' | 'width' | 'height'>): Part {
  return {
    id: newId(),
    rotation: 0,
    cornerRadius: 0,
    corners: null,
    pinch: 0,
    blobVariant: 0,
    bend: 0.6,
    clipToBody: false,
    fill: { type: 'solid', color: '#ffffff' },
    stroke: null,
    opacity: 1,
    hidden: false,
    locked: false,
    mirror: false,
    behindBody: false,
    aboveFace: false,
    ...overrides,
  }
}

/** A classic sun — round face, burst rays tucked behind, radial glow. */
function sunny(): AvatarProject {
  const p = defaultProject()
  p.name = 'Sunny'
  p.body = {
    kind: 'circle',
    width: 150,
    height: 150,
    cornerRadius: 0,
    blobVariant: 0,
    fill: { type: 'gradient', color: '#ffe082', color2: '#ffb74d', gradientType: 'radial' },
    stroke: null,
  }
  p.parts = [
    part({
      name: 'Rays',
      kind: 'burst',
      x: 0,
      y: 0,
      width: 214,
      height: 214,
      spikes: 12,
      spikeDepth: 0.42,
      fill: { type: 'gradient', color: '#ffcf54', color2: '#ff9d5c', gradientType: 'radial' },
      behindBody: true,
    }),
  ]
  p.eyes = { ...p.eyes, style: 'round', spacing: 26, offsetY: -16, size: 17, squash: 1.05, pupilSize: 0.55, color: '#ffffff', pupilColor: '#8c3b41' }
  p.mouth = { style: 'smile', offsetY: 20, width: 34, height: 12, curvature: 0.9, color: '#8c3b41' }
  return p
}

/** A sleepy pale moon — hand-drawn sketchy outline, craters, a nightcap. */
function luna(): AvatarProject {
  const p = defaultProject()
  p.name = 'Luna'
  const navy = '#3a3f5c'
  p.body = {
    kind: 'circle',
    width: 176,
    height: 176,
    cornerRadius: 0,
    blobVariant: 0,
    fill: { type: 'gradient', color: '#fff3d6', color2: '#f0dca6', gradientType: 'radial' },
    stroke: { color: '#c9b37e', width: 3, style: 'sketchy' },
  }
  p.parts = [
    part({
      name: 'Crater',
      kind: 'ellipse',
      x: -56,
      y: 26,
      width: 26,
      height: 22,
      fill: { type: 'solid', color: '#ecd9a4' },
      clipToBody: true,
    }),
    part({
      name: 'Crater small',
      kind: 'ellipse',
      x: 62,
      y: -14,
      width: 16,
      height: 14,
      fill: { type: 'solid', color: '#ecd9a4' },
      clipToBody: true,
    }),
    part({
      name: 'Nightcap',
      kind: 'triangle',
      x: 50,
      y: -76,
      width: 74,
      height: 64,
      rotation: 42,
      fill: { type: 'gradient', color: '#4b5178', color2: navy },
    }),
    part({
      name: 'Pompom',
      kind: 'circle',
      x: 88,
      y: -92,
      width: 22,
      height: 22,
      fill: { type: 'solid', color: '#fff3d6' },
      stroke: { color: '#c9b37e', width: 2, style: 'sketchy' },
    }),
  ]
  p.eyes = { ...p.eyes, style: 'halfmoon', spacing: 28, offsetY: -14, size: 17, squash: 1, pupilSize: 0.6, highlight: false, color: '#ffffff', pupilColor: navy }
  p.mouth = { style: 'smile', offsetY: 22, width: 24, height: 9, curvature: 0.5, color: navy }
  return p
}

/** Layered and mechanical — squircle, polygon bolts, dashed panel lines. */
function robo(): AvatarProject {
  const p = defaultProject()
  p.name = 'Robo'
  p.body = {
    kind: 'squircle',
    width: 180,
    height: 170,
    cornerRadius: 0,
    blobVariant: 0,
    exponent: 5,
    fill: { type: 'gradient', color: '#90a4ae', color2: '#607d8b', gradientAngle: 135 },
    stroke: { color: '#263238', width: 3, style: 'dashed' },
  }
  p.parts = [
    part({
      name: 'Antenna stem',
      kind: 'capsule',
      x: 0,
      y: -96,
      width: 10,
      height: 36,
      fill: { type: 'solid', color: '#455a64' },
      behindBody: true,
    }),
    part({
      name: 'Antenna tip',
      kind: 'circle',
      x: 0,
      y: -116,
      width: 18,
      height: 18,
      fill: { type: 'gradient', color: '#ff8a65', color2: '#e5646b', gradientType: 'radial' },
      behindBody: true,
    }),
    part({
      name: 'Bolt',
      kind: 'polygon',
      x: 101,
      y: -4,
      width: 30,
      height: 30,
      rotation: 15,
      sides: 6,
      fill: { type: 'solid', color: '#455a64' },
      mirror: true,
      behindBody: true,
    }),
    part({
      name: 'Panel',
      kind: 'strip',
      x: 0,
      y: 46,
      width: 66,
      height: 28,
      cornerRadius: 8,
      fill: { type: 'solid', color: '#eceff1' },
      stroke: { color: '#263238', width: 2, style: 'dashed' },
    }),
    part({
      name: 'Button',
      kind: 'circle',
      x: -16,
      y: 46,
      width: 10,
      height: 10,
      fill: { type: 'solid', color: '#e5646b' },
      mirror: true,
      aboveFace: true,
    }),
  ]
  p.eyes = { ...p.eyes, style: 'round', spacing: 33, offsetY: -24, size: 19, squash: 0.9, pupilSize: 0.5, color: '#eceff1', pupilColor: '#263238' }
  p.mouth = { style: 'flat', offsetY: 12, width: 26, height: 8, curvature: 0, color: '#263238' }
  return p
}

/** A sunflower — burst petals behind a brown centre, stem and leaves below. */
function bloom(): AvatarProject {
  const p = defaultProject()
  p.name = 'Bloom'
  p.body = {
    kind: 'circle',
    width: 122,
    height: 122,
    cornerRadius: 0,
    blobVariant: 0,
    fill: { type: 'gradient', color: '#a06b3e', color2: '#6f4e2a', gradientType: 'radial' },
    stroke: null,
  }
  p.parts = [
    part({
      name: 'Petals',
      kind: 'burst',
      x: 0,
      y: 0,
      width: 196,
      height: 196,
      spikes: 12,
      spikeDepth: 0.5,
      fill: { type: 'gradient', color: '#ffc93c', color2: '#f5a623', gradientType: 'radial' },
      behindBody: true,
    }),
    part({
      name: 'Stem',
      kind: 'capsule',
      x: 0,
      y: 88,
      width: 13,
      height: 72,
      fill: { type: 'solid', color: '#66a83d' },
      behindBody: true,
    }),
    part({
      name: 'Leaf',
      kind: 'teardrop',
      x: 24,
      y: 88,
      width: 26,
      height: 40,
      rotation: 118,
      pinch: 0.4,
      fill: { type: 'solid', color: '#4a7d2c' },
      mirror: true,
      behindBody: true,
    }),
  ]
  p.eyes = { ...p.eyes, style: 'round', spacing: 20, offsetY: -13, size: 16, squash: 1.05, pupilSize: 0.62, color: '#ffffff', pupilColor: '#3a2a12' }
  p.mouth = { style: 'smile', offsetY: 18, width: 28, height: 10, curvature: 0.85, color: '#ffe9c7' }
  return p
}

/** The app mascot, unchanged. */
function pip(): AvatarProject {
  return defaultProject()
}

/** A bare starting point: neutral placeholder grey, nothing to undo. */
function blank(): AvatarProject {
  const p = defaultProject()
  p.name = 'MyAvatar'
  p.body = {
    kind: 'circle',
    width: 180,
    height: 180,
    cornerRadius: 0,
    blobVariant: 0,
    fill: { type: 'solid', color: '#c7cfda' },
    stroke: null,
  }
  p.parts = []
  p.eyes = { ...p.eyes, style: 'round', spacing: 28, offsetY: -18, size: 19, squash: 1.05, pupilSize: 0.6, highlight: true, color: '#ffffff', pupilColor: '#39414f' }
  p.mouth = { style: 'smile', offsetY: 22, width: 30, height: 10, curvature: 0.6, color: '#39414f' }
  return p
}

export const PRESETS: Preset[] = [
  { name: 'Sunny', tagline: 'Radiant and simple', build: sunny },
  { name: 'Luna', tagline: 'Sketchy and sleepy', build: luna },
  { name: 'Robo', tagline: 'Layered and mechanical', build: robo },
  { name: 'Bloom', tagline: 'Petals, stem and leaves', build: bloom },
  { name: 'Pip', tagline: 'The Blink mascot', build: pip },
  { name: 'Blank', tagline: 'Start from scratch', build: blank },
]
