/**
 * Data object whose values are injected into an HTML template. Must contain the
 * marker coordinates plus any custom fields referenced by the template.
 *
 * @public
 */
export interface IContentInfoWindow {
    lat: number;
    lng: number;
    [key: string]: unknown;
}

/**
 * Options controlling how {@link injectAttributes} replaces placeholders.
 *
 * @public
 */
export interface InjectAttributesOptions {
    /**
     * When `true`, injected values are inserted as raw HTML. Only enable this if
     * every value is fully trusted — raw injection allows script execution (XSS).
     *
     * @defaultValue false (values are HTML-escaped)
     */
    allowHtml?: boolean;
    /**
     * Replacement used when a referenced key is missing or `null`/`undefined`.
     *
     * @defaultValue '' (empty string)
     */
    fallback?: string;
}

const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

/**
 * Escapes the five HTML-significant characters to prevent markup/script
 * injection when interpolating untrusted values into HTML.
 */
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

/**
 * Replaces `$>key<$` placeholders in an HTML template with values from `info`.
 *
 * By default every injected value is **HTML-escaped** to prevent XSS, since the
 * result is typically assigned to a Google Maps `InfoWindow` `content` (raw
 * HTML). Set `allowHtml: true` only when the values are fully trusted.
 *
 * @param info - Object providing values keyed by placeholder name.
 * @param htmlCode - HTML template containing `$>key<$` placeholders.
 * @param options - Escaping/fallback behavior. See {@link InjectAttributesOptions}.
 * @returns The template with placeholders resolved.
 *
 * @example
 * ```ts
 * injectAttributes(
 *   { lat: 0, lng: 0, name: '<b>John</b>' },
 *   '<p>$>name<$</p>'
 * );
 * // '<p>&lt;b&gt;John&lt;/b&gt;</p>'  (escaped by default)
 * ```
 *
 * @public
 */
export const injectAttributes = (info: IContentInfoWindow, htmlCode: string, options: InjectAttributesOptions = {}): string => {
    const { allowHtml = false, fallback = '' } = options;

    return htmlCode.replace(/\$>(.*?)<\$/g, (_, rawKey: string) => {
        const key = rawKey.trim();
        const value = info[key];
        if (value === undefined || value === null) return fallback;
        const stringValue = String(value);
        return allowHtml ? stringValue : escapeHtml(stringValue);
    });
};

export default injectAttributes;
