import { useEffect, useState, type RefObject } from 'react';
import { hashCode } from '../utilities';
import type { AvatarActivity } from './types';

type MotionRef = RefObject<SVGGElement | null>;

type CommonMotion = {
  activity: AvatarActivity;
  animated: boolean;
  audioLevel: number | undefined;
  name: string;
};

type MarbleMotion = CommonMotion & {
  flow: MotionRef;
  secondary: MotionRef;
  ripple: MotionRef;
};

type BeamMotion = CommonMotion & {
  body: MotionRef;
  face: MotionRef;
  eyes: MotionRef;
  mouth: MotionRef;
};

const animationOptions = (duration: number): KeyframeAnimationOptions => ({
  duration,
  easing: 'ease-in-out',
  fill: 'both',
  iterations: Infinity,
});

const animate = (
  element: SVGElement | null,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation | null => {
  if (!element || typeof element.animate !== 'function') return null;
  return element.animate(keyframes, options);
};

const useReducedMotion = () => {
  // The server starts stopped; the browser reads the preference during hydration,
  // and useEffect is still the first point where animations can be created.
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

const fallbackLevel = (name: string) => 0.42 + (hashCode(name) % 23) / 100;

export const marblePose = (activity: AvatarActivity) => {
  switch (activity) {
    case 'listening':
      return 'translate(0px, 1px) scale(0.95)';
    case 'thinking':
      return 'translate(2px, -1px) rotate(6deg) scale(1.01)';
    case 'speaking':
      return 'translate(0px, -1px) scale(1.04)';
    default:
      return 'translate(0px, 0px) scale(1)';
  }
};

export const beamBodyPose = (activity: AvatarActivity) => {
  switch (activity) {
    case 'listening':
      return 'translate(0px, 1px) scale(1.025)';
    case 'thinking':
      return 'translate(0px, 1px) rotate(-5deg) scale(0.99)';
    case 'speaking':
      return 'translate(0px, -1px) scale(1.025, 0.98)';
    default:
      return 'translate(0px, 1px) scale(1)';
  }
};

export const beamFacePose = (activity: AvatarActivity) => {
  switch (activity) {
    case 'listening':
      return 'translate(0px, 1px)';
    case 'thinking':
      return 'translate(2px, -3px) rotate(2deg)';
    case 'speaking':
      return 'translate(0px, 1px)';
    default:
      return 'translate(0px, 0px)';
  }
};

export const useMarbleMotion = ({
  activity,
  animated,
  audioLevel,
  name,
  flow,
  secondary,
  ripple,
}: MarbleMotion) => {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!animated || reduced) return;

    const seed = hashCode(name);
    const level = audioLevel ?? fallbackLevel(name);
    const animations: Array<Animation | null> = [];
    const base = marblePose(activity);

    if (activity === 'idle') {
      const duration = 8_000 + (seed % 3_500);
      animations.push(
        animate(
          flow.current,
          [
            { transform: base },
            { transform: 'translate(1.5px, -1px) rotate(2deg) scale(1.015)' },
            { transform: 'translate(-1px, 1px) rotate(-1deg) scale(0.995)' },
            { transform: base },
          ],
          animationOptions(duration),
        ),
        animate(
          ripple.current,
          [
            { opacity: 0, transform: 'scale(0.82)', offset: 0 },
            { opacity: 0, transform: 'scale(0.82)', offset: 0.68 },
            { opacity: 0.28, transform: 'scale(0.98)', offset: 0.76 },
            { opacity: 0, transform: 'scale(1.14)', offset: 0.88 },
            { opacity: 0, transform: 'scale(1.14)', offset: 1 },
          ],
          animationOptions(7_200 + (seed % 5_300)),
        ),
      );
    } else if (activity === 'listening') {
      const contraction = 0.94 - level * 0.045;
      animations.push(
        animate(
          flow.current,
          [
            { transform: base },
            { transform: `translate(0px, 1px) scale(${contraction})` },
            { transform: base },
          ],
          animationOptions(1_750 - level * 500),
        ),
        animate(
          secondary.current,
          [
            { transform: 'translate(0px, 0px) scale(1)' },
            { transform: `translate(0px, 1px) scale(${0.98 - level * 0.035})` },
            { transform: 'translate(0px, 0px) scale(1)' },
          ],
          animationOptions(1_300 - level * 300),
        ),
      );
    } else if (activity === 'thinking') {
      const duration = 4_600 + (seed % 1_100);
      animations.push(
        animate(
          flow.current,
          [
            { transform: 'translate(2px, -1px) rotate(6deg) scale(1.01)' },
            { transform: 'translate(-2px, 2px) rotate(11deg) scale(1.025)' },
            { transform: 'translate(-1px, -2px) rotate(16deg) scale(1)' },
            { transform: 'translate(2px, -1px) rotate(6deg) scale(1.01)' },
          ],
          { ...animationOptions(duration), easing: 'linear' },
        ),
        animate(
          secondary.current,
          [
            { transform: 'translate(-2px, 1px) rotate(0deg)' },
            { transform: 'translate(2px, -2px) rotate(-7deg)' },
            { transform: 'translate(1px, 2px) rotate(-13deg)' },
            { transform: 'translate(-2px, 1px) rotate(0deg)' },
          ],
          { ...animationOptions(duration * 0.82), easing: 'linear' },
        ),
      );
    } else {
      const expansion = 1.035 + level * 0.075;
      animations.push(
        animate(
          flow.current,
          [
            { transform: base },
            { transform: `translate(0px, -1.5px) scale(${expansion}, ${1 + level * 0.035})` },
            { transform: `translate(1px, 0px) scale(${1.02 + level * 0.025})` },
            { transform: base },
          ],
          animationOptions(900 - level * 280),
        ),
        animate(
          ripple.current,
          [
            { opacity: 0.38, transform: 'scale(0.78)' },
            { opacity: 0, transform: `scale(${1.06 + level * 0.12})` },
          ],
          animationOptions(1_150 - level * 350),
        ),
      );
    }

    return () => animations.forEach((animation) => animation?.cancel());
  }, [activity, animated, audioLevel, flow, name, reduced, ripple, secondary]);
};

export const useBeamMotion = ({
  activity,
  animated,
  audioLevel,
  name,
  body,
  face,
  eyes,
  mouth,
}: BeamMotion) => {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!animated || reduced) return;

    const seed = hashCode(name);
    const level = audioLevel ?? fallbackLevel(name);
    const animations: Array<Animation | null> = [];
    const bodyBase = beamBodyPose(activity);
    const faceBase = beamFacePose(activity);

    if (activity === 'idle') {
      animations.push(
        animate(
          body.current,
          [
            { transform: bodyBase },
            { transform: 'translate(0px, 0px) scale(1.012, 0.995)' },
            { transform: bodyBase },
          ],
          animationOptions(4_200 + (seed % 1_400)),
        ),
        animate(
          eyes.current,
          [
            { transform: 'scaleY(1)', offset: 0 },
            { transform: 'scaleY(1)', offset: 0.72 },
            { transform: 'scaleY(0.08)', offset: 0.75 },
            { transform: 'scaleY(1)', offset: 0.79 },
            { transform: 'scaleY(1)', offset: 1 },
          ],
          animationOptions(4_900 + (seed % 4_700)),
        ),
        animate(
          face.current,
          [
            { transform: faceBase, offset: 0 },
            { transform: faceBase, offset: 0.58 },
            { transform: 'translate(1.3px, 0px)', offset: 0.68 },
            { transform: faceBase, offset: 0.78 },
            { transform: faceBase, offset: 1 },
          ],
          animationOptions(6_300 + (seed % 3_200)),
        ),
      );
    } else if (activity === 'listening') {
      animations.push(
        animate(
          body.current,
          [
            { transform: bodyBase },
            { transform: `translate(0px, ${0.5 - level}px) scale(${1.025 + level * 0.018})` },
            { transform: bodyBase },
          ],
          animationOptions(1_700 - level * 350),
        ),
        animate(
          face.current,
          [
            { transform: faceBase },
            { transform: `translate(0px, ${0.5 + level * 0.7}px)` },
            { transform: faceBase },
          ],
          animationOptions(1_500 - level * 250),
        ),
      );
    } else if (activity === 'thinking') {
      animations.push(
        animate(
          body.current,
          [
            { transform: 'translate(0px, 1px) rotate(-5deg) scale(0.99)' },
            { transform: 'translate(0px, 0px) rotate(2deg) scale(1.005)' },
            { transform: 'translate(0px, 1px) rotate(-5deg) scale(0.99)' },
          ],
          animationOptions(4_800 + (seed % 900)),
        ),
        animate(
          face.current,
          [
            { transform: 'translate(2px, -3px) rotate(2deg)' },
            { transform: 'translate(-1px, -2px) rotate(-1deg)' },
            { transform: 'translate(2px, -3px) rotate(2deg)' },
          ],
          animationOptions(4_100 + (seed % 700)),
        ),
      );
    } else {
      const open = 0.7 + level * 1.25;
      animations.push(
        animate(
          body.current,
          [
            { transform: bodyBase },
            { transform: `translate(0px, ${-1.3 - level}px) scale(${1.02 + level * 0.018}, ${0.985 - level * 0.018})` },
            { transform: 'translate(0px, 0px) scale(0.995, 1.015)' },
            { transform: bodyBase },
          ],
          animationOptions(720 - level * 220),
        ),
        animate(
          mouth.current,
          [
            { transform: 'scaleY(0.45)' },
            { transform: `scaleY(${open})` },
            { transform: 'scaleY(0.65)' },
          ],
          animationOptions(520 - level * 170),
        ),
      );
    }

    return () => animations.forEach((animation) => animation?.cancel());
  }, [activity, animated, audioLevel, body, eyes, face, mouth, name, reduced]);
};
