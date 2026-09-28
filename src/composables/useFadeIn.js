/**
 * useFadeIn
 *
 * Adds `.visible` to each matched element with a staggered delay,
 * triggering the .fade-in CSS transition defined in animations.css.
 *
 * Port from livio-frontend. Default 25 ms stagger — fast enough to
 * feel snappy, slow enough to read the cascade.
 * Pass staggerMs=0 to animate all elements simultaneously.
 *
 * Usage:
 *   import { useFadeIn } from '@/composables/useFadeIn.js'
 *   onMounted(() => useFadeIn('.fade-in'))
 */
export function useFadeIn(selector = '.fade-in', staggerMs = 25) {
  document.querySelectorAll(selector).forEach((el, i) => {
    setTimeout(() => el.classList.add('visible'), i * staggerMs);
  });
}
