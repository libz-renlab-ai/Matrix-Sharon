import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  server: { port: 4322, host: "127.0.0.1" },
  vite: {
    server: {
      proxy: {
        "/v1": "http://127.0.0.1:4321",
        "/login": "http://127.0.0.1:4321",
        "/auth": "http://127.0.0.1:4321",
        "/dev-login": "http://127.0.0.1:4321",
      },
    },
  },
});
