import type { SVGProps } from 'react';

export type AvatarVariant = 'marble' | 'beam';

export type AvatarActivity = 'idle' | 'listening' | 'thinking' | 'speaking';

export type AvatarProps = {
  name?: string;
  colors?: string[];
  variant?: AvatarVariant;
  activity?: AvatarActivity;
  audioLevel?: number;
  animated?: boolean;
  title?: boolean;
  square?: boolean;
  size?: number | string;
} & SVGProps<SVGSVGElement>;
