import { useEffect, useRef, type RefObject } from 'react';
import { hashCode } from '../utilities';
import type { AvatarActivity } from './types';
import {
  animateMouth,
  animateMouthPause,
  animateMouthPulse,
  animateRestingMouthMorph,
  mouthPose,
  selectMouthShape,
  type MouthShape,
} from './beam-mouth-motion';
import {
  beamBodyPose,
  beamCharacterPose,
  beamFacePose,
  beamGazePose,
  beamShadowOpacity,
  beamShadowPose,
  type MouthOpacities,
  type RestingMouthPaths,
} from './beam-poses';
import { createLongFollowEvent, createPeekEvent, createRollEvent } from './beam-room-events';
import { createThinkingEvent } from './beam-thinking-events';
import {
  STATE_SETTLE_MS,
  STATE_TRANSITION_MS,
  animate,
  cancelAnimations,
  captureAnimatedOpacity,
  captureAnimatedStyle,
  createMotionRuntime,
  createSeededRandom,
  eventOptions,
  now,
  randomBetween,
  transitionOptions,
  useClientLayoutEffect,
  useReducedMotion,
  type MotionRef,
} from './motion-core';

export {
  beamBodyPose,
  beamCharacterPose,
  beamFacePose,
  beamGazePose,
  beamMouthPose,
  beamRestingMouthPaths,
  beamShadowOpacity,
  beamShadowPose,
} from './beam-poses';

type BeamMotion = {
  activity: AvatarActivity;
  animated: boolean;
  audioLevel: number | undefined;
  name: string;
  isCircle: boolean;
  character: MotionRef;
  shadow: RefObject<SVGEllipseElement | null>;
  body: MotionRef;
  face: MotionRef;
  gaze: MotionRef;
  eyesOpen: MotionRef;
  eyesClosed: MotionRef;
  mouthRest: MotionRef;
  mouthSmile: MotionRef;
  mouthMorph: RefObject<SVGPathElement | null>;
  mouthPaths: RestingMouthPaths;
  mouthMid: MotionRef;
  mouthOpen: MotionRef;
};

export const useBeamMotion = ({
  activity,
  animated,
  audioLevel,
  name,
  isCircle,
  character,
  shadow,
  body,
  face,
  gaze,
  eyesOpen,
  eyesClosed,
  mouthRest,
  mouthSmile,
  mouthMorph,
  mouthPaths,
  mouthMid,
  mouthOpen,
}: BeamMotion) => {
  const reduced = useReducedMotion();
  const previousActivity = useRef(activity);
  const previousAnimated = useRef(animated);
  const currentCharacter = useRef<string | null>(null);
  const currentShadow = useRef<string | null>(null);
  const currentShadowOpacity = useRef<number | null>(null);
  const currentBody = useRef<string | null>(null);
  const currentFace = useRef<string | null>(null);
  const currentGaze = useRef<string | null>(null);
  const currentMouth = useRef<MouthOpacities | null>(null);
  const restingShape: Extract<MouthShape, 'rest' | 'smile'> =
    hashCode(name) % 2 === 0 ? 'smile' : 'rest';
  const mouthShape = useRef<MouthShape>(activity === 'speaking' ? 'mid' : restingShape);
  const previousMouthActivity = useRef(activity);
  const previousAudioLevel = useRef(audioLevel ?? 0);
  const lastAccentAt = useRef(0);
  const lastBlinkAt = useRef(0);
  const activeBlink = useRef<Array<Animation | null>>([]);
  const activeAccent = useRef<Animation | null>(null);
  const activeRestingMorph = useRef<Animation | null>(null);
  const wholeBodyAction = useRef(false);
  const hasAudio = audioLevel !== undefined;

  const playBlink = () => {
    cancelAnimations(activeBlink.current);
    activeBlink.current = [
      animate(
        eyesOpen.current,
        [
          { opacity: 1, offset: 0 },
          { opacity: 0, offset: 0.38 },
          { opacity: 0, offset: 0.55 },
          { opacity: 1, offset: 1 },
        ],
        eventOptions(170, 0, 'cubic-bezier(0.3, 0, 0.2, 1)'),
      ),
      animate(
        eyesClosed.current,
        [
          { opacity: 0, offset: 0 },
          { opacity: 1, offset: 0.38 },
          { opacity: 1, offset: 0.55 },
          { opacity: 0, offset: 1 },
        ],
        eventOptions(170, 0, 'cubic-bezier(0.3, 0, 0.2, 1)'),
      ),
    ];
    lastBlinkAt.current = now();
  };

  useClientLayoutEffect(() => {
    const previous = previousActivity.current;
    const wasAnimated = previousAnimated.current;
    previousActivity.current = activity;
    previousAnimated.current = animated;
    if (reduced) return;
    const settling = wasAnimated && !animated;
    if (!animated && !settling) return;

    const random = createSeededRandom(hashCode(`${name}:${activity}:beam`));
    const mouthRandom = createSeededRandom(hashCode(`${name}:${activity}:beam-mouth`));
    const runtime = createMotionRuntime();
    const characterBase = beamCharacterPose(activity);
    const shadowBase = beamShadowPose(activity);
    const shadowOpacityBase = beamShadowOpacity(activity);
    const bodyBase = beamBodyPose(activity);
    const faceBase = beamFacePose(activity);
    const gazeBase = beamGazePose(activity);
    const characterFromCurrent = currentCharacter.current;
    const shadowFromCurrent = currentShadow.current;
    const shadowOpacityFromCurrent = currentShadowOpacity.current;
    const bodyFromCurrent = currentBody.current;
    const faceFromCurrent = currentFace.current;
    const gazeFromCurrent = currentGaze.current;
    currentCharacter.current = null;
    currentShadow.current = null;
    currentShadowOpacity.current = null;
    currentBody.current = null;
    currentFace.current = null;
    currentGaze.current = null;
    const stateChanged = previous !== activity;
    const hasCurrentPose =
      characterFromCurrent !== null ||
      shadowFromCurrent !== null ||
      bodyFromCurrent !== null ||
      faceFromCurrent !== null ||
      gazeFromCurrent !== null;
    const transitionDuration = stateChanged
      ? STATE_TRANSITION_MS
      : settling && hasCurrentPose
        ? 320
        : hasCurrentPose
          ? 180
          : 0;

    if (transitionDuration > 0) {
      runtime.track(
        animate(
          character.current,
          [
            { transform: characterFromCurrent ?? beamCharacterPose(previous) },
            { transform: characterBase },
          ],
          transitionOptions(transitionDuration),
        ),
        animate(
          shadow.current,
          [
            {
              transform: shadowFromCurrent ?? beamShadowPose(previous),
              opacity: shadowOpacityFromCurrent ?? beamShadowOpacity(previous),
            },
            { transform: shadowBase, opacity: shadowOpacityBase },
          ],
          transitionOptions(transitionDuration),
        ),
        animate(
          body.current,
          [{ transform: bodyFromCurrent ?? beamBodyPose(previous) }, { transform: bodyBase }],
          transitionOptions(transitionDuration),
        ),
        animate(
          face.current,
          [{ transform: faceFromCurrent ?? beamFacePose(previous) }, { transform: faceBase }],
          transitionOptions(Math.min(transitionDuration, 300)),
        ),
        animate(
          gaze.current,
          [{ transform: gazeFromCurrent ?? beamGazePose(previous) }, { transform: gazeBase }],
          transitionOptions(Math.min(transitionDuration, 170)),
        ),
      );
    }

    const runThinkingEvent = () => {
      const event = createThinkingEvent(random, {
        character: characterBase,
        shadow: shadowBase,
        shadowOpacity: shadowOpacityBase,
        body: bodyBase,
        face: faceBase,
        gaze: gazeBase,
      });
      wholeBodyAction.current = true;
      runtime.track(
        animate(character.current, event.character, eventOptions(event.duration, 0, 'linear')),
        animate(shadow.current, event.shadow, eventOptions(event.duration, 0, 'linear')),
        animate(body.current, event.body, eventOptions(event.duration, 170, 'linear')),
        animate(face.current, event.face, eventOptions(event.duration, 90, 'linear')),
        animate(gaze.current, event.gaze, eventOptions(event.duration, 0, 'linear')),
      );
      runtime.schedule(playBlink, event.duration * event.blinkAt);
      runtime.schedule(() => {
        wholeBodyAction.current = false;
      }, event.duration);
      runtime.schedule(runThinkingEvent, event.duration + event.gap);
    };

    const runAmbientEvent = () => {
      const direction = random() < 0.5 ? -1 : 1;
      const idleAction = random();
      const shouldRoll = activity === 'idle' && idleAction < 0.16;
      if (shouldRoll) {
        const event = createRollEvent(random, direction, isCircle, {
          character: characterBase,
          shadow: shadowBase,
          shadowOpacity: shadowOpacityBase,
          body: bodyBase,
          face: faceBase,
          gaze: gazeBase,
        });
        wholeBodyAction.current = true;
        activeRestingMorph.current?.cancel();
        activeRestingMorph.current = null;
        runtime.track(
          animate(
            character.current,
            event.character,
            eventOptions(event.duration, 0, 'cubic-bezier(0.45, 0, 0.2, 1)'),
          ),
          animate(shadow.current, event.shadow, eventOptions(event.duration, 0, 'linear')),
          animate(body.current, event.body, eventOptions(event.duration, 0, 'linear')),
        );
        runtime.schedule(() => {
          wholeBodyAction.current = false;
          playBlink();
        }, event.duration);
        runtime.schedule(runAmbientEvent, event.duration + event.gap);
        return;
      }

      const shouldPeek = activity === 'idle' && idleAction < 0.34;
      if (shouldPeek) {
        const event = createPeekEvent(random, direction, {
          character: characterBase,
          shadow: shadowBase,
          shadowOpacity: shadowOpacityBase,
          body: bodyBase,
          face: faceBase,
          gaze: gazeBase,
        });
        wholeBodyAction.current = true;
        activeRestingMorph.current?.cancel();
        activeRestingMorph.current = null;

        runtime.track(
          animate(
            character.current,
            event.character,
            eventOptions(event.duration, 0, 'linear'),
          ),
          animate(shadow.current, event.shadow, eventOptions(event.duration, 0, 'linear')),
          animate(
            body.current,
            event.body,
            eventOptions(event.duration, 0, 'cubic-bezier(0.37, 0, 0.63, 1)'),
          ),
          animate(
            gaze.current,
            event.gaze,
            eventOptions(event.duration, 0, 'cubic-bezier(0.37, 0, 0.63, 1)'),
          ),
          animate(
            face.current,
            event.face,
            eventOptions(event.duration, 0, 'cubic-bezier(0.37, 0, 0.63, 1)'),
          ),
        );
        runtime.schedule(playBlink, event.duration * 0.6);
        runtime.schedule(() => {
          wholeBodyAction.current = false;
        }, event.duration);
        runtime.schedule(runAmbientEvent, event.duration + event.gap);
        return;
      }

      const longGazeChance = activity === 'idle' ? 0.34 : 0.28;
      const watchesBird = random() < longGazeChance;
      if (watchesBird) {
        const event = createLongFollowEvent(activity, random, direction, {
          character: characterBase,
          shadow: shadowBase,
          shadowOpacity: shadowOpacityBase,
          body: bodyBase,
          face: faceBase,
          gaze: gazeBase,
        });
        runtime.track(
          animate(
            character.current,
            event.character,
            eventOptions(event.duration, 0, 'linear'),
          ),
          animate(shadow.current, event.shadow, eventOptions(event.duration, 0, 'linear')),
          animate(gaze.current, event.gaze, eventOptions(event.duration, 0, 'linear')),
          animate(
            body.current,
            event.body,
            eventOptions(event.duration, 120, 'linear'),
          ),
          animate(face.current, event.face, eventOptions(event.duration, 90, 'linear')),
        );
        runtime.schedule(playBlink, event.duration * 0.94);
        runtime.schedule(runAmbientEvent, event.duration + event.gap);
        return;
      }

      const duration =
        activity === 'listening'
          ? randomBetween(random, 1_400, 1_900)
          : randomBetween(random, 1_800, 2_400);
      const gazeX = direction * randomBetween(random, 1.1, 1.75);
      const gazeY = randomBetween(random, -1.05, 0.7);
      const quickGazeFrames: Keyframe[] = [
        { transform: gazeBase, offset: 0 },
        { transform: `translate(${gazeX * 0.54}px, ${gazeY * 0.45}px) scaleX(0.97)`, offset: 0.18 },
        { transform: `translate(${gazeX}px, ${gazeY}px) scaleX(0.94)`, offset: 0.38 },
        { transform: `translate(${gazeX * 0.94}px, ${gazeY * 0.92}px) scaleX(0.945)`, offset: 0.58 },
        { transform: `translate(${gazeX * 0.44}px, ${gazeY * 0.38}px) scaleX(0.975)`, offset: 0.8 },
        { transform: gazeBase, offset: 1 },
      ];
      const quickFaceFrames: Keyframe[] = [
        { transform: faceBase, offset: 0 },
        {
          transform: `${faceBase} translate(${gazeX * 1.15}px, ${gazeY * 0.4}px) rotate(${0.9 * direction}deg) scaleX(0.99)`,
          offset: 0.2,
        },
        {
          transform: `${faceBase} translate(${gazeX * 3.2}px, ${gazeY * 0.85}px) rotate(${2.4 * direction}deg) scaleX(0.95)`,
          offset: 0.42,
        },
        {
          transform: `${faceBase} translate(${gazeX * 2.8}px, ${gazeY * 0.75}px) rotate(${2 * direction}deg) scaleX(0.955)`,
          offset: 0.6,
        },
        {
          transform: `${faceBase} translate(${gazeX}px, ${gazeY * 0.34}px) rotate(${0.8 * direction}deg) scaleX(0.99)`,
          offset: 0.82,
        },
        { transform: faceBase, offset: 1 },
      ];
      const softTurn = 'cubic-bezier(0.45, 0, 0.55, 1)';

      if (activity === 'idle') {
        const roamX = direction * randomBetween(random, 3.5, 6);
        const hopY = -randomBetween(random, 1.4, 2.6);
        runtime.track(
          animate(
            character.current,
            [
              { transform: characterBase, offset: 0, easing: softTurn },
              { transform: `translate(${roamX}px, ${hopY}px) scale(1.01, 0.99)`, offset: 0.5, easing: softTurn },
              { transform: characterBase, offset: 1 },
            ],
            eventOptions(duration, 0, 'linear'),
          ),
          animate(
            shadow.current,
            [
              { transform: shadowBase, opacity: shadowOpacityBase, offset: 0, easing: softTurn },
              { transform: `translate(${roamX}px, 0px) scale(0.72, 0.78)`, opacity: shadowOpacityBase * 0.62, offset: 0.5, easing: softTurn },
              { transform: shadowBase, opacity: shadowOpacityBase, offset: 1 },
            ],
            eventOptions(duration, 0, 'linear'),
          ),
          animate(
            gaze.current,
            quickGazeFrames,
            eventOptions(duration, 0, 'linear'),
          ),
          animate(
            body.current,
            [
              { transform: bodyBase, offset: 0, easing: softTurn },
              { transform: `translate(${0.3 * direction}px, -0.22px) rotate(${1.6 * direction}deg) scale(1.005, 0.995)`, offset: 0.48, easing: softTurn },
              { transform: bodyBase, offset: 1 },
            ],
            eventOptions(duration, 120, 'linear'),
          ),
          animate(
            face.current,
            quickFaceFrames,
            eventOptions(duration, 80, 'linear'),
          ),
        );
        if (random() < 0.45) runtime.schedule(playBlink, duration * 0.82);
      } else if (activity === 'listening') {
        runtime.track(
          animate(
            character.current,
            [
              { transform: characterBase, offset: 0, easing: softTurn },
              { transform: 'translate(-0.35px, 0.2px) scale(1.435, 1.375)', offset: 0.5, easing: softTurn },
              { transform: characterBase },
            ],
            eventOptions(duration, 0, 'linear'),
          ),
          animate(
            shadow.current,
            [
              { transform: shadowBase, opacity: shadowOpacityBase },
              { transform: 'translate(0px, 5px) scale(0.66, 0.56)', opacity: 0.055 },
              { transform: shadowBase, opacity: shadowOpacityBase },
            ],
            eventOptions(duration),
          ),
          animate(
            gaze.current,
            quickGazeFrames,
            eventOptions(duration, 0, 'linear'),
          ),
          animate(
            body.current,
            [
              { transform: bodyBase, offset: 0, easing: softTurn },
              { transform: `translate(${0.2 * direction}px, 0.8px) rotate(${1.1 * direction}deg) scale(1.01, 0.99)`, offset: 0.5, easing: softTurn },
              { transform: bodyBase },
            ],
            eventOptions(duration, 70, 'linear'),
          ),
          animate(
            face.current,
            quickFaceFrames,
            eventOptions(duration, 80, 'linear'),
          ),
        );
        if (random() < 0.35) runtime.schedule(playBlink, duration * 0.62);
      }

      const gap =
        activity === 'idle'
          ? randomBetween(random, 1_800, 3_400)
          : randomBetween(random, 1_400, 2_600);
      runtime.schedule(runAmbientEvent, duration + gap);
    };

    const scheduleFallbackPhrase = () => {
      const syllableCount = 3 + Math.floor(random() * 5);
      let syllable = 0;

      const advance = () => {
        const choices: MouthShape[] = [restingShape, 'open'];
        const nextShape = choices[Math.floor(random() * choices.length)];
        const duration = randomBetween(random, 180, 250);
        runtime.track(
          ...animateMouthPulse(
            { mouthRest, mouthSmile, mouthMid, mouthOpen },
            mouthPose(nextShape),
            duration,
          ),
        );
        syllable += 1;

        if (syllable < syllableCount) {
          if (syllable % 2 === 0 && random() < 0.6) {
            runtime.track(
              animate(
                body.current,
                [
                  { transform: bodyBase },
                  { transform: 'translate(0px, -0.85px) rotate(1.1deg) scale(1.014, 0.986)' },
                  { transform: bodyBase },
                ],
                eventOptions(300),
              ),
            );
          }
          runtime.schedule(advance, duration + randomBetween(random, 30, 105));
          return;
        }

        runtime.schedule(() => {
          const phraseGap = randomBetween(random, 850, 1_650);
          runtime.track(
            ...animateMouthPause({ mouthRest, mouthSmile, mouthMid, mouthOpen }, phraseGap),
          );
          runtime.schedule(playBlink, phraseGap * 0.25);
          runtime.schedule(scheduleFallbackPhrase, phraseGap);
        }, duration);
      };

      advance();
    };

    const scheduleRestingMouthSwap = () => {
      if (wholeBodyAction.current) {
        runtime.schedule(scheduleRestingMouthSwap, 700);
        return;
      }
      const duration = randomBetween(mouthRandom, 3_200, 4_800);
      activeRestingMorph.current = animateRestingMouthMorph(
        mouthMorph.current,
        mouthPaths,
        restingShape,
        duration,
      );
      runtime.track(activeRestingMorph.current);
      runtime.schedule(
        scheduleRestingMouthSwap,
        duration + randomBetween(mouthRandom, 900, 2_200),
      );
    };

    const firstEventDelay = transitionDuration + STATE_SETTLE_MS;
    if (animated) {
      if (activity === 'speaking' && !hasAudio) {
        runtime.schedule(scheduleFallbackPhrase, firstEventDelay);
      } else if (activity === 'thinking') {
        runtime.schedule(runThinkingEvent, firstEventDelay);
      } else if (activity !== 'speaking') {
        runtime.schedule(runAmbientEvent, firstEventDelay);
        runtime.schedule(
          scheduleRestingMouthSwap,
          firstEventDelay + randomBetween(mouthRandom, 900, 2_000),
        );
      }
    }

    return () => {
      currentCharacter.current = captureAnimatedStyle(character.current, 'transform');
      currentShadow.current = captureAnimatedStyle(shadow.current, 'transform');
      currentShadowOpacity.current = captureAnimatedOpacity(shadow.current);
      currentBody.current = captureAnimatedStyle(body.current, 'transform');
      currentFace.current = captureAnimatedStyle(face.current, 'transform');
      currentGaze.current = captureAnimatedStyle(gaze.current, 'transform');
      const rest = captureAnimatedOpacity(mouthRest.current);
      const smile = captureAnimatedOpacity(mouthSmile.current);
      const mid = captureAnimatedOpacity(mouthMid.current);
      const open = captureAnimatedOpacity(mouthOpen.current);
      if (rest !== null || smile !== null || mid !== null || open !== null) {
        const logicalPose = mouthPose(mouthShape.current);
        currentMouth.current = {
          rest: rest ?? logicalPose.rest,
          smile: smile ?? logicalPose.smile,
          mid: mid ?? logicalPose.mid,
          open: open ?? logicalPose.open,
        };
      }
      runtime.cancel();
      cancelAnimations(activeBlink.current);
      activeBlink.current = [];
      activeAccent.current?.cancel();
      activeAccent.current = null;
      activeRestingMorph.current?.cancel();
      activeRestingMorph.current = null;
      wholeBodyAction.current = false;
    };
  }, [activity, animated, body, character, face, gaze, hasAudio, isCircle, name, reduced, shadow]);

  useClientLayoutEffect(() => {
    const previousActivity = previousMouthActivity.current;
    previousMouthActivity.current = activity;
    const previousLevel = previousAudioLevel.current;
    const level = audioLevel ?? 0;
    previousAudioLevel.current = level;
    if (reduced) return;

    const animations: Array<Animation | null> = [];
    const mouthFromCurrent = currentMouth.current;
    const from = mouthFromCurrent ?? mouthPose(mouthShape.current);
    currentMouth.current = null;
    const wasSpeaking = previousActivity === 'speaking';
    const targetShape = !animated
      ? activity === 'speaking'
        ? 'mid'
        : restingShape
      : activity === 'speaking'
        ? audioLevel === undefined
          ? 'mid'
          : selectMouthShape(level, mouthShape.current)
        : restingShape;
    const opening = targetShape === 'open' || (targetShape === 'mid' && mouthShape.current === 'rest');
    const duration = previousActivity !== activity ? 220 : opening ? 75 : 135;
    const to = mouthPose(targetShape);

    if (targetShape !== mouthShape.current || previousActivity !== activity || mouthFromCurrent) {
      animations.push(
        ...animateMouth({ mouthRest, mouthSmile, mouthMid, mouthOpen }, from, to, duration),
      );
      mouthShape.current = targetShape;
    }

    if (animated && activity === 'speaking' && audioLevel !== undefined && wasSpeaking) {
      const timestamp = now();
      const risingPeak = level > 0.38 && level - previousLevel > 0.16;
      if (risingPeak && timestamp - lastAccentAt.current > 420) {
        activeAccent.current?.cancel();
        activeAccent.current = animate(
          body.current,
          [
            { transform: beamBodyPose('speaking') },
            { transform: 'translate(0px, -0.9px) rotate(1.15deg) scale(1.014, 0.986)' },
            { transform: beamBodyPose('speaking') },
          ],
          eventOptions(310, 0, 'cubic-bezier(0.22, 1, 0.36, 1)'),
        );
        lastAccentAt.current = timestamp;
      }

      const phraseEnded = previousLevel > 0.22 && level < 0.09;
      if (phraseEnded && timestamp - lastBlinkAt.current > 2_500) playBlink();
    }

    return () => {
      const rest = captureAnimatedOpacity(mouthRest.current);
      const smile = captureAnimatedOpacity(mouthSmile.current);
      const mid = captureAnimatedOpacity(mouthMid.current);
      const open = captureAnimatedOpacity(mouthOpen.current);
      currentMouth.current =
        rest === null && smile === null && mid === null && open === null
          ? null
          : {
              rest: rest ?? to.rest,
              smile: smile ?? to.smile,
              mid: mid ?? to.mid,
              open: open ?? to.open,
            };
      cancelAnimations(animations);
    };
  }, [activity, animated, audioLevel, body, mouthMid, mouthOpen, mouthRest, mouthSmile, reduced, restingShape]);

  useEffect(
    () => () => {
      cancelAnimations(activeBlink.current);
      activeAccent.current?.cancel();
    },
    [],
  );
};
