import type { UploadedPhotoValue } from "@/types";

export function photosOwnedByUser(photos: UploadedPhotoValue[], userId: string) {
  return photos.every((photo) => photo.path.startsWith(`${userId}/`));
}
