import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
    build: {

        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "google-handler-area-react",
            fileName: "index",
        },
        rollupOptions: {
            external: ["react", "react-dom"],
            output: {
                globals: { react: "React" }
            }
        },
    },
});