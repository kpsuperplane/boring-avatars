import * as React from 'react';
import { getContrast, getRandomColor, getUnit, hashCode } from '../utilities';
import { beamBodyPose, beamFacePose, useBeamMotion } from './motion';
import type { AvatarProps } from './types';

const SIZE = 100;
const DEFAULT_COLORS = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'];
const motionStyle: React.CSSProperties = {
  transformBox: 'fill-box',
  transformOrigin: 'center',
};

const generateData = (name: string, colors: string[]) => {
  const seed = hashCode(name);
  const bodyColor = getRandomColor(seed, colors, colors.length);
  return {
    seed,
    bodyColor,
    faceColor: getContrast(bodyColor),
    backgroundColor: getRandomColor(seed + 13, colors, colors.length),
    shadowColor: getRandomColor(seed + 29, colors, colors.length),
    eyeSpread: 10 + Math.abs(getUnit(seed, 4, 1)),
    eyeSize: 3.2 + (seed % 3) * 0.3,
    mouthWidth: 7.5 + (seed % 4),
    bodyOffset: getUnit(seed, 2.2, 2),
    faceRotation: getUnit(seed, 4, 3),
  };
};

const AvatarBeam = ({
  name = 'Clara Barton',
  colors = DEFAULT_COLORS,
  activity = 'idle',
  audioLevel,
  animated = true,
  title = false,
  square = false,
  size = '40px',
  ...otherProps
}: AvatarProps) => {
  const palette = colors.length ? colors : DEFAULT_COLORS;
  const data = generateData(name, palette);
  const maskId = React.useId();
  const body = React.useRef<SVGGElement>(null);
  const face = React.useRef<SVGGElement>(null);
  const eyes = React.useRef<SVGGElement>(null);
  const mouth = React.useRef<SVGGElement>(null);

  useBeamMotion({ activity, animated, audioLevel, name, body, face, eyes, mouth });

  const mouthY = activity === 'thinking' ? 62 : 64;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      fill="none"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      data-avatar-variant="beam"
      data-avatar-activity={activity}
      data-audio-level={audioLevel ?? 'fallback'}
      data-animated={animated}
      {...otherProps}
    >
      {title && <title>{name}</title>}
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={SIZE} height={SIZE}>
          <rect width={SIZE} height={SIZE} rx={square ? 0 : SIZE / 2} fill="white" />
        </mask>
        <radialGradient id={`${maskId}-background`} cx="34%" cy="24%" r="90%">
          <stop stopColor={data.backgroundColor} stopOpacity="0.82" />
          <stop offset="1" stopColor={data.shadowColor} />
        </radialGradient>
        <radialGradient id={`${maskId}-sphere`} cx="32%" cy="24%" r="76%">
          <stop offset="0" stopColor="white" stopOpacity="0.72" />
          <stop offset="0.16" stopColor={data.bodyColor} />
          <stop offset="0.72" stopColor={data.bodyColor} />
          <stop offset="1" stopColor={data.faceColor} stopOpacity="0.28" />
        </radialGradient>
        <linearGradient id={`${maskId}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="white" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="black" stopOpacity="0.2" />
        </linearGradient>
        <filter id={`${maskId}-shadow`} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.28" />
        </filter>
      </defs>

      <g mask={`url(#${maskId})`}>
        <rect width={SIZE} height={SIZE} fill={`url(#${maskId}-background)`} />
        <ellipse cx="50" cy="84" rx="27" ry="6" fill="#000" opacity="0.18" />
        <g transform={`translate(${data.bodyOffset} 0)`}>
          <g
            ref={body}
            data-motion="beam-body"
            style={{ ...motionStyle, transform: beamBodyPose(activity) }}
          >
            <circle
              cx="50"
              cy="49"
              r="34"
              fill={`url(#${maskId}-sphere)`}
              filter={`url(#${maskId}-shadow)`}
            />
            <circle
              cx="50"
              cy="49"
              r="33.5"
              stroke={`url(#${maskId}-rim)`}
              strokeWidth="1.5"
            />
            <ellipse cx="39" cy="31" rx="10" ry="6" fill="white" opacity="0.19" />
            <g transform={`rotate(${data.faceRotation} 50 52)`}>
              <g
                ref={face}
                data-motion="beam-face"
                style={{ ...motionStyle, transform: beamFacePose(activity) }}
              >
                <g
                  ref={eyes}
                  data-motion="beam-eyes"
                  style={{ ...motionStyle, transformOrigin: 'center 49px' }}
                >
                  <ellipse
                    cx={50 - data.eyeSpread}
                    cy="49"
                    rx={data.eyeSize}
                    ry={activity === 'listening' ? 4.2 : 3.7}
                    fill={data.faceColor}
                  />
                  <ellipse
                    cx={50 + data.eyeSpread}
                    cy="49"
                    rx={data.eyeSize}
                    ry={activity === 'listening' ? 4.2 : 3.7}
                    fill={data.faceColor}
                  />
                  <circle cx={49 - data.eyeSpread} cy="47.8" r="0.8" fill="white" opacity="0.78" />
                  <circle cx={49 + data.eyeSpread} cy="47.8" r="0.8" fill="white" opacity="0.78" />
                </g>
                <g
                  ref={mouth}
                  data-motion="beam-mouth"
                  style={{ ...motionStyle, transformOrigin: `center ${mouthY}px` }}
                >
                  {activity === 'speaking' ? (
                    <ellipse
                      cx="50"
                      cy={mouthY}
                      rx={data.mouthWidth * 0.72}
                      ry="3.4"
                      fill={data.faceColor}
                    />
                  ) : (
                    <path
                      d={`M${50 - data.mouthWidth} ${mouthY} Q50 ${mouthY + (activity === 'listening' ? 2 : 3.4)} ${50 + data.mouthWidth} ${mouthY}`}
                      stroke={data.faceColor}
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                  )}
                </g>
              </g>
            </g>
          </g>
        </g>
        <rect width={SIZE} height={SIZE} fill="white" opacity="0.025" />
      </g>
    </svg>
  );
};

export default AvatarBeam;
