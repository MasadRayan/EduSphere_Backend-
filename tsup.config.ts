import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/vercel.ts"],
  format: ["cjs"],
  target: "node20",
  outDir: "dist",
  clean: true,
  bundle: true,
  splitting: false,
  sourcemap: true,
  shims: true,
  noExternal: ["http-status"],
});