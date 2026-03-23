# 60thface

Private event photo album with:

- timeline-based browsing
- face clustering plus human review
- per-person galleries
- Cloudflare-friendly web frontend

## Project structure

- `apps/web`: guest-facing gallery app
- `pipeline`: local face detection, clustering, and review exports
- `data`: shared metadata consumed by the app and produced by the pipeline
- `docs`: product and architecture notes

## First milestone

The first milestone is the human-in-the-loop face review flow:

1. Scan photos from the local gallery folder.
2. Detect faces and generate embeddings.
3. Cluster candidate identities.
4. Review, name, merge, or reject clusters.
5. Export approved people data for the site.

## Local gallery source

The raw photos currently live outside the repo at:

`/Users/toni/galleryface/Gallery`

The pipeline reads from that folder via environment variable so the repo stays lightweight.

## Next steps

- install web app dependencies
- install Python face-processing dependencies
- run an initial clustering pass
- build the admin review UI

## Current status

- photo inventory is working against the local gallery source
- real face detection and clustering logic is implemented in the pipeline
- cluster approval can write named people into shared app data
- admin review UI is the next major feature
