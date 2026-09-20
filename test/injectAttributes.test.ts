import { describe, it, expect } from 'vitest';
import { injectAttributes } from '../src/utils/injectAttributes';

describe('injectAttributes', () => {
    const base = { lat: 0, lng: 0 };

    it('replaces $>key<$ placeholders with values', () => {
        const out = injectAttributes({ ...base, name: 'John', age: 25 }, '<p>$>name<$ is $>age<$</p>');
        expect(out).toBe('<p>John is 25</p>');
    });

    it('trims whitespace inside placeholders', () => {
        expect(injectAttributes({ ...base, name: 'Jo' }, '$> name <$')).toBe('Jo');
    });

    it('escapes HTML by default to prevent XSS', () => {
        const out = injectAttributes({ ...base, name: '<img src=x onerror=alert(1)>' }, '<p>$>name<$</p>');
        expect(out).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
        expect(out).not.toContain('<img');
    });

    it('allows raw HTML when allowHtml is true', () => {
        const out = injectAttributes({ ...base, name: '<b>Jo</b>' }, '$>name<$', { allowHtml: true });
        expect(out).toBe('<b>Jo</b>');
    });

    it('uses the fallback for missing keys', () => {
        expect(injectAttributes(base, '$>missing<$')).toBe('');
        expect(injectAttributes(base, '$>missing<$', { fallback: 'N/A' })).toBe('N/A');
    });

    it('escapes ampersands and quotes', () => {
        expect(injectAttributes({ ...base, v: `a&b"c'd` }, '$>v<$')).toBe('a&amp;b&quot;c&#39;d');
    });
});
