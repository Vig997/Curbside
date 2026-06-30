import type { UploadedPhotoValue } from "@/lib/types";

export function photosOwnedByUser(photos: UploadedPhotoValue[], userId: string) {
  return photos.every((photo) => photo.path.startsWith(`${userId}/`));
}
