# MusicBusiness Arena

MusicBusiness Arena is an independent music platform where artists can upload releases, connect streaming links, share videos, receive fan support, and guide listeners to download or donate.

This project is packaged for GitHub and Render deployment under the folder/repo name `MusicBuzzArena`.

## Features

- Public homepage with latest music releases
- Artist profile page
- Song listing page with streaming, download, and donation actions
- Artist video page with YouTube video and shorts sections
- Artist upload dashboard
- Store manager/admin prototype
- Local upload storage for development
- MongoDB Atlas support for production site data
- Render persistent disk support for uploaded media

## Run Locally

```bash
npm install
npm start
```

Open:

```text
http://localhost:8010
```

## Production

This project includes:

- `render.yaml` for Render hosting
- `.env.example` for environment variables
- `scripts/verify-build.js` for production build verification
- MongoDB Atlas support through `MONGODB_URI`
- Custom domain setup for `musicbusinessarena.com`

See `DEPLOYMENT.md` for full deployment steps.

## Environment Variables

```text
NODE_ENV=production
HOST=0.0.0.0
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB_NAME=musicbusinessarena
MONGODB_COLLECTION=siteStore
UPLOAD_DIR=/var/data/uploads
PUBLIC_SITE_URL=https://musicbusinessarena.com
```
