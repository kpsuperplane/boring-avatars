import * as React from 'react';
import { getRandomColor, getUnit, hashCode } from '../utilities';
import { marblePose, useMarbleMotion } from './motion';
import type { AvatarProps } from './types';

const SIZE = 100;
const DEFAULT_COLORS = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'];
const motionStyle: React.CSSProperties = {
  transformBox: 'fill-box',
  transformOrigin: 'center',
};

const generateData = (name: string, colors: string[]) => {
  const seed = hashCode(name);
  return {
    seed,
    background: getRandomColor(seed, colors, colors.length),
    middle: getRandomColor(seed + 7, colors, colors.length),
    foreground: getRandomColor(seed + 19, colors, colors.length),
    accent: getRandomColor(seed + 31, colors, colors.length),
    firstRotation: getUnit(seed, 32, 1),
    secondRotation: getUnit(seed + 17, 38, 2),
    offsetX: getUnit(seed, 5, 1),
    offsetY: getUnit(seed, 5, 2),
  };
};

const AvatarMarble = ({
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
  const flow = React.useRef<SVGGElement>(null);
  const secondary = React.useRef<SVGGElement>(null);
  const ripple = React.useRef<SVGGElement>(null);

  useMarbleMotion({ activity, animated, audioLevel, name, flow, secondary, ripple });

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      fill="none"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      data-avatar-variant="marble"
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
        <radialGradient id={`${maskId}-base`} cx="28%" cy="20%" r="92%">
          <stop offset="0" stopColor={data.accent} />
          <stop offset="0.54" stopColor={data.background} />
          <stop offset="1" stopColor={data.middle} />
        </radialGradient>
        <filter id={`${maskId}-soft`} x="-22%" y="-22%" width="144%" height="144%">
          <feGaussianBlur stdDeviation="5.4" />
        </filter>
        <linearGradient id={`${maskId}-sheen`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="white" stopOpacity="0.32" />
          <stop offset="0.45" stopColor="white" stopOpacity="0.04" />
          <stop offset="1" stopColor="black" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      <g mask={`url(#${maskId})`}>
        <rect width={SIZE} height={SIZE} fill={`url(#${maskId}-base)`} />
        <g
          ref={flow}
          data-motion="marble-flow"
          style={{ ...motionStyle, transform: marblePose(activity) }}
        >
          <path
            d="M-12 37C2 5 31 4 48 19c19 17 30 6 52-8l18 54c-21 13-42 17-57 7-24-16-41 10-65 16z"
            fill={data.middle}
            transform={`translate(${data.offsetX} ${data.offsetY}) rotate(${data.firstRotation} 50 50)`}
            filter={`url(#${maskId}-soft)`}
          />
          <path
            d="M7 105C-2 75 12 54 35 53c28-1 26-30 61-35l14 69c-22 18-37 3-55 11-18 9-31 17-48 7z"
            fill={data.foreground}
            opacity="0.88"
            filter={`url(#${maskId}-soft)`}
            transform={`rotate(${data.secondRotation} 50 50)`}
          />
        </g>
        <g ref={secondary} data-motion="marble-secondary" style={motionStyle}>
          <ellipse
            cx={27 + data.offsetX}
            cy={67 + data.offsetY}
            rx="25"
            ry="19"
            fill={data.accent}
            opacity="0.66"
            filter={`url(#${maskId}-soft)`}
          />
          <ellipse
            cx={74 - data.offsetX}
            cy={28 - data.offsetY}
            rx="20"
            ry="25"
            fill={data.background}
            opacity="0.64"
            filter={`url(#${maskId}-soft)`}
          />
        </g>
        <g
          ref={ripple}
          data-motion="marble-ripple"
          opacity={activity === 'speaking' ? 0.32 : activity === 'idle' ? 0.12 : 0}
          style={motionStyle}
        >
          <circle cx="50" cy="50" r="31" stroke="white" strokeWidth="2" opacity="0.42" />
          <circle cx="50" cy="50" r="38" stroke={data.accent} strokeWidth="1.5" opacity="0.34" />
        </g>
        <circle cx="34" cy="25" r="27" fill={`url(#${maskId}-sheen)`} opacity="0.72" />
        <rect width={SIZE} height={SIZE} fill={`url(#${maskId}-sheen)`} opacity="0.4" />
      </g>
    </svg>
  );
};

export default AvatarMarble;
