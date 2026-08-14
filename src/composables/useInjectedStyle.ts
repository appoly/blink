import { onBeforeUnmount, watchEffect, type Ref } from 'vue'

/** Keeps a <style> element in <head> in sync with a computed CSS string. */
export function useInjectedStyle(css: Ref<string>) {
  const el = document.createElement('style')
  document.head.appendChild(el)
  const stop = watchEffect(() => {
    el.textContent = css.value
  })
  onBeforeUnmount(() => {
    stop()
    el.remove()
  })
}
