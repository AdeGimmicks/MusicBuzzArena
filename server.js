const http = require("http");
const fs = require("fs/promises");
const path = require("path");
let MongoClient;

try {
  ({ MongoClient } = require("mongodb"));
} catch {
  MongoClient = null;
}

const PORT = Number(process.env.PORT || 8010);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(ROOT, "uploads"));
const DB_FILE = path.join(DATA_DIR, "musicbusiness-arena.json");
const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "musicbusinessarena";
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || "siteStore";
const STORE_DOCUMENT_ID = "musicbusiness-arena";

let mongoClient;
let storeCollection;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
};

function defaultStore() {
  return {
    site: {
      logo: "Mba Logos/MusicBusiness Logo.png",
      title: "MusicBusiness Arena",
      tagline: "Where Artists Connect. Fans Support. Music Thrives.",
      intro:
        "A music commerce platform where independent artists upload songs, connect streaming links, and receive support directly from fans.",
      primaryCta: "Open Artist Dashboard",
      secondaryCta: "Browse Releases",
      featuredArtistId: "",
      commissionRate: 15,
    },
    artists: [],
    releases: [],
    donations: [],
    transactions: [],
  };
}

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(path.join(UPLOAD_DIR, "images"), { recursive: true });
  await fs.mkdir(path.join(UPLOAD_DIR, "audio"), { recursive: true });
}

async function connectMongo() {
  if (!MONGODB_URI) return null;
  if (storeCollection) return storeCollection;
  if (!MongoClient) {
    throw new Error("MongoDB is configured, but the mongodb package is not installed. Run npm install.");
  }

  mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  storeCollection = mongoClient.db(MONGODB_DB_NAME).collection(MONGODB_COLLECTION);
  await storeCollection.createIndex({ _id: 1 });
  return storeCollection;
}

function mergeStore(store) {
  return {
    ...defaultStore(),
    ...(store || {}),
    site: { ...defaultStore().site, ...(store?.site || {}) },
    artists: Array.isArray(store?.artists) ? store.artists : [],
    releases: Array.isArray(store?.releases) ? store.releases : [],
    donations: Array.isArray(store?.donations) ? store.donations : [],
    transactions: Array.isArray(store?.transactions) ? store.transactions : [],
  };
}

async function readStore() {
  await ensureStorage();

  const collection = await connectMongo();
  if (collection) {
    const document = await collection.findOne({ _id: STORE_DOCUMENT_ID });
    return mergeStore(document?.store);
  }

  try {
    const content = await fs.readFile(DB_FILE, "utf8");
    return mergeStore(JSON.parse(content));
  } catch {
    return defaultStore();
  }
}

async function writeStore(store) {
  await ensureStorage();
  const normalized = mergeStore(store);
  const collection = await connectMongo();
  if (collection) {
    await collection.updateOne(
      { _id: STORE_DOCUMENT_ID },
      {
        $set: {
          store: normalized,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    return;
  }

  await fs.writeFile(DB_FILE, JSON.stringify(normalized, null, 2));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 700 * 1024 * 1024) {
        reject(new Error("Upload is too large for this local prototype."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function slugify(value) {
  return String(value || "musicbusiness")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function extensionForMime(mimeType, fallback = ".bin") {
  return (
    {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/svg+xml": ".svg",
      "audio/mpeg": ".mp3",
      "audio/mp3": ".mp3",
      "audio/wav": ".wav",
      "audio/x-wav": ".wav",
      "audio/mp4": ".m4a",
      "audio/aac": ".aac",
      "audio/ogg": ".ogg",
    }[mimeType] || fallback
  );
}

async function saveDataUrl(dataUrl, folder, preferredName) {
  if (!dataUrl || !String(dataUrl).startsWith("data:")) return dataUrl || "";

  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return "";

  const mimeType = match[1];
  const extension = extensionForMime(mimeType, path.extname(preferredName));
  const baseName = slugify(path.basename(preferredName || "upload", path.extname(preferredName || "")));
  const filename = `${Date.now()}-${baseName}${extension}`;
  const relativeFile = path.join("uploads", folder, filename).replace(/\\/g, "/");
  const absoluteFile = path.join(UPLOAD_DIR, folder, filename);

  await fs.mkdir(path.dirname(absoluteFile), { recursive: true });
  await fs.writeFile(absoluteFile, Buffer.from(match[2], "base64"));

  return relativeFile;
}

async function normalizeUploads(store) {
  const normalized = {
    site: { ...defaultStore().site, ...(store.site || {}) },
    artists: Array.isArray(store.artists) ? store.artists.map((artist) => ({ ...artist })) : [],
    releases: Array.isArray(store.releases) ? store.releases.map((release) => ({ ...release })) : [],
    donations: Array.isArray(store.donations) ? store.donations : [],
    transactions: Array.isArray(store.transactions) ? store.transactions : [],
  };

  normalized.site.logo = await saveDataUrl(normalized.site.logo, "images", "musicbusiness-logo.png");

  for (const artist of normalized.artists) {
    artist.photo = await saveDataUrl(artist.photo, "images", `${artist.name || "artist"}-photo.jpg`);
    artist.banner = await saveDataUrl(artist.banner, "images", `${artist.name || "artist"}-banner.jpg`);
  }

  for (const release of normalized.releases) {
    release.cover = await saveDataUrl(release.cover, "images", `${release.title || "release"}-cover.jpg`);
    release.audioUrl = await saveDataUrl(
      release.audioData || release.audioUrl,
      "audio",
      release.audioName || `${release.title || "song"}.mp3`
    );
    release.audioData = "";
  }

  return normalized;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function isPathInsideRoot(filePath) {
  const relative = path.relative(ROOT, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isPathInsideUploadRoot(filePath) {
  const relative = path.relative(UPLOAD_DIR, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = pathname.startsWith("/uploads/")
    ? path.join(UPLOAD_DIR, pathname.replace(/^\/uploads\//, ""))
    : path.join(ROOT, pathname);

  const isAllowedPath = pathname.startsWith("/uploads/") ? isPathInsideUploadRoot(filePath) : isPathInsideRoot(filePath);
  if (!isAllowedPath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Origin": "*",
      });
      response.end();
      return;
    }

    if (url.pathname === "/api/store" && request.method === "GET") {
      sendJson(response, 200, await readStore());
      return;
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      sendJson(response, 200, {
        ok: true,
        storage: MONGODB_URI ? "mongodb" : "file",
        service: "MusicBusiness Arena",
      });
      return;
    }

    if (url.pathname === "/api/store" && request.method === "POST") {
      const body = await readRequestBody(request);
      const store = await normalizeUploads(JSON.parse(body));
      await writeStore(store);
      sendJson(response, 200, store);
      return;
    }

    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Local server error" });
  }
}

ensureStorage().then(() => {
  http.createServer(handleRequest).listen(PORT, HOST, () => {
    console.log(`MusicBusiness Arena running at http://${HOST}:${PORT}`);
  });
});

process.on("SIGINT", async () => {
  await mongoClient?.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await mongoClient?.close();
  process.exit(0);
});
