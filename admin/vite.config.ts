import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isVercel = Boolean(process.env.VERCEL);

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },

  // Use Vercel's Nitro preset when building on Vercel.
  nitro: isVercel ? { preset: "vercel" } : true,
});