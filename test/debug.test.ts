import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setDebug, isDebugEnabled } from '../src/core/debug';
import { debugLog } from '../src/core/debug';

describe('debug', () => {
    let spy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
        spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
        setDebug(false);
    });
    afterEach(() => {
        spy.mockRestore();
        setDebug(false);
    });

    it('is off by default and logs nothing', () => {
        expect(isDebugEnabled()).toBe(false);
        debugLog('scope', 'hello');
        expect(spy).not.toHaveBeenCalled();
    });

    it('logs when enabled globally', () => {
        setDebug(true);
        expect(isDebugEnabled()).toBe(true);
        debugLog('loader', 'loaded', { a: 1 });
        expect(spy).toHaveBeenCalledWith('[gh-area:loader]', 'loaded', { a: 1 });
    });

    it('logs when local is true even if global is off', () => {
        debugLog('x', 'forced', undefined, true);
        expect(spy).toHaveBeenCalledWith('[gh-area:x]', 'forced');
    });
});
