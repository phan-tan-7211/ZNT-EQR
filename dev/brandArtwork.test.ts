import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Text inside an image cannot be found by the legacy identity guard, so this
 * suite pins the artwork side of the rename:
 *
 * - SHA-256 digests of every retired image (the previous wordmark and mark,
 *   the product stills and Help Center screenshots that showed the previous
 *   identity, a former customer and a former maintainer). None of them may be
 *   committed again under any name.
 * - The legacy logo paths old e-mails and external pages still link to keep
 *   resolving, now to ZNTEQR artwork.
 * - The Help Center uses the ZNTEQR icon for its favicon, nav logo and heroes.
 */
const RETIRED_ARTWORK_SHA256 = new Set([
  // Previous wordmark and mark (legacy logo paths, Help Center icon and favicon).
  'd28de00dd6b8e3969459cebd5e1bf039144714e105fb82e779b2913c1c1c46bb',
  '64325be43299f7136e1e3d323ac3aa6e5a7b61d97246807c42f38fffd1e1f9b7',
  '7dfa842d4cde7f6ed26a773f8f27f40a8a2771a892821b627c11809cce4323a9',
  'af48954603e0f723da18869039381210db9c909d7dd40bd1d474ad03e5460839',
  '9f175bfba762848404e32520b85556bfe230a10eab7dccee00fb74aff6fa2dac',
  'cd2bcfc4e2c9bc8f509b3f83336f4c5206e3480515c03352d24597a10a1e0be9',
  'c219b72674a3a8312f6abfe58c94ac81fe11c35cf18271267a20cddd9d09ecd9',
  '4513df143022283d73c1ce3931ea9a27da04f2d8b7aed104c71d28e0ce7489e7',
  // Feature-page product stills.
  '410e7b0da639522364ed1427fe7b9098e56f4123b6b14d3bcf70bf85ba35dff8',
  'ad59543e454d2a092b7d515ae6adc8b11210f88f961a90d2bb72f183375d0481',
  '644f5769a727630e7361c59b963026ccc5005a32ab5157d9e388807946c5dda5',
  '40e9281bc468a85d3da63c61e353077dd1fd8bc3d4fd001e8f51e7544c4f844d',
  '29a049869fb8919238bc9cad59500c477c656a1197e83c689ee51245564e8ae4',
  'c6f963f5d02ad111336f6998e94046aec6fed22280e4331a919a679184dda6f1',
  '3a06da9b0eec607e37167591fda4ce4867ab4bfcbd83e7892d646093c347d2ce',
  '6625b239c3c4ec38fb23376e9dcdab37e89097850c8c41d2fbf3824f8ad222c6',
  'e83b2fe505079f3fe5ad28e08e3a059625c8e85c32e1a83c68a44306d309f2d1',
  '3b84c55f0cca7a5a04fee6259ef025c1de2eeb4c0db89aef14700eb0e8a6ca23',
  '6260872e844e41d23df08044d14c9e159d9ec3c189ada614e6a053d8227e56d1',
  '924cf84728e5f9dfb904bb539073df386c156c08141d497be0638dc03b3c7cc6',
  '22272d4d1c3975dd48e91e6f868da0066e0b9a68f5be5c56c95ebbb608d0ba8d',
  'b3dd0dca0254f09b68f61b52a570aaaa6f9b4c3a107807b21e5864dab4a4d719',
  '46691204ca9cab08a84eb191ca873d34788262324e8fb5d40d293525dccc83bf',
  '4f5b23116fa5c260d007de75acdc5a8dde5e425dc739331169519e4ede7f5a70',
  '8099bb87ad984604bb8d38883a8f7e144f1e1f97882baa0de938aa1ec17f89de',
  // Help Center screenshots.
  '3906bd7f3db680001e36bcf2af90366a68e49e032311b8ebc0f3ff1e22bc6e89',
  '9b4546b48ccd288ed06c305478196b9b57e49a378fe734d9ac375843d9f0a03c',
  '5f3b307d9f316e8318fa2454c0b2dfc274814363739287ec9ae3f068a95ffeee',
  '446004cf4e5ee582721a43a68ec622f140418895beaa47e8903f6fe93e052d3d',
  '63b68790456a6f56e3d131faf77287f61746a5a96235f89f9acd8c5b6beabced',
  '87e1e13cdb6f7aff21da41b18fb3f6570cdd4d3ea0567a0423e6e1eed4c88f6a',
  '689f22449f33d86a4e0826e6182d5fcb259295770a2dbaa3704a93c9a7748fba',
  'a45b29cd45f237b2fd945cc21123939128e9bbf69a5fc763c0a7a3e000f4d7db',
  '4ab2528a5096d8fa67427022fe84fb5a69286a74c94efed173e74fba5667dc88',
  '2e2753c7623c9730d57bef702a79d0c99551b10e4f3fcccdec86fd58e90af704',
  '2e2565079d7ca0f72d4d4cfe151f38e0f0684ac81f7fb686ebca8ee67e575072',
  '21c88bbf3fbaa59b9cc317e04a8c30dd674420b7eee9bcc401d155b2b1a0ed31',
  '75d1961e41c4571ceaa4ff8a7569453364f01a70cf36f01cc88b1994237e9a5b',
  'ac7968ff8f8a4392bbcdbfb8026f2ad8c44cc5c171989eb55ddd312f52c7e5d1',
  '80abd12e1333c00d662591b2c67a60524db23b56990bde9ca86cf77e213d2815',
  '244c6a4e82a3c069492f415fca22531dbda43f795f0e587090368bca142c0f0f',
  '6541871f1b75b22c2db4d1f5a041b6f6f3c3cee56de0d026a971bc3b6623fa7f',
  '9e9ffb6eb824b2832dfe2d15b994420ca04969467cc0f8bd6c9ddec146e0bcfd',
  '9060d1081050db7890e9550fbdd776aec4be53262ffccf031ba9abbd36d30e5b',
  'b198c00519515cb9b23c4be5a7fdb7ba327e7a2bee8e092602e32519c121ad1e',
  'e10af96bab928319e67cb42b211252ff0ef0db3ae8851ac3180029974993435a',
  '5d1fb4d2404ff2b07b61252c28fc6d26e32643001d6ef33d64848ef09a8ab8d1',
  'a256169b9dba363b87130aa716fca9f2cd501e2c97e4f7a392c47c544d104667',
  '38f5afe3d354d1c2cf3bb97f5033800d8c947de3e2bc8f9984f5ea70464a492d',
  'f1be68040a510acff56fd68333159404e4373c5bfbda5f040030a3434c15a72c',
  'e6a3157c08be03f566c497a9cbc3fbfb71d0350402d0cba43da5d83298420612',
  '2d41e0fc68363474129597b30218d02d75a22b091dcf5d562bb66cc827e6ac6b',
  '7a29e7279b145169f71db8ef44fdde9f39705a212504f324082e14ddb6a9dd39',
  '177764df4b44178ad8a670f1c33ddbbe58edfd207547e18133b98321d0e7d548',
  '462c3ba2ba51a7f6c53756c9ea4a4a2e7d3c3dd424b23db13776654f13a78644',
]);

const IMAGE_FILE = /\.(png|jpe?g|gif|webp|avif|ico|svg)$/i;

// Paths reached through /eqr-logo/* and /branded-logos/* (public/_redirects,
// netlify.toml) by invitation e-mails and pages published before the rename.
const LEGACY_LOGO_FILES = [
  'public/images/brand/eqr-logo/black.png',
  'public/images/brand/eqr-logo/grayscale.png',
  'public/images/brand/eqr-logo/icon.svg',
  'public/images/brand/eqr-logo/inverse.png',
  'public/images/brand/eqr-logo/transparent.png',
  'public/images/brand/eqr-logo/vector.svg',
  'public/images/brand/logos/white.png',
];

const HELP_CENTER_ICON = '/brand/znteqr-icon.png';
const HELP_CENTER_HOME_PAGES = ['docs/index.md', 'docs/vi/index.md', 'docs/ko/index.md'];

const root = process.cwd();

function trackedImages(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter((file) => IMAGE_FILE.test(file) && existsSync(join(root, file)));
}

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(join(root, file))).digest('hex');
}

describe('retired brand artwork', () => {
  it('lists each retired image once', () => {
    expect(RETIRED_ARTWORK_SHA256.size).toBe(55);
  });

  it('is not committed again under any name', () => {
    const offenders = trackedImages().filter((file) => RETIRED_ARTWORK_SHA256.has(sha256(file)));
    expect(offenders).toEqual([]);
  });

  it('keeps serving the legacy logo paths with replacement artwork', () => {
    const missing = LEGACY_LOGO_FILES.filter((file) => !existsSync(join(root, file)));
    expect(missing).toEqual([]);

    for (const file of LEGACY_LOGO_FILES.filter((path) => path.endsWith('.svg'))) {
      const svg = readFileSync(join(root, file), 'utf8');
      expect(svg, file).toContain('aria-label="ZNTEQR"');
      expect(svg, file).toContain('href="data:image/png;base64,');
    }
  });
});

describe('Help Center branding', () => {
  it('ships the ZNTEQR icon and favicon', () => {
    expect(existsSync(join(root, 'docs/public', HELP_CENTER_ICON))).toBe(true);
    expect(existsSync(join(root, 'docs/public/favicon.ico'))).toBe(true);
    expect(existsSync(join(root, 'docs/public/eqr-logo'))).toBe(false);
  });

  it('uses the ZNTEQR icon for the favicon, touch icon and nav logo', () => {
    const config = readFileSync(join(root, 'docs/.vitepress/config.ts'), 'utf8');
    expect(config).toContain(`["link", { rel: "apple-touch-icon", href: "${HELP_CENTER_ICON}" }]`);
    expect(config).toContain(`logo: { src: "${HELP_CENTER_ICON}", alt: "ZNTEQR" }`);
    expect(config).not.toContain('/eqr-logo/');
  });

  it.each(HELP_CENTER_HOME_PAGES)('%s shows the ZNTEQR icon in the hero', (page) => {
    const markdown = readFileSync(join(root, page), 'utf8');
    expect(markdown).toContain(`    src: ${HELP_CENTER_ICON}\n`);
    expect(markdown).not.toContain('/eqr-logo/');
  });
});
