export function isPalettePreviewEnabled(env: {
  VERCEL_ENV?: string;
  VIEWFLO_ENV?: string;
  NODE_ENV?: string;
}) {
  // Production always wins, even if a staging variable was copied accidentally.
  if (env.VERCEL_ENV === "production" || env.VIEWFLO_ENV === "production")
    return false;
  return (
    env.VERCEL_ENV === "preview" ||
    env.VIEWFLO_ENV === "staging" ||
    env.NODE_ENV === "development"
  );
}
