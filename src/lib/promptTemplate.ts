// Builds the copy-paste prompt for generating an .avatar file with any LLM.
// The prompt teaches the full project schema plus design rules, appends the
// user's description, and asks for bare JSON we can import directly.

const TEMPLATE = `You are generating a character file for "Avatar Builder", an app that designs cute animated 2D avatars (think friendly mascots: a smiling cardboard box, a round soot-sprite, a happy peach).

Respond with ONLY a single JSON object. No markdown fences, no commentary before or after.

## Coordinate system
- The body is centred at (0, 0). +x is right, +y is DOWN (so negative offsetY = higher up).
- All part positions are the shape's CENTRE, relative to the body centre, in px.

## JSON schema
{
  "version": 1,
  "name": "PascalCaseName",
  "body": {
    "kind": "rect" | "circle" | "ellipse" | "capsule" | "trapezoid" | "blob",
    "width": 120-260,
    "height": 120-260,
    "cornerRadius": 0-60,            // rect only
    "blobVariant": 0 | 1 | 2,        // blob only: 0 pebble (round), 1 splodge (pear), 2 puddle (wide)
    "fill": { "type": "solid" | "gradient", "color": "#rrggbb" },   // gradient auto-derives a darker bottom stop
    "stroke": null | { "color": "#rrggbb", "width": 1-8 }
  },
  "parts": [
    // zero or more decorative shapes, each:
    {
      "id": "unique-short-id",
      "name": "Human label",
      "kind": "rect" | "circle" | "ellipse" | "capsule" | "lobe" | "arc" | "trapezoid" | "blob" | "triangle" | "star" | "heart" | "strip",
      "x": number, "y": number,      // centre; keep within the body bounds +/- 30
      "width": number, "height": number,
      "rotation": degrees,
      "cornerRadius": number,                  // uniform radius (rect/strip)
      "corners": null | [tl, tr, br, bl],      // per-corner radii, overrides cornerRadius (rect/strip)
      "pinch": 0-1,                   // lobe/capsule: cinches the +Y end into a waist (ears, horns, tails)
      "blobVariant": 0 | 1 | 2,       // blob parts only
      "bend": -1.5 to 1.5,            // arc only: curve depth as a fraction of width (0 = straight band)
      "clipToBody": false,            // true trims the shape at the body silhouette (stripes/markings end exactly at the edge)
      "fill": { "type": "solid", "color": "#rrggbb" },
      "stroke": null | { "color": "#rrggbb", "width": 1-8 },
      "opacity": 0-1,
      "hidden": false, "locked": false,
      "mirror": false,        // true renders a mirrored twin across the vertical centre line (ears, arms, blush)
      "behindBody": false,    // true = renders behind the body (ears, tails)
      "aboveFace": false      // true = renders on top of the eyes/mouth; false sits above the body but below the face
    }
  ],
  "eyes": {
    "style": "round" | "oval" | "halfmoon" | "bean",
    "spacing": 20-60,          // distance from centre line to each eye
    "offsetY": number,         // usually -15 to -45 (up)
    "size": 8-30,
    "squash": 0.5-1.5,         // <1 sleepy, >1 wide awake
    "pupilSize": 0-0.9,        // fraction of eye size; use pupilColor = eye color for blank cartoon eyes
    "highlight": true | false, // white glint dot
    "color": "#rrggbb", "pupilColor": "#rrggbb",
    "pupilDrift": true
  },
  "mouth": {
    "style": "smile" | "open" | "flat" | "o" | "cat" | "tongue",
    "offsetY": number,         // usually 20 to 45 (down)
    "width": 20-80, "height": 6-30,
    "curvature": -1 to 1,      // 1 = big smile, 0 = flat, negative = frown
    "color": "#rrggbb"
  },
  "expressions": {
    // OPTIONAL. Keys: idle, happy, curious, angry, confused, sad, surprised, sleepy, love, laughing, wink, dizzy.
    // Each value: { "speed": 0.25-3, "intensity": 0-1.5, "loop": "infinite" | "once" | <number>, "include": true|false }
    // "include" picks which animations ship with the exported component. idle is always included.
  }
}

## Design rules
- Cute and cohesive: 2-5 decorative parts, a harmonious palette (3-4 colours), a big readable face.
- Blob bodies are a single dough silhouette (no baked-in ears or limbs). Prefer a gradient fill and no stroke. Variant 1 (splodge) is the default look.
- Eyes sit in the upper third of the body; mouth slightly below centre.
- "lobe" is the ear/horn/tail shape: a round tip with a pinched waist. Set "pinch" 0.4–0.7, rotate so the pinched end meets the body, and use "behindBody": true so the join tucks under. Mirror for a pair.
- "strip" + "corners" is perfect for tape, lids and labels. A lid hugging the top of a rect body with cornerRadius 24 uses "corners": [24, 24, 0, 0] and width equal to the body width.
- "arc" is a curved ribbon (width = chord, height = thickness, "bend" = curve depth). Combine with "clipToBody": true for stripes and markings that follow and end exactly at the body's edge — oversize them and let the clip trim.
- Layering: tape/lids/labels keep "aboveFace": false so the face stays on top; ears and tails go "behindBody": true.
- Use "mirror": true for anything that comes in symmetric pairs.
- In "expressions", set "include": true for idle plus 2-4 moods that suit the character.

## Example output (a smiling cardboard-box character)
{"version":1,"name":"BoxBuddy","body":{"kind":"rect","width":180,"height":160,"cornerRadius":24,"blobVariant":0,"fill":{"type":"gradient","color":"#d9a066"},"stroke":null},"parts":[{"id":"lid","name":"Lid","kind":"strip","x":0,"y":-62,"width":180,"height":36,"rotation":0,"cornerRadius":0,"corners":[24,24,0,0],"fill":{"type":"solid","color":"#d17f28"},"stroke":null,"opacity":1,"hidden":false,"locked":false,"mirror":false,"behindBody":false,"aboveFace":false},{"id":"tape","name":"Tape","kind":"strip","x":0,"y":10,"width":34,"height":140,"rotation":0,"cornerRadius":0,"corners":[0,0,4,4],"fill":{"type":"solid","color":"#f2d5b3"},"stroke":null,"opacity":1,"hidden":false,"locked":false,"mirror":false,"behindBody":false,"aboveFace":false},{"id":"label","name":"Label","kind":"rect","x":56,"y":54,"width":42,"height":26,"rotation":-6,"cornerRadius":4,"corners":null,"fill":{"type":"solid","color":"#f2e6d4"},"stroke":{"color":"#b07d4a","width":2},"opacity":1,"hidden":false,"locked":false,"mirror":false,"behindBody":false,"aboveFace":false}],"eyes":{"style":"oval","spacing":40,"offsetY":-20,"size":17,"squash":1,"pupilSize":0.7,"highlight":true,"color":"#f7f4ef","pupilColor":"#2b2b2b","pupilDrift":true},"mouth":{"style":"smile","offsetY":28,"width":44,"height":16,"curvature":0.7,"color":"#2b2b2b"},"expressions":{"happy":{"speed":1,"intensity":1,"loop":"infinite","include":true},"surprised":{"speed":1,"intensity":1,"loop":"infinite","include":true},"wink":{"speed":1,"intensity":1,"loop":"once","include":true}}}

## Build this character:
`

export function buildGenerationPrompt(userRequest: string): string {
  return TEMPLATE + userRequest.trim() + '\n'
}

/** Pull the JSON object out of an AI response (tolerates fences/commentary). */
export function extractJson(response: string): string {
  const start = response.indexOf('{')
  const end = response.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in the pasted text')
  }
  return response.slice(start, end + 1)
}
