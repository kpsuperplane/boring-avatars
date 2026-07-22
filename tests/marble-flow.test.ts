import { describe, expect, it } from 'vitest';
import {
  contourArea,
  createMarbleFlowEvent,
  createMarbleFlowState,
  createMarbleVelocityField,
  sampleMarbleVelocity,
  stateToPaths,
} from '../src/lib/components/marble-flow-field';

describe('Marble flow field', () => {
  it('generates deterministic, area-preserving contour events', () => {
    const first = createMarbleFlowState(12_345, 'idle');
    const second = createMarbleFlowState(12_345, 'idle');
    const different = createMarbleFlowState(54_321, 'idle');
    expect(stateToPaths(first)).toEqual(stateToPaths(second));
    expect(stateToPaths(first)).not.toEqual(stateToPaths(different));

    const event = createMarbleFlowEvent(first, 12_345, 'thinking', 0);
    expect(event.frames).toHaveLength(6);
    event.frames.flat().forEach((path) => expect(path.match(/C/g)).toHaveLength(8));
    event.finalState.contours.forEach((contour, index) => {
      const originalArea = contourArea(first.contours[index]);
      expect(contourArea(contour) / originalArea).toBeGreaterThanOrEqual(0.95);
      expect(contourArea(contour) / originalArea).toBeLessThanOrEqual(1.05);
      contour.nodes.forEach((node) => {
        [node.point, node.incoming, node.outgoing].forEach(({ x, y }) => {
          expect(x).toBeGreaterThanOrEqual(-12);
          expect(x).toBeLessThanOrEqual(112);
          expect(y).toBeGreaterThanOrEqual(-12);
          expect(y).toBeLessThanOrEqual(112);
        });
      });
    });
  });

  it('keeps the sampled velocity field approximately divergence-free', () => {
    const field = createMarbleVelocityField(7_654, 'thinking', 2);
    const delta = 0.01;
    const velocityX = (x: number, y: number) => sampleMarbleVelocity(field, { x, y }).x;
    const velocityY = (x: number, y: number) => sampleMarbleVelocity(field, { x, y }).y;

    [
      [24, 31],
      [48, 52],
      [76, 69],
    ].forEach(([x, y]) => {
      const divergence =
        (velocityX(x + delta, y) - velocityX(x - delta, y)) / (2 * delta) +
        (velocityY(x, y + delta) - velocityY(x, y - delta)) / (2 * delta);
      expect(Math.abs(divergence)).toBeLessThan(0.0001);
    });
  });
});
