import type { AvatarActivity } from './types';

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
