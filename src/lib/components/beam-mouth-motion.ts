import {
  animate,
  eventOptions,
  transitionOptions,
  type MotionRef,
} from './motion-core';
import type { MouthOpacities, RestingMouthPaths } from './beam-poses';

export type MouthShape = keyof MouthOpacities;

type MouthRefs = {
  mouthRest: MotionRef;
  mouthSmile: MotionRef;
  mouthMid: MotionRef;
  mouthOpen: MotionRef;
};

export const mouthPose = (shape: MouthShape): MouthOpacities => ({
  rest: shape === 'rest' || shape === 'smile' ? 1 : 0,
  smile: 0,
  mid: shape === 'mid' ? 1 : 0,
  open: shape === 'open' ? 1 : 0,
});

export const selectMouthShape = (level: number, current: MouthShape): MouthShape => {
  if (current === 'rest') return level >= 0.16 ? 'mid' : 'rest';
  if (current === 'open') return level < 0.5 ? 'mid' : 'open';
  if (level < 0.09) return 'rest';
  if (level > 0.66) return 'open';
  return 'mid';
};

const mouthElements = (refs: MouthRefs): Record<MouthShape, MotionRef> => ({
  rest: refs.mouthRest,
  smile: refs.mouthSmile,
  mid: refs.mouthMid,
  open: refs.mouthOpen,
});

export const animateMouth = (
  refs: MouthRefs,
  from: MouthOpacities,
  to: MouthOpacities,
  duration: number,
) => {
  const elements = mouthElements(refs);
  return (Object.keys(elements) as MouthShape[])
    .filter((shape) => from[shape] !== to[shape])
    .map((shape) =>
      animate(
        elements[shape].current,
        [{ opacity: from[shape] }, { opacity: to[shape] }],
        transitionOptions(duration),
      ),
    );
};

export const animateMouthPulse = (
  refs: MouthRefs,
  target: MouthOpacities,
  duration: number,
) => {
  const neutral = mouthPose('mid');
  const elements = mouthElements(refs);
  return (Object.keys(elements) as MouthShape[])
    .filter((shape) => neutral[shape] !== target[shape])
    .map((shape) =>
      animate(
        elements[shape].current,
        [{ opacity: neutral[shape] }, { opacity: target[shape] }, { opacity: neutral[shape] }],
        eventOptions(duration),
      ),
    );
};

export const animateMouthPause = (refs: MouthRefs, duration: number) => {
  const neutral = mouthPose('mid');
  const closed = mouthPose('rest');
  const elements = mouthElements(refs);
  const frames = (shape: MouthShape): Keyframe[] => [
    { opacity: neutral[shape], offset: 0 },
    { opacity: closed[shape], offset: 0.12 },
    { opacity: closed[shape], offset: 0.88 },
    { opacity: neutral[shape], offset: 1 },
  ];
  return (Object.keys(elements) as MouthShape[])
    .filter((shape) => neutral[shape] !== closed[shape])
    .map((shape) => animate(elements[shape].current, frames(shape), eventOptions(duration)));
};

export const animateRestingMouthMorph = (
  mouth: SVGPathElement | null,
  paths: RestingMouthPaths,
  restingShape: Extract<MouthShape, 'rest' | 'smile'>,
  duration: number,
) => {
  const alternateShape = restingShape === 'rest' ? 'smile' : 'rest';
  const path = (shape: 'rest' | 'smile') => `path("${paths[shape]}")`;
  return animate(
    mouth,
    [
      { d: path(restingShape), offset: 0 },
      { d: path(alternateShape), offset: 0.16 },
      { d: path(alternateShape), offset: 0.78 },
      { d: path(restingShape), offset: 1 },
    ],
    eventOptions(duration),
  );
};
