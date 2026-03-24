# Cloudflare R2 Setup

Use a public bucket or public custom domain for guest-facing image reads.

## 1. Public image base URL

Set the web app env var to the public object base URL:

```bash
NEXT_PUBLIC_PHOTO_BASE_URL=https://pub-your-public-bucket-id.r2.dev
```

Important:

- Do not use the S3 endpoint for browser image reads.
- `https://<account-id>.r2.cloudflarestorage.com` is for S3-compatible uploads.
- For the site, use either:
  - the bucket's public `r2.dev` URL
  - or a custom domain pointed at the bucket

## 2. Local development

Inside `/Users/toni/galleryface/60thface/apps/web`, create `.env.local`:

```bash
NEXT_PUBLIC_PHOTO_BASE_URL=https://pub-your-public-bucket-id.r2.dev
```

If this var is missing, the app falls back to local disk images through `/api/local-image`.

## 3. Vercel

In Vercel project settings, add:

- `NEXT_PUBLIC_PHOTO_BASE_URL`

Then redeploy.

## 4. Uploading images to R2

You still need S3-compatible R2 credentials for upload:

- Account ID
- Access Key ID
- Secret Access Key

Example sync with AWS CLI after those are created:

```bash
aws s3 sync /Users/toni/galleryface/Gallery s3://60thface-photos \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

Files should keep their original filenames, because the site maps images by filename.
