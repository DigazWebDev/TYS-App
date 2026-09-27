import {
  POST_IMAGE_MAX_BYTES,
  POST_IMAGE_MIME_TYPES,
  POST_MEDIA_MAX_ITEMS,
  POST_MEDIA_MAX_VIDEOS,
  POST_VIDEO_MAX_BYTES,
  POST_VIDEO_MIME_TYPES,
} from '@/constants/post-media';

export type PostMediaKind = 'image' | 'video';

export type PostMediaDraft = {
  id: string;
  uri: string;
  kind: PostMediaKind;
  mimeType: string | null;
  fileName: string | null;
  fileSize: number | null;
};

export type IncomingPostMedia = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  pickerType?: 'image' | 'video' | 'livePhoto' | 'pairedVideo' | null;
};

const IMAGE_MIME = new Set<string>(POST_IMAGE_MIME_TYPES);
const VIDEO_MIME = new Set<string>(POST_VIDEO_MIME_TYPES);

const FORMAT_MESSAGE =
  'Este formato não é aceite. Usa JPG, PNG, WEBP, GIF, MP4, MOV ou WEBM.';
const ITEM_LIMIT_MESSAGE = `Podes escolher até ${POST_MEDIA_MAX_ITEMS} ficheiros.`;
const VIDEO_LIMIT_MESSAGE = `Podes incluir até ${POST_MEDIA_MAX_VIDEOS} vídeos.`;
const DUPLICATE_MESSAGE = 'Esse ficheiro já está na seleção.';
const EMPTY_FILE_MESSAGE = 'O ficheiro está vazio.';

function normalizeMime(mimeType: string | null | undefined) {
  const mime = mimeType?.toLowerCase().split(';')[0]?.trim() ?? '';
  if (mime === 'image/jpg') {
    return 'image/jpeg';
  }
  if (mime === 'video/mov') {
    return 'video/quicktime';
  }
  return mime;
}

function extensionOf(uri: string, fileName?: string | null) {
  const source = fileName?.trim() || uri;
  const match = /\.([a-z0-9]+)(?:\?|#|$)/i.exec(source);
  return match?.[1]?.toLowerCase() ?? '';
}

function kindFromExtension(extension: string): PostMediaKind | null {
  if (
    extension === 'jpg' ||
    extension === 'jpeg' ||
    extension === 'png' ||
    extension === 'webp' ||
    extension === 'gif' ||
    extension === 'heic' ||
    extension === 'heif'
  ) {
    return 'image';
  }
  if (extension === 'mp4' || extension === 'mov' || extension === 'webm') {
    return 'video';
  }
  return null;
}

function classifyIncoming(item: IncomingPostMedia):
  | { ok: true; draft: Omit<PostMediaDraft, 'id'> }
  | { ok: false; reason: string } {
  const uri = item.uri.trim();
  if (!uri) {
    return { ok: false, reason: FORMAT_MESSAGE };
  }

  const mime = normalizeMime(item.mimeType);
  const extension = extensionOf(uri, item.fileName);
  const extensionKind = kindFromExtension(extension);
  const previewMime =
    mime ||
    (extension === 'heic'
      ? 'image/heic'
      : extension === 'heif'
        ? 'image/heif'
        : '');
  let kind: PostMediaKind | null = null;

  if (previewMime === 'image/heic' || previewMime === 'image/heif') {
    kind = 'image';
  } else if (mime) {
    if (IMAGE_MIME.has(mime)) {
      kind = 'image';
    } else if (VIDEO_MIME.has(mime)) {
      kind = 'video';
    } else {
      return { ok: false, reason: FORMAT_MESSAGE };
    }
  } else if (item.pickerType === 'image' || item.pickerType === 'livePhoto') {
    kind = extensionKind === 'video' ? null : extensionKind ?? 'image';
  } else if (item.pickerType === 'video') {
    kind = extensionKind === 'image' ? null : extensionKind ?? 'video';
  } else {
    kind = extensionKind;
  }

  if (!kind) {
    return { ok: false, reason: FORMAT_MESSAGE };
  }

  const fileSize = typeof item.fileSize === 'number' ? item.fileSize : null;
  if (fileSize === 0) {
    return { ok: false, reason: EMPTY_FILE_MESSAGE };
  }

  const limit = kind === 'video' ? POST_VIDEO_MAX_BYTES : POST_IMAGE_MAX_BYTES;
  if (fileSize !== null && fileSize > limit) {
    return {
      ok: false,
      reason:
        kind === 'video'
          ? 'Os vídeos não podem passar de 50 MB.'
          : 'As imagens não podem passar de 15 MB.',
    };
  }

  return {
    ok: true,
    draft: {
      uri,
      kind,
      mimeType: previewMime || null,
      fileName: item.fileName?.trim() || null,
      fileSize,
    },
  };
}

export function mergePostMediaDrafts(
  current: PostMediaDraft[],
  incoming: IncomingPostMedia[],
) {
  const next = current.slice();
  const reasons: string[] = [];

  incoming.forEach((item, index) => {
    if (next.length >= POST_MEDIA_MAX_ITEMS) {
      reasons.push(ITEM_LIMIT_MESSAGE);
      return;
    }

    const classified = classifyIncoming(item);
    if (!classified.ok) {
      reasons.push(classified.reason);
      return;
    }

    if (next.some((existing) => existing.uri === classified.draft.uri)) {
      reasons.push(DUPLICATE_MESSAGE);
      return;
    }

    const videoCount = next.filter((existing) => existing.kind === 'video').length;
    if (classified.draft.kind === 'video' && videoCount >= POST_MEDIA_MAX_VIDEOS) {
      reasons.push(VIDEO_LIMIT_MESSAGE);
      return;
    }

    next.push({
      ...classified.draft,
      id: `${Date.now()}-${index}-${next.length}`,
    });
  });

  const uniqueReasons = [...new Set(reasons)];
  if (uniqueReasons.length === 0) {
    return { items: next, error: null };
  }

  const added = next.length > current.length;
  const detail = uniqueReasons.join(' ');
  return {
    items: next,
    error: added ? `Alguns ficheiros ficaram de fora. ${detail}` : detail,
  };
}

export function removePostMediaDraft(items: PostMediaDraft[], index: number) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function movePostMediaDraft(
  items: PostMediaDraft[],
  index: number,
  direction: -1 | 1,
) {
  const target = index + direction;
  if (target < 0 || target >= items.length) {
    return items;
  }

  const next = items.slice();
  const [moved] = next.splice(index, 1);
  if (!moved) {
    return items;
  }
  next.splice(target, 0, moved);
  return next;
}
