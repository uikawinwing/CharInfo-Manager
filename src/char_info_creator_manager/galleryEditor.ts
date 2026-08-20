import { normalizePortraitMediaUrlForBrowser, type PortraitMediaKind } from '../char_info_viewer/services/imageUrl.ts';
import type { GalleryImage } from '../char_info_shared/characterVisualProfile';

export interface EditableGalleryImage extends GalleryImage {
  id: number;
  previewSourceIndex: number;
}

export function isViewerVisible(image: Pick<GalleryImage, 'viewerVisible'>): boolean {
  return image.viewerVisible !== false;
}

export function preferredStaticImageUrl(image: Pick<GalleryImage, 'sources'> | null | undefined): string {
  if (!image) return '';
  for (const source of image.sources) {
    const media = normalizePortraitMediaUrlForBrowser(source);
    if (media?.kind === 'image') return media.url;
  }
  return '';
}

export function preferredMediaKind(image: Pick<GalleryImage, 'sources'> | null | undefined): PortraitMediaKind | null {
  if (!image) return null;
  for (const source of image.sources) {
    const media = normalizePortraitMediaUrlForBrowser(source);
    if (media) return media.kind;
  }
  return null;
}

export function firstViewerImage(gallery: readonly EditableGalleryImage[]): EditableGalleryImage | null {
  return gallery.find(isViewerVisible) ?? null;
}

export function firstStaticImage(gallery: readonly EditableGalleryImage[]): EditableGalleryImage | null {
  return gallery.find(image => !!preferredStaticImageUrl(image)) ?? null;
}

export function setMainViewerImage(gallery: EditableGalleryImage[], imageId: number): void {
  const index = gallery.findIndex(image => image.id === imageId);
  if (index < 0) return;
  const [image] = gallery.splice(index, 1);
  delete image.viewerVisible;
  gallery.unshift(image);
}

export function setViewerVisibility(
  gallery: EditableGalleryImage[],
  selectedIds: readonly number[],
  visible: boolean,
): boolean {
  const selected = new Set(selectedIds);
  if (!visible) {
    const remainingViewerCount = gallery.filter(image => !selected.has(image.id) && isViewerVisible(image)).length;
    if (remainingViewerCount === 0) return false;
  }
  gallery.forEach(image => {
    if (!selected.has(image.id)) return;
    if (visible) delete image.viewerVisible;
    else image.viewerVisible = false;
  });
  return true;
}
