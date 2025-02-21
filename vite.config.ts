import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 7850,
    allowedHosts: ["ke3940hm6fbel3j4mo4ka301.projectanka.com"]
  }
});
