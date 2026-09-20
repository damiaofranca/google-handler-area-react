import { resolve } from 'path';
import { defineConfig } from 'vite';

// Everything that must stay external so the bundle is minimal and does not
// duplicate the consumer's copy of React or the Google Maps packages.
const external = ['react', 'react-dom', 'react/jsx-runtime', '@googlemaps/js-api-loader', '@googlemaps/react-wrapper', '@googlemaps/markerclusterer'];

export default defineConfig({
    build: {
        sourcemap: true,
        lib: {
            entry: resolve(__dirname, 'src/index.tsx'),
            name: 'GoogleHandlerAreaReact',
            formats: ['es', 'umd'],
            fileName: (format) => (format === 'es' ? 'index.mjs' : 'index.umd.js')
        },
        rollupOptions: {
            external,
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    'react/jsx-runtime': 'jsxRuntime',
                    '@googlemaps/js-api-loader': 'googlemapsApiLoader',
                    '@googlemaps/react-wrapper': 'googlemapsReactWrapper'
                }
            }
        }
    }
});
