import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Avatar, {
  Avatar as NamedAvatar,
  type AvatarActivity,
  type AvatarProps,
  type AvatarVariant,
} from '../src/lib';

const palette = ['#112233', '#445566', '#778899', '#aabbcc', '#ddeeff'];

describe('public API', () => {
  it('supports only Marble and Beam and falls back to Marble at runtime', () => {
    const variants = ['marble', 'beam'] satisfies AvatarVariant[];
    const activities = ['idle', 'listening', 'thinking', 'speaking'] satisfies AvatarActivity[];
    const props = { variant: variants[0], activity: activities[0] } satisfies AvatarProps;

    expect(renderToStaticMarkup(<Avatar {...props} />)).toContain('data-avatar-variant="marble"');
    expect(renderToStaticMarkup(<NamedAvatar variant="beam" />)).toContain(
      'data-avatar-variant="beam"',
    );
    expect(
      renderToStaticMarkup(<Avatar variant={'pixel' as AvatarVariant} />),
    ).toContain('data-avatar-variant="marble"');
    expect(
      renderToStaticMarkup(<Avatar variant={'toString' as AvatarVariant} />),
    ).toContain('data-avatar-variant="marble"');
  });

  it('renders deterministic base output for the same identity and palette', () => {
    const first = renderToStaticMarkup(
      <Avatar name="Ada Lovelace" colors={palette} variant="marble" activity="thinking" />,
    );
    const second = renderToStaticMarkup(
      <Avatar name="Ada Lovelace" colors={palette} variant="marble" activity="thinking" />,
    );
    const different = renderToStaticMarkup(
      <Avatar name="Grace Hopper" colors={palette} variant="marble" activity="thinking" />,
    );

    expect(first).toBe(second);
    expect(first).not.toBe(different);
  });

  it.each([
    [-0.4, '0'],
    [0.38, '0.38'],
    [2.6, '1'],
    [Number.NaN, '0'],
    [Number.POSITIVE_INFINITY, '0'],
    [Number.NEGATIVE_INFINITY, '0'],
  ])('normalizes audio level %s to %s', (input, expected) => {
    const output = renderToStaticMarkup(<Avatar audioLevel={input} />);
    expect(output).toContain(`data-audio-level="${expected}"`);
  });

  it('uses the deterministic fallback when audio level is omitted', () => {
    expect(renderToStaticMarkup(<Avatar activity="speaking" />)).toContain(
      'data-audio-level="fallback"',
    );
  });

  it('supports accessible titles and passes SVG props through', () => {
    const titled = renderToStaticMarkup(
      <Avatar
        name="Katherine Johnson"
        title
        className="profile-orb"
        aria-label="Katherine is listening"
        data-testid="avatar"
      />,
    );
    const untitled = renderToStaticMarkup(<Avatar name="Katherine Johnson" />);

    expect(titled).toContain('<title>Katherine Johnson</title>');
    expect(titled).toContain('class="profile-orb"');
    expect(titled).toContain('aria-label="Katherine is listening"');
    expect(titled).toContain('data-testid="avatar"');
    expect(untitled).not.toContain('<title>');
  });

  it('renders on the server without browser globals or time-dependent output', () => {
    expect(typeof window).toBe('undefined');
    const output = renderToStaticMarkup(
      <Avatar name="Server Safe" variant="beam" activity="speaking" animated />,
    );

    expect(output).toContain('<svg');
    expect(output).toContain('data-avatar-activity="speaking"');
    expect(output).not.toContain('style="transform:matrix');
  });
});
