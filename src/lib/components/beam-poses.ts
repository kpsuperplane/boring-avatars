import { getUnit } from '../utilities';
import type { AvatarActivity } from './types';

const ORIGINAL_BEAM_SIZE = 36;
const ROOM_BEAM_SIZE = 68;
const VIEWBOX_SIZE = 100;
const ROOM_BEAM_X = 16;
const ROOM_BEAM_Y = 18;
const CHARACTER_ORIGIN_X = 50;
const CHARACTER_ORIGIN_Y = 52;

const motionNumber = (value: number) => Number(value.toFixed(3));

type Matrix = [number, number, number, number, number, number];

const multiply = (left: Matrix, right: Matrix): Matrix => [
  left[0] * right[0] + left[2] * right[1],
  left[1] * right[0] + left[3] * right[1],
  left[0] * right[2] + left[2] * right[3],
  left[1] * right[2] + left[3] * right[3],
  left[0] * right[4] + left[2] * right[5] + left[4],
  left[1] * right[4] + left[3] * right[5] + left[5],
];

const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
const scale = (amount: number): Matrix => [amount, 0, 0, amount, 0, 0];
const rotate = (degrees: number, x: number, y: number): Matrix => {
  const radians = (degrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return multiply(
    multiply(translate(x, y), [cosine, sine, -sine, cosine, 0, 0]),
    translate(-x, -y),
  );
};
const inverse = ([a, b, c, d, e, f]: Matrix): Matrix => {
  const determinant = a * d - b * c;
  return [
    d / determinant,
    -b / determinant,
    -c / determinant,
    a / determinant,
    (c * f - d * e) / determinant,
    (b * e - a * f) / determinant,
  ];
};
const cssTransform = ([a, b, c, d, e, f]: Matrix) => {
  const rotation = (Math.atan2(b, a) * 180) / Math.PI;
  const scaleX = Math.hypot(a, b);
  const scaleY = (a * d - b * c) / scaleX;
  const scaleValue =
    Math.abs(scaleX - scaleY) < 0.0001
      ? `${motionNumber(scaleX)}`
      : `${motionNumber(scaleX)}, ${motionNumber(scaleY)}`;
  return `translate(${motionNumber(e)}px, ${motionNumber(f)}px) rotate(${motionNumber(rotation)}deg) scale(${scaleValue})`;
};

export const beamShortestRotationTransform = (transform: string) => {
  const match = transform.match(/^matrix\(([^)]+)\)$/);
  if (!match) return transform;
  const values = match[1].split(',').map(Number);
  if (values.length !== 6 || values.some((value) => !Number.isFinite(value))) return transform;
  return cssTransform(values as Matrix);
};

export type OriginalBeamIdleTransforms = {
  character: string;
  faceAnchor: string;
};

export const beamOriginalIdleTransforms = (
  seed: number,
  currentFaceRotation: number,
  isCircle: boolean,
): OriginalBeamIdleTransforms => {
  const preTranslateX = getUnit(seed, 10, 1);
  const preTranslateY = getUnit(seed, 10, 2);
  const wrapperTranslateX = preTranslateX < 5 ? preTranslateX + 4 : preTranslateX;
  const wrapperTranslateY = preTranslateY < 5 ? preTranslateY + 4 : preTranslateY;
  const wrapperRotation = getUnit(seed, 360);
  const bodyRotation = isCircle
    ? 0
    : ((wrapperRotation + 45) % 90 + 90) % 90 - 45;
  const originalScale = 1 + getUnit(seed, ORIGINAL_BEAM_SIZE / 12) / 10;
  const faceRotation = getUnit(seed, 10, 3);
  const faceTranslateX =
    wrapperTranslateX > 6 ? wrapperTranslateX / 2 : getUnit(seed, 8, 1);
  const faceTranslateY =
    wrapperTranslateY > 6 ? wrapperTranslateY / 2 : getUnit(seed, 7, 2);
  const unitScale = VIEWBOX_SIZE / ORIGINAL_BEAM_SIZE;
  const bodyExpansion = VIEWBOX_SIZE / ROOM_BEAM_SIZE;

  const roomBodyToOriginalBody = multiply(
    translate(-ROOM_BEAM_X * bodyExpansion, -ROOM_BEAM_Y * bodyExpansion),
    scale(bodyExpansion),
  );
  const originalBodyTransform = multiply(
    multiply(
      translate(wrapperTranslateX * unitScale, wrapperTranslateY * unitScale),
      rotate(bodyRotation, VIEWBOX_SIZE / 2, VIEWBOX_SIZE / 2),
    ),
    scale(originalScale),
  );
  const renderedCharacter = multiply(originalBodyTransform, roomBodyToOriginalBody);

  // CSS applies the character matrix around its transform origin. Conjugating the
  // rendered matrix keeps the existing centered animation coordinate system intact.
  const character = multiply(
    multiply(translate(-CHARACTER_ORIGIN_X, -CHARACTER_ORIGIN_Y), renderedCharacter),
    translate(CHARACTER_ORIGIN_X, CHARACTER_ORIGIN_Y),
  );
  const originalFaceTransform = multiply(
    translate(faceTranslateX * unitScale, faceTranslateY * unitScale),
    rotate(faceRotation, VIEWBOX_SIZE / 2, VIEWBOX_SIZE / 2),
  );
  const currentFaceTransform = rotate(
    currentFaceRotation,
    CHARACTER_ORIGIN_X,
    CHARACTER_ORIGIN_Y,
  );
  const faceAnchor = multiply(
    multiply(inverse(renderedCharacter), originalFaceTransform),
    inverse(currentFaceTransform),
  );

  return {
    character: cssTransform(character),
    faceAnchor: cssTransform(faceAnchor),
  };
};

export type MouthOpacities = {
  rest: number;
  smile: number;
  mid: number;
  open: number;
};

export type RestingMouthPaths = {
  rest: string;
  smile: string;
  scrunch: string;
};

export const beamRestingMouthPaths = (width: number): RestingMouthPaths => {
  const left = 50 - width;
  const right = 50 + width;
  const scrunchWidth = width * 0.52;
  const scrunchLeft = 50 - scrunchWidth;
  const scrunchRight = 50 + scrunchWidth;
  return {
    rest: `M${left} 62.5 C${left + width * 0.35} 66 ${right - width * 0.35} 66 ${right} 62.5 C${right - width * 0.35} 67.5 ${left + width * 0.35} 67.5 ${left} 62.5 Z`,
    smile: `M${left} 62.5 C${left + width * 0.35} 62.5 ${right - width * 0.35} 62.5 ${right} 62.5 C${right - width * 0.2} 72 ${left + width * 0.2} 72 ${left} 62.5 Z`,
    scrunch: `M${scrunchLeft} 63 C${scrunchLeft + scrunchWidth * 0.45} 60.8 ${scrunchRight - scrunchWidth * 0.45} 60.8 ${scrunchRight} 63 C${scrunchRight - scrunchWidth * 0.32} 66.2 ${scrunchLeft + scrunchWidth * 0.32} 66.2 ${scrunchLeft} 63 Z`,
  };
};

export const beamCharacterPose = (activity: AvatarActivity) => {
  switch (activity) {
    case 'listening':
      return 'translate(0px, 0px) scale(1.42, 1.39)';
    case 'thinking':
      return 'translate(-3px, 0.8px) scale(0.965, 0.985)';
    case 'speaking':
      return 'translate(0px, -1px) scale(1.02)';
    default:
      return 'translate(0px, 0px) scale(1)';
  }
};

export const beamShadowPose = (activity: AvatarActivity) => {
  switch (activity) {
    case 'listening':
      return 'translate(0px, 5px) scale(0.72, 0.62)';
    case 'thinking':
      return 'translate(-3px, 0px) scale(0.8, 0.82)';
    case 'speaking':
      return 'translate(0px, 0px) scale(0.92, 0.9)';
    default:
      return 'translate(0px, 0px) scale(1)';
  }
};

export const beamShadowOpacity = (activity: AvatarActivity) =>
  activity === 'listening' ? 0.08 : activity === 'thinking' ? 0.18 : 0.24;

export const beamBodyPose = (activity: AvatarActivity) => {
  switch (activity) {
    case 'listening':
      return 'translate(0px, 0.4px) rotate(-0.7deg) scale(1.018, 0.982)';
    case 'thinking':
      return 'translate(0px, -0.9px) rotate(-3deg) scale(0.99, 1.02)';
    case 'speaking':
      return 'translate(0px, -0.35px) rotate(0.8deg) scale(1.008, 0.992)';
    default:
      return 'translate(0px, 0px) scale(1)';
  }
};

export const beamFacePose = (activity: AvatarActivity) => {
  switch (activity) {
    case 'listening':
      return 'translate(0px, 0.65px) rotate(-0.4deg) scale(1.075, 0.955)';
    case 'thinking':
      return 'translate(0.65px, -2.4px) rotate(1.2deg)';
    case 'speaking':
      return 'translate(0px, 0.25px)';
    default:
      return 'translate(0px, 0px)';
  }
};

export const beamGazePose = (activity: AvatarActivity) => {
  switch (activity) {
    case 'listening':
      return 'translate(0px, -0.2px)';
    case 'thinking':
      return 'translate(0.9px, -2.7px) scaleX(0.98)';
    case 'speaking':
      return 'translate(0.15px, 0px)';
    default:
      return 'translate(0px, 0px)';
  }
};

export const beamMouthPose = (activity: AvatarActivity): MouthOpacities =>
  activity === 'speaking'
    ? { rest: 0, smile: 0, mid: 1, open: 0 }
    : { rest: 1, smile: 0, mid: 0, open: 0 };
