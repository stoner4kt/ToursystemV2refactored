---
name: Cloudinary viewing architecture
description: Cloudinary URL handling rules for this fleet portal's existing upload model.
---

Public Cloudinary assets use `/upload/` delivery URLs and must be opened directly. Assets stored with `/authenticated/` delivery must go through the Supabase signing function. For foldered public IDs, match the Cloudinary SDK's version segment (`v1` when no source version is available, or preserve the uploaded version); the version is not part of the SHA-1 signature input. Ordinary signed delivery URLs do not provide expiration by themselves.

**Why:** The upload preset can explicitly enforce authenticated delivery, and Cloudinary rejects the raw authenticated URL with 401. Cloudinary's SDK also inserts a version segment for foldered IDs, so omitting it can produce a rejected delivery URL.

**How to apply:** Keep upload behavior unchanged. At the shared viewing helper, preserve public and non-Cloudinary URLs exactly, infer resource type and source version from Cloudinary URLs, and sign only authenticated assets. Keep attachment behavior opt-in. The signing function should validate an optional version and use `v1` for foldered IDs without one.