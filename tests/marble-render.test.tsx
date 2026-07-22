// @vitest-environment jsdom

import { act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Avatar from '../src/lib';

describe('Marble rendering', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;
  let animateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.append(container);
    animateSpy = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation);
    Object.defineProperty(SVGElement.prototype, 'animate', {
      configurable: true,
      value: animateSpy,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses a color pressure contour instead of white sound rings', () => {
    container.innerHTML = renderToString(
      <Avatar variant="marble" activity="speaking" animated={false} />,
    );
    const bloom = container.querySelector('[data-motion="marble-bloom"]');
    expect(bloom?.tagName.toLowerCase()).toBe('path');
    expect(bloom?.getAttribute('fill')).toContain('-bloom)');
    expect(bloom?.hasAttribute('stroke')).toBe(false);
  });

  it('does not render a top-left specular spot', () => {
    container.innerHTML = renderToString(<Avatar variant="marble" animated={false} />);
    expect(container.querySelector('circle[cx="34"][cy="25"]')).toBeNull();
  });

  it('hydrates without changing its server-authored contours', async () => {
    const avatar = (
      <Avatar name="Marble Hydration" variant="marble" activity="speaking" animated />
    );
    container.innerHTML = renderToString(avatar);
    const before = container.innerHTML;
    await act(async () => {
      root = hydrateRoot(container, avatar);
    });
    expect(container.innerHTML).toBe(before);
    await act(async () => vi.advanceTimersByTime(120));
    expect(animateSpy).toHaveBeenCalled();
  });
});
