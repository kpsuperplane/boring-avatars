// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Avatar from '../src/lib';
import { getBoolean, getUnit, hashCode } from '../src/lib/utilities';
import {
  beamOriginalIdleTransforms,
  beamShortestRotationTransform,
} from '../src/lib/components/beam-poses';
import {
  createMarbleFlowState,
  stateToPaths,
} from '../src/lib/components/marble-flow-field';

const setReducedMotion = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('motion controller', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;
  let cancelSpies: Array<ReturnType<typeof vi.fn>>;
  let animateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.append(container);
    cancelSpies = [];
    animateSpy = vi.fn(() => {
      const cancel = vi.fn();
      cancelSpies.push(cancel);
      return { cancel } as unknown as Animation;
    });
    Object.defineProperty(SVGElement.prototype, 'animate', {
      configurable: true,
      value: animateSpy,
    });
    setReducedMotion(false);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
      root = undefined;
    }
    container.remove();
    Reflect.deleteProperty(SVGElement.prototype, 'getAnimations');
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts after mounting, cancels on activity changes, and cancels on unmount', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Motion Test" variant="marble" activity="idle" />);
    });

    expect(animateSpy).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(120));
    expect(animateSpy).toHaveBeenCalledTimes(3);
    const idleCancels = [...cancelSpies];

    await act(async () => {
      root?.render(<Avatar name="Motion Test" variant="marble" activity="thinking" />);
    });

    idleCancels.forEach((cancel) => expect(cancel).toHaveBeenCalledOnce());
    expect(animateSpy).toHaveBeenCalledTimes(7);
    await act(async () => vi.advanceTimersByTime(480));
    expect(animateSpy).toHaveBeenCalledTimes(10);
    const marbleTransition = animateSpy.mock.calls.slice(3, 6);
    marbleTransition.forEach(([keyframes, options]) => {
      expect(keyframes).toHaveLength(2);
      expect(keyframes[0].d).toMatch(/^path\("M/);
      expect(keyframes[1].d).toMatch(/^path\("M/);
      expect(JSON.stringify(keyframes)).not.toContain('transform');
      expect(options).toMatchObject({ duration: 360, iterations: 1 });
    });
    const thinkingCancels = cancelSpies.slice(3);

    await act(async () => root?.unmount());
    root = undefined;
    thinkingCancels.forEach((cancel) => expect(cancel).toHaveBeenCalledOnce());
  });

  it('does not animate when disabled', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar animated={false} activity="speaking" audioLevel={1} />);
    });

    expect(animateSpy).not.toHaveBeenCalled();
    const path = container.querySelector('[data-motion="marble-flow"]')?.getAttribute('d') ?? '';
    expect(path.match(/C/g)).toHaveLength(8);
    expect(
      container.querySelector('[data-motion="marble-flow"]')?.getAttribute('style') ?? '',
    ).not.toContain('transform');
  });

  it('matches the original Beam placement for a static idle avatar', async () => {
    const name = 'Original Static Beam';
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name={name} variant="beam" activity="idle" animated={false} />);
    });

    const seed = hashCode(name);
    const expected = beamOriginalIdleTransforms(
      seed,
      getUnit(seed, 4, 3),
      getBoolean(seed, 1),
    );
    const character = container.querySelector('[data-motion="beam-character"]');
    const faceAnchor = container.querySelector('[data-motion="beam-face-anchor"]');
    expect(character?.getAttribute('style')).toContain(expected.character);
    expect(faceAnchor?.getAttribute('style')).toContain(expected.faceAnchor);
    expect(character?.contains(faceAnchor)).toBe(true);
    const characterRotation = Number(expected.character.match(/rotate\(([-\d.]+)deg\)/)?.[1]);
    const faceRotation = Number(expected.faceAnchor.match(/rotate\(([-\d.]+)deg\)/)?.[1]);
    expect(Math.abs(characterRotation)).toBeLessThanOrEqual(180);
    expect(Math.abs(faceRotation)).toBeLessThanOrEqual(180);
    expect(animateSpy).not.toHaveBeenCalled();
  });

  it('decomposes captured matrices onto the shortest rotation arc', () => {
    expect(
      beamShortestRotationTransform(
        'matrix(0.984808, -0.173648, 0.347296, 1.969616, 4, -2)',
      ),
    ).toBe('translate(4px, -2px) rotate(-10deg) scale(1, 2)');
  });

  it('minimizes static body rotation using each Beam shape symmetry', () => {
    const roundedSquare = beamOriginalIdleTransforms(92, getUnit(92, 4, 3), false);
    const circle = beamOriginalIdleTransforms(82, getUnit(82, 4, 3), true);

    expect(roundedSquare.character).toContain('rotate(2deg)');
    expect(circle.character).toContain('rotate(0deg)');
  });

  it('smoothly settles from the original static Beam placement when animation is enabled', async () => {
    const name = 'Static To Animated Beam';
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name={name} variant="beam" activity="idle" animated={false} />);
    });
    await act(async () => {
      root?.render(<Avatar name={name} variant="beam" activity="idle" animated />);
    });

    const seed = hashCode(name);
    const expected = beamOriginalIdleTransforms(
      seed,
      getUnit(seed, 4, 3),
      getBoolean(seed, 1),
    );
    expect(animateSpy).toHaveBeenCalledWith(
      [
        { transform: expected.character },
        { transform: 'translate(0px, 0px) rotate(0deg) scale(1)' },
      ],
      expect.objectContaining({ duration: 360, iterations: 1 }),
    );
    expect(animateSpy).toHaveBeenCalledWith(
      [
        { transform: expected.faceAnchor },
        { transform: 'translate(0px, 0px) rotate(0deg) scale(1)' },
      ],
      expect.objectContaining({ duration: 360, iterations: 1 }),
    );
  });

  it('does not animate when reduced motion is requested', async () => {
    setReducedMotion(true);
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar variant="beam" activity="speaking" audioLevel={1} />);
    });

    expect(animateSpy).not.toHaveBeenCalled();
    expect(container.querySelector('[data-motion="beam-body"]')?.getAttribute('style')).toContain(
      'rotate(0.8deg) scale(1.008, 0.992)',
    );
  });

  it('renders a deterministic static Marble contour set for reduced motion', async () => {
    setReducedMotion(true);
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Reduced Marble" variant="marble" activity="thinking" />);
    });

    expect(animateSpy).not.toHaveBeenCalled();
    const paths = container.querySelectorAll('path[data-motion^="marble-"]');
    expect(paths).toHaveLength(4);
    paths.forEach((path) => expect(path.getAttribute('d')?.match(/C/g)).toHaveLength(8));
  });

  it('blinks and speaks without transforming facial feature groups', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Attached Face" variant="beam" activity="idle" />);
    });

    await act(async () => {
      root?.render(
        <Avatar name="Attached Face" variant="beam" activity="speaking" audioLevel={0.82} />,
      );
    });

    const featureSelectors = [
      '[data-motion="beam-eyes-open"]',
      '[data-motion="beam-eyes-closed"]',
      '[data-motion="beam-mouth-rest"]',
      '[data-motion="beam-mouth-smile"]',
      '[data-motion="beam-mouth-mid"]',
      '[data-motion="beam-mouth-open"]',
    ];

    featureSelectors.forEach((selector) => {
      expect(container.querySelector(selector)?.getAttribute('style')).not.toContain('transform');
    });
    expect(container.querySelector('[data-motion="beam-gaze"]')?.getAttribute('style')).toContain(
      'translate(0.15px, 0px)',
    );
    const gazeEyes = container.querySelectorAll('[data-motion="beam-gaze"] ellipse');
    expect(gazeEyes).toHaveLength(2);
    const mouthColor = container
      .querySelector('[data-motion="beam-mouth-rest"] path')
      ?.getAttribute('fill');
    gazeEyes.forEach((eye) => {
      expect(eye.getAttribute('fill')).toBe(mouthColor);
      expect(eye.getAttribute('ry')).toBe('3.12');
    });
    const eyeSpread =
      (Number(gazeEyes[1].getAttribute('cx')) - Number(gazeEyes[0].getAttribute('cx'))) / 2;
    expect(eyeSpread).toBeGreaterThanOrEqual(10.5 * 1.15);
    expect(eyeSpread).toBeLessThanOrEqual(12 * 1.15);
    expect(
      container.querySelector('[data-motion="beam-mouth-position"]')?.getAttribute('transform'),
    ).toBe('translate(0 -2.4)');
    animateSpy.mock.calls.forEach(([keyframes]) => {
      expect(JSON.stringify(keyframes)).not.toContain('scaleY');
    });
  });

  it('uses short, finite blink events instead of a repeating blink clock', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Natural Blink" variant="beam" activity="idle" />);
    });
    await act(async () => vi.advanceTimersByTime(8_000));

    const blinkCalls = animateSpy.mock.calls.filter(([, options]) => options.duration === 170);
    expect(blinkCalls.length).toBeGreaterThanOrEqual(2);
    expect(blinkCalls.length % 2).toBe(0);
    blinkCalls.forEach(([, options]) => expect(options.iterations).toBe(1));
    expect(blinkCalls[0][0]).toEqual([
      { opacity: 1, offset: 0 },
      { opacity: 0, offset: 0.38 },
      { opacity: 0, offset: 0.55 },
      { opacity: 1, offset: 1 },
    ]);
  });

  it('advects all Marble dyes through one finite shared-flow event', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Coherent Marble" variant="marble" activity="thinking" />);
    });
    await act(async () => vi.advanceTimersByTime(120));

    expect(animateSpy).toHaveBeenCalledTimes(3);
    const [fieldCall, flowCall, secondaryCall] = animateSpy.mock.calls;
    expect(fieldCall[1].duration).toBe(flowCall[1].duration);
    expect(flowCall[1].duration).toBe(secondaryCall[1].duration);
    expect(fieldCall[1].duration).toBeGreaterThanOrEqual(4_500);
    expect(fieldCall[1].duration).toBeLessThanOrEqual(6_500);
    expect(fieldCall[1].iterations).toBe(1);
    expect(flowCall[1].iterations).toBe(1);
    expect(secondaryCall[1].iterations).toBe(1);
    [fieldCall, flowCall, secondaryCall].forEach(([keyframes, options]) => {
      expect(keyframes).toHaveLength(6);
      expect(keyframes[0].d).toMatch(/^path\("M/);
      expect(keyframes[5].d).toMatch(/^path\("M/);
      expect(keyframes[0].d.match(/C/g)).toHaveLength(8);
      expect(keyframes[5].d.match(/C/g)).toHaveLength(8);
      expect(keyframes[0].d).not.toBe(keyframes[5].d);
      expect(JSON.stringify(keyframes)).not.toContain('transform');
      expect(options.easing).toBe('linear');
    });
  });

  it('continues Marble activity changes from the visibly rendered contours', async () => {
    const renderedPath = `path("${stateToPaths(createMarbleFlowState(9_999, 'idle'))[0]}")`;
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          getPropertyValue: (property: string) => (property === 'd' ? renderedPath : ''),
        }) as CSSStyleDeclaration,
    );

    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Captured Marble" variant="marble" activity="idle" />);
    });
    await act(async () => vi.advanceTimersByTime(120));
    await act(async () => {
      root?.render(<Avatar name="Captured Marble" variant="marble" activity="listening" />);
    });

    animateSpy.mock.calls.slice(3, 6).forEach(([keyframes]) => {
      expect(keyframes[0].d).toBe(renderedPath);
    });
  });

  it('settles a Marble state transition before applying live audio response', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Settled Marble" variant="marble" activity="idle" audioLevel={0.8} />);
    });
    await act(async () => {
      root?.render(
        <Avatar name="Settled Marble" variant="marble" activity="speaking" audioLevel={0.8} />,
      );
    });

    expect(animateSpy).toHaveBeenCalledTimes(4);
    await act(async () => vi.advanceTimersByTime(479));
    expect(animateSpy).toHaveBeenCalledTimes(4);
    await act(async () => vi.advanceTimersByTime(1));
    expect(animateSpy).toHaveBeenCalledTimes(8);
  });

  it('continues state transitions from an in-flight browser pose', async () => {
    Object.defineProperty(SVGElement.prototype, 'getAnimations', {
      configurable: true,
      value: vi.fn(() => [{}]),
    });
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element) =>
        ({
          opacity: element.getAttribute('data-motion')?.includes('mouth') ? '0.4' : '1',
          transform:
            element.getAttribute('data-motion') === 'beam-body'
              ? 'matrix(1, 0, 0, 1, 0, -0.75)'
              : 'matrix(1, 0, 0, 1, 0.5, 0)',
        }) as CSSStyleDeclaration,
    );

    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Continuous" variant="beam" activity="idle" />);
    });
    await act(async () => {
      root?.render(<Avatar name="Continuous" variant="beam" activity="speaking" />);
    });

    expect(animateSpy).toHaveBeenCalledWith(
      [
        { transform: 'matrix(1, 0, 0, 1, 0, -0.75)' },
        { transform: 'translate(0px, -0.35px) rotate(0.8deg) scale(1.008, 0.992)' },
      ],
      expect.objectContaining({ duration: 360, iterations: 1 }),
    );
  });

  it('gazes first and follows with a readable Beam head turn', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="quick 2" variant="beam" activity="idle" />);
    });
    await act(async () => vi.advanceTimersByTime(120));

    expect(animateSpy).toHaveBeenCalledTimes(5);
    const gazeCall = animateSpy.mock.calls.find(([keyframes]) =>
      JSON.stringify(keyframes).includes('scaleX(0.94)'),
    );
    const bodyCall = animateSpy.mock.calls.find(([keyframes]) =>
      JSON.stringify(keyframes).includes('1.6deg'),
    );
    const faceCall = animateSpy.mock.calls.find(([keyframes]) =>
      JSON.stringify(keyframes).includes('scaleX(0.95)'),
    );
    expect(gazeCall?.[0]).toHaveLength(6);
    expect(gazeCall?.[1].delay).toBe(0);
    expect(gazeCall?.[1].duration).toBeGreaterThanOrEqual(1_800);
    expect(gazeCall?.[1].easing).toBe('linear');
    expect(bodyCall?.[1].delay).toBe(120);
    expect(bodyCall?.[0]).toHaveLength(3);
    expect(bodyCall?.[0][1].easing).toBe('cubic-bezier(0.45, 0, 0.55, 1)');
    expect(bodyCall?.[1].easing).toBe('linear');
    expect(faceCall?.[1].delay).toBe(80);
  });

  it('occasionally tracks a moving subject across the full field of view', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="long 5" variant="beam" activity="idle" />);
    });
    await act(async () => vi.advanceTimersByTime(120));

    expect(animateSpy).toHaveBeenCalledTimes(5);
    const gazeCall = animateSpy.mock.calls.find(([keyframes]) =>
      JSON.stringify(keyframes).includes('scaleX(0.91)'),
    );
    const bodyCall = animateSpy.mock.calls.find(([keyframes]) =>
      JSON.stringify(keyframes).includes('3.2deg'),
    );
    const faceCall = animateSpy.mock.calls.find(([keyframes]) =>
      JSON.stringify(keyframes).includes('scaleX(0.97)'),
    );
    expect(gazeCall?.[0]).toHaveLength(7);
    expect(gazeCall?.[0][3].transform).toMatch(/translate\(0px, -\d/);
    expect(gazeCall?.[1].duration).toBeGreaterThanOrEqual(4_000);
    expect(bodyCall?.[1].delay).toBe(120);
    expect(bodyCall?.[0]).toHaveLength(4);
    expect(bodyCall?.[0][1].easing).toBe('cubic-bezier(0.45, 0, 0.55, 1)');
    expect(bodyCall?.[0][2].easing).toBe('cubic-bezier(0.45, 0, 0.55, 1)');
    expect(bodyCall?.[1].easing).toBe('linear');
    expect(faceCall?.[0][5].transform).toContain('scaleX(0.97)');
  });

  it('gives thinking a contained multi-point contemplation cycle', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Contemplative Beam" variant="beam" activity="thinking" />);
    });
    await act(async () => vi.advanceTimersByTime(120));

    expect(animateSpy).toHaveBeenCalledTimes(5);
    const characterCall = animateSpy.mock.calls.find(
      ([keyframes]) => keyframes[0].transform === 'translate(-3px, 0.8px) scale(0.965, 0.985)',
    );
    const gazeCall = animateSpy.mock.calls.find(
      ([keyframes]) => keyframes[0].transform === 'translate(0.9px, -2.7px) scaleX(0.98)',
    );
    const bodyCall = animateSpy.mock.calls.find(
      ([keyframes]) =>
        keyframes[0].transform ===
        'translate(0px, -0.9px) rotate(-3deg) scale(0.99, 1.02)',
    );
    const faceCall = animateSpy.mock.calls.find(
      ([keyframes]) => keyframes[0].transform === 'translate(0.65px, -2.4px) rotate(1.2deg)',
    );

    expect(characterCall?.[1]).toMatchObject({ easing: 'linear', iterations: 1 });
    expect(Number(characterCall?.[1].duration)).toBeGreaterThanOrEqual(3_800);
    expect(Number(characterCall?.[1].duration)).toBeLessThanOrEqual(5_800);
    expect(gazeCall?.[0].length).toBeGreaterThanOrEqual(4);
    expect(gazeCall?.[0].length).toBeLessThanOrEqual(5);
    gazeCall?.[0].slice(0, -1).forEach((keyframe: Keyframe) => {
      expect(keyframe.easing).toBe('cubic-bezier(0.45, 0, 0.55, 1)');
    });
    bodyCall?.[0].slice(0, -1).forEach((keyframe: Keyframe) => {
      expect(keyframe.easing).toBe('cubic-bezier(0.45, 0, 0.55, 1)');
    });
    const finalTransformNumber = (transform: string, pattern: RegExp) => {
      const matches = [...transform.matchAll(pattern)];
      return Math.abs(Number(matches.at(-1)?.[1]));
    };
    const characterTravel = characterCall?.[0]
      .slice(1, -1)
      .map((keyframe: Keyframe) =>
        finalTransformNumber(String(keyframe.transform), /translate\(([-\d.]+)px/g),
      );
    const faceTravel = faceCall?.[0]
      .slice(1, -1)
      .map((keyframe: Keyframe) =>
        finalTransformNumber(String(keyframe.transform), /translate\(([-\d.]+)px/g),
      );
    const bodyTurn = bodyCall?.[0]
      .slice(1, -1)
      .map((keyframe: Keyframe) =>
        finalTransformNumber(String(keyframe.transform), /rotate\(([-\d.]+)deg/g),
      );
    expect(Math.max(...(characterTravel ?? []))).toBeLessThanOrEqual(1.5);
    expect(Math.max(...(faceTravel ?? []))).toBeGreaterThanOrEqual(4.5);
    expect(Math.max(...(faceTravel ?? []))).toBeLessThanOrEqual(6.5);
    expect(Math.max(...(bodyTurn ?? []))).toBeGreaterThanOrEqual(3);
    gazeCall?.[0].slice(1, -1).forEach((keyframe: Keyframe) => {
      const vertical = String(keyframe.transform).match(/translate\([^,]+, ([-\d.]+)px\)/);
      expect(Number(vertical?.[1])).toBeLessThanOrEqual(-2.5);
    });
    expect(gazeCall?.[1].delay).toBe(0);
    expect(faceCall?.[1].delay).toBe(90);
    expect(bodyCall?.[1].delay).toBe(170);
    gazeCall?.[0].slice(1, -1).forEach((keyframe: Keyframe, index: number) => {
      expect(Number(keyframe.offset)).toBeLessThan(Number(faceCall?.[0][index + 1].offset));
      expect(Number(faceCall?.[0][index + 1].offset)).toBeLessThan(
        Number(bodyCall?.[0][index + 1].offset),
      );
    });
    expect(JSON.stringify(animateSpy.mock.calls)).not.toMatch(
      /rotate\((?:-?28|360)deg\)|translate\((?:-?4\d|-?5\d)px/,
    );

    await act(async () => vi.advanceTimersByTime(20_000));
    const mouthMorphCalls = animateSpy.mock.calls.filter(([keyframes]) =>
      keyframes.some((keyframe: Keyframe) => keyframe.offset === 0.16 && 'd' in keyframe),
    );
    expect(mouthMorphCalls).toHaveLength(0);
  });

  it('occasionally gives thinking a restrained seeded aha lift', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Aha Beam" variant="beam" activity="thinking" />);
    });
    await act(async () => vi.advanceTimersByTime(120));

    expect(animateSpy).toHaveBeenCalledTimes(5);
    const characterCall = animateSpy.mock.calls.find(([keyframes]) =>
      JSON.stringify(keyframes).includes('translate(-0.35px, -1.8px)'),
    );
    const gazeCall = animateSpy.mock.calls.find(([keyframes]) =>
      JSON.stringify(keyframes).includes('translate(0px, -1.6px) scaleX(0.975)'),
    );
    const faceCall = animateSpy.mock.calls.find(([keyframes]) =>
      JSON.stringify(keyframes).includes('scale(1.045, 0.955)'),
    );
    expect(Number(characterCall?.[1].duration)).toBeGreaterThanOrEqual(3_800);
    expect(Number(characterCall?.[1].duration)).toBeLessThanOrEqual(5_200);
    expect(characterCall?.[0].map((keyframe: Keyframe) => keyframe.offset)).toEqual([
      0,
      0.29,
      0.55,
      0.77,
      0.93,
      1,
    ]);
    characterCall?.[0].slice(0, -1).forEach((keyframe: Keyframe) => {
      expect(keyframe.easing).toBe('cubic-bezier(0.45, 0, 0.55, 1)');
    });
    expect(gazeCall?.[1]).toMatchObject({ easing: 'linear', iterations: 1 });
    expect(faceCall?.[0][1].transform).toMatch(/translate\((?:-)?5\.4px, -2px\).*rotate\((?:-)?4\.2deg\)/);
  });

  it.each(['idle', 'listening', 'speaking'] as const)(
    'cancels an in-flight thinking cycle cleanly when changing to %s',
    async (nextActivity) => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Interrupted Thought" variant="beam" activity="thinking" />);
    });
    await act(async () => vi.advanceTimersByTime(120));
    const thinkingCancels = cancelSpies.slice(0, 5);

    await act(async () => {
      root?.render(<Avatar name="Interrupted Thought" variant="beam" activity={nextActivity} />);
    });

    expect(thinkingCancels).toHaveLength(5);
    thinkingCancels.forEach((cancel) => expect(cancel).toHaveBeenCalledOnce());
    const transitionCalls = animateSpy.mock.calls.slice(5, 10);
    expect(transitionCalls).toHaveLength(5);
    transitionCalls.forEach(([, options]) => {
      expect(options).toMatchObject({ duration: expect.any(Number), iterations: 1 });
    });
    },
  );

  it('uses a distinct deterministic thinking pose without ambient motion', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <Avatar name="Still Thought" variant="beam" activity="thinking" animated={false} />,
      );
    });

    expect(animateSpy).not.toHaveBeenCalled();
    expect(container.querySelector('[data-motion="beam-character"]')?.getAttribute('style')).toContain(
      'translate(-3px, 0.8px) scale(0.965, 0.985)',
    );
    expect(container.querySelector('[data-motion="beam-gaze"]')?.getAttribute('style')).toContain(
      'translate(0.9px, -2.7px) scaleX(0.98)',
    );
    const thinkingMouth = container
      .querySelector('[data-motion="beam-mouth-morph"]')
      ?.getAttribute('d');
    expect(thinkingMouth).toContain(' 60.8');
    expect(thinkingMouth).toContain(' 66.2');
  });

  it('uses the same deterministic thinking pose when reduced motion is requested', async () => {
    setReducedMotion(true);
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Reduced Thought" variant="beam" activity="thinking" />);
    });

    expect(animateSpy).not.toHaveBeenCalled();
    expect(container.querySelector('[data-motion="beam-character"]')?.getAttribute('style')).toContain(
      'translate(-3px, 0.8px) scale(0.965, 0.985)',
    );
  });

  it('keeps Marble visibly flowing while listening without audio samples', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Listening Flow" variant="marble" activity="listening" />);
    });
    await act(async () => vi.advanceTimersByTime(120));

    expect(animateSpy).toHaveBeenCalledTimes(3);
    animateSpy.mock.calls.forEach(([keyframes, options]) => {
      expect(keyframes).toHaveLength(6);
      expect(keyframes[0].d.match(/C/g)).toHaveLength(8);
      expect(options.easing).toBe('linear');
    });
    expect(animateSpy.mock.calls[0][1].duration).toBeGreaterThanOrEqual(5_500);
  });

  it('always uses the half-moon Beam smile for a static resting avatar', async () => {
    const name = 'Static Rest Mouth';
    expect(hashCode(name) % 2).toBe(1);
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name={name} variant="beam" animated={false} />);
    });

    expect(container.querySelector('[data-motion="beam-mouth-rest"]')?.getAttribute('style')).toContain(
      'opacity: 1',
    );
    expect(container.querySelector('[data-motion="beam-mouth-morph"]')?.getAttribute('d')).toContain(
      '72',
    );
  });

  it('gives the resting Beam mouth rounded edge weight without changing its morph path', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Weighted Mouth" variant="beam" animated={false} />);
    });

    const mouth = container.querySelector('[data-motion="beam-mouth-morph"]');
    expect(mouth?.getAttribute('stroke-width')).toBe('1.1');
    expect(mouth?.getAttribute('stroke-linejoin')).toBe('round');
    expect(mouth?.getAttribute('stroke')).toBe(mouth?.getAttribute('fill'));
  });

  it('alternates between both resting Beam smiles outside speaking', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Alternating Smile" variant="beam" activity="idle" />);
    });
    await act(async () => vi.advanceTimersByTime(2_500));

    const mouthMorphCalls = animateSpy.mock.calls.filter(([keyframes]) =>
      keyframes.some((frame: Keyframe) => frame.offset === 0.16 && 'd' in frame),
    );
    expect(mouthMorphCalls).toHaveLength(1);
    expect(mouthMorphCalls[0][0][0].d).not.toBe(mouthMorphCalls[0][0][1].d);
  });

  it('smoothly settles an animated Beam before disabling motion', async () => {
    Object.defineProperty(SVGElement.prototype, 'getAnimations', {
      configurable: true,
      value: function getAnimations(this: SVGElement) {
        return this.getAttribute('data-motion')?.match(/beam-(body|face|gaze)$/) ? [{}] : [];
      },
    });
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      opacity: '1',
      transform: 'matrix(1, 0, 0, 1, 0.7, -0.4)',
    } as CSSStyleDeclaration);

    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Smooth Toggle" variant="beam" activity="idle" />);
    });
    await act(async () => vi.advanceTimersByTime(120));
    const beforeToggle = animateSpy.mock.calls.length;
    await act(async () => {
      root?.render(
        <Avatar name="Smooth Toggle" variant="beam" activity="idle" animated={false} />,
      );
    });

    const settleCalls = animateSpy.mock.calls.slice(beforeToggle);
    expect(settleCalls).toHaveLength(6);
    expect(settleCalls.map(([, options]) => options.duration)).toEqual([
      320,
      320,
      320,
      320,
      300,
      170,
    ]);
  });

  it('renders an opaque room whose viewport is independent from the seeded Beam body', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <Avatar
          name="Roll 4"
          variant="beam"
          animated={false}
          colors={['#112233', '#445566', '#778899']}
        />,
      );
    });

    const circularRoom = container.querySelector('[data-beam-viewport-shape]');
    expect(circularRoom?.getAttribute('data-beam-viewport-shape')).toBe('circle');
    expect(circularRoom?.getAttribute('data-beam-body-shape')).toBe('circle');
    expect(circularRoom?.querySelector(':scope > rect')?.getAttribute('fill')).toMatch(/^#/);
    expect(circularRoom?.querySelector(':scope > rect')?.hasAttribute('opacity')).toBe(false);
    expect(container.querySelector('mask rect')?.getAttribute('rx')).toBe('50');
    expect(container.querySelector('[data-motion="beam-body"] circle')?.getAttribute('r')).toBe(
      '34',
    );

    await act(async () => {
      root?.render(<Avatar name="Roll 4" variant="beam" animated={false} square />);
    });
    const squareRoom = container.querySelector('[data-beam-viewport-shape]');
    expect(squareRoom?.getAttribute('data-beam-viewport-shape')).toBe('square');
    expect(squareRoom?.getAttribute('data-beam-body-shape')).toBe('circle');
    expect(container.querySelector('mask rect')?.getAttribute('rx')).toBe('0');
  });

  it('keeps room travel, body deformation, shadow, and facial transforms in separate layers', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Layered Beam" variant="beam" activity="listening" animated={false} />);
    });

    const character = container.querySelector('[data-motion="beam-character"]');
    const shadow = container.querySelector('[data-motion="beam-shadow"]');
    const body = container.querySelector('[data-motion="beam-body"]');
    const face = container.querySelector('[data-motion="beam-face"]');
    expect(character?.contains(body)).toBe(true);
    expect(body?.contains(face)).toBe(true);
    expect(character?.contains(shadow)).toBe(false);
    expect(character?.getAttribute('style')).toContain('scale(1.42, 1.39)');
    expect(face?.getAttribute('style')).toContain('scale(1.075, 0.955)');
    expect(shadow?.getAttribute('style')).toContain('opacity: 0.08');
  });

  it('lets a circular Beam complete a finite roll across the room', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Roll 4" variant="beam" activity="idle" />);
    });
    await act(async () => vi.advanceTimersByTime(120));

    const rollCall = animateSpy.mock.calls.find(([keyframes]) =>
      JSON.stringify(keyframes).includes('rotate(360deg)'),
    );
    const travelCall = animateSpy.mock.calls.find(([keyframes]) =>
      keyframes.some(
        (frame: Keyframe) =>
          typeof frame.transform === 'string' && /translate\((-?1[3-9]|-?2\d)/.test(frame.transform),
      ),
    );
    expect(rollCall?.[0]).toHaveLength(7);
    expect(rollCall?.[1]).toMatchObject({ easing: 'linear', iterations: 1 });
    expect(travelCall).toBeDefined();
    expect(
      animateSpy.mock.calls.some(([keyframes]) =>
        JSON.stringify(keyframes).includes('scaleX(0.94)'),
      ),
    ).toBe(false);
  });

  it('makes a rounded-square Beam attempt a roll without completing one', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Roll 9" variant="beam" activity="idle" />);
    });
    await act(async () => vi.advanceTimersByTime(120));

    expect(container.querySelector('[data-beam-body-shape]')?.getAttribute('data-beam-body-shape')).toBe(
      'rounded-square',
    );
    const failedRoll = animateSpy.mock.calls.find(([keyframes]) =>
      JSON.stringify(keyframes).includes('rotate(-28deg)'),
    );
    expect(failedRoll?.[0]).toHaveLength(7);
    expect(failedRoll?.[1].iterations).toBe(1);
    expect(JSON.stringify(failedRoll?.[0])).not.toContain('360deg');
  });

  it('occasionally peeks in from a seeded corner before returning to the room', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Peek 2" variant="beam" activity="idle" />);
    });
    await act(async () => vi.advanceTimersByTime(120));

    expect(animateSpy).toHaveBeenCalledTimes(5);
    const peekTravel = animateSpy.mock.calls.find(([keyframes]) => keyframes.length === 9);
    const peekGaze = animateSpy.mock.calls.find(([keyframes]) =>
      JSON.stringify(keyframes).includes('scaleX(0.95)'),
    );
    const peekShadow = animateSpy.mock.calls.find(([keyframes]) =>
      keyframes.some((frame: Keyframe) => frame.opacity === 0),
    );
    expect(peekTravel?.[0].some((frame: Keyframe) =>
      typeof frame.transform === 'string' && /translate\((-?4\d|-?5\d)/.test(frame.transform),
    )).toBe(true);
    expect(peekTravel?.[1]).toMatchObject({ easing: 'linear', iterations: 1 });
    expect(peekGaze?.[0]).toHaveLength(6);
    expect(peekShadow).toBeDefined();
  });

  it('hydrates without changing the server-authored SVG', async () => {
    const markup = renderToString(<Avatar name="Hydration Test" variant="beam" activity="listening" />);
    container.innerHTML = markup;
    const before = container.innerHTML;

    await act(async () => {
      root = hydrateRoot(
        container,
        <Avatar name="Hydration Test" variant="beam" activity="listening" />,
      );
    });

    expect(container.innerHTML).toBe(before);
    await act(async () => vi.advanceTimersByTime(7_000));
    expect(animateSpy).toHaveBeenCalled();
  });

});
