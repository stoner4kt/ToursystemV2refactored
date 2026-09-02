---
name: Flat Next.js imports
description: Migration guidance for Vercel exports that use app/components/lib at the repository root instead of a src client directory.
---

Flat Next.js exports may not be detected by the workspace migration helper because it expects a client directory containing src or a root src entry point.

**Why:** The helper's automatic detector can report no client directory even when a complete Next.js app is present at the repository root.

**How to apply:** Preserve the source tree, stage the root app/components/hooks/lib directories into a temporary src layout for the copy helper, then remove the staging directory before converting the Next-only entry points.