import * as React from 'react';
import { getContrast, getRandomColor, getUnit, hashCode } from '../utilities';
import { beamBodyPose, beamFacePose, beamMouthPose, useBeamMotion } from './motion';
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
    bodyOffset: getUnit(seed, 1.1, 2),
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
  const eyesOpen = React.useRef<SVGGElement>(null);
  const eyesClosed = React.useRef<SVGGElement>(null);
  const mouthRest = React.useRef<SVGGElement>(null);
  const mouthMid = React.useRef<SVGGElement>(null);
  const mouthOpen = React.useRef<SVGGElement>(null);

  useBeamMotion({
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
  });

  const mouthPose = beamMouthPose(activity);

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
          <stop stopColor={data.backgroundColor} stopOpacity="0.65" />
          <stop offset="1" stopColor={data.shadowColor} stopOpacity="0.42" />
        </radialGradient>
        <radialGradient id={`${maskId}-sphere`} cx="31%" cy="23%" r="78%">
          <stop offset="0" stopColor="white" />
          <stop offset="0.14" stopColor={data.bodyColor} />
          <stop offset="0.7" stopColor={data.bodyColor} />
          <stop offset="1" stopColor={data.shadowColor} />
        </radialGradient>
        <linearGradient id={`${maskId}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="white" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="black" stopOpacity="0.2" />
        </linearGradient>
        <filter id={`${maskId}-shadow`} x="-20%" y="-20%" width="140%" height="145%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.4" floodColor="#000" floodOpacity="0.24" />
        </filter>
      </defs>

      <g mask={`url(#${maskId})`}>
        <rect
          width={SIZE}
          height={SIZE}
          fill={`url(#${maskId}-background)`}
          opacity={square ? 0.48 : 0}
        />
        <g transform={`translate(${data.bodyOffset} 0)`}>
          <g
            ref={body}
            data-motion="beam-body"
            style={{ ...motionStyle, transform: beamBodyPose(activity) }}
          >
            <circle
              cx="50"
              cy="50"
              r="42"
              fill={`url(#${maskId}-sphere)`}
              filter={`url(#${maskId}-shadow)`}
            />
            <circle
              cx="50"
              cy="50"
              r="41.4"
              stroke={`url(#${maskId}-rim)`}
              strokeWidth="1.5"
            />
            <ellipse cx="37" cy="27" rx="11" ry="6.5" fill="white" opacity="0.2" />
            <g transform={`rotate(${data.faceRotation} 50 52)`}>
              <g
                ref={face}
                data-motion="beam-face"
                style={{ ...motionStyle, transform: beamFacePose(activity) }}
              >
                <g
                  ref={eyesOpen}
                  data-motion="beam-eyes-open"
                  style={{ opacity: 1 }}
                >
                  <ellipse
                    cx={50 - data.eyeSpread}
                    cy="48"
                    rx={data.eyeSize}
                    ry="3.9"
                    fill={data.faceColor}
                  />
                  <ellipse
                    cx={50 + data.eyeSpread}
                    cy="48"
                    rx={data.eyeSize}
                    ry="3.9"
                    fill={data.faceColor}
                  />
                  <circle cx={49 - data.eyeSpread} cy="46.8" r="0.8" fill="white" opacity="0.78" />
                  <circle cx={49 + data.eyeSpread} cy="46.8" r="0.8" fill="white" opacity="0.78" />
                </g>
                <g
                  ref={eyesClosed}
                  data-motion="beam-eyes-closed"
                  style={{ opacity: 0 }}
                >
                  <path
                    d={`M${47 - data.eyeSpread} 48 Q${50 - data.eyeSpread} 50 ${53 - data.eyeSpread} 48`}
                    stroke={data.faceColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M${47 + data.eyeSpread} 48 Q${50 + data.eyeSpread} 50 ${53 + data.eyeSpread} 48`}
                    stroke={data.faceColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </g>
                <g
                  ref={mouthRest}
                  data-motion="beam-mouth-rest"
                  style={{ opacity: mouthPose.rest }}
                >
                  <path
                    d={`M${50 - data.mouthWidth} 63 Q50 67 ${50 + data.mouthWidth} 63`}
                    stroke={data.faceColor}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                </g>
                <g
                  ref={mouthMid}
                  data-motion="beam-mouth-mid"
                  style={{ opacity: mouthPose.mid }}
                >
                  <ellipse cx="50" cy="64" rx={data.mouthWidth * 0.68} ry="3.2" fill={data.faceColor} />
                </g>
                <g
                  ref={mouthOpen}
                  data-motion="beam-mouth-open"
                  style={{ opacity: mouthPose.open }}
                >
                  <ellipse cx="50" cy="64" rx={data.mouthWidth * 0.72} ry="6.2" fill={data.faceColor} />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
};

export default AvatarBeam;
