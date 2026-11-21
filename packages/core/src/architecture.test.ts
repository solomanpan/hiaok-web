import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = __dirname;
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : n.endsWith('.ts') && !n.endsWith('.test.ts') ? [join(dir, n)] : []));
const imports = (f: string) => [...readFileSync(f, 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1]!);
const layer = (name: string) => files(join(root, name)).map((f) => ({ file: relative(root, f), imports: imports(f) }));

/** Dependencies point inward: domain <- application <- infrastructure <- composition (app.ts). */
describe('layering', () => {
  it('domain depends on nothing but itself (and the language types)', () => {
    for (const { file, imports: i } of layer('domain'))
      for (const m of i) expect(m.startsWith('./') || m.startsWith('../i18n/messages'), `${file} imports ${m}`).toBe(true);
  });
  it('application knows the domain only: no infrastructure, no HTTP client', () => {
    for (const { file, imports: i } of layer('application'))
      for (const m of i) expect(/infrastructure|api-client/.test(m), `${file} imports ${m}`).toBe(false);
  });
  it('only infrastructure talks to the HTTP client', () => {
    for (const name of ['domain', 'application', 'i18n'])
      for (const { file, imports: i } of layer(name)) expect(i.includes('@hiaok/api-client'), file).toBe(false);
  });
});
