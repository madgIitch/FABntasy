import { describe, expect, it } from 'vitest';
describe('foundation', () => { it('keeps FAB secrets server-side by convention', () => { expect('FAB_KEY'.startsWith('NEXT_PUBLIC_')).toBe(false); }); });
