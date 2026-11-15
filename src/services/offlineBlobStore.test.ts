import { describe, it, expect, vi, beforeEach } from 'vitest';
import { set, get, del, keys } from 'idb-keyval';
import {
  stageOfflineImages,
  loadOfflineImageFiles,
  deleteOfflineImageRefs,
  clearOfflineBlobsForUser,
} from './offlineBlobStore';

// Lets a test hold the legacy storage migration "in progress".
const legacyMigration = vi.hoisted(() => ({ done: Promise.resolve() as Promise<void> }));
vi.mock('@/lib/legacyStorageMigration', () => ({
  whenLegacyStorageMigrated: () => legacyMigration.done,
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(async () => []),
  delMany: vi.fn(),
}));

describe('offlineBlobStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    legacyMigration.done = Promise.resolve();
  });

  it('stages image blobs and returns reference ids', async () => {
    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    vi.mocked(set).mockResolvedValue(undefined);

    const refs = await stageOfflineImages('user-1', 'org-1', [file]);

    expect(refs).toHaveLength(1);
    expect(set).toHaveBeenCalledTimes(1);
  });

  it('loads staged blobs as File objects', async () => {
    const blob = new Blob(['hello'], { type: 'image/jpeg' });
    vi.mocked(get).mockResolvedValue({
      blob,
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 5,
      createdAt: Date.now(),
    });

    const files = await loadOfflineImageFiles('user-1', 'org-1', ['ref-1']);

    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('photo.jpg');
  });

  it('deletes blob refs on cleanup', async () => {
    vi.mocked(del).mockResolvedValue(undefined);
    await deleteOfflineImageRefs('user-1', 'org-1', ['ref-1', 'ref-2']);
    expect(del).toHaveBeenCalledTimes(2);
  });

  it('rolls back partially staged blobs when a later file fails', async () => {
    const first = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const second = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
    vi.mocked(set)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new DOMException('quota', 'QuotaExceededError'));
    vi.mocked(del).mockResolvedValue(undefined);

    await expect(stageOfflineImages('user-1', 'org-1', [first, second])).rejects.toThrow(
      /quota exceeded/i,
    );
    expect(del).toHaveBeenCalled();
  });

  it('waits for the legacy storage migration before reading or deleting blobs', async () => {
    let finishMigration = () => {};
    legacyMigration.done = new Promise<void>((resolve) => {
      finishMigration = resolve;
    });
    vi.mocked(get).mockResolvedValue({
      blob: new Blob(['hello'], { type: 'image/jpeg' }),
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 5,
      createdAt: Date.now(),
    });
    vi.mocked(del).mockResolvedValue(undefined);
    vi.mocked(keys).mockResolvedValue([]);

    const loading = loadOfflineImageFiles('user-1', 'org-1', ['ref-1']);
    const deleting = deleteOfflineImageRefs('user-1', 'org-1', ['ref-2']);
    const clearing = clearOfflineBlobsForUser('user-1');
    await new Promise((resolve) => setTimeout(resolve, 0));

    // A photo still under its legacy key must not be reported missing or left behind.
    expect(get).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(keys).not.toHaveBeenCalled();

    finishMigration();
    await expect(loading).resolves.toHaveLength(1);
    await deleting;
    await clearing;
    expect(get).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledTimes(1);
    expect(keys).toHaveBeenCalledTimes(1);
  });
});
