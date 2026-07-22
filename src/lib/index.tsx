import AvatarBeam from './components/avatar-beam';
import AvatarMarble from './components/avatar-marble';
import type { AvatarProps, AvatarVariant } from './components/types';
import { normalizeAudioLevel } from './utilities';

const DEFAULT_COLORS = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'];

const AVATAR_VARIANTS = {
  marble: AvatarMarble,
  beam: AvatarBeam,
} satisfies Record<AvatarVariant, typeof AvatarMarble>;

const Avatar = ({
  variant = 'marble',
  colors = DEFAULT_COLORS,
  name = 'Clara Barton',
  activity = 'idle',
  audioLevel,
  animated = true,
  title = false,
  size = '40px',
  square = false,
  ...otherProps
}: AvatarProps) => {
  const AvatarComponent = variant === 'beam' ? AVATAR_VARIANTS.beam : AVATAR_VARIANTS.marble;

  return (
    <AvatarComponent
      colors={colors}
      name={name}
      activity={activity}
      audioLevel={normalizeAudioLevel(audioLevel)}
      animated={animated}
      title={title}
      size={size}
      square={square}
      {...otherProps}
    />
  );
};

export { Avatar };
export type { AvatarActivity, AvatarProps, AvatarVariant } from './components/types';
export default Avatar;
