# MusicBusiness Arena Deployment Guide

This project is ready to push to GitHub and host on Render with MongoDB Atlas as the database.

## Project Name

Use `MusicBuzzArena` as the GitHub folder/repository name if you want a shorter project name.
The public website brand remains `MusicBusiness Arena`.

## Local Development

Install dependencies:

```bash
npm install
```

Run the website:

```bash
npm start
```

Open:

```text
http://localhost:8010
```

Use the localhost address when uploading files. Opening the HTML files directly with `file://` cannot save uploads correctly.

## Environment Variables

Create `.env` locally from `.env.example` if needed. On Render, add these values in the dashboard or through `render.yaml`.

```text
NODE_ENV=production
HOST=0.0.0.0
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=musicbusinessarena
MONGODB_COLLECTION=siteStore
UPLOAD_DIR=/var/data/uploads
PUBLIC_SITE_URL=https://musicbusinessarena.com
STRIPE_SECRET_KEY=sk_live_your_private_key
STRIPE_DEFAULT_CURRENCY=usd
PLATFORM_FEE_PERCENT=10
```

Do not commit `.env` to GitHub. Stripe keys must be added only in Render environment variables, never inside the source code.

## MongoDB Atlas

1. Create a MongoDB Atlas account.
2. Create a free or paid cluster.
3. Create a database user and password.
4. Add network access for Render. During first setup, you can allow `0.0.0.0/0`, then tighten it later.
5. Copy the Node.js connection string.
6. Put that connection string into Render as `MONGODB_URI`.

The website stores the main site data in MongoDB. Uploaded images and audio files are stored on the Render persistent disk at `/var/data/uploads`.

## Render Deployment

This repo includes `render.yaml`, so Render can create the web service from the GitHub repo.

Render settings:

```text
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
Health Check Path: /api/health
```

The Render service also includes:

```text
Custom Domains:
musicbusinessarena.com
www.musicbusinessarena.com

Persistent Disk:
/var/data
```

The persistent disk keeps uploaded cover artwork, artist photos, and audio files from disappearing after redeploys.

## Stripe Checkout

MusicBusiness Arena uses Stripe Checkout for paid downloads and support. The website code does not store Stripe keys. Add `STRIPE_SECRET_KEY` privately in Render, then redeploy.

Recommended Render values:

```text
PUBLIC_SITE_URL=https://musicbusinessarena.com
STRIPE_DEFAULT_CURRENCY=usd
PLATFORM_FEE_PERCENT=10
```

Stripe can show cards, Apple Pay, Google Pay, and supported international payment methods depending on your Stripe account settings, domain verification, visitor device, and country. Artist payouts through Stripe Connect require storing each artist's connected account ID before automatic split payouts can be enabled.

## Custom Domain

In Render:

1. Open the MusicBusiness Arena web service.
2. Go to `Settings` then `Custom Domains`.
3. Add `musicbusinessarena.com`.
4. Add `www.musicbusinessarena.com`.
5. Render will show the exact DNS records to add.

At your domain registrar, add the DNS records Render gives you. Usually this means:

```text
Root domain: A, ALIAS, or ANAME record provided by Render
www: CNAME record provided by Render
```

Use Render's exact values because DNS targets can change by service.

## GitHub Deployment Steps

From the project folder:

```bash
git init
git add .
git commit -m "Prepare MusicBusiness Arena for Render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/MusicBuzzArena.git
git push -u origin main
```

Then connect that GitHub repo to Render.

## Important Production Notes

The current website is ready for Render hosting, MongoDB storage, and persistent uploads. Before accepting public artists and payments, the next production pieces should be added:

- Artist login and private dashboard access
- Store manager/admin login
- Stripe Connect onboarding for each artist payout account
- Fulfillment after successful checkout, so paid downloads unlock only after Stripe confirms payment
- Stronger file validation for uploads
- Cloud storage such as S3, Cloudinary, or Backblaze when the platform grows

For now, MongoDB Atlas plus Render persistent disk is enough for your first version and your own music uploads.
