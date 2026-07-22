import { randomBetween } from './motion-core';

const SOFT_TURN = 'cubic-bezier(0.45, 0, 0.55, 1)';

type ThinkingBases = {
  character: string;
  shadow: string;
  shadowOpacity: number;
  body: string;
  face: string;
  gaze: string;
};

export type ThinkingEvent = {
  kind: 'thought' | 'aha';
  duration: number;
  gap: number;
  blinkAt: number;
  character: Keyframe[];
  shadow: Keyframe[];
  body: Keyframe[];
  face: Keyframe[];
  gaze: Keyframe[];
};

const frame = (transform: string, offset: number): Keyframe => ({
  transform,
  offset,
  easing: SOFT_TURN,
});

const createThoughtEvent = (
  random: () => number,
  base: ThinkingBases,
): ThinkingEvent => {
  const duration = randomBetween(random, 3_800, 5_800);
  const direction = random() < 0.5 ? -1 : 1;
  const pointCount = random() < 0.48 ? 2 : 3;
  const pointOne = {
    x: direction * randomBetween(random, 2.35, 3.15),
    y: -randomBetween(random, 3.4, 4.3),
  };
  const pointTwo = {
    x: -direction * randomBetween(random, 2.2, 3.05),
    y: -randomBetween(random, 2.5, 3.3),
  };
  const pointThree = {
    x: direction * randomBetween(random, 2.25, 3),
    y: -randomBetween(random, 3, 4),
  };
  const gazePoints = pointCount === 2 ? [pointOne, pointTwo] : [pointOne, pointTwo, pointThree];
  const gazeOffsets = pointCount === 2 ? [0.16, 0.58] : [0.13, 0.43, 0.72];
  const faceOffsets = gazeOffsets.map((offset) => offset + 0.06);
  const bodyOffsets = gazeOffsets.map((offset) => offset + 0.13);
  const characterOffsets = gazeOffsets.map((offset) => offset + 0.16);
  const travel = [1.35, 1.2, 0.9];
  const travelY = [1.05, -0.65, 0.6];
  const bodyTurns = [3.8, 4.6, 3.3];
  const bodyScales = [
    [1.035, 0.965],
    [0.972, 1.028],
    [1.026, 0.974],
  ];
  const facePoints = gazePoints.map((point) => ({
    x: Math.sign(point.x) * randomBetween(random, 4.5, 6.5),
    y: point.y * randomBetween(random, 0.72, 0.9),
    rotation: Math.sign(point.x) * randomBetween(random, 3, 5),
  }));

  return {
    kind: 'thought',
    duration,
    gap: randomBetween(random, 600, 1_400),
    blinkAt: pointCount === 2 ? 0.82 : 0.9,
    character: [
      frame(base.character, 0),
      ...gazePoints.map((point, index) =>
        frame(
          `${base.character} translate(${Math.sign(point.x) * travel[index]}px, ${travelY[index]}px) scale(${index === 1 ? '0.988, 1.012' : '1.018, 0.982'})`,
          characterOffsets[index],
        ),
      ),
      { transform: base.character, offset: 1 },
    ],
    shadow: [
      { transform: base.shadow, opacity: base.shadowOpacity, offset: 0, easing: SOFT_TURN },
      ...gazePoints.map((point, index) => ({
        transform: `${base.shadow} translate(${Math.sign(point.x) * travel[index]}px, 0px) scale(${index === 1 ? '0.92, 1.04' : '1.08, 0.94'})`,
        opacity: base.shadowOpacity * (index === 1 ? 0.92 : 1.08),
        offset: characterOffsets[index],
        easing: SOFT_TURN,
      })),
      { transform: base.shadow, opacity: base.shadowOpacity, offset: 1 },
    ],
    body: [
      frame(base.body, 0),
      ...gazePoints.map((point, index) =>
        frame(
          `${base.body} rotate(${Math.sign(point.x) * bodyTurns[index]}deg) scale(${bodyScales[index][0]}, ${bodyScales[index][1]})`,
          bodyOffsets[index],
        ),
      ),
      { transform: base.body, offset: 1 },
    ],
    gaze: [
      frame(base.gaze, 0),
      ...gazePoints.map((point, index) =>
        frame(
          `translate(${point.x}px, ${point.y}px) scaleX(${index === 1 ? 0.94 : 0.95})`,
          gazeOffsets[index],
        ),
      ),
      { transform: base.gaze, offset: 1 },
    ],
    face: [
      frame(base.face, 0),
      ...facePoints.map((point, index) =>
        frame(
          `${base.face} translate(${point.x}px, ${point.y}px) rotate(${point.rotation}deg) scaleX(${index === 1 ? 0.94 : 0.955})`,
          faceOffsets[index],
        ),
      ),
      { transform: base.face, offset: 1 },
    ],
  };
};

const createAhaEvent = (random: () => number, base: ThinkingBases): ThinkingEvent => {
  const duration = randomBetween(random, 3_800, 5_200);
  const direction = random() < 0.5 ? -1 : 1;
  return {
    kind: 'aha',
    duration,
    gap: randomBetween(random, 800, 1_600),
    blinkAt: 0.76,
    character: [
      frame(base.character, 0),
      frame(`${base.character} translate(${0.7 * direction}px, 1.2px) scale(1.026, 0.974)`, 0.29),
      frame(`${base.character} translate(${-0.35 * direction}px, -1.8px) scale(0.984, 1.016)`, 0.55),
      frame(`${base.character} translate(0px, -1.05px) scale(0.993, 1.007)`, 0.77),
      frame(`${base.character} translate(${0.3 * direction}px, 0.4px) scale(1.008, 0.992)`, 0.93),
      { transform: base.character, offset: 1 },
    ],
    shadow: [
      { transform: base.shadow, opacity: base.shadowOpacity, offset: 0, easing: SOFT_TURN },
      {
        transform: `${base.shadow} translate(${0.5 * direction}px, 0px) scale(1.13, 0.9)`,
        opacity: base.shadowOpacity * 1.14,
        offset: 0.29,
        easing: SOFT_TURN,
      },
      {
        transform: `${base.shadow} translate(${-0.38 * direction}px, 0px) scale(0.7, 0.8)`,
        opacity: base.shadowOpacity * 0.58,
        offset: 0.55,
        easing: SOFT_TURN,
      },
      {
        transform: `${base.shadow} scale(0.82, 0.88)`,
        opacity: base.shadowOpacity * 0.74,
        offset: 0.77,
        easing: SOFT_TURN,
      },
      { transform: base.shadow, opacity: base.shadowOpacity, offset: 1 },
    ],
    body: [
      frame(base.body, 0),
      frame(`${base.body} rotate(${4.8 * direction}deg) scale(1.04, 0.96)`, 0.26),
      frame(`${base.body} translate(0px, -0.35px) rotate(-0.3deg) scale(0.976, 1.024)`, 0.52),
      frame(`${base.body} translate(0px, -0.15px) rotate(-1deg) scale(0.99, 1.01)`, 0.74),
      frame(`${base.body} rotate(${-1.2 * direction}deg) scale(1.016, 0.984)`, 0.92),
      { transform: base.body, offset: 1 },
    ],
    gaze: [
      frame(base.gaze, 0),
      frame(`translate(${2.9 * direction}px, -4px) scaleX(0.94)`, 0.14),
      frame('translate(0px, -1.6px) scaleX(0.975)', 0.4),
      frame('translate(0px, -1.1px) scaleX(0.98)', 0.62),
      frame(`translate(${1.1 * direction}px, -2.2px) scaleX(0.96)`, 0.84),
      { transform: base.gaze, offset: 1 },
    ],
    face: [
      frame(base.face, 0),
      frame(`${base.face} translate(${5.4 * direction}px, -2px) rotate(${4.2 * direction}deg) scaleX(0.945)`, 0.2),
      frame(`${base.face} translate(0px, -1.6px) rotate(0deg) scale(1.045, 0.955)`, 0.46),
      frame(`${base.face} translate(0px, -0.9px) rotate(0deg) scale(1.022, 0.978)`, 0.68),
      frame(`${base.face} translate(${1.2 * direction}px, -0.35px) scaleX(0.98)`, 0.88),
      { transform: base.face, offset: 1 },
    ],
  };
};

export const createThinkingEvent = (
  random: () => number,
  base: ThinkingBases,
): ThinkingEvent =>
  random() < 0.2 ? createAhaEvent(random, base) : createThoughtEvent(random, base);
