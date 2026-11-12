// Painted picture icons for the "Who are you?" buttons. They're made once in Admin
// (each one a KID version of the thing) and stored in Supabase; the emoji shows until then.
export const ICON_FOLDER = "ui/character";

/**
 * Bump an icon's number when its description changes: kids stop seeing the old picture
 * right away (the emoji shows), and Admin lists it as missing so it gets repainted.
 */
const VERSION: Record<string, number> = { dactyloid: 2 };

export const iconFile = (id: string) => (VERSION[id] ? `${id}-v${VERSION[id]}.webp` : `${id}.webp`);

export const iconPath = (id: string) => `${ICON_FOLDER}/${iconFile(id)}`;

export const iconUrl = (id: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/card-images/${iconPath(id)}`;
