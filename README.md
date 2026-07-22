# @kpsuperplane/boring-avatars

A small React library for deterministic, SVG-based avatars with expressive activity states. It includes two variants: the fluid **Marble** and the spherical **Beam** character.

This project is a fork of [boringdesigners/boring-avatars](https://github.com/boringdesigners/boring-avatars). The original design, deterministic identity approach, and MIT license are retained with attribution.

## Install

```sh
npm install @kpsuperplane/boring-avatars
```

React 18 or newer is required.

## Usage

```tsx
import Avatar, { type AvatarActivity } from '@kpsuperplane/boring-avatars';

const activity: AvatarActivity = 'listening';

<Avatar
  name="Maria Mitchell"
  variant="marble"
  activity={activity}
  audioLevel={0.62}
  size={96}
  title
/>;
```

The default export is also available as the named `Avatar` export. `AvatarProps`, `AvatarVariant`, and `AvatarActivity` are exported as public types.

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string` | `"Clara Barton"` | Seeds colors, geometry, and motion timing. |
| `colors` | `string[]` | built-in five-color palette | Palette used to build the identity. |
| `variant` | `"marble" \| "beam"` | `"marble"` | Selects the avatar design. |
| `activity` | `"idle" \| "listening" \| "thinking" \| "speaking"` | `"idle"` | Selects the representative pose and motion language. |
| `audioLevel` | `number` | deterministic fallback pulse | Drives listening and speaking response; finite values are clamped to `0…1`, and non-finite values become `0`. |
| `animated` | `boolean` | `true` | Enables motion when the operating system does not request reduced motion. |
| `size` | `number \| string` | `"40px"` | Sets SVG width and height. |
| `square` | `boolean` | `false` | Uses a square outer mask. Beam remains spherical inside it. |
| `title` | `boolean` | `false` | Adds an SVG `<title>` containing the name. |

Standard SVG props are passed through to the root element.

```tsx
import { Avatar } from '@kpsuperplane/boring-avatars';

<Avatar
  name="Grace Hopper"
  colors={['#fb6900', '#f63700', '#004853', '#007e80', '#00b9bd']}
  variant="beam"
  activity="speaking"
  className="voice-avatar"
  aria-label="Grace Hopper is speaking"
/>;
```

## Motion and accessibility

Animation starts in the browser after hydration, uses the Web Animations API, and is cancelled when state changes or the component unmounts. `animated={false}` and `prefers-reduced-motion: reduce` leave each activity in a stable representative pose. The library does not request microphone access; applications can provide their own normalized audio level when appropriate.

The same name and palette always produce the same base SVG and seeded animation cadence.

## License

MIT. The original copyright notice from boringdesigners is preserved in [LICENSE](LICENSE).
