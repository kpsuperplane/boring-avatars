import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
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
  eyesOpen: MotionRef;
  eyesClosed: MotionRef;
  mouthRest: MotionRef;
  mouthMid: MotionRef;
  mouthOpen: MotionRef;
};

type MouthOpacities = {
  rest: number;
  mid: number;
  open: number;
};

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const loopOptions = (
  duration: number,
  delay = 0,
  easing = 'ease-in-out',
): KeyframeAnimationOptions => ({
  duration,
  delay,
  easing,
  fill: 'none',
  iterations: Infinity,
});

const transitionOptions = (duration: number): KeyframeAnimationOptions => ({
  duration,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fill: 'both',
  iterations: 1,
});

const animate = (
  element: SVGElement | null,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation | null => {
  if (!element || typeof element.animate !== 'function') return null;
  return element.animate(keyframes, options);
};

const captureAnimatedStyle = (
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

const captureAnimatedOpacity = (element: SVGElement | null): number | null => {
  const value = captureAnimatedStyle(element, 'opacity');
  if (value === null) return null;
  const opacity = Number.parseFloat(value);
  return Number.isFinite(opacity) ? opacity : null;
};

const useReducedMotion = () => {
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

export const marbleSecondaryPose = (activity: AvatarActivity) => {
  switch (activity) {
    case 'listening':
      return 'translate(0px, 1px) scale(0.98)';
    case 'thinking':
      return 'translate(-2px, 1px) rotate(0deg)';
    case 'speaking':
      return 'translate(0px, 0px) scale(1.02)';
    default:
      return 'translate(0px, 0px) scale(1)';
  }
};

const marbleRippleOpacity = (activity: AvatarActivity) => {
  if (activity === 'speaking') return 0.32;
  if (activity === 'idle') return 0.12;
  return 0;
};

export const beamBodyPose = (activity: AvatarActivity) => {
  switch (activity) {
    case 'listening':
      return 'translate(0px, 1px) scale(1.018)';
    case 'thinking':
      return 'translate(0px, 1px) rotate(-4deg) scale(0.995)';
    case 'speaking':
      return 'translate(0px, -1px) scale(1.018, 0.988)';
    default:
      return 'translate(0px, 0px) scale(1)';
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

export const beamMouthPose = (activity: AvatarActivity): MouthOpacities =>
  activity === 'speaking'
    ? { rest: 0, mid: 1, open: 0 }
    : { rest: 1, mid: 0, open: 0 };

const audioMouthPose = (level: number): MouthOpacities => {
  if (level <= 0.45) {
    const progress = level / 0.45;
    return { rest: 1 - progress, mid: progress, open: 0 };
  }

  const progress = (level - 0.45) / 0.55;
  return { rest: 0, mid: 1 - progress, open: progress };
};

const beamAnimatedMouthPose = (
  activity: AvatarActivity,
  audioLevel: number | undefined,
): MouthOpacities => {
  if (activity !== 'speaking' || audioLevel === undefined) return beamMouthPose(activity);
  return audioMouthPose(audioLevel);
};

const addOpacityTransition = (
  animations: Array<Animation | null>,
  element: SVGElement | null,
  from: number,
  to: number,
  duration: number,
) => {
  if (from === to) return;
  animations.push(
    animate(element, [{ opacity: from }, { opacity: to }], transitionOptions(duration)),
  );
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
  const previousActivity = useRef(activity);
  const currentFlow = useRef<string | null>(null);
  const currentSecondary = useRef<string | null>(null);
  const currentRippleOpacity = useRef<number | null>(null);

  useClientLayoutEffect(() => {
    const previous = previousActivity.current;
    previousActivity.current = activity;
    if (!animated || reduced) return;

    const seed = hashCode(name);
    const level = audioLevel ?? fallbackLevel(name);
    const animations: Array<Animation | null> = [];
    const flowFromCurrent = currentFlow.current;
    const secondaryFromCurrent = currentSecondary.current;
    const rippleFromCurrent = currentRippleOpacity.current;
    currentFlow.current = null;
    currentSecondary.current = null;
    currentRippleOpacity.current = null;
    const stateChanged = previous !== activity;
    const hasCurrentPose = flowFromCurrent !== null || secondaryFromCurrent !== null;
    const transitionDuration = stateChanged ? 360 : hasCurrentPose ? 140 : 0;
    const base = marblePose(activity);
    const secondaryBase = marbleSecondaryPose(activity);

    if (transitionDuration > 0) {
      animations.push(
        animate(
          flow.current,
          [{ transform: flowFromCurrent ?? marblePose(previous) }, { transform: base }],
          transitionOptions(transitionDuration),
        ),
        animate(
          secondary.current,
          [
            { transform: secondaryFromCurrent ?? marbleSecondaryPose(previous) },
            { transform: secondaryBase },
          ],
          transitionOptions(transitionDuration),
        ),
      );
    }

    if (stateChanged || rippleFromCurrent !== null) {
      addOpacityTransition(
        animations,
        ripple.current,
        rippleFromCurrent ?? marbleRippleOpacity(previous),
        marbleRippleOpacity(activity),
        transitionDuration || 140,
      );
    }

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
          loopOptions(duration, transitionDuration),
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
          loopOptions(7_200 + (seed % 5_300), transitionDuration),
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
          loopOptions(1_750 - level * 500, transitionDuration),
        ),
        animate(
          secondary.current,
          [
            { transform: secondaryBase },
            { transform: `translate(0px, 1px) scale(${0.965 - level * 0.025})` },
            { transform: secondaryBase },
          ],
          loopOptions(1_300 - level * 300, transitionDuration),
        ),
      );
    } else if (activity === 'thinking') {
      const duration = 4_600 + (seed % 1_100);
      animations.push(
        animate(
          flow.current,
          [
            { transform: base },
            { transform: 'translate(-2px, 2px) rotate(11deg) scale(1.025)' },
            { transform: 'translate(-1px, -2px) rotate(16deg) scale(1)' },
            { transform: base },
          ],
          loopOptions(duration, transitionDuration, 'linear'),
        ),
        animate(
          secondary.current,
          [
            { transform: secondaryBase },
            { transform: 'translate(2px, -2px) rotate(-7deg)' },
            { transform: 'translate(1px, 2px) rotate(-13deg)' },
            { transform: secondaryBase },
          ],
          loopOptions(duration * 0.82, transitionDuration, 'linear'),
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
          loopOptions(900 - level * 280, transitionDuration),
        ),
        animate(
          ripple.current,
          [
            { opacity: 0.38, transform: 'scale(0.78)' },
            { opacity: 0, transform: `scale(${1.06 + level * 0.12})` },
          ],
          loopOptions(1_150 - level * 350, transitionDuration),
        ),
      );
    }

    return () => {
      currentFlow.current = captureAnimatedStyle(flow.current, 'transform');
      currentSecondary.current = captureAnimatedStyle(secondary.current, 'transform');
      currentRippleOpacity.current = captureAnimatedOpacity(ripple.current);
      animations.forEach((animation) => animation?.cancel());
    };
  }, [activity, animated, audioLevel, flow, name, reduced, ripple, secondary]);
};

export const useBeamMotion = ({
  activity,
  animated,
  audioLevel,
  name,
  body,
  face,
  eyesOpen,
  eyesClosed,
  mouthRest,
  mouthMid,
  mouthOpen,
}: BeamMotion) => {
  const reduced = useReducedMotion();
  const previousActivity = useRef(activity);
  const previousAudioLevel = useRef<number | undefined>(undefined);
  const currentBody = useRef<string | null>(null);
  const currentFace = useRef<string | null>(null);
  const currentMouth = useRef<MouthOpacities | null>(null);

  useClientLayoutEffect(() => {
    const previous = previousActivity.current;
    const previousAudio = previousAudioLevel.current;
    previousActivity.current = activity;
    previousAudioLevel.current = audioLevel;
    if (!animated || reduced) return;

    const seed = hashCode(name);
    const level = audioLevel ?? fallbackLevel(name);
    const animations: Array<Animation | null> = [];
    const bodyFromCurrent = currentBody.current;
    const faceFromCurrent = currentFace.current;
    const mouthFromCurrent = currentMouth.current;
    currentBody.current = null;
    currentFace.current = null;
    currentMouth.current = null;
    const stateChanged = previous !== activity;
    const hasCurrentPose = bodyFromCurrent !== null || faceFromCurrent !== null;
    const transitionDuration = stateChanged ? 360 : hasCurrentPose ? 140 : 0;
    const bodyBase = beamBodyPose(activity);
    const faceBase = beamFacePose(activity);

    if (transitionDuration > 0) {
      animations.push(
        animate(
          body.current,
          [{ transform: bodyFromCurrent ?? beamBodyPose(previous) }, { transform: bodyBase }],
          transitionOptions(transitionDuration),
        ),
        animate(
          face.current,
          [{ transform: faceFromCurrent ?? beamFacePose(previous) }, { transform: faceBase }],
          transitionOptions(transitionDuration),
        ),
      );
    }

    const fromMouth = mouthFromCurrent ?? beamAnimatedMouthPose(previous, previousAudio);
    const toMouth = beamAnimatedMouthPose(activity, audioLevel);
    const mouthDuration = stateChanged ? transitionDuration : 140;
    addOpacityTransition(animations, mouthRest.current, fromMouth.rest, toMouth.rest, mouthDuration);
    addOpacityTransition(animations, mouthMid.current, fromMouth.mid, toMouth.mid, mouthDuration);
    addOpacityTransition(animations, mouthOpen.current, fromMouth.open, toMouth.open, mouthDuration);

    if (activity === 'idle') {
      const blinkDuration = 4_900 + (seed % 4_700);
      animations.push(
        animate(
          body.current,
          [
            { transform: bodyBase },
            { transform: 'translate(0px, -0.5px) scale(1.009, 0.996)' },
            { transform: bodyBase },
          ],
          loopOptions(4_200 + (seed % 1_400), transitionDuration),
        ),
        animate(
          eyesOpen.current,
          [
            { opacity: 1, offset: 0 },
            { opacity: 1, offset: 0.72 },
            { opacity: 0, offset: 0.75 },
            { opacity: 1, offset: 0.79 },
            { opacity: 1, offset: 1 },
          ],
          loopOptions(blinkDuration, transitionDuration),
        ),
        animate(
          eyesClosed.current,
          [
            { opacity: 0, offset: 0 },
            { opacity: 0, offset: 0.72 },
            { opacity: 1, offset: 0.75 },
            { opacity: 0, offset: 0.79 },
            { opacity: 0, offset: 1 },
          ],
          loopOptions(blinkDuration, transitionDuration),
        ),
        animate(
          face.current,
          [
            { transform: faceBase, offset: 0 },
            { transform: faceBase, offset: 0.58 },
            { transform: 'translate(1.2px, 0px)', offset: 0.68 },
            { transform: faceBase, offset: 0.78 },
            { transform: faceBase, offset: 1 },
          ],
          loopOptions(6_300 + (seed % 3_200), transitionDuration),
        ),
      );
    } else if (activity === 'listening') {
      animations.push(
        animate(
          body.current,
          [
            { transform: bodyBase },
            { transform: `translate(0px, ${0.5 - level}px) scale(${1.018 + level * 0.014})` },
            { transform: bodyBase },
          ],
          loopOptions(1_700 - level * 350, transitionDuration),
        ),
        animate(
          face.current,
          [
            { transform: faceBase },
            { transform: `translate(0px, ${0.5 + level * 0.5}px)` },
            { transform: faceBase },
          ],
          loopOptions(1_500 - level * 250, transitionDuration),
        ),
      );
    } else if (activity === 'thinking') {
      animations.push(
        animate(
          body.current,
          [
            { transform: bodyBase },
            { transform: 'translate(0px, 0px) rotate(2deg) scale(1.003)' },
            { transform: bodyBase },
          ],
          loopOptions(4_800 + (seed % 900), transitionDuration),
        ),
        animate(
          face.current,
          [
            { transform: faceBase },
            { transform: 'translate(-1px, -2px) rotate(-1deg)' },
            { transform: faceBase },
          ],
          loopOptions(4_100 + (seed % 700), transitionDuration),
        ),
      );
    } else {
      animations.push(
        animate(
          body.current,
          [
            { transform: bodyBase },
            { transform: `translate(0px, ${-1.2 - level * 0.7}px) scale(${1.016 + level * 0.012}, ${0.99 - level * 0.012})` },
            { transform: 'translate(0px, 0px) scale(0.998, 1.008)' },
            { transform: bodyBase },
          ],
          loopOptions(720 - level * 220, transitionDuration),
        ),
      );

      if (audioLevel === undefined) {
        const cadence = 560 - level * 120;
        animations.push(
          animate(
            mouthRest.current,
            [{ opacity: 0.2 }, { opacity: 0 }, { opacity: 0.4 }, { opacity: 0.2 }],
            loopOptions(cadence, transitionDuration),
          ),
          animate(
            mouthMid.current,
            [{ opacity: 0.8 }, { opacity: 0.2 }, { opacity: 0.6 }, { opacity: 0.8 }],
            loopOptions(cadence, transitionDuration),
          ),
          animate(
            mouthOpen.current,
            [{ opacity: 0 }, { opacity: 0.8 }, { opacity: 0 }, { opacity: 0 }],
            loopOptions(cadence, transitionDuration),
          ),
        );
      }
    }

    return () => {
      currentBody.current = captureAnimatedStyle(body.current, 'transform');
      currentFace.current = captureAnimatedStyle(face.current, 'transform');
      const rest = captureAnimatedOpacity(mouthRest.current);
      const mid = captureAnimatedOpacity(mouthMid.current);
      const open = captureAnimatedOpacity(mouthOpen.current);
      currentMouth.current =
        rest === null && mid === null && open === null
          ? null
          : {
              rest: rest ?? beamMouthPose(activity).rest,
              mid: mid ?? beamMouthPose(activity).mid,
              open: open ?? beamMouthPose(activity).open,
            };
      animations.forEach((animation) => animation?.cancel());
    };
  }, [
    activity,
    animated,
    audioLevel,
    body,
    eyesClosed,
    eyesOpen,
    face,
    mouthMid,
    mouthOpen,
    mouthRest,
    name,
    reduced,
  ]);
};
