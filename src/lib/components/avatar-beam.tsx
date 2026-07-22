import * as React from 'react';
import { getBoolean, getContrast, getRandomColor, getUnit, hashCode } from '../utilities';
import {
  beamBodyPose,
  beamCharacterPose,
  beamFacePose,
  beamGazePose,
  beamMouthPose,
  beamOriginalIdleTransforms,
  beamRestingMouthPaths,
  beamShadowOpacity,
  beamShadowPose,
  useBeamMotion,
} from './motion';
import type { AvatarProps } from './types';

const SIZE = 100;
const EYE_SPACING_SCALE = 1.15;
const MOUTH_Y_OFFSET = -2.4;
const DEFAULT_COLORS = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'];
const motionStyle: React.CSSProperties = {
  transformBox: 'fill-box',
  transformOrigin: 'center',
};
const characterMotionStyle: React.CSSProperties = {
  transformBox: 'view-box',
  transformOrigin: '50px 52px',
};
const faceAnchorMotionStyle: React.CSSProperties = {
  transformBox: 'view-box',
  transformOrigin: '0 0',
};

const generateData = (name: string, colors: string[]) => {
  const seed = hashCode(name);
  const bodyColor = getRandomColor(seed, colors, colors.length);
  const faceColor = getContrast(bodyColor);
  return {
    seed,
    bodyColor,
    faceColor,
    backgroundColor: getRandomColor(seed + 13, colors, colors.length),
    shadowColor: getRandomColor(seed + 29, colors, colors.length),
    isCircle: getBoolean(seed, 1),
    eyeSpread: (10.5 + Math.abs(getUnit(seed, 1.5, 1))) * EYE_SPACING_SCALE,
    eyeSize: (3.2 + (seed % 3) * 0.3) * 0.8,
    mouthWidth: 7.5 + (seed % 4),
    useHalfMoon: seed % 2 === 0,
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
  const mouthPaths = React.useMemo(
    () => beamRestingMouthPaths(data.mouthWidth),
    [data.mouthWidth],
  );
  const maskId = React.useId();
  const character = React.useRef<SVGGElement>(null);
  const shadow = React.useRef<SVGEllipseElement>(null);
  const body = React.useRef<SVGGElement>(null);
  const faceAnchor = React.useRef<SVGGElement>(null);
  const face = React.useRef<SVGGElement>(null);
  const gaze = React.useRef<SVGGElement>(null);
  const eyesOpen = React.useRef<SVGGElement>(null);
  const eyesClosed = React.useRef<SVGGElement>(null);
  const mouthRest = React.useRef<SVGGElement>(null);
  const mouthSmile = React.useRef<SVGGElement>(null);
  const mouthMorph = React.useRef<SVGPathElement>(null);
  const mouthMid = React.useRef<SVGGElement>(null);
  const mouthOpen = React.useRef<SVGGElement>(null);

  useBeamMotion({
    activity,
    animated,
    audioLevel,
    name,
    isCircle: data.isCircle,
    faceRotation: data.faceRotation,
    character,
    shadow,
    body,
    faceAnchor,
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
  });

  const mouthPose = beamMouthPose(activity);
  const originalIdleTransforms = beamOriginalIdleTransforms(
    data.seed,
    data.faceRotation,
    data.isCircle,
  );
  const isOriginalStaticIdle = activity === 'idle' && !animated;
  const characterPose = isOriginalStaticIdle
    ? originalIdleTransforms.character
    : beamCharacterPose(activity);
  const faceAnchorPose = isOriginalStaticIdle
    ? originalIdleTransforms.faceAnchor
    : 'translate(0px, 0px) rotate(0deg) scale(1)';

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
        <radialGradient id={`${maskId}-sphere`} cx="31%" cy="23%" r="78%">
          <stop offset="0.14" stopColor={data.bodyColor} />
          <stop offset="0.7" stopColor={data.bodyColor} />
          <stop offset="1" stopColor={data.shadowColor} />
        </radialGradient>
        <linearGradient id={`${maskId}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="white" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="white" stopOpacity="0" />
          <stop offset="1" stopColor="black" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id={`${maskId}-ground-shadow`}>
          <stop stopColor="#000" stopOpacity="0.3" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g
        mask={`url(#${maskId})`}
        data-beam-viewport-shape={square ? 'square' : 'circle'}
        data-beam-body-shape={data.isCircle ? 'circle' : 'rounded-square'}
      >
        <rect width={SIZE} height={SIZE} fill={data.backgroundColor} />
        <ellipse
          ref={shadow}
          data-motion="beam-shadow"
          cx="50"
          cy="88"
          rx="25"
          ry="5"
          fill={`url(#${maskId}-ground-shadow)`}
          style={{
            ...motionStyle,
            opacity: beamShadowOpacity(activity),
            transform: beamShadowPose(activity),
          }}
        />
        <g
          ref={character}
          data-motion="beam-character"
          style={{ ...characterMotionStyle, transform: characterPose }}
        >
          <g
            ref={body}
            data-motion="beam-body"
            style={{ ...motionStyle, transform: beamBodyPose(activity) }}
          >
            {data.isCircle ? (
              <>
                <circle cx="50" cy="52" r="34" fill={`url(#${maskId}-sphere)`} />
                <circle
                  cx="50"
                  cy="52"
                  r="33.4"
                  stroke={`url(#${maskId}-rim)`}
                  strokeWidth="1.4"
                />
              </>
            ) : (
              <>
                <rect
                  x="16"
                  y="18"
                  width="68"
                  height="68"
                  rx="12"
                  fill={`url(#${maskId}-sphere)`}
                />
                <rect
                  x="16.6"
                  y="18.6"
                  width="66.8"
                  height="66.8"
                  rx="11.4"
                  stroke={`url(#${maskId}-rim)`}
                  strokeWidth="1.4"
                />
              </>
            )}
            <g
              ref={faceAnchor}
              data-motion="beam-face-anchor"
              style={{ ...faceAnchorMotionStyle, transform: faceAnchorPose }}
            >
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
                    <g
                      ref={gaze}
                      data-motion="beam-gaze"
                      style={{ ...motionStyle, transform: beamGazePose(activity) }}
                    >
                      <ellipse
                        cx={50 - data.eyeSpread}
                        cy="48"
                        rx={data.eyeSize}
                        ry="3.12"
                        fill={data.faceColor}
                      />
                      <ellipse
                        cx={50 + data.eyeSpread}
                        cy="48"
                        rx={data.eyeSize}
                        ry="3.12"
                        fill={data.faceColor}
                      />
                    </g>
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
                    data-motion="beam-mouth-position"
                    transform={`translate(0 ${MOUTH_Y_OFFSET})`}
                  >
                    <g
                      ref={mouthRest}
                      data-motion="beam-mouth-rest"
                      style={{ opacity: mouthPose.rest }}
                    >
                      <path
                        ref={mouthMorph}
                        data-motion="beam-mouth-morph"
                        d={
                          activity === 'thinking'
                            ? mouthPaths.scrunch
                            : !animated || data.useHalfMoon
                              ? mouthPaths.smile
                              : mouthPaths.rest
                        }
                        fill={data.faceColor}
                        stroke={data.faceColor}
                        strokeWidth="1.1"
                        strokeLinejoin="round"
                      />
                    </g>
                    <g
                      ref={mouthSmile}
                      data-motion="beam-mouth-smile"
                      style={{ opacity: mouthPose.smile }}
                    />
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
        </g>
        <rect
          x="0.6"
          y="0.6"
          width="98.8"
          height="98.8"
          rx={square ? 0 : 49.4}
          stroke="#000"
          strokeOpacity="0.12"
          strokeWidth="1.2"
          pointerEvents="none"
        />
      </g>
    </svg>
  );
};

export default AvatarBeam;
