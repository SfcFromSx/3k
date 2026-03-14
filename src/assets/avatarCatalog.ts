export const AVATAR_VARIANT_COUNT = 100;

const clampVariant = (variant: number) => {
  if (!Number.isFinite(variant)) return 1;
  return Math.min(AVATAR_VARIANT_COUNT, Math.max(1, Math.trunc(variant)));
};

const formatVariant = (variant: number) => String(clampVariant(variant)).padStart(3, '0');
const normalizeBaseUrl = (baseUrl: string) => {
  if (!baseUrl) return '/';
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
};

export const buildAvatarUrl = (characterId: string, variant: number, baseUrl = import.meta.env.BASE_URL || '/') =>
  `${normalizeBaseUrl(baseUrl)}avatars/${characterId}/avatar-${formatVariant(variant)}.svg`;

export const getAvatarUrl = (characterId: string, variant: number) =>
  buildAvatarUrl(characterId, variant);
