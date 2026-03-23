# Architecture Notes

## Core idea

Keep the project split into two systems:

- local processing pipeline on the MacBook for face detection and clustering
- static-friendly web app for browsing approved event data

## Data flow

1. Raw photos live in the local gallery folder.
2. The Python pipeline scans those photos and writes generated metadata.
3. A reviewer assigns names and cleans up clusters.
4. The web app reads approved JSON files to render pages.

## Shared data files

- `data/photos.json`: photo-level metadata
- `data/timeline.json`: section definitions and photo membership
- `data/review/clusters.json`: raw candidate clusters for review
- `data/people.json`: approved named people with linked photos

## Hosting shape

- Cloudflare Pages for the frontend
- Cloudflare R2 for image storage
- optional Worker for protected downloads or zip generation

