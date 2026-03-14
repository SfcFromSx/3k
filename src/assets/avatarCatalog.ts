export const AVATAR_VARIANT_COUNT = 100;

const clampVariant = (variant: number) => {
  if (!Number.isFinite(variant)) return 1;
  return Math.min(AVATAR_VARIANT_COUNT, Math.max(1, Math.trunc(variant)));
};

const formatVariant = (variant: number) => String(clampVariant(variant)).padStart(3, '0');

export const getAvatarUrl = (characterId: string, variant: number) =>
  `/avatars/${characterId}/avatar-${formatVariant(variant)}.svg`;

