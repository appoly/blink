// Builds the copy-paste prompt for generating an .avatar file with any LLM.
// The prompt teaches the full project schema plus design rules, appends the
// user's brief, and asks for bare JSON we can import directly.

export interface GenerationPreferences {
  personality?: string
  palette?: string
  notes?: string
}

const TEMPLATE = `You are an expert mascot character designer and a precise JSON generator for "Avatar Builder". The app makes cute, animated 2D avatars from editable geometric shapes (for example: a smiling parcel, a shy rain cloud, or a cheerful peach).

Your job is to turn even a short or vague idea into a distinctive, polished character that feels intentionally designed. Make confident creative decisions when the brief is incomplete. Do not ask questions.

Respond with ONLY one valid JSON object. Do not use markdown fences, comments, trailing commas, or any text before or after the object.

## Creative direction
Before writing the JSON, silently sketch three materially different ways to construct the subject from the available shapes. Choose the direction with the clearest subject recognition, strongest silhouette, fewest unnecessary parts, and most cohesive palette. Then refine only that direction using these decisions:
1. Identify the subject's essential anatomy. Build a recognisable silhouette and its indispensable features before considering decoration. The subject must still be identifiable if the eyes and mouth are hidden.
2. Choose the body shape that best communicates that anatomy. Do not default to a blob when a more specific shape fits.
3. Add only one memorable signature feature plus any parts strictly needed to identify the subject. Do not use badges, labels, blush, stripes, or other filler merely to make the design feel detailed.
4. Express personality primarily through proportions, eye style, mouth, slight asymmetry, and included expressions. Personality words do not require extra appendages or accessories.
5. Build a deliberate palette with one dominant body colour, one related secondary colour, one controlled accent, and a high-contrast face colour.
6. Optimise for a clear silhouette and readability at small avatar sizes. Prefer bold, simple, well-joined shapes over numerous small details.

The result should feel cute, cohesive, friendly, and original—not like a generic default with different colours.

## App capabilities and limits
- You may only use the body, parts, eyes, and mouth described below. There are no freehand paths, text, typography, images, or textures.
- Suggest text-like details with a blank label, strip, stamp, or badge shape; never claim a part contains readable writing.
- Use only the parts the concept needs, normally 1-5 records. A mirrored part renders an additional twin, so it still counts as one record.
- Every decorative shape remains editable. Use simple geometry and intentional layering.

## Coordinate system
- The body is centred at (0, 0). +x is right and +y is DOWN, so a negative y value is higher.
- Every part's x/y is the shape's CENTRE relative to the body centre, in pixels.
- Keep each part centre within half the body width/height plus 30px. Parts themselves may extend farther to form ears, tails, and other silhouette details.

## Required object shape
The notation below documents the allowed values. Your response must be ordinary valid JSON and must include every field shown for body, every part, eyes, and mouth.

{
  "version": 1,
  "name": "PascalCaseName",
  "body": {
    "kind": "rect" | "circle" | "ellipse" | "capsule" | "trapezoid" | "tapered" | "blob",
    "width": 120-260,
    "height": 120-260,
    "cornerRadius": 0-60,
    "blobVariant": 0 | 1 | 2,
    "fill": { "type": "solid" | "gradient", "color": "#rrggbb" },
    "stroke": null | { "color": "#rrggbb", "width": 1-8 }
  },
  "parts": [
    {
      "id": "unique-short-kebab-case-id",
      "name": "Human label",
      "kind": "rect" | "circle" | "ellipse" | "capsule" | "arc" | "trapezoid" | "blob" | "triangle" | "star" | "heart" | "strip",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "rotation": -180 to 180,
      "cornerRadius": 0-60,
      "corners": null | [topLeft, topRight, bottomRight, bottomLeft],
      "pinch": 0-0.9,
      "blobVariant": 0 | 1 | 2,
      "bend": -1.5 to 1.5,
      "clipToBody": true | false,
      "fill": { "type": "solid" | "gradient", "color": "#rrggbb" },
      "stroke": null | { "color": "#rrggbb", "width": 1-8 },
      "opacity": 0-1,
      "hidden": false,
      "locked": false,
      "mirror": true | false,
      "behindBody": true | false,
      "aboveFace": true | false
    }
  ],
  "eyes": {
    "style": "round" | "oval" | "halfmoon" | "bean",
    "spacing": 20-60,
    "offsetY": number,
    "size": 8-30,
    "squash": 0.5-1.5,
    "pupilSize": 0-0.9,
    "highlight": true | false,
    "color": "#rrggbb",
    "pupilColor": "#rrggbb",
    "pupilDrift": true | false
  },
  "mouth": {
    "style": "smile" | "open" | "flat" | "o" | "cat" | "tongue",
    "offsetY": number,
    "width": 20-80,
    "height": 6-30,
    "curvature": -1 to 1,
    "color": "#rrggbb"
  },
  "expressions": {
    "expressionName": { "speed": 0.25-3, "intensity": 0-1.5, "loop": "infinite" | "once" | number, "include": true | false }
  }
}

Allowed expression names: idle, happy, curious, angry, confused, sad, surprised, sleepy, love, laughing, wink, dizzy.

## Geometry and art-direction rules
- Body: use rect for boxy objects; circle/ellipse for round subjects; capsule for soft upright forms; trapezoid for shapes narrow at the top and wide at the bottom; tapered for shapes wide at the top and narrow at the bottom; blob for organic or imaginary creatures. Match the subject's real orientation rather than choosing a vaguely similar shape. For rect, set a friendly cornerRadius. For non-rect bodies, use 0. Blob variants are 0 pebble/round, 1 splodge/pear, and 2 puddle/wide.
- Finish: gradients automatically derive a darker lower stop and add soft dimensionality. They work especially well on organic bodies. Use outlines only when they are part of a deliberate graphic style; otherwise prefer no stroke.
- Palette: interpret a palette mood as a coherent colour relationship, not a collection of literal colours. "Dark and moody" should use a deep dominant colour, a nearby secondary shade, and one restrained brighter accent; it must still have strong face contrast. Avoid muddy palettes and unrelated accent hues.
- Face: keep both eyes and the mouth fully inside the body with generous space around them and away from lids, bands, and other structural parts. Put the face near the upper-middle (eyes are often -15 to -45; mouth is often 10 to 40). Large pupils and highlights feel open and friendly; halfmoon eyes feel calm or sleepy; bean eyes feel playful. Ensure the pupil/face colour contrasts strongly with the body. Mouth details should never become the visual focal point unless the brief explicitly calls for that.
- Ears/horns/limbs: use ellipse or capsule, rotate the join toward the body, and set behindBody true so the join tucks under the silhouette. On capsule, pinch 0.3-0.7 narrows the join end.
- Strip: use for tape, lids, bands, and blank labels. For rect/strip only, corners can override cornerRadius. Example: [24,24,0,0] makes a top lid with rounded upper corners.
- Arc: a curved ribbon where width is the chord, height is thickness, and bend controls curve depth (0 is straight). Oversize it and set clipToBody true for stripes or markings that end cleanly at the body edge.
- Mirroring: set mirror true for a symmetric pair such as ears, arms, cheeks, or horns. Place the source part off-centre; do not also add the twin as another record.
- Layers: behindBody is for ears, tails, limbs, and anything tucked behind the body. aboveFace is only for something intentionally crossing in front of the face. Most markings use both false so the face remains readable.
- Field completeness: include corners, pinch, blobVariant, bend, and clipToBody on every part even when that shape does not use them; use null, 0, or false as appropriate. Use finite numbers, unique ids, opacity 1, and hidden/locked false unless the brief specifically requires otherwise.
- Expressions: include idle plus 2-4 personality-appropriate moods. Idle must use loop "infinite". Wink usually uses loop "once"; other moods usually use "infinite". Avoid including every expression.

## General concept translation
- First classify what makes the subject recognisable: its outer contour, one attached feature, a top/bottom feature, or a surface marking. Spend the body and first parts on those cues in that order.
- For manufactured objects, preserve functional geometry: tops align with tops, bands follow surfaces, and attached pieces visibly meet the body. Choose one coherent version of the object and never mix features from incompatible variants.
- For animals, plants, food, and other organic subjects, use the main mass as the body and add only the one or two features that distinguish the type. Simplify anatomy without replacing it with unrelated decoration.
- For weather, elemental, or abstract ideas, establish the core silhouette first and use one unmistakable secondary cue. Motion marks, trails, droplets, sparks, or wisps should read as effects—not accidental ears, antennae, or limbs.
- External parts must touch or slightly overlap the body at a believable join unless they are intentionally floating effects. Put tucked joins behind the body. Align structural parts precisely; reserve small rotations and asymmetry for expressive details.
- Do not confuse category with personality. A playful subject still needs accurate defining geometry; make it playful through face, proportions, pose-like asymmetry, and expressions.
- After assembling the character, remove each part mentally. If removing it does not weaken recognition or the requested personality, omit it from the JSON.

## Quality check
Silently verify all of the following before responding:
- The result clearly communicates the brief without relying on its name or nonexistent text.
- With the face mentally removed, the body and structural parts still read as the requested subject rather than a different object.
- The face is unobstructed, high-contrast, and positioned inside the body.
- The silhouette has one recognisable focal feature and is readable when small.
- Every part has a clear structural or expressive purpose; remove any filler decoration before output.
- All colours are six-digit hex strings, all ids are unique, all enum values are allowed, and all required fields are present.
- The response parses as strict JSON with no comments or trailing commas.

## Character brief
`

function preferenceLine(label: string, value?: string): string {
  const trimmed = value?.trim()
  return `- ${label}: ${trimmed || 'Not specified — make the strongest choice for the concept.'}`
}

export function buildGenerationPrompt(userRequest: string, preferences: GenerationPreferences = {}): string {
  const request = userRequest.trim() || 'Invent a delightful, broadly appealing mascot character.'
  return `${TEMPLATE}- Core idea: ${request}\n${preferenceLine('Personality / vibe', preferences.personality)}\n${preferenceLine('Palette mood', preferences.palette)}\n${preferenceLine('Extra must-haves or things to avoid', preferences.notes)}\n`
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
