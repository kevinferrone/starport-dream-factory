// Painted picture icons for the "Who are you?" buttons. They're made once in Admin
// (each one a KID version of the thing) and stored in Supabase; the emoji shows until then.
export const ICON_FOLDER = "ui/character";

export const iconPath = (id: string) => `${ICON_FOLDER}/${id}.webp`;

export const iconUrl = (id: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/card-images/${iconPath(id)}`;
