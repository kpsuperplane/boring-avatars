import { hashCode } from '../utilities';
import type { AvatarActivity } from './types';
import { createSeededRandom, randomBetween } from './motion-core';

const POINTS = 8;
const FLOW_STEPS = 5;
const MIN_COORDINATE = -12;
const MAX_COORDINATE = 112;

export type FluidPoint = { x: number; y: number };

export type ContourNode = {
  point: FluidPoint;
  incoming: FluidPoint;
  outgoing: FluidPoint;
};

export type FluidContour = {
  nodes: ContourNode[];
  targetArea: number;
};

export type MarbleFlowState = {
  contours: FluidContour[];
};

export type MarbleVelocityField = {
  vortices: Array<{
    center: FluidPoint;
    radius: number;
    strength: number;
  }>;
  shear: number;
  strain: number;
  verticalDrift: number;
};

export type MarbleFlowEvent = {
  duration: number;
  frames: string[][];
  finalState: MarbleFlowState;
};

type FlowProfile = {
  duration: [number, number];
  strength: [number, number];
  shear: number;
  strain: number;
  verticalDrift: number;
};

const FLOW_PROFILES: Record<AvatarActivity, FlowProfile> = {
  idle: {
    duration: [7_000, 10_000],
    strength: [2.7, 3.9],
    shear: 0.22,
    strain: 0.004,
    verticalDrift: 0.08,
  },
  listening: {
    duration: [5_500, 7_500],
    strength: [3, 4.5],
    shear: 0.42,
    strain: 0.018,
    verticalDrift: -0.04,
  },
  thinking: {
    duration: [4_500, 6_500],
    strength: [4.3, 6.1],
    shear: 0.58,
    strain: 0.012,
    verticalDrift: -0.12,
  },
  speaking: {
    duration: [5_000, 7_000],
    strength: [3.2, 4.7],
    shear: 0.34,
    strain: 0.006,
    verticalDrift: -0.06,
  },
};

const motionNumber = (value: number) =>
  Math.abs(value) < 0.005 ? 0 : Number(value.toFixed(2));

const point = (x: number, y: number): FluidPoint => ({ x, y });

const clonePoint = (value: FluidPoint): FluidPoint => point(value.x, value.y);

const cloneContour = (contour: FluidContour): FluidContour => ({
  nodes: contour.nodes.map((node) => ({
    point: clonePoint(node.point),
    incoming: clonePoint(node.incoming),
    outgoing: clonePoint(node.outgoing),
  })),
  targetArea: contour.targetArea,
});

const cloneState = (state: MarbleFlowState): MarbleFlowState => ({
  contours: state.contours.map(cloneContour),
});

export const contourArea = (contour: FluidContour) => {
  const anchors = contour.nodes.map((node) => node.point);
  return Math.abs(
    anchors.reduce((area, current, index) => {
      const next = anchors[(index + 1) % anchors.length];
      return area + current.x * next.y - next.x * current.y;
    }, 0) / 2,
  );
};

const contourCentroid = (contour: FluidContour) => {
  const anchors = contour.nodes.map((node) => node.point);
  return anchors.reduce(
    (center, current) => ({
      x: center.x + current.x / anchors.length,
      y: center.y + current.y / anchors.length,
    }),
    point(0, 0),
  );
};

const contourFromAnchors = (anchors: FluidPoint[]): FluidContour => {
  const nodes = anchors.map((anchor, index) => {
    const previous = anchors[(index - 1 + anchors.length) % anchors.length];
    const next = anchors[(index + 1) % anchors.length];
    const tangent = point((next.x - previous.x) / 6, (next.y - previous.y) / 6);
    return {
      point: clonePoint(anchor),
      incoming: point(anchor.x - tangent.x, anchor.y - tangent.y),
      outgoing: point(anchor.x + tangent.x, anchor.y + tangent.y),
    };
  });
  const contour = { nodes, targetArea: 0 };
  contour.targetArea = contourArea(contour);
  return contour;
};

const createContour = (
  random: () => number,
  center: FluidPoint,
  radiusX: number,
  radiusY: number,
  phase: number,
) => {
  const anchors = Array.from({ length: POINTS }, (_, index) => {
    const angle = (Math.PI * 2 * index) / POINTS;
    const wobble =
      1 +
      0.12 * Math.sin(angle * 3 + phase) +
      0.06 * Math.sin(angle * 5 - phase * 0.7) +
      randomBetween(random, -0.035, 0.035);
    return point(
      center.x + Math.cos(angle) * radiusX * wobble,
      center.y + Math.sin(angle) * radiusY * wobble,
    );
  });
  return contourFromAnchors(anchors);
};

const activityPhase = (activity: AvatarActivity) =>
  activity === 'idle' ? 0 : activity === 'listening' ? 0.7 : activity === 'thinking' ? 1.4 : 2.1;

export const createMarbleFlowState = (
  seed: number,
  activity: AvatarActivity,
): MarbleFlowState => {
  const random = createSeededRandom(hashCode(`${seed}:${activity}:marble-contours`));
  const phase = randomBetween(random, 0, Math.PI * 2) + activityPhase(activity);
  return {
    contours: [
      createContour(
        random,
        point(30 + randomBetween(random, -3, 3), 42 + randomBetween(random, -3, 3)),
        48,
        31,
        phase,
      ),
      createContour(
        random,
        point(69 + randomBetween(random, -3, 3), 61 + randomBetween(random, -3, 3)),
        46,
        34,
        phase + 1.9,
      ),
      createContour(
        random,
        point(52 + randomBetween(random, -4, 4), 29 + randomBetween(random, -2, 3)),
        39,
        27,
        phase + 3.7,
      ),
    ],
  };
};

export const contourToPath = (contour: FluidContour) => {
  const first = contour.nodes[0].point;
  const commands = contour.nodes.map((node, index) => {
    const next = contour.nodes[(index + 1) % contour.nodes.length];
    return `C${motionNumber(node.outgoing.x)} ${motionNumber(node.outgoing.y)} ${motionNumber(next.incoming.x)} ${motionNumber(next.incoming.y)} ${motionNumber(next.point.x)} ${motionNumber(next.point.y)}`;
  });
  return `M${motionNumber(first.x)} ${motionNumber(first.y)}${commands.join('')}Z`;
};

export const stateToPaths = (state: MarbleFlowState) => state.contours.map(contourToPath);

export const createMarbleVelocityField = (
  seed: number,
  activity: AvatarActivity,
  eventIndex: number,
): MarbleVelocityField => {
  const profile = FLOW_PROFILES[activity];
  const random = createSeededRandom(hashCode(`${seed}:${activity}:marble-flow:${eventIndex}`));
  const firstDirection = random() < 0.5 ? -1 : 1;
  const secondDirection = random() < 0.72 ? -firstDirection : firstDirection;
  const engulfing = activity === 'idle' && eventIndex % 4 === 3;
  const strengthMultiplier = engulfing ? 1.32 : 1;
  return {
    vortices: [
      {
        center: point(randomBetween(random, 25, 48), randomBetween(random, 28, 72)),
        radius: randomBetween(random, 28, 42),
        strength:
          firstDirection * randomBetween(random, ...profile.strength) * strengthMultiplier,
      },
      {
        center: point(randomBetween(random, 54, 79), randomBetween(random, 25, 75)),
        radius: randomBetween(random, 30, 46),
        strength:
          secondDirection * randomBetween(random, ...profile.strength) * strengthMultiplier,
      },
    ],
    shear: profile.shear * (random() < 0.5 ? -1 : 1),
    strain: profile.strain * (random() < 0.5 ? -1 : 1),
    verticalDrift: profile.verticalDrift * (random() < 0.5 ? -1 : 1),
  };
};

export const sampleMarbleVelocity = (
  field: MarbleVelocityField,
  value: FluidPoint,
): FluidPoint => {
  const velocity = field.vortices.reduce(
    (total, vortex) => {
      const dx = value.x - vortex.center.x;
      const dy = value.y - vortex.center.y;
      const falloff = Math.exp(-(dx * dx + dy * dy) / (vortex.radius * vortex.radius));
      return {
        x: total.x - (dy / vortex.radius) * vortex.strength * falloff,
        y: total.y + (dx / vortex.radius) * vortex.strength * falloff,
      };
    },
    point(0, 0),
  );
  velocity.x += ((value.y - 50) / 50) * field.shear;
  velocity.y += ((50 - value.x) / 50) * field.shear + field.verticalDrift;
  velocity.x -= (value.x - 50) * field.strain;
  velocity.y += (value.y - 50) * field.strain;
  return velocity;
};

const advectPoint = (field: MarbleVelocityField, value: FluidPoint) => {
  const first = sampleMarbleVelocity(field, value);
  const midpoint = point(value.x + first.x * 0.5, value.y + first.y * 0.5);
  const second = sampleMarbleVelocity(field, midpoint);
  return point(value.x + second.x, value.y + second.y);
};

const preserveArea = (contour: FluidContour) => {
  const currentArea = contourArea(contour);
  if (currentArea <= 0) return;
  const center = contourCentroid(contour);
  const scale = Math.sqrt(contour.targetArea / currentArea);
  contour.nodes.forEach((node) => {
    [node.point, node.incoming, node.outgoing].forEach((value) => {
      value.x = center.x + (value.x - center.x) * scale;
      value.y = center.y + (value.y - center.y) * scale;
    });
  });
};

const keepInBounds = (contour: FluidContour) => {
  const values = contour.nodes.flatMap((node) => [node.point, node.incoming, node.outgoing]);
  const minimumX = Math.min(...values.map((value) => value.x));
  const maximumX = Math.max(...values.map((value) => value.x));
  const minimumY = Math.min(...values.map((value) => value.y));
  const maximumY = Math.max(...values.map((value) => value.y));
  const shiftX =
    minimumX < MIN_COORDINATE
      ? MIN_COORDINATE - minimumX
      : maximumX > MAX_COORDINATE
        ? MAX_COORDINATE - maximumX
        : 0;
  const shiftY =
    minimumY < MIN_COORDINATE
      ? MIN_COORDINATE - minimumY
      : maximumY > MAX_COORDINATE
        ? MAX_COORDINATE - maximumY
        : 0;
  contour.nodes.forEach((node) => {
    [node.point, node.incoming, node.outgoing].forEach((value) => {
      value.x += shiftX;
      value.y += shiftY;
    });
  });
};

const advectContour = (contour: FluidContour, field: MarbleVelocityField) => {
  contour.nodes.forEach((node) => {
    node.point = advectPoint(field, node.point);
    node.incoming = advectPoint(field, node.incoming);
    node.outgoing = advectPoint(field, node.outgoing);
  });
  preserveArea(contour);
  keepInBounds(contour);
};

export const createMarbleFlowEvent = (
  current: MarbleFlowState,
  seed: number,
  activity: AvatarActivity,
  eventIndex: number,
): MarbleFlowEvent => {
  const profile = FLOW_PROFILES[activity];
  const random = createSeededRandom(hashCode(`${seed}:${activity}:marble-duration:${eventIndex}`));
  const field = createMarbleVelocityField(seed, activity, eventIndex);
  const next = cloneState(current);
  const frames = [stateToPaths(next)];
  for (let step = 0; step < FLOW_STEPS; step += 1) {
    next.contours.forEach((contour) => advectContour(contour, field));
    frames.push(stateToPaths(next));
  }
  return {
    duration: randomBetween(random, ...profile.duration),
    frames,
    finalState: next,
  };
};

export const createMarblePressurePath = (
  seed: number,
  activity: AvatarActivity,
  level: number,
) => {
  const random = createSeededRandom(hashCode(`${seed}:${activity}:marble-pressure`));
  const phase = randomBetween(random, 0, Math.PI * 2);
  const direction = random() < 0.5 ? -1 : 1;
  const normalized = Math.min(1, Math.max(0, level));
  const anchors = Array.from({ length: POINTS }, (_, index) => {
    const angle = (Math.PI * 2 * index) / POINTS;
    const pressure = Math.max(0, Math.cos(angle - phase)) * normalized;
    const radiusX = 25 + normalized * 8 + pressure * 7;
    const radiusY = 20 - normalized * 2 + (1 - pressure) * normalized * 5;
    return point(
      50 + Math.cos(angle) * radiusX + direction * Math.sin(angle * 2) * normalized * 2.5,
      50 + Math.sin(angle) * radiusY - pressure * normalized * 3,
    );
  });
  return contourToPath(contourFromAnchors(anchors));
};

export const cssPath = (path: string) => `path("${path}")`;
