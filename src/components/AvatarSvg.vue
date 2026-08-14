<script lang="ts">
import { computed, defineComponent, h, type PropType, type VNode } from 'vue'
import type { AvatarProject } from '../types/avatar'
import { buildAvatar, type SvgNode } from '../lib/render'

/**
 * Renders an avatar from project state via the shared node-tree builder —
 * the same geometry the exporter serialises, so previews match exports.
 * With `bare`, renders a <g> for embedding inside the editor canvas svg.
 */
export default defineComponent({
  name: 'AvatarSvg',
  props: {
    project: { type: Object as PropType<AvatarProject>, required: true },
    idPrefix: { type: String, default: 'ed' },
    bare: { type: Boolean, default: false },
  },
  setup(props) {
    const render = computed(() => buildAvatar(props.project, props.idPrefix))

    const renderNode = (node: SvgNode): VNode =>
      h(node.tag, node.attrs, (node.children ?? []).map(renderNode))

    return () => {
      const children = render.value.nodes.map(renderNode)
      if (props.bare) return h('g', {}, children)
      return h(
        'svg',
        {
          viewBox: render.value.viewBox,
          xmlns: 'http://www.w3.org/2000/svg',
          style: 'display: block; width: 100%; height: 100%; overflow: visible;',
        },
        children,
      )
    }
  },
})
</script>
