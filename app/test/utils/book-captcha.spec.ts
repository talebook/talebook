import { describe, expect, it } from 'vitest';
import { bookCaptchaReturn, decodeBookCaptchaNext } from '@/utils/book-captcha';
import { appendCaptchaData } from '@/utils/captcha';

describe('book verification navigation', () => {
    it('decodes a URL-safe target once without losing nested query separators', () => {
        const target = '/read/1?reader=readest&cfi=abc';
        const encoded = btoa(target).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
        expect(decodeBookCaptchaNext(encoded)).toBe(target);
        for (const invalid of [null, ['a'], '!', 'a', 'x'.repeat(16385)]) expect(decodeBookCaptchaNext(invalid)).toBeNull();
    });
    it('keeps book-specific reader state and deployment prefix', () => {
        expect(bookCaptchaReturn('/shelf/read/1?cfi=abc&reader=readest#chapter', '1', 'read', '/shelf'))
            .toBe('/shelf/read/1?cfi=abc&reader=readest#chapter');
        expect(bookCaptchaReturn('/api/book/1.EPUB', '1', 'download', '')).toBe('/api/book/1.EPUB');
        expect(bookCaptchaReturn('/read-comic/1', '1', 'read', '')).toBe('/read-comic/1');
    });
    it('rejects external URLs, another book, wrong actions and malformed paths', () => {
        for (const next of ['https://evil.test', '//evil.test', '/\\evil.test', '/read/2', '/read/1/../../login', '/api/book/1.epub', '/read/1\n']) {
            expect(bookCaptchaReturn(next, '1', 'read', '')).toBe('/read/1');
        }
        expect(bookCaptchaReturn('/api/book/2.epub', '1', 'download', '')).toBe('/book/1');
        expect(bookCaptchaReturn('/api/book/1.epub/extra', '1', 'download', '')).toBe('/book/1');
    });
    it('submits only the selected provider parameters for account and book forms', () => {
        const data = new URLSearchParams();
        appendCaptchaData(data, { provider: 'turnstile', turnstile_token: 'token', captcha_code: 'wrong' });
        expect(data.toString()).toBe('turnstile_token=token');
        const image = new URLSearchParams();
        appendCaptchaData(image, { provider: 'image', captcha_code: 'ABCD' });
        expect(image.get('captcha_code')).toBe('ABCD');
        const geetest = new URLSearchParams();
        appendCaptchaData(geetest, { provider: 'geetest', lot_number: 'lot', captcha_output: 'output', pass_token: 'pass', gen_time: 'time' });
        expect(geetest.size).toBe(4);
    });
});
