import * as React from 'react';
import { getRandomColor, hashCode } from '../utilities';
import {
  createMarbleFlowState,
  createMarblePressurePath,
  stateToPaths,
} from './marble-flow-field';
import { marbleRippleOpacity, useMarbleMotion } from './motion';
import type { AvatarProps } from './types';

const SIZE = 100;
const DEFAULT_COLORS = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'];
const generateData = (name: string, colors: string[]) => {
  const seed = hashCode(name);
  return {
    seed,
    background: getRandomColor(seed, colors, colors.length),
    middle: getRandomColor(seed + 7, colors, colors.length),
    foreground: getRandomColor(seed + 19, colors, colors.length),
    accent: getRandomColor(seed + 31, colors, colors.length),
  };
};

const luminance = (color: string) => {
  const hex = color.startsWith('#') ? color.slice(1) : color;
  const expanded = hex.length === 3 ? hex.split('').map((value) => value + value).join('') : hex;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4),
  );
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
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
  const dyeA = React.useRef<SVGPathElement>(null);
  const dyeB = React.useRef<SVGPathElement>(null);
  const dyeC = React.useRef<SVGPathElement>(null);
  const pressure = React.useRef<SVGPathElement>(null);
  const staticPaths = React.useMemo(
    () => stateToPaths(createMarbleFlowState(data.seed, activity)),
    [activity, data.seed],
  );
  const pressurePath = React.useMemo(
    () => createMarblePressurePath(data.seed, activity, 0),
    [activity, data.seed],
  );
  const medianLuminance = [...palette]
    .map(luminance)
    .sort((first, second) => first - second)[Math.floor(palette.length / 2)];
  const blendMode: React.CSSProperties['mixBlendMode'] =
    medianLuminance < 0.45 ? 'screen' : 'multiply';

  useMarbleMotion({
    activity,
    animated,
    audioLevel,
    name,
    seed: data.seed,
    dyeA,
    dyeB,
    dyeC,
    pressure,
  });

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
        <radialGradient
          id={`${maskId}-base`}
          gradientUnits="userSpaceOnUse"
          cx="28"
          cy="20"
          r="92"
        >
          <stop offset="0" stopColor={data.accent} />
          <stop offset="0.54" stopColor={data.background} />
          <stop offset="1" stopColor={data.middle} />
        </radialGradient>
        <filter id={`${maskId}-fluid-soft`} x="-16%" y="-16%" width="132%" height="132%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <radialGradient id={`${maskId}-dye-a`} cx="34%" cy="36%" r="72%">
          <stop stopColor={data.accent} stopOpacity="0.94" />
          <stop offset="0.62" stopColor={data.middle} stopOpacity="0.82" />
          <stop offset="1" stopColor={data.middle} stopOpacity="0.52" />
        </radialGradient>
        <linearGradient id={`${maskId}-dye-b`} x1="0" y1="1" x2="1" y2="0">
          <stop stopColor={data.foreground} stopOpacity="0.9" />
          <stop offset="0.56" stopColor={data.background} stopOpacity="0.76" />
          <stop offset="1" stopColor={data.accent} stopOpacity="0.48" />
        </linearGradient>
        <radialGradient id={`${maskId}-dye-c`} cx="68%" cy="28%" r="68%">
          <stop stopColor={data.background} stopOpacity="0.88" />
          <stop offset="0.58" stopColor={data.accent} stopOpacity="0.68" />
          <stop offset="1" stopColor={data.foreground} stopOpacity="0.34" />
        </radialGradient>
        <linearGradient id={`${maskId}-sheen`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="white" stopOpacity="0.32" />
          <stop offset="0.45" stopColor="white" stopOpacity="0.04" />
          <stop offset="1" stopColor="black" stopOpacity="0.12" />
        </linearGradient>
        <radialGradient id={`${maskId}-bloom`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={data.accent} stopOpacity="0.62" />
          <stop offset="0.48" stopColor={data.foreground} stopOpacity="0.34" />
          <stop offset="1" stopColor={data.foreground} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g mask={`url(#${maskId})`}>
        <rect x="-20" y="-20" width="140" height="140" fill={`url(#${maskId}-base)`} />
        <g filter={`url(#${maskId}-fluid-soft)`}>
          <path
            ref={dyeA}
            data-motion="marble-field"
            d={staticPaths[0]}
            fill={`url(#${maskId}-dye-a)`}
            opacity="0.82"
          />
          <path
            ref={dyeB}
            data-motion="marble-flow"
            d={staticPaths[1]}
            fill={`url(#${maskId}-dye-b)`}
            opacity="0.76"
          />
          <path
            ref={dyeC}
            data-motion="marble-secondary"
            d={staticPaths[2]}
            fill={`url(#${maskId}-dye-c)`}
            opacity="0.52"
            style={{ mixBlendMode: blendMode }}
          />
          <path
            ref={pressure}
            data-motion="marble-bloom"
            d={pressurePath}
            fill={`url(#${maskId}-bloom)`}
            opacity={marbleRippleOpacity(activity)}
            style={{ mixBlendMode: 'screen' }}
          />
        </g>
        <rect width={SIZE} height={SIZE} fill={`url(#${maskId}-sheen)`} opacity="0.4" />
      </g>
    </svg>
  );
};

export default AvatarMarble;
