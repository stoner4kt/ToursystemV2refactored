---
name: Cloudinary viewing architecture
description: Cloudinary URL handling rules for this fleet portal's existing upload model.
---

Public Cloudinary assets use `/upload/` delivery URLs and must be opened directly. Only assets explicitly stored with `/authenticated/` delivery should go through the Supabase signing function; ordinary signed delivery URLs do not provide expiration by themselves.

**Why:** Existing images and documents were uploaded through the public delivery path, while the old viewer converted every asset to an authenticated URL and added an invalid expiration parameter.

**How to apply:** Keep upload behavior unchanged. At the shared viewing helper, preserve public and non-Cloudinary URLs exactly, infer resource type from Cloudinary URLs, and sign only authenticated assets. Keep attachment behavior opt-in.