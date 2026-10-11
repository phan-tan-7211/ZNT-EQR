import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { buildCsp, extractCspFromCloudflareHeaders } from './csp';

describe('csp', () => {
  it('Cloudflare Pages Content-Security-Policy matches buildCsp() production output', () => {
    const headersPath = join(process.cwd(), 'public', '_headers');
    const cloudflareCsp = extractCspFromCloudflareHeaders(readFileSync(headersPath, 'utf-8'));
    expect(cloudflareCsp).toBeDefined();
    expect(cloudflareCsp).toBe(buildCsp());
  });

  it('docs Cloudflare Pages _headers exposes the static docs CSP read by the docs evidence server', () => {
    const headersPath = join(process.cwd(), 'docs', 'public', '_headers');
    const docsCsp = extractCspFromCloudflareHeaders(readFileSync(headersPath, 'utf-8'));
    expect(docsCsp).toBeDefined();
    const scriptSrc = docsCsp
      ?.split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('script-src '));
    expect(scriptSrc).toBe("script-src 'self'");
  });

  it('buildCsp({ dev: true }) adds localhost allowances for the Vite dev server', () => {
    const devCsp = buildCsp({ dev: true });

    expect(devCsp).toContain('http://localhost:*');
    expect(devCsp).toContain('http://127.0.0.1:*');
    expect(devCsp).toContain('ws://localhost:*');
    expect(devCsp).toContain('wss://localhost:*');
    expect(devCsp).not.toBe(buildCsp());
  });

  it('production CSP omits unsafe-eval while dev CSP includes it for Vite HMR', () => {
    const productionCsp = buildCsp();
    const devCsp = buildCsp({ dev: true });

    expect(productionCsp).not.toContain(" 'unsafe-eval'");
    expect(devCsp).toContain(" 'unsafe-eval'");
  });

  it('production and dev CSP allow WASM compilation for Google Maps vector basemap', () => {
    const productionCsp = buildCsp();
    const devCsp = buildCsp({ dev: true });

    expect(productionCsp).toContain("'wasm-unsafe-eval'");
    expect(devCsp).toContain("'wasm-unsafe-eval'");
  });

  it('production and dev CSP allow HIBP password range checks', () => {
    const productionCsp = buildCsp();
    const devCsp = buildCsp({ dev: true });

    expect(productionCsp).toContain('https://api.pwnedpasswords.com');
    expect(devCsp).toContain('https://api.pwnedpasswords.com');
  });

  it('production CSP sets frame-ancestors self', () => {
    expect(buildCsp()).toContain("frame-ancestors 'self'");
  });
});
