export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 1024 * 1024;
export const MAX_BODY_BYTES = 3500000;
export function validateContact(contact: string) {
  return (
    contact.length <= 254 &&
    (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ||
      (/^[+\d\s().-]+$/.test(contact) &&
        contact.replace(/\D/g, "").length >= 10 &&
        contact.replace(/\D/g, "").length <= 15))
  );
}
export function validatePhotos(files: Pick<File, "size" | "type">[]) {
  if (!files.length || files.length > MAX_PHOTOS)
    return "Choose between 1 and 3 window photos.";
  if (files.some((f) => !["image/jpeg", "image/png"].includes(f.type)))
    return "Use JPG or PNG photos. Convert HEIC images before uploading.";
  if (files.some((f) => f.size === 0 || f.size > MAX_PHOTO_BYTES))
    return "Each photo must be nonempty and no larger than 1 MB.";
  return null;
}
