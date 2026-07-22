import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { hashCode } from '../utilities';

export type MotionRef = RefObject<SVGGElement | null>;

export const STATE_TRANSITION_MS = 360;
export const STATE_SETTLE_MS = 120;

export const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export const transitionOptions = (duration: number): KeyframeAnimationOptions => ({
  duration,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fill: 'both',
  iterations: 1,
});

export const eventOptions = (
  duration: number,
  delay = 0,
  easing = 'cubic-bezier(0.37, 0, 0.63, 1)',
): KeyframeAnimationOptions => ({
  duration,
  delay,
  easing,
  fill: 'both',
  iterations: 1,
});

export const animate = (
  element: SVGElement | null,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation | null => {
  if (!element || typeof element.animate !== 'function') return null;
  return element.animate(keyframes, options);
};

export const captureAnimatedStyle = (
  element: SVGElement | null,
  property: 'opacity' | 'transform',
): string | null => {
  if (
    !element ||
    typeof window === 'undefined' ||
    typeof element.getAnimations !== 'function' ||
    element.getAnimations().length === 0
  ) {
    return null;
  }

  const value = window.getComputedStyle(element)[property];
  return value && value !== 'none' ? value : null;
};

export const captureAnimatedOpacity = (element: SVGElement | null): number | null => {
  const value = captureAnimatedStyle(element, 'opacity');
  if (value === null) return null;
  const opacity = Number.parseFloat(value);
  return Number.isFinite(opacity) ? opacity : null;
};

export const useReducedMotion = () => {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return reduced;
};

export const fallbackLevel = (name: string) => 0.42 + (hashCode(name) % 23) / 100;

export const createSeededRandom = (seed: number) => {
  let state = (seed || 1) >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
};

export const randomBetween = (random: () => number, minimum: number, maximum: number) =>
  minimum + (maximum - minimum) * random();

export const now = () =>
  typeof performance === 'undefined' ? Date.now() : performance.now();

export const cancelAnimations = (animations: Array<Animation | null>) => {
  animations.forEach((animation) => animation?.cancel());
};

export const createMotionRuntime = () => {
  const animations = new Set<Animation>();
  const timers = new Set<ReturnType<typeof setTimeout>>();

  return {
    track: (...items: Array<Animation | null>) => {
      items.forEach((item) => {
        if (!item) return;
        animations.add(item);
        item.addEventListener?.(
          'finish',
          () => {
            animations.delete(item);
            item.cancel();
          },
          { once: true },
        );
      });
    },
    schedule: (callback: () => void, delay: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        callback();
      }, Math.max(0, delay));
      timers.add(timer);
      return timer;
    },
    cancel: () => {
      timers.forEach((timer) => clearTimeout(timer));
      animations.forEach((animation) => animation.cancel());
      timers.clear();
      animations.clear();
    },
  };
};
