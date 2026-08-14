export interface Palette {
  name: string
  colors: string[]
}

export const PALETTES: Palette[] = [
  { name: 'Cardboard', colors: ['#d9a066', '#b07d4a', '#8c5e33', '#f2d5b3', '#5c4327'] },
  { name: 'Bubblegum', colors: ['#f7a8c4', '#f06292', '#ba68c8', '#fff1f7', '#7b3f61'] },
  { name: 'Ocean', colors: ['#6fc3df', '#3d9ec9', '#2b6f97', '#d7f0f7', '#1d4560'] },
  { name: 'Meadow', colors: ['#9ccc65', '#66a83d', '#4a7d2c', '#eef7e2', '#33531f'] },
  { name: 'Sunset', colors: ['#ffb74d', '#ff8a65', '#e5646b', '#ffe9d1', '#8c3b41'] },
  { name: 'Slate', colors: ['#90a4ae', '#607d8b', '#455a64', '#eceff1', '#263238'] },
]
