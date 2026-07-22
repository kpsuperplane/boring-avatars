// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Avatar from '../src/lib';

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
    vi.restoreAllMocks();
  });

  it('starts after mounting, cancels on activity changes, and cancels on unmount', async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(<Avatar name="Motion Test" variant="marble" activity="idle" />);
    });

    expect(animateSpy).toHaveBeenCalledTimes(2);
    const idleCancels = [...cancelSpies];

    await act(async () => {
      root?.render(<Avatar name="Motion Test" variant="marble" activity="thinking" />);
    });

    idleCancels.forEach((cancel) => expect(cancel).toHaveBeenCalledOnce());
    expect(animateSpy).toHaveBeenCalledTimes(7);
    expect(animateSpy).toHaveBeenCalledWith(
      [
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: 'translate(2px, -1px) rotate(6deg) scale(1.01)' },
      ],
      expect.objectContaining({ duration: 360, iterations: 1 }),
    );
    const thinkingCancels = cancelSpies.slice(2);

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
    expect(container.querySelector('[data-motion="marble-flow"]')?.getAttribute('style')).toContain(
      'scale(1.04)',
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
      'scale(1.018, 0.988)',
    );
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
      '[data-motion="beam-mouth-mid"]',
      '[data-motion="beam-mouth-open"]',
    ];

    featureSelectors.forEach((selector) => {
      expect(container.querySelector(selector)?.getAttribute('style')).not.toContain('transform');
    });
    animateSpy.mock.calls.forEach(([keyframes]) => {
      expect(JSON.stringify(keyframes)).not.toContain('scaleY');
    });
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
        { transform: 'translate(0px, -1px) scale(1.018, 0.988)' },
      ],
      expect.objectContaining({ duration: 360, iterations: 1 }),
    );
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
    expect(animateSpy).toHaveBeenCalled();
  });
});
