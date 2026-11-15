import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
  },
}));

import { getEquipmentDisplayImageRef } from './equipmentDisplayImageRefService';

const ORG_ID = 'org-1';
const EQUIP_ID = 'eq-1';

/** Build a Supabase query chain whose `maybeSingle()` resolves to `result`. */
function makeChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  };
  return chain;
}

describe('getEquipmentDisplayImageRef', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads image_url from the equipment row scoped to its organization', async () => {
    const chain = makeChain({
      data: { image_url: 'display-images/org/org-1/equipment/eq-1/set/full.webp' },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    await expect(getEquipmentDisplayImageRef(ORG_ID, EQUIP_ID)).resolves.toBe(
      'display-images/org/org-1/equipment/eq-1/set/full.webp',
    );

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('equipment');
    expect(chain.select).toHaveBeenCalledWith('image_url');
    expect(chain.eq.mock.calls).toEqual([
      ['id', EQUIP_ID],
      ['organization_id', ORG_ID],
    ]);
    expect(chain.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('returns null when the equipment row is not found', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));

    await expect(getEquipmentDisplayImageRef(ORG_ID, EQUIP_ID)).resolves.toBeNull();
  });

  it('returns null when the equipment has no display image', async () => {
    mockFrom.mockReturnValue(makeChain({ data: { image_url: null }, error: null }));

    await expect(getEquipmentDisplayImageRef(ORG_ID, EQUIP_ID)).resolves.toBeNull();
  });

  it('rethrows the Supabase error unchanged', async () => {
    const dbError = { message: 'permission denied', code: '42501' };
    mockFrom.mockReturnValue(makeChain({ data: null, error: dbError }));

    await expect(getEquipmentDisplayImageRef(ORG_ID, EQUIP_ID)).rejects.toBe(dbError);
  });
});
