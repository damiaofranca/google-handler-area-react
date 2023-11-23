interface IContentInfoWindow {
    lat: number;
    lng: number;
    [key: string]: any;
}

/**
 * Replaces placeholders in the HTML code with corresponding values provided in `info`.
 *
 * @param {IContentInfoWindow} info - An object containing information to be injected into the HTML.
 * @param {string} htmlCode - The HTML code with placeholders in the format '$>placeholder<$' to be replaced.
 * @returns {string} - The modified HTML code with injected values.
 *
 * @example
 * const info = { name: 'John', age: 25, city: 'New York' };
 * const htmlCode = '<p>$>name<$ is $>age<$ years old and lives in $>city<$.</p>';
 * const modifiedHtml = injectAttributes(info, htmlCode);
 * // Result: '<p>John is 25 years old and lives in New York.</p>'
 */

const injectAttributes = (info: IContentInfoWindow, htmlCode: string) => {
    return htmlCode.replace(/\$>(.*?)<\$/g, (_, match) => info[match.trim()]);
};

export default injectAttributes;
