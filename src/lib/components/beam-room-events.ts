import { randomBetween } from './motion-core';
import type { AvatarActivity } from './types';

const SOFT_TURN = 'cubic-bezier(0.45, 0, 0.55, 1)';

type RoomBases = {
  character: string;
  shadow: string;
  shadowOpacity: number;
  body: string;
  face: string;
  gaze: string;
};

export const createLongFollowEvent = (
  activity: AvatarActivity,
  random: () => number,
  direction: number,
  base: RoomBases,
) => {
  const duration = randomBetween(random, 4_000, 6_200);
  const startX = -direction * randomBetween(random, 1.3, 2);
  const endX = direction * randomBetween(random, 1.5, 2.2);
  const startY = randomBetween(random, -0.9, 0.25);
  const apexY = randomBetween(random, -2.1, -1.25);
  const endY = randomBetween(random, -0.85, 0.3);
  const character: Keyframe[] =
    activity === 'listening'
      ? [
          { transform: base.character, offset: 0, easing: SOFT_TURN },
          { transform: 'translate(-0.4px, 0.25px) scale(1.435, 1.375)', offset: 0.3, easing: SOFT_TURN },
          { transform: 'translate(0.35px, -0.1px) scale(1.415, 1.395)', offset: 0.76, easing: SOFT_TURN },
          { transform: base.character, offset: 1 },
        ]
      : activity === 'thinking'
        ? [
            { transform: base.character, offset: 0, easing: SOFT_TURN },
            { transform: `translate(${-7 * direction}px, -1.8px) scale(0.97)`, offset: 0.27, easing: SOFT_TURN },
            { transform: `translate(${7 * direction}px, -0.8px) scale(0.97)`, offset: 0.75, easing: SOFT_TURN },
            { transform: base.character, offset: 1 },
          ]
        : [
            { transform: base.character, offset: 0, easing: SOFT_TURN },
            { transform: `translate(${-6 * direction}px, -1px) scale(1)`, offset: 0.25, easing: SOFT_TURN },
            { transform: `translate(${7.5 * direction}px, -1.8px) scale(1)`, offset: 0.74, easing: SOFT_TURN },
            { transform: base.character, offset: 1 },
          ];
  return {
    duration,
    gap: randomBetween(random, 1_200, 2_400),
    character,
    shadow: [
      { transform: base.shadow, opacity: base.shadowOpacity, offset: 0, easing: SOFT_TURN },
      {
        transform: `translate(${-7 * direction}px, 0px) scale(0.78, 0.82)`,
        opacity: base.shadowOpacity * 0.72,
        offset: 0.27,
        easing: SOFT_TURN,
      },
      {
        transform: `translate(${8 * direction}px, 0px) scale(0.84, 0.88)`,
        opacity: base.shadowOpacity * 0.8,
        offset: 0.75,
        easing: SOFT_TURN,
      },
      { transform: base.shadow, opacity: base.shadowOpacity, offset: 1 },
    ] as Keyframe[],
    gaze: [
      { transform: base.gaze, offset: 0 },
      { transform: `translate(${startX}px, ${startY}px) scaleX(0.96)`, offset: 0.08 },
      { transform: `translate(${startX * 0.62}px, ${(startY + apexY) * 0.5}px) scaleX(0.93)`, offset: 0.27 },
      { transform: `translate(0px, ${apexY}px) scaleX(0.91)`, offset: 0.47 },
      { transform: `translate(${endX * 0.62}px, ${(endY + apexY) * 0.5}px) scaleX(0.93)`, offset: 0.67 },
      { transform: `translate(${endX}px, ${endY}px) scaleX(0.96)`, offset: 0.85 },
      { transform: base.gaze, offset: 1 },
    ] as Keyframe[],
    body: [
      { transform: base.body, offset: 0, easing: SOFT_TURN },
      { transform: `translate(${-0.5 * direction}px, -0.28px) rotate(${-2.2 * direction}deg) scale(1.006, 0.994)`, offset: 0.28, easing: SOFT_TURN },
      { transform: `translate(${0.62 * direction}px, -0.18px) rotate(${3.2 * direction}deg) scale(1.004, 0.996)`, offset: 0.78, easing: SOFT_TURN },
      { transform: base.body, offset: 1 },
    ] as Keyframe[],
    face: [
      { transform: base.face, offset: 0 },
      { transform: `${base.face} translate(${startX * 1.6}px, ${startY * 0.5}px) rotate(${-2 * direction}deg) scaleX(0.98)`, offset: 0.12 },
      { transform: `${base.face} translate(${startX}px, ${apexY * 0.55}px) rotate(${-1.2 * direction}deg) scaleX(0.96)`, offset: 0.3 },
      { transform: `${base.face} translate(0px, ${apexY * 0.68}px) scaleX(0.94)`, offset: 0.48 },
      { transform: `${base.face} translate(${endX * 1.55}px, ${apexY * 0.5}px) rotate(${2 * direction}deg) scaleX(0.96)`, offset: 0.68 },
      { transform: `${base.face} translate(${endX * 2.6}px, ${endY * 0.7}px) rotate(${3 * direction}deg) scaleX(0.97)`, offset: 0.84 },
      { transform: base.face, offset: 1 },
    ] as Keyframe[],
  };
};

export const createRollEvent = (
  random: () => number,
  direction: number,
  isCircle: boolean,
  base: RoomBases,
) => {
  const duration = randomBetween(random, 2_800, 3_600);
  const startX = -direction * randomBetween(random, 13, 17);
  const endX = direction * randomBetween(random, 14, 18);
  const character: Keyframe[] = [
    { transform: base.character, offset: 0 },
    { transform: `translate(${startX}px, 0px) scale(1)`, offset: 0.16 },
    { transform: `translate(${startX * 0.4}px, -2.8px) scale(1)`, offset: 0.34 },
    { transform: `translate(${endX * 0.38}px, -1.2px) scale(1)`, offset: 0.62 },
    { transform: `translate(${endX}px, 0px) scale(1)`, offset: 0.82 },
    { transform: `translate(${endX * 0.72}px, 0px) scale(1)`, offset: 0.9 },
    { transform: base.character, offset: 1 },
  ];
  const shadow: Keyframe[] = [
    { transform: base.shadow, opacity: base.shadowOpacity, offset: 0 },
    {
      transform: `translate(${startX}px, 0px) scale(0.92, 1)`,
      opacity: base.shadowOpacity,
      offset: 0.16,
    },
    {
      transform: `translate(${startX * 0.4}px, 0px) scale(0.7, 0.76)`,
      opacity: base.shadowOpacity * 0.65,
      offset: 0.34,
    },
    {
      transform: `translate(${endX * 0.38}px, 0px) scale(0.78, 0.82)`,
      opacity: base.shadowOpacity * 0.72,
      offset: 0.62,
    },
    {
      transform: `translate(${endX}px, 0px) scale(1.08, 0.86)`,
      opacity: base.shadowOpacity,
      offset: 0.82,
    },
    { transform: base.shadow, opacity: base.shadowOpacity, offset: 1 },
  ];
  const body: Keyframe[] = isCircle
    ? [
        { transform: base.body, offset: 0 },
        { transform: `${base.body} rotate(0deg)`, offset: 0.16 },
        { transform: `${base.body} rotate(${105 * direction}deg)`, offset: 0.34 },
        { transform: `${base.body} rotate(${255 * direction}deg)`, offset: 0.62 },
        {
          transform: `${base.body} rotate(${360 * direction}deg) scale(1.025, 0.975)`,
          offset: 0.82,
        },
        { transform: `${base.body} rotate(${360 * direction}deg)`, offset: 0.9 },
        { transform: base.body, offset: 1 },
      ]
    : [
        { transform: base.body, offset: 0 },
        { transform: `${base.body} rotate(${-8 * direction}deg)`, offset: 0.16 },
        {
          transform: `${base.body} rotate(${24 * direction}deg) scale(0.98, 1.02)`,
          offset: 0.36,
        },
        {
          transform: `${base.body} rotate(${-18 * direction}deg) scale(1.015, 0.985)`,
          offset: 0.56,
        },
        {
          transform: `${base.body} rotate(${28 * direction}deg) scale(0.975, 1.025)`,
          offset: 0.75,
        },
        {
          transform: `${base.body} rotate(${-5 * direction}deg) scale(1.03, 0.97)`,
          offset: 0.88,
        },
        { transform: base.body, offset: 1 },
      ];
  return {
    duration,
    gap: randomBetween(random, 1_600, 3_000),
    character,
    shadow,
    body,
  };
};

export const createPeekEvent = (
  random: () => number,
  direction: number,
  base: RoomBases,
) => {
  const verticalDirection = random() < 0.5 ? -1 : 1;
  const duration = randomBetween(random, 4_800, 6_400);
  const cornerX = direction * randomBetween(random, 27, 31);
  const cornerY = verticalDirection * randomBetween(random, 23, 27);
  const outsideX = cornerX * 1.62;
  const outsideY = cornerY * 1.72;
  const inwardX = -direction * 1.8;
  const inwardY = -verticalDirection * 1.15;
  return {
    duration,
    gap: randomBetween(random, 1_500, 2_800),
    character: [
      { transform: base.character, offset: 0 },
      {
        transform: `translate(${cornerX * 0.38}px, ${cornerY * 0.34}px) scale(0.96)`,
        offset: 0.1,
        easing: 'cubic-bezier(0.7, 0, 0.9, 0.4)',
      },
      {
        transform: `translate(${outsideX}px, ${outsideY}px) scale(0.88)`,
        offset: 0.21,
        easing: 'cubic-bezier(0.18, 0.9, 0.25, 1)',
      },
      {
        transform: `translate(${cornerX * 0.86}px, ${cornerY * 0.84}px) scale(0.92)`,
        offset: 0.34,
        easing: 'cubic-bezier(0.22, 1.3, 0.36, 1)',
      },
      { transform: `translate(${cornerX}px, ${cornerY}px) scale(0.9)`, offset: 0.43 },
      {
        transform: `translate(${cornerX * 0.97}px, ${cornerY * 0.96}px) scale(0.905)`,
        offset: 0.72,
      },
      {
        transform: `translate(${outsideX}px, ${outsideY}px) scale(0.86)`,
        offset: 0.84,
        easing: 'cubic-bezier(0.65, 0, 0.9, 0.45)',
      },
      {
        transform: `translate(${cornerX * 0.3}px, ${cornerY * 0.28}px) scale(0.96)`,
        offset: 0.94,
        easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.15)',
      },
      { transform: base.character, offset: 1 },
    ] as Keyframe[],
    shadow: [
      { transform: base.shadow, opacity: base.shadowOpacity, offset: 0 },
      {
        transform: `translate(${cornerX * 0.4}px, 1px) scale(0.75, 0.8)`,
        opacity: 0.12,
        offset: 0.1,
      },
      { transform: `translate(${cornerX}px, 3px) scale(0.42, 0.58)`, opacity: 0, offset: 0.2 },
      { transform: `translate(${cornerX}px, 3px) scale(0.42, 0.58)`, opacity: 0, offset: 0.86 },
      { transform: base.shadow, opacity: base.shadowOpacity, offset: 1 },
    ] as Keyframe[],
    body: [
      { transform: base.body, offset: 0 },
      { transform: `${base.body} rotate(${6 * direction}deg) scale(0.98, 1.02)`, offset: 0.12 },
      { transform: `${base.body} rotate(${-11 * direction}deg) scale(1.02, 0.98)`, offset: 0.34 },
      { transform: `${base.body} rotate(${-7 * direction}deg)`, offset: 0.43 },
      { transform: `${base.body} rotate(${-5 * direction}deg)`, offset: 0.72 },
      { transform: `${base.body} rotate(${8 * direction}deg) scale(0.98, 1.02)`, offset: 0.84 },
      { transform: base.body, offset: 1 },
    ] as Keyframe[],
    gaze: [
      { transform: base.gaze, offset: 0 },
      { transform: base.gaze, offset: 0.28 },
      { transform: `translate(${inwardX}px, ${inwardY}px) scaleX(0.95)`, offset: 0.4 },
      { transform: `translate(${inwardX * 0.82}px, ${inwardY * 0.76}px) scaleX(0.96)`, offset: 0.72 },
      { transform: base.gaze, offset: 0.86 },
      { transform: base.gaze, offset: 1 },
    ] as Keyframe[],
    face: [
      { transform: base.face, offset: 0 },
      { transform: base.face, offset: 0.28 },
      {
        transform: `${base.face} translate(${-direction * 3.6}px, ${-verticalDirection * 2.2}px) rotate(${-direction * 2}deg) scaleX(0.97)`,
        offset: 0.41,
      },
      {
        transform: `${base.face} translate(${-direction * 3.1}px, ${-verticalDirection * 1.8}px) rotate(${-direction * 1.4}deg) scaleX(0.975)`,
        offset: 0.72,
      },
      { transform: base.face, offset: 0.86 },
      { transform: base.face, offset: 1 },
    ] as Keyframe[],
  };
};
