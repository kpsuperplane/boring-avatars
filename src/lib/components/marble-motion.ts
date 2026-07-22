import { useRef, type RefObject } from 'react';
import type { AvatarActivity } from './types';
import {
  createMarbleFlowEvent,
  createMarbleFlowState,
  createMarblePressurePath,
  cssPath,
  stateToPaths,
  type MarbleFlowState,
} from './marble-flow-field';
import {
  STATE_SETTLE_MS,
  STATE_TRANSITION_MS,
  animate,
  cancelAnimations,
  createMotionRuntime,
  createSeededRandom,
  eventOptions,
  fallbackLevel,
  now,
  randomBetween,
  transitionOptions,
  useClientLayoutEffect,
  useReducedMotion,
} from './motion-core';

type PathRef = RefObject<SVGPathElement | null>;

type MarbleMotion = {
  activity: AvatarActivity;
  animated: boolean;
  audioLevel: number | undefined;
  name: string;
  seed: number;
  dyeA: PathRef;
  dyeB: PathRef;
  dyeC: PathRef;
  pressure: PathRef;
};

type CapturedPaths = [string | null, string | null, string | null];

export const marbleRippleOpacity = (activity: AvatarActivity) =>
  activity === 'speaking' ? 0.1 : activity === 'listening' ? 0.045 : 0;

const captureAnimatedPath = (element: SVGPathElement | null): string | null => {
  if (!element) return null;
  if (typeof window !== 'undefined') {
    const rendered = window.getComputedStyle(element).getPropertyValue('d');
    if (rendered && rendered !== 'none') return rendered;
  }
  const path = element.getAttribute('d');
  return path ? cssPath(path) : null;
};

const captureRenderedOpacity = (element: SVGPathElement | null): number | null => {
  if (!element) return null;
  const value =
    typeof window === 'undefined'
      ? element.getAttribute('opacity')
      : window.getComputedStyle(element).opacity;
  const opacity = Number.parseFloat(value ?? '');
  return Number.isFinite(opacity) ? opacity : null;
};

const pathFrames = (frames: string[]): Keyframe[] =>
  frames.map((frame, index) => ({
    d: cssPath(frame),
    offset: index / (frames.length - 1),
  }));

const animatePath = (
  element: SVGPathElement | null,
  frames: string[],
  duration: number,
) => {
  if (!element || frames.length < 2) return null;
  element.setAttribute('d', frames[frames.length - 1]);
  return animate(
    element,
    pathFrames(frames),
    eventOptions(duration, 0, 'linear'),
  );
};

const transitionPath = (
  element: SVGPathElement | null,
  from: string,
  to: string,
  duration: number,
) => {
  if (!element) return null;
  element.setAttribute('d', to);
  return animate(
    element,
    [{ d: from }, { d: cssPath(to) }],
    transitionOptions(duration),
  );
};

const pressureOpacity = (activity: AvatarActivity, level: number) => {
  const response = activity === 'speaking' ? level * 0.22 : level * 0.13;
  return marbleRippleOpacity(activity) + response;
};

export const useMarbleMotion = ({
  activity,
  animated,
  audioLevel,
  name,
  seed,
  dyeA,
  dyeB,
  dyeC,
  pressure,
}: MarbleMotion) => {
  const reduced = useReducedMotion();
  const previousActivity = useRef(activity);
  const previousAnimated = useRef(animated);
  const previousAudioLevel = useRef(audioLevel ?? 0);
  const currentPaths = useRef<CapturedPaths>([null, null, null]);
  const currentPressurePath = useRef<string | null>(null);
  const currentPressureOpacity = useRef<number | null>(null);
  const audioPressurePath = useRef<string | null>(null);
  const audioPressureOpacity = useRef<number | null>(null);
  const lastAudioResponseAt = useRef(0);
  const stateReadyAt = useRef(now() + STATE_SETTLE_MS);
  const hasAudio = audioLevel !== undefined;

  useClientLayoutEffect(() => {
    const previous = previousActivity.current;
    const wasAnimated = previousAnimated.current;
    previousActivity.current = activity;
    previousAnimated.current = animated;
    if (reduced) return;

    const settling = wasAnimated && !animated;
    if (!animated && !settling) return;

    const runtime = createMotionRuntime();
    const random = createSeededRandom(seed ^ 0x6d617262);
    const targetState = createMarbleFlowState(seed, activity);
    const targetPaths = stateToPaths(targetState);
    const previousPaths = stateToPaths(createMarbleFlowState(seed, previous));
    const fromPaths = currentPaths.current.map(
      (path, index) => path ?? cssPath(previousPaths[index]),
    ) as [string, string, string];
    const targetPressurePath = createMarblePressurePath(seed, activity, 0);
    const previousPressurePath = createMarblePressurePath(seed, previous, 0);
    const fromPressurePath = currentPressurePath.current ?? cssPath(previousPressurePath);
    const fromPressureOpacity =
      currentPressureOpacity.current ?? marbleRippleOpacity(previous);
    const stateChanged = previous !== activity;
    currentPaths.current = [null, null, null];
    currentPressurePath.current = null;
    currentPressureOpacity.current = null;
    if (stateChanged) {
      audioPressurePath.current = cssPath(targetPressurePath);
      audioPressureOpacity.current = marbleRippleOpacity(activity);
      lastAudioResponseAt.current = 0;
    }
    const hasCurrentPose = fromPaths.some((path, index) => path !== cssPath(previousPaths[index]));
    const transitionDuration = stateChanged
      ? STATE_TRANSITION_MS
      : settling && hasCurrentPose
        ? 360
        : hasCurrentPose
          ? 180
          : 0;
    stateReadyAt.current = now() + transitionDuration + STATE_SETTLE_MS;

    if (transitionDuration > 0) {
      if (pressure.current) {
        pressure.current.setAttribute('d', targetPressurePath);
        pressure.current.setAttribute('opacity', String(marbleRippleOpacity(activity)));
      }
      runtime.track(
        transitionPath(dyeA.current, fromPaths[0], targetPaths[0], transitionDuration),
        transitionPath(dyeB.current, fromPaths[1], targetPaths[1], transitionDuration),
        transitionPath(dyeC.current, fromPaths[2], targetPaths[2], transitionDuration),
        animate(
          pressure.current,
          [
            { d: fromPressurePath, opacity: fromPressureOpacity },
            {
              d: cssPath(targetPressurePath),
              opacity: marbleRippleOpacity(activity),
            },
          ],
          transitionOptions(transitionDuration),
        ),
      );
    }

    let flowState: MarbleFlowState = targetState;
    let eventIndex = 0;
    const runFlowEvent = () => {
      const event = createMarbleFlowEvent(flowState, seed, activity, eventIndex);
      flowState = event.finalState;
      eventIndex += 1;
      const contourFrames = [0, 1, 2].map((contourIndex) =>
        event.frames.map((frame) => frame[contourIndex]),
      );
      runtime.track(
        animatePath(dyeA.current, contourFrames[0], event.duration),
        animatePath(dyeB.current, contourFrames[1], event.duration),
        animatePath(dyeC.current, contourFrames[2], event.duration),
      );
      runtime.schedule(runFlowEvent, event.duration);
    };

    const runFallbackSpeechPulse = () => {
      const level = fallbackLevel(name) * randomBetween(random, 0.82, 1.08);
      const basePath = createMarblePressurePath(seed, activity, 0);
      const mediumPath = createMarblePressurePath(seed, activity, level * 0.62);
      const strongPath = createMarblePressurePath(seed, activity, level);
      const duration = randomBetween(random, 1_200, 2_000);
      if (pressure.current) {
        pressure.current.setAttribute('d', basePath);
        pressure.current.setAttribute('opacity', String(marbleRippleOpacity(activity)));
      }
      runtime.track(
        animate(
          pressure.current,
          [
            { d: cssPath(basePath), opacity: 0.08, offset: 0 },
            { d: cssPath(mediumPath), opacity: pressureOpacity(activity, level * 0.62), offset: 0.28 },
            { d: cssPath(strongPath), opacity: pressureOpacity(activity, level), offset: 0.52 },
            { d: cssPath(mediumPath), opacity: pressureOpacity(activity, level * 0.48), offset: 0.74 },
            { d: cssPath(basePath), opacity: marbleRippleOpacity(activity), offset: 1 },
          ],
          eventOptions(duration, 0, 'cubic-bezier(0.37, 0, 0.63, 1)'),
        ),
      );
      runtime.schedule(
        runFallbackSpeechPulse,
        duration + randomBetween(random, 180, 520),
      );
    };

    const firstEventDelay = transitionDuration + STATE_SETTLE_MS;
    if (animated) {
      runtime.schedule(runFlowEvent, firstEventDelay);
      if (activity === 'speaking' && !hasAudio) {
        runtime.schedule(runFallbackSpeechPulse, firstEventDelay);
      }
    }

    return () => {
      currentPaths.current = [
        captureAnimatedPath(dyeA.current),
        captureAnimatedPath(dyeB.current),
        captureAnimatedPath(dyeC.current),
      ];
      currentPressurePath.current = captureAnimatedPath(pressure.current);
      currentPressureOpacity.current = captureRenderedOpacity(pressure.current);
      runtime.cancel();
    };
  }, [activity, animated, dyeA, dyeB, dyeC, hasAudio, name, pressure, reduced, seed]);

  useClientLayoutEffect(() => {
    const previousLevel = previousAudioLevel.current;
    const level = Math.min(1, Math.max(0, audioLevel ?? 0));
    previousAudioLevel.current = level;
    if (!animated || reduced || audioLevel === undefined) return;
    if (activity !== 'listening' && activity !== 'speaking') return;

    const animations: Array<Animation | null> = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startResponse = () => {
      const timestamp = now();
      if (timestamp - lastAudioResponseAt.current < 320) return;
      lastAudioResponseAt.current = timestamp;
      const targetPath = createMarblePressurePath(seed, activity, level);
      const fromPath =
        audioPressurePath.current ??
        cssPath(createMarblePressurePath(seed, activity, previousLevel));
      const fromOpacity =
        audioPressureOpacity.current ?? pressureOpacity(activity, previousLevel);
      const duration = level > previousLevel ? 140 : 260;
      audioPressurePath.current = cssPath(targetPath);
      audioPressureOpacity.current = pressureOpacity(activity, level);
      if (pressure.current) {
        pressure.current.setAttribute('d', targetPath);
        pressure.current.setAttribute('opacity', String(pressureOpacity(activity, level)));
      }
      animations.push(
        animate(
          pressure.current,
          [
            { d: fromPath, opacity: fromOpacity },
            { d: cssPath(targetPath), opacity: pressureOpacity(activity, level) },
          ],
          eventOptions(duration, 0, 'cubic-bezier(0.33, 1, 0.68, 1)'),
        ),
      );
    };

    const responseDelay = Math.max(0, stateReadyAt.current - now());
    if (responseDelay > 0) timer = setTimeout(startResponse, responseDelay);
    else startResponse();

    return () => {
      if (timer) clearTimeout(timer);
      cancelAnimations(animations);
    };
  }, [activity, animated, audioLevel, pressure, reduced, seed]);
};
