const http = require("http");
const fs = require("fs/promises");
const path = require("path");
let MongoClient;
let Stripe;

try {
  ({ MongoClient } = require("mongodb"));
} catch {
  MongoClient = null;
}

try {
  Stripe = require("stripe");
} catch {
  Stripe = null;
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
const STRIPE_SECRET_KEY = String(process.env.STRIPE_SECRET_KEY || process.env["Stripe Secret key"] || "").trim();
const STRIPE_DEFAULT_CURRENCY = (process.env.STRIPE_DEFAULT_CURRENCY || "usd").toLowerCase();
const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 10);

let mongoClient;
let storeCollection;
let cachedStore = null;
const stripe = STRIPE_SECRET_KEY && Stripe ? Stripe(STRIPE_SECRET_KEY) : null;
const hasValidStripeSecretKey = /^sk_(test|live)_/.test(STRIPE_SECRET_KEY);

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
      intro: "Discover releases from independent artists.",
      primaryCta: "Browse Music",
      secondaryCta: "Upload",
      featuredArtistId: "artist-focuzman",
      commissionRate: 10,
      videos: {
        mainVideoUrl: "https://www.youtube.com/watch?v=5-YcPo7bsqs",
        mainVideoTitle: "Focuzman Video",
        shortVideoUrl: "https://www.youtube.com/shorts/07x9uu4EQiA",
        tiktokUrl: "",
        moreVideosUrl: "https://www.youtube.com/@Focuzman/videos",
        moreShortsUrl: "https://www.youtube.com/@Focuzman/shorts",
      },
    },
    artists: [
      {
        id: "artist-focuzman",
        name: "Focuzman",
        handle: "@focuzman",
        bio:
          "Focuzman is an African-born, Chicago-based artist creating music inspired by gratitude, hope, and real-life experiences.",
        photo: "assets/sample/images/too-late-to-quit-cover.png",
        banner: "assets/sample/images/let-the-hustle-pay-cover.jpg",
        socials: {
          instagram: "https://www.instagram.com/focuzman/",
          facebook: "https://www.facebook.com/Focuzmanmusic",
          x: "https://x.com/RealFocuzman",
          youtube: "https://www.youtube.com/@Focuzman",
          tiktok: "https://www.tiktok.com/@focuzmanmusic",
          website: "https://musicbusinessarena.com",
        },
        status: "approved",
        followers: 405,
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ],
    releases: [
      {
        id: "release-let-the-hustle-pay",
        artistId: "artist-focuzman",
        artistName: "Focuzman",
        title: "Let The Hustle Pay",
        releaseType: "Single",
        genre: "Afrobeats",
        secondaryGenre: "Afropop",
        mood: ["Motivation", "Happy"],
        songBio:
          "A motivational afrobeat release about staying focused, working hard, and trusting the reward of honest effort.",
        releaseDate: "2025-10-22",
        producer: "crespinbeat",
        country: "United States",
        cityState: "Chicago, Illinois",
        location: "Chicago, Illinois, United States",
        price: 0.99,
        donationAmount: 5,
        donationLink: "",
        cover: "assets/sample/images/let-the-hustle-pay-cover.jpg",
        audioUrl: "assets/sample/audio/let-the-hustle-pay.mp3",
        audioName: "let-the-hustle-pay.mp3",
        streaming: {
          youtubeMusic: "https://music.youtube.com/@Focuzman",
          spotify: "https://open.spotify.com/artist/3VG7dgwn6IYHZWl2tkTkrD",
          audiomack: "https://audiomack.com/focuzman/song/let-the-hustle-pay",
          soundcloud: "https://soundcloud.com/user-768411131",
        },
        downloads: 6,
        earnings: 0,
        donations: 0,
        status: "approved",
        createdAt: "2026-06-08T10:00:00.000Z",
      },
      {
        id: "release-i-love-music",
        artistId: "artist-focuzman",
        artistName: "Focuzman",
        title: "I Love music",
        releaseType: "Single",
        genre: "Hip-Hop/Rap",
        secondaryGenre: "Pop",
        mood: ["Energy", "Creative"],
        songBio: "A freestyle release celebrating the love of music and creative expression.",
        releaseDate: "2026-06-08",
        producer: "",
        country: "United States",
        cityState: "Chicago, Illinois",
        location: "Chicago, Illinois, United States",
        price: 0.99,
        donationAmount: 5,
        donationLink: "",
        cover: "assets/sample/images/i-love-music-cover.png",
        audioUrl: "assets/sample/audio/i-love-music.mp3",
        audioName: "i-love-music.mp3",
        streaming: {},
        downloads: 0,
        earnings: 0,
        donations: 0,
        status: "approved",
        createdAt: "2026-06-08T09:00:00.000Z",
      },
      {
        id: "release-too-late-to-quit",
        artistId: "artist-focuzman",
        artistName: "Focuzman",
        title: "Too Late to Quit",
        releaseType: "Single",
        genre: "Electronic",
        secondaryGenre: "Pop",
        mood: ["Motivation", "Hope"],
        songBio: "A hopeful motivational song about refusing to quit when the vision is still alive.",
        releaseDate: "2026-04-11",
        producer: "",
        country: "United States",
        cityState: "Chicago IL",
        location: "Chicago IL, United States",
        price: 0.99,
        donationAmount: 5,
        donationLink: "",
        cover: "assets/sample/images/too-late-to-quit-cover.png",
        audioUrl: "assets/sample/audio/too-late-to-quit.mp3",
        audioName: "too-late-to-quit.mp3",
        streaming: {
          youtubeMusic: "https://music.youtube.com/@Focuzman",
        },
        downloads: 6,
        earnings: 0,
        donations: 0,
        status: "approved",
        createdAt: "2026-06-08T08:00:00.000Z",
      },
      {
        id: "release-easy",
        artistId: "artist-focuzman",
        artistName: "Focuzman",
        title: "Easy",
        releaseType: "Single",
        genre: "Afrobeats",
        secondaryGenre: "Afropop",
        mood: ["Inspirational", "Focus"],
        songBio: "An Afrobeats release built around focus, confidence, and steady movement.",
        releaseDate: "2026-02-03",
        producer: "",
        country: "United States",
        cityState: "Chicago, Illinois",
        location: "Chicago, Illinois, United States",
        price: 0.99,
        donationAmount: 5,
        donationLink: "",
        cover: "assets/sample/images/easy-cover.jpg",
        audioUrl: "assets/sample/audio/easy.m4a",
        audioName: "easy.m4a",
        streaming: {},
        downloads: 0,
        earnings: 0,
        donations: 0,
        status: "approved",
        createdAt: "2026-06-08T07:00:00.000Z",
      },
    ],
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
  if (cachedStore) return cachedStore;

  const collection = await connectMongo();
  if (collection) {
    const document = await collection.findOne({ _id: STORE_DOCUMENT_ID });
    const store = mergeStore(document?.store);
    if (!store.artists.length && !store.releases.length) {
      const seededStore = defaultStore();
      await collection.updateOne(
        { _id: STORE_DOCUMENT_ID },
        {
          $set: {
            store: seededStore,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
      cachedStore = mergeStore(seededStore);
      return cachedStore;
    }
    cachedStore = store;
    return store;
  }

  try {
    const content = await fs.readFile(DB_FILE, "utf8");
    cachedStore = mergeStore(JSON.parse(content));
    return cachedStore;
  } catch {
    cachedStore = defaultStore();
    return cachedStore;
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
    cachedStore = normalized;
    return;
  }

  await fs.writeFile(DB_FILE, JSON.stringify(normalized, null, 2));
  cachedStore = normalized;
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

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

function requestOrigin(request) {
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL.replace(/\/$/, "");
  const proto = request.headers["x-forwarded-proto"] || "http";
  const host = request.headers["x-forwarded-host"] || request.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function normalizedCurrency(value) {
  const currency = String(value || STRIPE_DEFAULT_CURRENCY || "usd")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 3);
  return currency || "usd";
}

function toMinorUnits(amount, currency) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? Math.round(value) : Math.round(value * 100);
}

function cleanCheckoutAmount(value, fallback, minimum) {
  const amount = Number(value || fallback || 0);
  if (!Number.isFinite(amount)) return minimum;
  return Math.max(amount, minimum);
}

function checkoutImageUrl(origin, imagePath) {
  if (!imagePath) return "";
  if (/^https:\/\//i.test(imagePath)) return imagePath;
  if (/^http:\/\//i.test(imagePath)) return "";
  return `${origin}/${String(imagePath).replace(/^\/+/, "")}`;
}

async function createCheckoutSession(request, response) {
  if (!stripe) {
    sendJson(response, 503, {
      error: "Stripe is not configured. Add STRIPE_SECRET_KEY in Render environment variables.",
    });
    return;
  }

  if (!hasValidStripeSecretKey) {
    sendJson(response, 503, {
      error: "Render STRIPE_SECRET_KEY must be the Stripe secret key that starts with sk_live_ or sk_test_. Do not use a publishable, restricted, mobile, or webhook key.",
    });
    return;
  }

  const bodyText = await readRequestBody(request);
  const body = bodyText ? JSON.parse(bodyText) : {};
  const store = await readStore();
  const release = (store.releases || []).find((item) => item.id === body.releaseId && item.status === "approved");

  if (!release) {
    sendJson(response, 404, { error: "Release not found." });
    return;
  }

  const artist = (store.artists || []).find((item) => item.id === release.artistId) || {};
  const checkoutType = "download";
  const artistLabel = artist.name || release.artistName || "Independent Artist";
  const currency = normalizedCurrency(body.currency || release.currency);
  const fallbackAmount = Number(release.price || 0.99);
  const amountMajor = cleanCheckoutAmount(body.amount, fallbackAmount, 0.5);
  const unitAmount = toMinorUnits(amountMajor, currency);

  if (!unitAmount) {
    sendJson(response, 400, { error: "A valid payment amount is required." });
    return;
  }

  const origin = requestOrigin(request);
  const platformFeePercent = Number.isFinite(PLATFORM_FEE_PERCENT)
    ? PLATFORM_FEE_PERCENT
    : Number(store.site?.commissionRate || 10);
  const connectedAccountId = artist.stripeAccountId || release.stripeAccountId || "";
  const productName = `Download ${release.title || "song"} by ${artistLabel}`;
  const metadata = {
    checkoutType,
    releaseId: release.id,
    artistId: release.artistId || "",
    artistName: artistLabel,
    releaseTitle: release.title || "",
    platformFeePercent: String(platformFeePercent),
  };
  const productData = {
    name: productName,
    description: `Paid music download on MusicBusiness Arena.`,
  };
  const imageUrl = checkoutImageUrl(origin, release.cover);
  if (imageUrl) productData.images = [imageUrl];

  const sessionParams = {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: productData,
        },
      },
    ],
    metadata,
    payment_intent_data: { metadata },
    success_url: `${origin}/listen?release=${encodeURIComponent(release.id)}&checkout=success&type=${checkoutType}#download`,
    cancel_url: `${origin}/listen?release=${encodeURIComponent(release.id)}&checkout=cancelled#download`,
  };

  if (connectedAccountId && checkoutType === "download") {
    sessionParams.payment_intent_data.application_fee_amount = Math.round(unitAmount * (platformFeePercent / 100));
    sessionParams.payment_intent_data.transfer_data = { destination: connectedAccountId };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  sendJson(response, 200, { url: session.url });
}

function isPathInsideRoot(filePath) {
  const relative = path.relative(ROOT, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isPathInsideUploadRoot(filePath) {
  const relative = path.relative(UPLOAD_DIR, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

const CLEAN_ROUTES = {
  "/home": "/index.html",
  "/music": "/artist-page.html",
  "/listen": "/artist-page-2.html",
  "/video": "/videos.html",
  "/upload": "/artist-dashboard.html",
  "/store-manager": "/store-manager.html",
};

const LEGACY_REDIRECTS = Object.fromEntries(Object.entries(CLEAN_ROUTES).map(([clean, file]) => [file, clean]));

function redirect(response, location) {
  response.writeHead(301, { Location: location });
  response.end();
}

function cacheControlFor(ext, pathname) {
  if (ext === ".html") return "no-cache";
  if (pathname.startsWith("/uploads/") || pathname.startsWith("/assets/")) return "public, max-age=604800";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".mp3", ".wav", ".m4a", ".aac", ".ogg"].includes(ext)) {
    return "public, max-age=604800";
  }
  if ([".css", ".js"].includes(ext)) return "public, max-age=300";
  return "no-cache";
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = decodeURIComponent(url.pathname);

  if (requestedPath === "/") {
    redirect(response, "/home");
    return;
  }

  if (LEGACY_REDIRECTS[requestedPath]) {
    redirect(response, `${LEGACY_REDIRECTS[requestedPath]}${url.search}`);
    return;
  }

  const pathname = CLEAN_ROUTES[requestedPath] || requestedPath;
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
      "Cache-Control": cacheControlFor(ext, pathname),
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

    if (url.pathname === "/api/create-checkout-session" && request.method === "POST") {
      await createCheckoutSession(request, response);
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
