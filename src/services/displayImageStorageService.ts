import { supabase } from '@/integrations/supabase/client';
import {
  createDisplayImageVariants,
  DISPLAY_IMAGE_VARIANT_NAMES,
  type DisplayImageVariantName,
} from '@/services/displayImageVariantService';

export const DISPLAY_IMAGE_BUCKET = 'display-images' as const;

export type DisplayImageEntity = 'equipment' | 'inventory';

export interface DisplayImagePathInput {
  organizationId: string;
  entity: DisplayImageEntity;
  entityId: string;
  imageSetId: string;
  variant: DisplayImageVariantName;
}

export type CanonicalDisplayImageRefInput = Omit<
  DisplayImagePathInput,
  'variant'
>;

export interface DisplayImageSetUploadInput
  extends Omit<CanonicalDisplayImageRefInput, 'imageSetId'> {
  source: File;
  imageSetId?: string;
}

export interface UploadedDisplayImageSet {
  imageSetId: string;
  canonicalRef: string;
  objectPaths: Record<DisplayImageVariantName, string>;
}

export const DISPLAY_IMAGE_UPLOAD_OPTIONS = {
  upsert: false,
  cacheControl: '31536000',
  contentType: 'image/webp',
} as const;

export class DisplayImageUploadError extends Error {
  readonly variant: DisplayImageVariantName;
  readonly cause: unknown;

  constructor(variant: DisplayImageVariantName, cause: unknown) {
    super('Failed to upload ' + variant + ' display image variant.');
    this.name = 'DisplayImageUploadError';
    this.variant = variant;
    this.cause = cause;
  }
}

export interface ParsedDisplayImageRef {
  canonicalRef: string;
  objectPath: string;
  organizationId: string;
  entity: DisplayImageEntity;
  entityId: string;
  imageSetId: string;
  variant: DisplayImageVariantName;
}

export type DisplayImagePublicUrls = Record<
  DisplayImageVariantName,
  string
>;

export type LegacyDisplayImageResolver = (
  storedRef: string,
  variant: DisplayImageVariantName,
) => string | null | Promise<string | null>;

const DISPLAY_IMAGE_PUBLIC_URL_MARKERS = [
  '/storage/v1/object/public/display-images/',
  '/storage/v1/object/sign/display-images/',
  '/object/public/display-images/',
  '/object/sign/display-images/',
] as const;

const SAFE_PATH_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._~-]*$/;

function isSafePathSegment(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    SAFE_PATH_SEGMENT.test(value) &&
    value !== '.' &&
    value !== '..'
  );
}

function assertSafePathSegment(label: string, value: unknown): asserts value is string {
  if (!isSafePathSegment(value)) {
    throw new TypeError(
      label + ' must be a non-empty path segment without separators.',
    );
  }
}

function assertDisplayImagePathInput(input: DisplayImagePathInput): void {
  if (input.entity !== 'equipment' && input.entity !== 'inventory') {
    throw new TypeError('entity must be equipment or inventory.');
  }

  assertSafePathSegment('organizationId', input.organizationId);
  assertSafePathSegment('entityId', input.entityId);
  assertSafePathSegment('imageSetId', input.imageSetId);

  if (!DISPLAY_IMAGE_VARIANT_NAMES.includes(input.variant)) {
    throw new TypeError('variant must be thumb, preview, or full.');
  }
}

export function createDisplayImagePath(input: DisplayImagePathInput): string;
export function createDisplayImagePath(
  entity: DisplayImageEntity,
  organizationId: string,
  entityId: string,
  imageSetId: string,
  variant: DisplayImageVariantName,
): string;
export function createDisplayImagePath(
  inputOrEntity: DisplayImagePathInput | DisplayImageEntity,
  organizationId?: string,
  entityId?: string,
  imageSetId?: string,
  variant?: DisplayImageVariantName,
): string {
  const input: DisplayImagePathInput =
    typeof inputOrEntity === 'string'
      ? {
          entity: inputOrEntity,
          organizationId: organizationId ?? '',
          entityId: entityId ?? '',
          imageSetId: imageSetId ?? '',
          variant: variant as DisplayImageVariantName,
        }
      : inputOrEntity;

  assertDisplayImagePathInput(input);

  return [
    'org',
    input.organizationId,
    input.entity,
    input.entityId,
    input.imageSetId,
    input.variant + '.webp',
  ].join('/');
}

export function createCanonicalDisplayImageRef(
  input: CanonicalDisplayImageRefInput,
): string;
export function createCanonicalDisplayImageRef(
  entity: DisplayImageEntity,
  organizationId: string,
  entityId: string,
  imageSetId: string,
): string;
export function createCanonicalDisplayImageRef(
  inputOrEntity: CanonicalDisplayImageRefInput | DisplayImageEntity,
  organizationId?: string,
  entityId?: string,
  imageSetId?: string,
): string {
  const input: CanonicalDisplayImageRefInput =
    typeof inputOrEntity === 'string'
      ? {
          entity: inputOrEntity,
          organizationId: organizationId ?? '',
          entityId: entityId ?? '',
          imageSetId: imageSetId ?? '',
        }
      : inputOrEntity;

  return (
    DISPLAY_IMAGE_BUCKET +
    '/' +
    createDisplayImagePath({ ...input, variant: 'full' })
  );
}

export function createDisplayImageSetId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;

  if (typeof randomUUID !== 'function') {
    throw new Error('crypto.randomUUID is required for display image sets.');
  }

  return randomUUID.call(globalThis.crypto);
}

export async function uploadDisplayImageSet(
  input: DisplayImageSetUploadInput,
): Promise<UploadedDisplayImageSet> {
  const imageSetId = input.imageSetId ?? createDisplayImageSetId();
  const canonicalInput: CanonicalDisplayImageRefInput = {
    organizationId: input.organizationId,
    entity: input.entity,
    entityId: input.entityId,
    imageSetId,
  };
  const canonicalRef = createCanonicalDisplayImageRef(canonicalInput);
  const variants = await createDisplayImageVariants(input.source);
  const objectPaths = {} as Record<DisplayImageVariantName, string>;

  for (const variant of DISPLAY_IMAGE_VARIANT_NAMES) {
    const objectPath = createDisplayImagePath({
      ...canonicalInput,
      variant,
    });
    const { error } = await supabase.storage
      .from(DISPLAY_IMAGE_BUCKET)
      .upload(objectPath, variants[variant], DISPLAY_IMAGE_UPLOAD_OPTIONS);

    if (error) {
      throw new DisplayImageUploadError(variant, error);
    }

    objectPaths[variant] = objectPath;
  }

  return {
    imageSetId,
    canonicalRef,
    objectPaths,
  };
}

function decodeStoragePath(path: string): string | null {
  const queryIndex = path.search(/[?#]/);
  const withoutQuery = (queryIndex === -1 ? path : path.slice(0, queryIndex))
    .replace(/^\/+/, '');

  if (!withoutQuery) return null;

  try {
    return decodeURIComponent(withoutQuery);
  } catch {
    return null;
  }
}

function extractDisplayImageObjectPath(storedRef: string): string | null {
  const trimmed = storedRef.trim();
  if (!trimmed) return null;

  const canonicalPrefix = DISPLAY_IMAGE_BUCKET + '/';
  if (trimmed.startsWith(canonicalPrefix)) {
    return decodeStoragePath(trimmed.slice(canonicalPrefix.length));
  }

  for (const marker of DISPLAY_IMAGE_PUBLIC_URL_MARKERS) {
    const markerIndex = trimmed.indexOf(marker);
    if (markerIndex === -1) continue;

    return decodeStoragePath(trimmed.slice(markerIndex + marker.length));
  }

  return null;
}

export function parseDisplayImageRef(
  storedRef: string,
): ParsedDisplayImageRef | null {
  const objectPath = extractDisplayImageObjectPath(storedRef);
  if (!objectPath) return null;

  const segments = objectPath.split('/');
  if (segments.length !== 6 || segments[0] !== 'org') {
    return null;
  }

  const organizationId = segments[1];
  const entityName = segments[2];
  const entityId = segments[3];
  const imageSetId = segments[4];
  const variant = DISPLAY_IMAGE_VARIANT_NAMES.find(
    (candidate) => segments[5] === candidate + '.webp',
  );

  if (
    !isSafePathSegment(organizationId) ||
    !isSafePathSegment(entityId) ||
    !isSafePathSegment(imageSetId) ||
    (entityName !== 'equipment' && entityName !== 'inventory') ||
    !variant
  ) {
    return null;
  }

  const entity = entityName;

  return {
    canonicalRef:
      DISPLAY_IMAGE_BUCKET +
      '/' +
      createDisplayImagePath({
        organizationId,
        entity,
        entityId,
        imageSetId,
        variant: 'full',
      }),
    objectPath,
    organizationId,
    entity,
    entityId,
    imageSetId,
    variant,
  };
}

export function parseCanonicalDisplayImageRef(
  storedRef: string,
): ParsedDisplayImageRef | null {
  const parsed = parseDisplayImageRef(storedRef);
  return parsed?.variant === 'full' ? parsed : null;
}

export function isDisplayImageV2Ref(
  storedRef: string | null | undefined,
): boolean {
  return Boolean(storedRef?.trim() && parseDisplayImageRef(storedRef.trim()));
}

export function getDisplayImageObjectPath(
  storedRef: string | null | undefined,
  variant: DisplayImageVariantName,
): string | null {
  if (!storedRef?.trim()) return null;

  const parsed = parseDisplayImageRef(storedRef.trim());
  if (!parsed) return null;

  return createDisplayImagePath({
    organizationId: parsed.organizationId,
    entity: parsed.entity,
    entityId: parsed.entityId,
    imageSetId: parsed.imageSetId,
    variant,
  });
}

function getPublicUrlForObjectPath(objectPath: string): string | null {
  const result = supabase.storage
    .from(DISPLAY_IMAGE_BUCKET)
    .getPublicUrl(objectPath);

  return result?.data?.publicUrl?.trim() || null;
}

export function getDisplayImagePublicUrl(
  storedRef: string | null | undefined,
  variant: DisplayImageVariantName,
): string | null {
  const objectPath = getDisplayImageObjectPath(storedRef, variant);
  return objectPath ? getPublicUrlForObjectPath(objectPath) : null;
}

export function getDisplayImagePublicUrls(
  canonicalRef: string | null | undefined,
): DisplayImagePublicUrls | null {
  if (!canonicalRef?.trim()) return null;

  const parsed = parseCanonicalDisplayImageRef(canonicalRef.trim());
  if (!parsed) return null;

  const urls = {} as DisplayImagePublicUrls;

  for (const variant of DISPLAY_IMAGE_VARIANT_NAMES) {
    const objectPath = createDisplayImagePath({
      organizationId: parsed.organizationId,
      entity: parsed.entity,
      entityId: parsed.entityId,
      imageSetId: parsed.imageSetId,
      variant,
    });
    const publicUrl = getPublicUrlForObjectPath(objectPath);

    if (!publicUrl) return null;
    urls[variant] = publicUrl;
  }

  return urls;
}

export async function removeDisplayImageSet(
  storedRef: string | null | undefined,
): Promise<boolean> {
  if (!storedRef?.trim()) return false;

  const parsed = parseDisplayImageRef(storedRef.trim());
  if (!parsed) return false;

  const objectPaths = DISPLAY_IMAGE_VARIANT_NAMES.map((variant) =>
    createDisplayImagePath({
      organizationId: parsed.organizationId,
      entity: parsed.entity,
      entityId: parsed.entityId,
      imageSetId: parsed.imageSetId,
      variant,
    }),
  );
  const { error } = await supabase.storage
    .from(DISPLAY_IMAGE_BUCKET)
    .remove(objectPaths);

  if (error) throw error;
  return true;
}

/**
 * Resolve a V2 ref with a public object URL. The legacy resolver is injected
 * so each caller keeps its existing private-bucket fallback unchanged.
 *
 * V2 refs are recognized before the legacy callback is considered. This
 * prevents an immutable display-image ref from entering private resolution.
 */
export async function resolveDisplayImageRef(
  storedRef: string | null | undefined,
  variant: DisplayImageVariantName,
  legacyResolver: LegacyDisplayImageResolver,
): Promise<string | null> {
  const trimmed = storedRef?.trim();
  if (!trimmed) return null;

  const parsed = parseDisplayImageRef(trimmed);
  if (parsed) {
    const objectPath = createDisplayImagePath({
      organizationId: parsed.organizationId,
      entity: parsed.entity,
      entityId: parsed.entityId,
      imageSetId: parsed.imageSetId,
      variant,
    });

    return getPublicUrlForObjectPath(objectPath);
  }

  return legacyResolver(trimmed, variant);
}
