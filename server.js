const http = require("http");
const crypto = require("crypto");
const fsSync = require("fs");
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
function envValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return String(value).trim();
  }
  return "";
}

const STRIPE_SECRET_KEY = envValue(
  "STRIPE_SECRET_KEY",
  "STRIPE_SECRET",
  "STRIPE_API_KEY",
  "Stripe Secret key",
  "Stripe Secret Key"
);
const STRIPE_DEFAULT_CURRENCY = (process.env.STRIPE_DEFAULT_CURRENCY || "usd").toLowerCase();
const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT || 10);
const STORE_MANAGER_PASSWORD = envValue("STORE_MANAGER_PASSWORD", "ADMIN_PASSWORD");
const STORE_MANAGER_PASSWORD_HASH = envValue("STORE_MANAGER_PASSWORD_HASH", "ADMIN_PASSWORD_HASH");
const RESEND_API_KEY = envValue("RESEND_API_KEY");
const ARTIST_EMAIL_FROM = envValue("ARTIST_EMAIL_FROM", "EMAIL_FROM") || "MusicBusiness Arena <noreply@musicbusinessarena.com>";
const OWNER_ARTIST_NAME = envValue("OWNER_ARTIST_NAME") || "Focuzman";
const OWNER_ARTIST_EMAIL = normalizeEmail(envValue("OWNER_ARTIST_EMAIL") || "focuzmanmusic@gmail.com");
const OWNER_ARTIST_INITIAL_PASSWORD = envValue("OWNER_ARTIST_INITIAL_PASSWORD") || "Focuzmanmbaacct@123";
const OWNER_MANAGER_EMAIL = normalizeEmail(envValue("OWNER_MANAGER_EMAIL", "STORE_MANAGER_EMAIL") || "kingsncrown@gmail.com");
const OWNER_MANAGER_INITIAL_PASSWORD = envValue("OWNER_MANAGER_INITIAL_PASSWORD", "STORE_MANAGER_INITIAL_PASSWORD") || "Mbamanagersacct@123";
const SESSION_COOKIE_NAME = "mba_store_manager";
const ARTIST_SESSION_COOKIE_NAME = "mba_artist_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const ARTIST_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const isProduction = process.env.NODE_ENV === "production";

let mongoClient;
let storeCollection;
let cachedStore = null;
let storeWriteQueue = Promise.resolve();
const adminSessions = new Map();
const artistSessions = new Map();
const stripe = STRIPE_SECRET_KEY && Stripe ? Stripe(STRIPE_SECRET_KEY) : null;
const hasValidStripeSecretKey = /^sk_(test|live)_/.test(STRIPE_SECRET_KEY);

const PROTECTED_ANALYTICS_FIELDS = new Set([
  "artistPageVisits",
  "clicks",
  "donations",
  "downloadPageVisits",
  "downloads",
  "earnings",
  "followers",
  "musicPageVisits",
  "plays",
  "profileViews",
  "revenue",
  "streamingClicks",
  "videoPageVisits",
  "views",
]);

const PROTECTED_ANALYTICS_OBJECTS = new Set(["platformClicks", "videoAnalytics"]);

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

const MEDIA_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".aac", ".ogg", ".mp4", ".webm"]);

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
        previewStart: 0,
        previewEnd: 60,
        previewDuration: 60,
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
        previewStart: 0,
        previewEnd: 60,
        previewDuration: 60,
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
        previewStart: 0,
        previewEnd: 60,
        previewDuration: 60,
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
        previewStart: 0,
        previewEnd: 60,
        previewDuration: 60,
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
    analyticsArchive: [],
    artistAccounts: [],
    storeManagerAccounts: [],
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
    analyticsArchive: Array.isArray(store?.analyticsArchive) ? store.analyticsArchive : [],
    artistAccounts: Array.isArray(store?.artistAccounts) ? store.artistAccounts : [],
    storeManagerAccounts: Array.isArray(store?.storeManagerAccounts) ? store.storeManagerAccounts : [],
  };
}

function cloneValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasSavedValue(value) {
  if (value === undefined || value === null) return false;
  return true;
}

function mergeSavedValue(existing, incoming, key = "", options = {}) {
  if (!hasSavedValue(incoming)) return cloneValue(existing);

  const protectAllNumbers = options.protectAllNumbers || PROTECTED_ANALYTICS_OBJECTS.has(key);
  if (typeof incoming === "number" && (protectAllNumbers || PROTECTED_ANALYTICS_FIELDS.has(key))) {
    if (options.allowAnalyticsReset) return incoming;
    return Math.max(Number(existing || 0), incoming);
  }

  if (key === "downloaded") return Boolean(existing) || Boolean(incoming);

  if (isPlainObject(incoming)) {
    const source = isPlainObject(existing) ? existing : {};
    const merged = { ...cloneValue(source) };
    Object.entries(incoming).forEach(([childKey, childValue]) => {
      merged[childKey] = mergeSavedValue(source[childKey], childValue, childKey, {
        ...options,
        protectAllNumbers,
      });
    });
    return merged;
  }

  if (Array.isArray(incoming)) return incoming.length ? cloneValue(incoming) : cloneValue(existing || []);
  return cloneValue(incoming);
}

function mergeEntityLists(existingList, incomingList, options = {}) {
  const deletedIds = new Set((options.deletedIds || []).map(String));
  const incomingById = new Map(
    (Array.isArray(incomingList) ? incomingList : [])
      .filter((item) => item?.id)
      .map((item) => [String(item.id), item])
  );
  const merged = [];

  (Array.isArray(existingList) ? existingList : []).forEach((existing) => {
    const id = String(existing?.id || "");
    if (!id || deletedIds.has(id)) return;
    const incoming = incomingById.get(id);
    merged.push(incoming ? mergeSavedValue(existing, incoming, "", options) : cloneValue(existing));
    incomingById.delete(id);
  });

  incomingById.forEach((incoming, id) => {
    if (!deletedIds.has(id)) merged.push(cloneValue(incoming));
  });
  return merged;
}

function applyExplicitClears(store, clears = []) {
  for (const clear of Array.isArray(clears) ? clears : []) {
    const collectionName = clear?.collection;
    const entityId = String(clear?.id || "");
    const fields = Array.isArray(clear?.fields) ? clear.fields : [];
    let entity = null;
    if (collectionName === "site") {
      entity = store.site;
    } else if (entityId && ["artists", "releases"].includes(collectionName)) {
      entity = (store[collectionName] || []).find((item) => String(item.id) === entityId);
    }
    if (!entity) continue;
    const clearValue = Object.prototype.hasOwnProperty.call(clear, "value")
      ? clear.value
      : "";
    fields.forEach((field) => {
      if (typeof field === "string" && /^[a-zA-Z0-9_]+$/.test(field)) {
        entity[field] = cloneValue(clearValue);
      }
    });
  }
}

function archivedAnalyticsRecord(entity, entityType) {
  const isArtist = entityType === "artist";
  const analytics = {};
  PROTECTED_ANALYTICS_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(entity, field)) {
      analytics[field] = Number(entity[field] || 0);
    }
  });
  PROTECTED_ANALYTICS_OBJECTS.forEach((field) => {
    if (isPlainObject(entity[field])) analytics[field] = cloneValue(entity[field]);
  });
  return {
    id: `${entityType}-analytics-${entity.id}`,
    entityType,
    artistId: isArtist ? entity.id : entity.artistId,
    releaseId: isArtist ? "" : entity.id,
    title: isArtist ? entity.name || "Artist" : entity.title || "Untitled song",
    price: Number(entity.price || 0),
    ...analytics,
    archivedAt: new Date().toISOString(),
  };
}

function archiveDeletedAnalytics(existing, deletedArtistIds, deletedReleaseIds) {
  const archive = cloneValue(existing.analyticsArchive || []);
  const saveRecord = (entity, entityType) => {
    const snapshot = archivedAnalyticsRecord(entity, entityType);
    const index = archive.findIndex((item) => item.id === snapshot.id);
    if (index >= 0) archive[index] = mergeSavedValue(archive[index], snapshot);
    else archive.push(snapshot);
  };

  (existing.artists || []).forEach((artist) => {
    if (deletedArtistIds.has(String(artist.id))) saveRecord(artist, "artist");
  });
  (existing.releases || []).forEach((release) => {
    if (deletedReleaseIds.has(String(release.id))) saveRecord(release, "release");
  });
  return archive;
}

function withoutClientAnalytics(store) {
  const sanitized = cloneValue(store || {});
  for (const collectionName of ["artists", "releases"]) {
    for (const entity of sanitized[collectionName] || []) {
      PROTECTED_ANALYTICS_FIELDS.forEach((field) => delete entity[field]);
      PROTECTED_ANALYTICS_OBJECTS.forEach((field) => delete entity[field]);
    }
  }
  sanitized.donations = [];
  sanitized.transactions = [];
  sanitized.analyticsArchive = [];
  return sanitized;
}

function withoutAnalyticsClears(clears) {
  return (Array.isArray(clears) ? clears : []).map((clear) => ({
    ...clear,
    fields: (Array.isArray(clear?.fields) ? clear.fields : []).filter(
      (field) => !PROTECTED_ANALYTICS_FIELDS.has(field) && !PROTECTED_ANALYTICS_OBJECTS.has(field)
    ),
  }));
}

function mergePersistentStore(existingStore, incomingStore, options = {}) {
  const existing = mergeStore(existingStore);
  const incoming = incomingStore && typeof incomingStore === "object" ? incomingStore : {};
  const deletions = options.deletions || {};
  const deletedArtistIds = new Set((deletions.artistIds || []).map(String));
  const deletedReleaseIds = new Set((deletions.releaseIds || []).map(String));

  for (const release of existing.releases || []) {
    if (deletedArtistIds.has(String(release.artistId || ""))) deletedReleaseIds.add(String(release.id || ""));
  }

  const analyticsArchive = options.archiveDeletedAnalytics
    ? archiveDeletedAnalytics(existing, deletedArtistIds, deletedReleaseIds)
    : options.allowAnalyticsReset && Array.isArray(incoming.analyticsArchive)
      ? cloneValue(incoming.analyticsArchive)
      : cloneValue(existing.analyticsArchive || []);

  const merged = {
    ...mergeSavedValue(existing, incoming, "", options),
    site: mergeSavedValue(existing.site, incoming.site || {}, "site", options),
    artists: mergeEntityLists(existing.artists, incoming.artists || [], {
      ...options,
      deletedIds: [...deletedArtistIds],
    }),
    releases: mergeEntityLists(existing.releases, incoming.releases || [], {
      ...options,
      deletedIds: [...deletedReleaseIds],
    }),
    donations: mergeEntityLists(existing.donations, incoming.donations || [], options),
    transactions: mergeEntityLists(existing.transactions, incoming.transactions || [], options),
    artistAccounts: mergeEntityLists(existing.artistAccounts, incoming.artistAccounts || [], options),
    storeManagerAccounts: mergeEntityLists(existing.storeManagerAccounts, incoming.storeManagerAccounts || [], options),
    analyticsArchive,
  };

  applyExplicitClears(merged, options.clears);
  return mergeStore(merged);
}

async function readStore() {
  await ensureStorage();
  if (cachedStore) return cloneValue(cachedStore);

  const collection = await connectMongo();
  if (collection) {
    const document = await collection.findOne({ _id: STORE_DOCUMENT_ID });
    const store = mergeStore(document?.store);
    if (!store.artists.length && !store.releases.length) {
      const seededStore = defaultStore();
      await bootstrapOwnerAccounts(seededStore);
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
      return cloneValue(cachedStore);
    }
    const beforeBootstrap = JSON.stringify(store.artistAccounts || []) + JSON.stringify(store.storeManagerAccounts || []);
    await bootstrapOwnerAccounts(store);
    const afterBootstrap = JSON.stringify(store.artistAccounts || []) + JSON.stringify(store.storeManagerAccounts || []);
    if (beforeBootstrap !== afterBootstrap) {
      await collection.updateOne(
        { _id: STORE_DOCUMENT_ID },
        {
          $set: {
            store,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
    cachedStore = store;
    return cloneValue(store);
  }

  try {
    const content = await fs.readFile(DB_FILE, "utf8");
    const store = mergeStore(JSON.parse(content));
    const beforeBootstrap = JSON.stringify(store.artistAccounts || []) + JSON.stringify(store.storeManagerAccounts || []);
    await bootstrapOwnerAccounts(store);
    const afterBootstrap = JSON.stringify(store.artistAccounts || []) + JSON.stringify(store.storeManagerAccounts || []);
    if (beforeBootstrap !== afterBootstrap) await fs.writeFile(DB_FILE, JSON.stringify(store, null, 2));
    cachedStore = store;
    return cloneValue(cachedStore);
  } catch {
    cachedStore = defaultStore();
    await bootstrapOwnerAccounts(cachedStore);
    await fs.writeFile(DB_FILE, JSON.stringify(cachedStore, null, 2));
    return cloneValue(cachedStore);
  }
}

async function persistStore(store) {
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
    cachedStore = cloneValue(normalized);
    return cloneValue(normalized);
  }

  await fs.writeFile(DB_FILE, JSON.stringify(normalized, null, 2));
  cachedStore = cloneValue(normalized);
  return cloneValue(normalized);
}

async function writeStore(store) {
  const snapshot = cloneValue(store);
  let saved;
  storeWriteQueue = storeWriteQueue.catch(() => {}).then(async () => {
    const existing = await readStore();
    saved = await persistStore(mergePersistentStore(existing, snapshot));
  });
  await storeWriteQueue;
  return cloneValue(saved);
}

async function mergeAndWriteStore(incomingStore, options = {}) {
  const incoming = cloneValue(incomingStore || {});
  let saved;
  storeWriteQueue = storeWriteQueue.catch(() => {}).then(async () => {
    const existing = await readStore();
    saved = await persistStore(mergePersistentStore(existing, incoming, options));
  });
  await storeWriteQueue;
  return cloneValue(saved);
}

async function mutateStore(mutator) {
  let result;
  storeWriteQueue = storeWriteQueue.catch(() => {}).then(async () => {
    const store = await readStore();
    result = await mutator(store);
    await persistStore(store);
  });
  await storeWriteQueue;
  return result;
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
  store = store && typeof store === "object" ? store : {};
  const normalized = {
    site: { ...(store.site || {}) },
    artists: Array.isArray(store.artists) ? store.artists.map((artist) => ({ ...artist })) : [],
    releases: Array.isArray(store.releases) ? store.releases.map((release) => ({ ...release })) : [],
    donations: Array.isArray(store.donations) ? store.donations : [],
    transactions: Array.isArray(store.transactions) ? store.transactions : [],
    analyticsArchive: Array.isArray(store.analyticsArchive) ? store.analyticsArchive : [],
    artistAccounts: Array.isArray(store.artistAccounts) ? store.artistAccounts : [],
    storeManagerAccounts: Array.isArray(store.storeManagerAccounts) ? store.storeManagerAccounts : [],
  };

  normalized.site.logo = await saveDataUrl(normalized.site.logo, "images", "musicbusiness-logo.png");

  for (const artist of normalized.artists) {
    artist.photo = await saveDataUrl(artist.photo, "images", `${artist.name || "artist"}-photo.jpg`);
    artist.banner = await saveDataUrl(artist.banner, "images", `${artist.name || "artist"}-banner.jpg`);
  }

  for (const release of normalized.releases) {
    release.cover = await saveDataUrl(release.cover, "images", `${release.title || "release"}-cover.jpg`);
    if (Array.isArray(release.tracks)) {
      release.tracks = await Promise.all(
        release.tracks.map(async (track, index) => {
          const nextTrack = { ...track, order: Number(track.order || index + 1) };
          nextTrack.audioUrl = await saveDataUrl(
            nextTrack.audioData || nextTrack.audioUrl,
            "audio",
            nextTrack.audioName || `${release.title || "track"}-${index + 1}.mp3`
          );
          nextTrack.audioData = "";
          return nextTrack;
        })
      );
    }
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

function validPlatformKey(value) {
  const key = String(value || "");
  return /^[a-zA-Z0-9_-]{1,64}$/.test(key) && !["__proto__", "constructor", "prototype"].includes(key);
}

async function recordStreamingClick(request, response) {
  const bodyText = await readRequestBody(request);
  const body = bodyText ? JSON.parse(bodyText) : {};
  const releaseId = String(body.releaseId || "");
  const platformKey = String(body.platformKey || "");

  if (!releaseId || !validPlatformKey(platformKey)) {
    sendJson(response, 400, { error: "A valid release and platform are required." });
    return;
  }

  const result = await mutateStore((store) => {
    const release = (store.releases || []).find((item) => item.id === releaseId);
    if (!release) return null;
    release.streamingClicks = Number(release.streamingClicks || 0) + 1;
    release.platformClicks = {
      ...(release.platformClicks || {}),
      [platformKey]: Number(release.platformClicks?.[platformKey] || 0) + 1,
    };
    return {
      streamingClicks: release.streamingClicks,
      platformClicks: release.platformClicks,
    };
  });

  if (!result) {
    sendJson(response, 404, { error: "Release not found." });
    return;
  }
  sendJson(response, 200, {
    ok: true,
    releaseId,
    platformKey,
    streamingClicks: result.streamingClicks,
    platformClicks: result.platformClicks,
  });
}

const ALLOWED_ANALYTICS_INCREMENTS = {
  artist: new Set(["artistPageVisits", "downloadPageVisits", "musicPageVisits", "profileViews", "videoPageVisits"]),
  release: new Set(["plays", "views"]),
};

async function incrementAnalytics(request, response) {
  const bodyText = await readRequestBody(request);
  const body = bodyText ? JSON.parse(bodyText) : {};
  const entityType = String(body.entityType || "");
  const entityId = String(body.entityId || "");
  const field = String(body.field || "");
  const allowedFields = ALLOWED_ANALYTICS_INCREMENTS[entityType];

  if (!entityId || !allowedFields?.has(field)) {
    sendJson(response, 400, { error: "A valid analytics entity and field are required." });
    return;
  }

  const result = await mutateStore((store) => {
    const collection = entityType === "artist" ? store.artists : store.releases;
    const entity = (collection || []).find((item) => String(item.id) === entityId);
    if (!entity) return null;
    entity[field] = Number(entity[field] || 0) + 1;
    return { value: entity[field] };
  });

  if (!result) {
    sendJson(response, 404, { error: "Analytics entity not found." });
    return;
  }

  sendJson(response, 200, { ok: true, entityType, entityId, field, value: result.value });
}

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, part) => {
    const [name, ...valueParts] = part.trim().split("=");
    if (!name) return cookies;
    cookies[name] = decodeURIComponent(valueParts.join("=") || "");
    return cookies;
  }, {});
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeArtistName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function publicAccount(account) {
  if (!account) return null;
  return {
    id: account.id,
    artistId: account.artistId,
    artistName: account.artistName,
    email: account.email,
    emailVerified: Boolean(account.emailVerified),
    role: account.role || "artist",
    createdAt: account.createdAt || "",
  };
}

function publicStore(store) {
  const sanitized = cloneValue(store || {});
  delete sanitized.artistAccounts;
  delete sanitized.storeManagerAccounts;
  return sanitized;
}

function artistScopedStore(store, artistId) {
  const scoped = publicStore(store);
  scoped.artists = (scoped.artists || []).filter((artist) => String(artist.id) === String(artistId));
  scoped.releases = (scoped.releases || []).filter((release) => String(release.artistId) === String(artistId));
  scoped.transactions = (scoped.transactions || []).filter((transaction) => String(transaction.artistId) === String(artistId));
  scoped.analyticsArchive = (scoped.analyticsArchive || []).filter((item) => String(item.artistId) === String(artistId));
  scoped.donations = (scoped.donations || []).filter((donation) => String(donation.artistId) === String(artistId));
  return scoped;
}

function hashToken(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function passwordHash(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("base64url");
    crypto.scrypt(String(password || ""), salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(`scrypt:${salt}:${derivedKey.toString("base64url")}`);
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise((resolve) => {
    const [method, salt, hash] = String(storedHash || "").split(":");
    if (method !== "scrypt" || !salt || !hash) {
      resolve(false);
      return;
    }
    crypto.scrypt(String(password || ""), salt, 64, (error, derivedKey) => {
      if (error) {
        resolve(false);
        return;
      }
      const submitted = Buffer.from(derivedKey.toString("base64url"));
      const expected = Buffer.from(hash);
      resolve(submitted.length === expected.length && crypto.timingSafeEqual(submitted, expected));
    });
  });
}

function artistSessionCookie(sessionId, options = {}) {
  const maxAge = options.clear ? 0 : Math.floor(ARTIST_SESSION_TTL_MS / 1000);
  const parts = [
    `${ARTIST_SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId || "")}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

function cleanupArtistSessions() {
  const now = Date.now();
  for (const [sessionId, session] of artistSessions.entries()) {
    if (!session || session.expiresAt <= now) artistSessions.delete(sessionId);
  }
}

function createArtistSession(account) {
  cleanupArtistSessions();
  const sessionId = randomToken();
  artistSessions.set(sessionId, {
    accountId: account.id,
    artistId: account.artistId,
    createdAt: Date.now(),
    expiresAt: Date.now() + ARTIST_SESSION_TTL_MS,
  });
  return sessionId;
}

function getArtistSession(request) {
  cleanupArtistSessions();
  const cookies = parseCookies(request.headers.cookie || "");
  const sessionId = cookies[ARTIST_SESSION_COOKIE_NAME];
  if (!sessionId) return null;
  const session = artistSessions.get(sessionId);
  if (!session) return null;
  session.expiresAt = Date.now() + ARTIST_SESSION_TTL_MS;
  return { sessionId, session };
}

function responseHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
    ...extra,
  };
}

function sendJsonWithHeaders(response, status, payload, headers = {}) {
  response.writeHead(status, responseHeaders(headers));
  response.end(JSON.stringify(payload));
}

function tokenUrl(request, pathname, token) {
  return `${requestOrigin(request)}${pathname}?token=${encodeURIComponent(token)}`;
}

async function sendArtistEmail(to, subject, body) {
  if (RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: ARTIST_EMAIL_FROM,
          to: [to],
          subject,
          text: body,
        }),
      });
      if (response.ok) return;
      console.warn(`[Artist email] Resend failed with ${response.status}: ${await response.text()}`);
    } catch (error) {
      console.warn(`[Artist email] Resend request failed: ${error.message}`);
    }
  }
  // Development fallback: the link remains visible in server logs until email provider env vars are configured.
  console.log(`[Artist email] To: ${to}\nSubject: ${subject}\n${body}`);
}

function timingSafeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function configuredAdminPassword() {
  if (OWNER_MANAGER_EMAIL) return true;
  if (STORE_MANAGER_PASSWORD || STORE_MANAGER_PASSWORD_HASH) return true;
  return !isProduction;
}

function verifyAdminPassword(password) {
  const submitted = String(password || "");
  if (STORE_MANAGER_PASSWORD_HASH) {
    const hash = crypto.createHash("sha256").update(submitted).digest("hex");
    return timingSafeEqualText(hash, STORE_MANAGER_PASSWORD_HASH);
  }

  const expected = STORE_MANAGER_PASSWORD || (isProduction ? "" : "admin123");
  return expected ? timingSafeEqualText(submitted, expected) : false;
}

function sessionCookie(sessionId, options = {}) {
  const maxAge = options.clear ? 0 : Math.floor(SESSION_TTL_MS / 1000);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId || "")}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

function cleanupAdminSessions() {
  const now = Date.now();
  for (const [sessionId, session] of adminSessions.entries()) {
    if (!session || session.expiresAt <= now) adminSessions.delete(sessionId);
  }
}

function createAdminSession(account = null) {
  cleanupAdminSessions();
  const sessionId = crypto.randomBytes(32).toString("base64url");
  adminSessions.set(sessionId, {
    accountId: account?.id || "legacy-admin",
    email: account?.email || "",
    role: account?.role || "store-manager",
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return sessionId;
}

function getAdminSession(request) {
  cleanupAdminSessions();
  const cookies = parseCookies(request.headers.cookie || "");
  const sessionId = cookies[SESSION_COOKIE_NAME];
  if (!sessionId) return null;
  const session = adminSessions.get(sessionId);
  if (!session) return null;
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return { sessionId, session };
}

function isStoreManagerRequest(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  return pathname === "/store-manager" || pathname === "/store-manager.html";
}

function isArtistDashboardRequest(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  return pathname === "/artist-dashboard" || pathname === "/artist-dashboard.html";
}

function sendAdminUnauthorized(response) {
  sendJson(response, 401, { error: "Store Manager login required." });
}

function sendArtistUnauthorized(response) {
  sendJson(response, 401, { error: "Artist login required." });
}

function accountByEmail(store, email) {
  const normalized = normalizeEmail(email);
  return (store.artistAccounts || []).find((account) => normalizeEmail(account.email) === normalized);
}

function accountByArtistId(store, artistId) {
  return (store.artistAccounts || []).find((account) => String(account.artistId) === String(artistId));
}

function artistByName(store, artistName) {
  const normalized = normalizeArtistName(artistName).toLowerCase();
  return (store.artists || []).find((artist) => normalizeArtistName(artist.name).toLowerCase() === normalized);
}

function accountByVerificationToken(store, token) {
  const tokenHash = hashToken(token);
  return (store.artistAccounts || []).find(
    (account) => account.emailVerificationTokenHash === tokenHash && Number(account.emailVerificationExpiresAt || 0) > Date.now()
  );
}

function accountByResetToken(store, token) {
  const tokenHash = hashToken(token);
  return (store.artistAccounts || []).find(
    (account) => account.passwordResetTokenHash === tokenHash && Number(account.passwordResetExpiresAt || 0) > Date.now()
  );
}

function managerAccountByEmail(store, email) {
  const normalized = normalizeEmail(email);
  return (store.storeManagerAccounts || []).find((account) => normalizeEmail(account.email) === normalized);
}

function managerAccountByResetToken(store, token) {
  const tokenHash = hashToken(token);
  return (store.storeManagerAccounts || []).find(
    (account) => account.passwordResetTokenHash === tokenHash && Number(account.passwordResetExpiresAt || 0) > Date.now()
  );
}

function publicManagerAccount(account) {
  if (!account) return null;
  return {
    id: account.id,
    email: account.email,
    role: account.role || "store-manager",
    createdAt: account.createdAt || "",
    updatedAt: account.updatedAt || "",
  };
}

async function bootstrapOwnerAccounts(store) {
  store.artistAccounts = Array.isArray(store.artistAccounts) ? store.artistAccounts : [];
  store.storeManagerAccounts = Array.isArray(store.storeManagerAccounts) ? store.storeManagerAccounts : [];

  if (OWNER_ARTIST_EMAIL && !accountByEmail(store, OWNER_ARTIST_EMAIL)) {
    const { artist, error } = ensureArtistForAccount(store, OWNER_ARTIST_NAME, OWNER_ARTIST_EMAIL);
    if (!error && artist) {
      store.artistAccounts.push({
        id: `artist-account-owner-${slugify(artist.name) || "artist"}`,
        artistId: artist.id,
        artistName: artist.name,
        email: OWNER_ARTIST_EMAIL,
        passwordHash: await passwordHash(OWNER_ARTIST_INITIAL_PASSWORD),
        emailVerified: true,
        emailVerificationTokenHash: "",
        emailVerificationExpiresAt: 0,
        passwordResetTokenHash: "",
        passwordResetExpiresAt: 0,
        role: "artist",
        ownerAccount: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  if (OWNER_MANAGER_EMAIL && !managerAccountByEmail(store, OWNER_MANAGER_EMAIL)) {
    store.storeManagerAccounts.push({
      id: "store-manager-owner",
      email: OWNER_MANAGER_EMAIL,
      passwordHash: await passwordHash(OWNER_MANAGER_INITIAL_PASSWORD),
      passwordResetTokenHash: "",
      passwordResetExpiresAt: 0,
      role: "store-manager",
      ownerAccount: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

function ensureArtistForAccount(store, artistName, email) {
  const name = normalizeArtistName(artistName);
  let artist = artistByName(store, name);
  if (artist) {
    if (accountByArtistId(store, artist.id)) {
      return { error: "That artist name already has an account." };
    }
    artist.email = artist.email || email;
    artist.status = artist.status || "approved";
    return { artist };
  }

  artist = {
    id: `artist-${slugify(name)}-${Date.now().toString(36)}`,
    name,
    handle: `@${slugify(name).replace(/-/g, "")}`,
    bio: "",
    photo: "",
    banner: "",
    socials: email ? { email: `mailto:${email}` } : {},
    email,
    status: "approved",
    followers: 0,
    createdAt: new Date().toISOString(),
  };
  store.artists.push(artist);
  return { artist };
}

async function createArtistAccount(request, response) {
  const bodyText = await readRequestBody(request);
  const body = bodyText ? JSON.parse(bodyText) : {};
  const artistName = normalizeArtistName(body.artistName);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!artistName || !email || !password || !confirmPassword) {
    sendJson(response, 400, { error: "Artist name, email, password, and confirmation are required." });
    return;
  }
  if (password.length < 8) {
    sendJson(response, 400, { error: "Password must be at least 8 characters." });
    return;
  }
  if (password !== confirmPassword) {
    sendJson(response, 400, { error: "Passwords do not match." });
    return;
  }

  let responsePayload = null;
  await mutateStore(async (store) => {
    store.artistAccounts = Array.isArray(store.artistAccounts) ? store.artistAccounts : [];
    if (accountByEmail(store, email)) {
      responsePayload = { status: 409, payload: { error: "An artist account already exists for this email." } };
      return;
    }
    const { artist, error } = ensureArtistForAccount(store, artistName, email);
    if (error) {
      responsePayload = { status: 409, payload: { error } };
      return;
    }

    const verificationToken = randomToken();
    const account = {
      id: `artist-account-${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}`,
      artistId: artist.id,
      artistName: artist.name,
      email,
      passwordHash: await passwordHash(password),
      emailVerified: false,
      emailVerificationTokenHash: hashToken(verificationToken),
      emailVerificationExpiresAt: Date.now() + TOKEN_TTL_MS,
      passwordResetTokenHash: "",
      passwordResetExpiresAt: 0,
      role: "artist",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.artistAccounts.push(account);
    responsePayload = {
      status: 201,
      payload: {
        ok: true,
        account: publicAccount(account),
        verificationUrl: tokenUrl(request, "/artist-verify", verificationToken),
      },
    };
  });

  if (responsePayload?.payload?.verificationUrl) {
    await sendArtistEmail(
      email,
      "Verify your MusicBusiness Arena artist account",
      `Verify your artist account here: ${responsePayload.payload.verificationUrl}`
    );
  }
  sendJson(response, responsePayload?.status || 500, responsePayload?.payload || { error: "Registration failed." });
}

async function verifyArtistEmail(request, response) {
  const bodyText = await readRequestBody(request);
  const body = bodyText ? JSON.parse(bodyText) : {};
  const token = String(body.token || "");
  if (!token) {
    sendJson(response, 400, { error: "Verification token is required." });
    return;
  }

  let result = null;
  await mutateStore((store) => {
    const account = accountByVerificationToken(store, token);
    if (!account) {
      result = { status: 400, payload: { error: "Verification link is invalid or expired." } };
      return;
    }
    account.emailVerified = true;
    account.emailVerificationTokenHash = "";
    account.emailVerificationExpiresAt = 0;
    account.updatedAt = new Date().toISOString();
    result = { status: 200, payload: { ok: true, account: publicAccount(account) } };
  });
  sendJson(response, result.status, result.payload);
}

async function loginArtist(request, response) {
  const bodyText = await readRequestBody(request);
  const body = bodyText ? JSON.parse(bodyText) : {};
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const store = await readStore();
  const account = accountByEmail(store, email);
  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    sendJson(response, 401, { error: "Incorrect email or password." });
    return;
  }
  if (!account.emailVerified) {
    sendJson(response, 403, { error: "Verify your email address before logging in." });
    return;
  }
  const sessionId = createArtistSession(account);
  sendJsonWithHeaders(response, 200, { ok: true, artistId: account.artistId, account: publicAccount(account) }, {
    "Set-Cookie": artistSessionCookie(sessionId),
  });
}

async function logoutArtist(request, response) {
  const artistSession = getArtistSession(request);
  if (artistSession) artistSessions.delete(artistSession.sessionId);
  sendJsonWithHeaders(response, 200, { ok: true }, {
    "Set-Cookie": artistSessionCookie("", { clear: true }),
  });
}

async function sendArtistSession(request, response) {
  const artistSession = getArtistSession(request);
  if (!artistSession) {
    sendJson(response, 200, { authenticated: false });
    return;
  }
  const store = await readStore();
  const account = (store.artistAccounts || []).find((item) => item.id === artistSession.session.accountId);
  if (!account) {
    artistSessions.delete(artistSession.sessionId);
    sendJson(response, 200, { authenticated: false });
    return;
  }
  sendJson(response, 200, {
    authenticated: true,
    artistId: account.artistId,
    account: publicAccount(account),
  });
}

async function forgotArtistPassword(request, response) {
  const bodyText = await readRequestBody(request);
  const body = bodyText ? JSON.parse(bodyText) : {};
  const email = normalizeEmail(body.email);
  let resetUrl = "";
  await mutateStore((store) => {
    const account = accountByEmail(store, email);
    if (!account) return;
    const token = randomToken();
    account.passwordResetTokenHash = hashToken(token);
    account.passwordResetExpiresAt = Date.now() + TOKEN_TTL_MS;
    account.updatedAt = new Date().toISOString();
    resetUrl = tokenUrl(request, "/artist-reset-password", token);
  });
  if (resetUrl) {
    await sendArtistEmail(email, "Reset your MusicBusiness Arena artist password", `Reset your password here: ${resetUrl}`);
  }
  sendJson(response, 200, { ok: true, message: "If that email exists, a password reset link has been sent." });
}

async function resetArtistPassword(request, response) {
  const bodyText = await readRequestBody(request);
  const body = bodyText ? JSON.parse(bodyText) : {};
  const token = String(body.token || "");
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");
  if (!token || !password || !confirmPassword) {
    sendJson(response, 400, { error: "Token, password, and confirmation are required." });
    return;
  }
  if (password.length < 8) {
    sendJson(response, 400, { error: "Password must be at least 8 characters." });
    return;
  }
  if (password !== confirmPassword) {
    sendJson(response, 400, { error: "Passwords do not match." });
    return;
  }

  let result = null;
  await mutateStore(async (store) => {
    const account = accountByResetToken(store, token);
    if (!account) {
      result = { status: 400, payload: { error: "Password reset link is invalid or expired." } };
      return;
    }
    account.passwordHash = await passwordHash(password);
    account.passwordResetTokenHash = "";
    account.passwordResetExpiresAt = 0;
    account.updatedAt = new Date().toISOString();
    result = { status: 200, payload: { ok: true } };
  });
  sendJson(response, result.status, result.payload);
}

async function updateArtistAccount(request, response) {
  const artistSession = getArtistSession(request);
  if (!artistSession) {
    sendArtistUnauthorized(response);
    return;
  }
  const bodyText = await readRequestBody(request);
  const body = bodyText ? JSON.parse(bodyText) : {};
  const currentPassword = String(body.currentPassword || "");
  const nextEmail = normalizeEmail(body.email);
  const nextPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  let result = null;
  await mutateStore(async (store) => {
    const account = (store.artistAccounts || []).find((item) => item.id === artistSession.session.accountId);
    if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
      result = { status: 401, payload: { error: "Current password is incorrect." } };
      return;
    }
    if (nextEmail && nextEmail !== normalizeEmail(account.email)) {
      const existing = accountByEmail(store, nextEmail);
      if (existing && existing.id !== account.id) {
        result = { status: 409, payload: { error: "That email address is already registered." } };
        return;
      }
      account.email = nextEmail;
      const artist = (store.artists || []).find((item) => String(item.id) === String(account.artistId));
      if (artist) {
        artist.email = nextEmail;
        artist.socials = artist.socials || {};
        artist.socials.email = `mailto:${nextEmail}`;
      }
    }
    if (nextPassword) {
      if (nextPassword.length < 8) {
        result = { status: 400, payload: { error: "New password must be at least 8 characters." } };
        return;
      }
      if (nextPassword !== confirmPassword) {
        result = { status: 400, payload: { error: "New passwords do not match." } };
        return;
      }
      account.passwordHash = await passwordHash(nextPassword);
      account.passwordResetTokenHash = "";
      account.passwordResetExpiresAt = 0;
    }
    account.updatedAt = new Date().toISOString();
    result = { status: 200, payload: { ok: true, account: publicAccount(account) } };
  });
  sendJson(response, result.status, result.payload);
}

async function loginStoreManager(request, response) {
  const bodyText = await readRequestBody(request);
  const body = bodyText ? JSON.parse(bodyText) : {};
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const store = await readStore();
  const account = email ? managerAccountByEmail(store, email) : null;

  if (account) {
    if (!(await verifyPassword(password, account.passwordHash))) {
      sendJson(response, 401, { error: "Incorrect Store Manager email or password." });
      return;
    }
    const sessionId = createAdminSession(account);
    sendJsonWithHeaders(response, 200, { ok: true, account: publicManagerAccount(account) }, {
      "Set-Cookie": sessionCookie(sessionId),
    });
    return;
  }

  if (!email && verifyAdminPassword(password)) {
    const sessionId = createAdminSession();
    sendJsonWithHeaders(response, 200, { ok: true, legacy: true }, {
      "Set-Cookie": sessionCookie(sessionId),
    });
    return;
  }

  sendJson(response, 401, { error: "Incorrect Store Manager email or password." });
}

async function forgotStoreManagerPassword(request, response) {
  const bodyText = await readRequestBody(request);
  const body = bodyText ? JSON.parse(bodyText) : {};
  const email = normalizeEmail(body.email);
  let resetUrl = "";
  await mutateStore((store) => {
    const account = managerAccountByEmail(store, email);
    if (!account) return;
    const token = randomToken();
    account.passwordResetTokenHash = hashToken(token);
    account.passwordResetExpiresAt = Date.now() + TOKEN_TTL_MS;
    account.updatedAt = new Date().toISOString();
    resetUrl = tokenUrl(request, "/store-manager-reset-password", token);
  });
  if (resetUrl) {
    await sendArtistEmail(email, "Reset your MusicBusiness Arena Store Manager password", `Reset your Store Manager password here: ${resetUrl}`);
  }
  sendJson(response, 200, { ok: true, message: "If that Store Manager email exists, a reset link has been sent." });
}

async function resetStoreManagerPassword(request, response) {
  const bodyText = await readRequestBody(request);
  const body = bodyText ? JSON.parse(bodyText) : {};
  const token = String(body.token || "");
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");
  if (!token || !password || !confirmPassword) {
    sendJson(response, 400, { error: "Token, password, and confirmation are required." });
    return;
  }
  if (password.length < 8) {
    sendJson(response, 400, { error: "Password must be at least 8 characters." });
    return;
  }
  if (password !== confirmPassword) {
    sendJson(response, 400, { error: "Passwords do not match." });
    return;
  }

  let result = null;
  await mutateStore(async (store) => {
    const account = managerAccountByResetToken(store, token);
    if (!account) {
      result = { status: 400, payload: { error: "Password reset link is invalid or expired." } };
      return;
    }
    account.passwordHash = await passwordHash(password);
    account.passwordResetTokenHash = "";
    account.passwordResetExpiresAt = 0;
    account.updatedAt = new Date().toISOString();
    result = { status: 200, payload: { ok: true } };
  });
  sendJson(response, result.status, result.payload);
}

async function updateStoreManagerAccount(request, response) {
  const adminSession = getAdminSession(request);
  if (!adminSession || adminSession.session.accountId === "legacy-admin") {
    sendAdminUnauthorized(response);
    return;
  }
  const bodyText = await readRequestBody(request);
  const body = bodyText ? JSON.parse(bodyText) : {};
  const currentPassword = String(body.currentPassword || "");
  const nextEmail = normalizeEmail(body.email);
  const nextPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  let result = null;
  await mutateStore(async (store) => {
    const account = (store.storeManagerAccounts || []).find((item) => item.id === adminSession.session.accountId);
    if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
      result = { status: 401, payload: { error: "Current password is incorrect." } };
      return;
    }
    if (nextEmail && nextEmail !== normalizeEmail(account.email)) {
      const existing = managerAccountByEmail(store, nextEmail);
      if (existing && existing.id !== account.id) {
        result = { status: 409, payload: { error: "That Store Manager email is already registered." } };
        return;
      }
      account.email = nextEmail;
      adminSession.session.email = nextEmail;
    }
    if (nextPassword) {
      if (nextPassword.length < 8) {
        result = { status: 400, payload: { error: "New password must be at least 8 characters." } };
        return;
      }
      if (nextPassword !== confirmPassword) {
        result = { status: 400, payload: { error: "New passwords do not match." } };
        return;
      }
      account.passwordHash = await passwordHash(nextPassword);
      account.passwordResetTokenHash = "";
      account.passwordResetExpiresAt = 0;
    }
    account.updatedAt = new Date().toISOString();
    result = { status: 200, payload: { ok: true, account: publicManagerAccount(account) } };
  });
  sendJson(response, result.status, result.payload);
}

async function sendArtistStore(request, response) {
  const artistSession = getArtistSession(request);
  if (!artistSession) {
    sendArtistUnauthorized(response);
    return;
  }
  const store = await readStore();
  sendJson(response, 200, artistScopedStore(store, artistSession.session.artistId));
}

async function saveArtistStore(request, response) {
  const artistSession = getArtistSession(request);
  if (!artistSession) {
    sendArtistUnauthorized(response);
    return;
  }
  const store = await readStore();
  const account = (store.artistAccounts || []).find((item) => item.id === artistSession.session.accountId);
  if (!account || !account.emailVerified) {
    sendJson(response, 403, { error: "Verify your email address before publishing or saving uploads." });
    return;
  }

  const body = await readRequestBody(request);
  const payload = JSON.parse(body);
  const incoming = withoutClientAnalytics(await normalizeUploads(payload.store || payload));
  const artistId = artistSession.session.artistId;
  const scopedStore = {
    artists: (incoming.artists || []).filter((artist) => String(artist.id) === String(artistId)),
    releases: (incoming.releases || []).filter((release) => String(release.artistId) === String(artistId)),
  };
  const requestedReleaseDeletes = new Set((payload.deletions?.releaseIds || []).map(String));
  const allowedReleaseDeletes = (store.releases || [])
    .filter((release) => requestedReleaseDeletes.has(String(release.id)) && String(release.artistId) === String(artistId))
    .map((release) => release.id);
  const allowedClears = withoutAnalyticsClears(payload.clears).filter((clear) => {
    if (clear.collection === "artists") return String(clear.id) === String(artistId);
    if (clear.collection === "releases") {
      return (store.releases || scopedStore.releases || []).some(
        (release) => String(release.id) === String(clear.id) && String(release.artistId) === String(artistId)
      );
    }
    return false;
  });

  const saved = await mergeAndWriteStore(scopedStore, {
    deletions: { releaseIds: allowedReleaseDeletes },
    clears: allowedClears,
    allowAnalyticsReset: false,
    archiveDeletedAnalytics: true,
  });
  sendJson(response, 200, artistScopedStore(saved, artistId));
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
    success_url: `${origin}/download?release=${encodeURIComponent(release.id)}&checkout=success&type=${checkoutType}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/download?release=${encodeURIComponent(release.id)}&checkout=cancelled`,
  };

  if (connectedAccountId && checkoutType === "download") {
    sessionParams.payment_intent_data.application_fee_amount = Math.round(unitAmount * (platformFeePercent / 100));
    sessionParams.payment_intent_data.transfer_data = { destination: connectedAccountId };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  sendJson(response, 200, { url: session.url });
}

async function paidDownloadPurchase(sessionId, releaseId) {
  if (!stripe || !hasValidStripeSecretKey) {
    return { status: 503, error: "Stripe is not configured." };
  }

  if (!sessionId) return { status: 400, error: "Stripe checkout session is required." };

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  } catch {
    return { status: 404, error: "Stripe checkout session was not found." };
  }

  if (session.payment_status !== "paid" || session.metadata?.checkoutType !== "download") {
    return { status: 403, error: "This purchase has not been paid." };
  }

  if (releaseId && session.metadata?.releaseId !== releaseId) {
    return { status: 403, error: "This purchase does not match this song." };
  }

  const store = await readStore();
  const release = (store.releases || []).find((item) => item.id === session.metadata?.releaseId && item.status === "approved");
  if (!release) return { status: 404, error: "Release not found." };

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || "";
  let transaction = (store.transactions || []).find(
    (item) => item.checkoutSessionId === session.id || (paymentIntentId && item.paymentIntentId === paymentIntentId)
  );

  if (!transaction) {
    const amount = Number(session.amount_total || 0) / 100;
    const platformFeePercent = Number(session.metadata?.platformFeePercent || store.site?.commissionRate || 10);
    transaction = {
      id: `txn-${session.id}`,
      releaseId: release.id,
      artistId: release.artistId || "",
      type: "download",
      amount,
      platformFee: amount * (platformFeePercent / 100),
      artistPayout: amount * (1 - platformFeePercent / 100),
      currency: session.currency || release.currency || "usd",
      checkoutSessionId: session.id,
      paymentIntentId,
      downloaded: false,
      downloadedAt: "",
      createdAt: new Date((session.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    };
    store.transactions.push(transaction);
    await writeStore(store);
  }

  return { status: 200, store, release, transaction, session };
}

async function sendDownloadStatus(request, response, url) {
  const result = await paidDownloadPurchase(url.searchParams.get("session_id"), url.searchParams.get("release"));
  if (result.status !== 200) {
    sendJson(response, result.status, { error: result.error });
    return;
  }

  sendJson(response, 200, {
    ok: true,
    releaseId: result.release.id,
    downloaded: Boolean(result.transaction.downloaded),
    downloadedAt: result.transaction.downloadedAt || "",
  });
}

function downloadFilename(release, filePath) {
  const extension = path.extname(filePath || release.audioUrl || ".mp3") || ".mp3";
  return `${slugify(release.title || "song")}${extension}`;
}

async function claimPaidDownload(request, response, url) {
  const result = await paidDownloadPurchase(url.searchParams.get("session_id"), url.searchParams.get("release"));
  if (result.status !== 200) {
    sendJson(response, result.status, { error: result.error });
    return;
  }

  const { store, release, transaction } = result;
  if (transaction.downloaded) {
    sendJson(response, 409, {
      error: "Thank you, this song has already been downloaded for this purchase.",
      downloaded: true,
      downloadedAt: transaction.downloadedAt || "",
    });
    return;
  }

  if (/^https?:\/\//i.test(release.audioUrl || "")) {
    transaction.downloaded = true;
    transaction.downloadedAt = new Date().toISOString();
    release.downloads = Number(release.downloads || 0) + 1;
    await writeStore(store);
    response.writeHead(303, { Location: release.audioUrl });
    response.end();
    return;
  }

  const audioPath = String(release.audioUrl || "");
  const isUpload = audioPath.startsWith("uploads/");
  const filePath = isUpload ? path.join(ROOT, audioPath) : path.join(ROOT, audioPath.replace(/^\/+/, ""));
  const isAllowedPath = isUpload ? isPathInsideUploadRoot(filePath) : isPathInsideRoot(filePath);

  if (!audioPath || !isAllowedPath) {
    sendJson(response, 404, { error: "Song file is not available." });
    return;
  }

  try {
    const file = fsSync.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    transaction.downloaded = true;
    transaction.downloadedAt = new Date().toISOString();
    release.downloads = Number(release.downloads || 0) + 1;
    await writeStore(store);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${downloadFilename(release, filePath)}"`,
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });
    response.end(file);
  } catch {
    sendJson(response, 404, { error: "Song file is not available." });
  }
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
  "/download": "/download.html",
  "/video": "/videos.html",
  "/upload": "/upload.html",
  "/artist-dashboard": "/artist-dashboard.html",
  "/artist-login": "/artist-login.html",
  "/artist-register": "/artist-register.html",
  "/artist-forgot-password": "/artist-forgot-password.html",
  "/artist-reset-password": "/artist-reset-password.html",
  "/artist-verify": "/artist-verify.html",
  "/store-manager": "/store-manager.html",
  "/store-manager-login": "/store-manager-login.html",
  "/store-manager-forgot-password": "/store-manager-forgot-password.html",
  "/store-manager-reset-password": "/store-manager-reset-password.html",
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

  if (isStoreManagerRequest(request) && !getAdminSession(request)) {
    redirect(response, "/store-manager-login");
    return;
  }

  if (isArtistDashboardRequest(request) && !getArtistSession(request)) {
    redirect(response, "/artist-login");
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
    const ext = path.extname(filePath).toLowerCase();
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error("Not a file");
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": cacheControlFor(ext, pathname),
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    };

    if (MEDIA_EXTENSIONS.has(ext)) {
      headers["Accept-Ranges"] = "bytes";
      const range = String(request.headers.range || "");
      const match = range.match(/^bytes=(\d*)-(\d*)$/);
      if (range && !match) {
        response.writeHead(416, { ...headers, "Content-Range": `bytes */${stat.size}` });
        response.end();
        return;
      }

      if (match) {
        const suffixLength = !match[1] && match[2] ? Number(match[2]) : 0;
        const start = suffixLength
          ? Math.max(0, stat.size - suffixLength)
          : Number(match[1] || 0);
        const end = suffixLength
          ? stat.size - 1
          : Math.min(Number(match[2] || stat.size - 1), stat.size - 1);

        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= stat.size) {
          response.writeHead(416, { ...headers, "Content-Range": `bytes */${stat.size}` });
          response.end();
          return;
        }

        response.writeHead(206, {
          ...headers,
          "Content-Length": end - start + 1,
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        });
        if (request.method === "HEAD") response.end();
        else fsSync.createReadStream(filePath, { start, end }).pipe(response);
        return;
      }

      response.writeHead(200, { ...headers, "Content-Length": stat.size });
      if (request.method === "HEAD") response.end();
      else fsSync.createReadStream(filePath).pipe(response);
      return;
    }

    const file = await fs.readFile(filePath);
    response.writeHead(200, { ...headers, "Content-Length": file.length });
    if (request.method === "HEAD") response.end();
    else response.end(file);
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
      sendJson(response, 200, publicStore(await readStore()));
      return;
    }

    if (url.pathname === "/api/artist/session" && request.method === "GET") {
      await sendArtistSession(request, response);
      return;
    }

    if (url.pathname === "/api/artist/register" && request.method === "POST") {
      await createArtistAccount(request, response);
      return;
    }

    if (url.pathname === "/api/artist/verify" && request.method === "POST") {
      await verifyArtistEmail(request, response);
      return;
    }

    if (url.pathname === "/api/artist/login" && request.method === "POST") {
      await loginArtist(request, response);
      return;
    }

    if (url.pathname === "/api/artist/logout" && request.method === "POST") {
      await logoutArtist(request, response);
      return;
    }

    if (url.pathname === "/api/artist/forgot-password" && request.method === "POST") {
      await forgotArtistPassword(request, response);
      return;
    }

    if (url.pathname === "/api/artist/reset-password" && request.method === "POST") {
      await resetArtistPassword(request, response);
      return;
    }

    if (url.pathname === "/api/artist/account" && request.method === "POST") {
      await updateArtistAccount(request, response);
      return;
    }

    if (url.pathname === "/api/artist/store" && request.method === "GET") {
      await sendArtistStore(request, response);
      return;
    }

    if (url.pathname === "/api/download-status" && request.method === "GET") {
      await sendDownloadStatus(request, response, url);
      return;
    }

    if (url.pathname === "/api/claim-download" && request.method === "GET") {
      await claimPaidDownload(request, response, url);
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

    if (url.pathname === "/api/admin/session" && request.method === "GET") {
      const adminSession = getAdminSession(request);
      sendJson(response, 200, {
        authenticated: Boolean(adminSession),
        configured: configuredAdminPassword(),
        account: adminSession
          ? {
              id: adminSession.session.accountId,
              email: adminSession.session.email,
              role: adminSession.session.role,
            }
          : null,
      });
      return;
    }

    if (url.pathname === "/api/admin/login" && request.method === "POST") {
      if (!configuredAdminPassword()) {
        sendJson(response, 503, {
          error: "Store Manager password is not configured. Add STORE_MANAGER_PASSWORD in Render environment variables.",
        });
        return;
      }

      await loginStoreManager(request, response);
      return;
    }

    if (url.pathname === "/api/admin/forgot-password" && request.method === "POST") {
      await forgotStoreManagerPassword(request, response);
      return;
    }

    if (url.pathname === "/api/admin/reset-password" && request.method === "POST") {
      await resetStoreManagerPassword(request, response);
      return;
    }

    if (url.pathname === "/api/admin/account" && request.method === "POST") {
      await updateStoreManagerAccount(request, response);
      return;
    }

    if (url.pathname === "/api/admin/logout" && request.method === "POST") {
      const adminSession = getAdminSession(request);
      if (adminSession) adminSessions.delete(adminSession.sessionId);
      response.writeHead(200, {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": sessionCookie("", { clear: true }),
      });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    if (url.pathname === "/api/admin/store" && request.method === "POST") {
      if (!getAdminSession(request)) {
        sendAdminUnauthorized(response);
        return;
      }

      const body = await readRequestBody(request);
      const payload = JSON.parse(body);
      const incoming = await normalizeUploads(payload.store || payload);
      const store = await mergeAndWriteStore(incoming, {
        deletions: payload.deletions || {},
        clears: payload.clears || [],
        allowAnalyticsReset: payload.resetAnalytics === true,
      });
      sendJson(response, 200, store);
      return;
    }

    if (url.pathname === "/api/store" && request.method === "POST") {
      const body = await readRequestBody(request);
      const payload = JSON.parse(body);
      const incoming = withoutClientAnalytics(await normalizeUploads(payload.store || payload));
      delete incoming.artistAccounts;
      delete incoming.storeManagerAccounts;
      const store = await mergeAndWriteStore(incoming, {
        deletions: payload.deletions || {},
        clears: withoutAnalyticsClears(payload.clears),
        allowAnalyticsReset: false,
        archiveDeletedAnalytics: true,
      });
      sendJson(response, 200, publicStore(store));
      return;
    }

    if (url.pathname === "/api/artist/store" && request.method === "POST") {
      await saveArtistStore(request, response);
      return;
    }

    if (url.pathname === "/api/streaming-click" && request.method === "POST") {
      await recordStreamingClick(request, response);
      return;
    }

    if (url.pathname === "/api/analytics-increment" && request.method === "POST") {
      await incrementAnalytics(request, response);
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
