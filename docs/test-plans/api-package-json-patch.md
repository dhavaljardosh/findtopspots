# api/package.json — scripts patch note

The current `api/package.json` uses `"test": "bun test"` which runs Bun's
built-in test runner. Switching to Vitest requires the following script changes.

## Required change

In `/Users/dhavaljardosh/Documents/findtopspots/api/package.json`, replace the
existing `"test"` script and add two new scripts under `"scripts"`:

```diff
   "scripts": {
     "dev": "bun --hot src/index.ts",
     "build": "bun build src/index.ts --outdir dist --target bun",
     "start": "bun dist/index.js",
     "typecheck": "tsc --noEmit",
-    "test": "bun test",
+    "test": "vitest run",
+    "test:watch": "vitest",
+    "test:coverage": "vitest run --coverage",
     "db:generate": "drizzle-kit generate",
     "db:migrate": "drizzle-kit migrate",
     "db:studio": "drizzle-kit studio"
   },
```

## Required devDependencies to add

```diff
   "devDependencies": {
     "drizzle-kit": "^0.30.4",
     "typescript": "^5.7.2",
-    "@types/bun": "^1.1.14"
+    "@types/bun": "^1.1.14",
+    "vitest": "^2.0.0",
+    "@vitest/coverage-v8": "^2.0.0"
   }
```

After applying, run `pnpm install` from the monorepo root to install the new packages.
