/* ===================================================
   BACKEND SERVER

   CODE OWNER GUIDE

   Runs the website server, MongoDB persistence, authentication, uploads, downloads, analytics, Stripe payments, Stripe Connect, and clean routes.
   Used by: the entire deployed MusicBusiness Arena website.
   Does not control visual styling directly.
=================================================== */

/* ===================================================
   SERVER SETUP AND ENVIRONMENT SETTINGS

   Controls the Node.js backend, folder paths, database
   names, Stripe keys, email settings, and session names.

   Used by:
   - The entire website backend.

   Editing this section affects backend configuration only.
=================================================== */
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
const ARTIST_PAYOUT_PERCENT = 80;
const PLATFORM_SERVICE_FEE_PERCENT = 10;
const PAYMENT_PROCESSING_FEE_PERCENT = 5;
const PLATFORM_OPERATIONS_FEE_PERCENT = 5;
const STORE_MANAGER_PASSWORD = envValue("STORE_MANAGER_PASSWORD", "ADMIN_PASSWORD");
const STORE_MANAGER_PASSWORD_HASH = envValue("STORE_MANAGER_PASSWORD_HASH", "ADMIN_PASSWORD_HASH");
const RESEND_API_KEY = envValue("RESEND_API_KEY");
const ARTIST_EMAIL_FROM = envValue("ARTIST_EMAIL_FROM", "EMAIL_FROM") || "MusicBusiness Arena <noreply@musicbusinessarena.com>";
const CONTACT_EMAIL_FROM = envValue("CONTACT_EMAIL_FROM", "EMAIL_FROM") || ARTIST_EMAIL_FROM;
const CONTACT_GENERAL_EMAIL = normalizeEmail(envValue("CONTACT_GENERAL_EMAIL") || "musicbusinessarena@gmail.com");
const CONTACT_ARTIST_SUPPORT_EMAIL = normalizeEmail(envValue("CONTACT_ARTIST_SUPPORT_EMAIL", "CONTACT_ARTIST_EMAIL") || "musicbuzzarenaartists@gmail.com");
const CONTACT_COPYRIGHT_EMAIL = normalizeEmail(envValue("CONTACT_COPYRIGHT_EMAIL", "CONTACT_DMCA_EMAIL") || "musicbuzzarenaartists@gmail.com");
const CONTACT_PAYOUT_EMAIL = normalizeEmail(envValue("CONTACT_PAYOUT_EMAIL") || CONTACT_GENERAL_EMAIL);
const CONTACT_TECHNICAL_EMAIL = normalizeEmail(envValue("CONTACT_TECHNICAL_EMAIL") || CONTACT_GENERAL_EMAIL);
const OWNER_ARTIST_NAME = envValue("OWNER_ARTIST_NAME") || "Focuzman";
const OWNER_ARTIST_EMAIL = normalizeEmail(envValue("OWNER_ARTIST_EMAIL") || "focuzmanmusic@gmail.com");
const OWNER_ARTIST_INITIAL_PASSWORD = envValue("OWNER_ARTIST_INITIAL_PASSWORD") || "Focuzmanmbaacct@123";
const OWNER_MANAGER_EMAIL = normalizeEmail(envValue("OWNER_MANAGER_EMAIL", "STORE_MANAGER_EMAIL") || "kingsncrown@gmail.com");
const OWNER_MANAGER_INITIAL_PASSWORD = envValue("OWNER_MANAGER_INITIAL_PASSWORD", "STORE_MANAGER_INITIAL_PASSWORD") || "Mbamanagersacct@123";
const SESSION_COOKIE_NAME = "mba_store_manager";
const ARTIST_SESSION_COOKIE_NAME = "mba_artist_session";
const ARTIST_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 20;
const STORE_MANAGER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 20;
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const isProduction = process.env.NODE_ENV === "production";
const SESSION_SIGNING_SECRET = envValue("SESSION_SECRET", "COOKIE_SECRET") || "musicbusinessarena-stable-session-secret";

let mongoClient;
let storeCollection;
let cachedStore = null;
let storeWriteQueue = Promise.resolve();
const adminSessions = new Map();
const artistSessions = new Map();
const stripe = STRIPE_SECRET_KEY && Stripe ? Stripe(STRIPE_SECRET_KEY) : null;
const hasValidStripeSecretKey = /^sk_(test|live)_/.test(STRIPE_SECRET_KEY);
const stripeConnectReady = Boolean(stripe && hasValidStripeSecretKey);
const stripeApiMode = STRIPE_SECRET_KEY.startsWith("sk_live_") ? "live" : STRIPE_SECRET_KEY.startsWith("sk_test_") ? "test" : "";

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

/* ===================================================
   DEFAULT WEBSITE DATA

   Provides starter data when MongoDB or the local JSON file
   does not already have saved website information.

   Used by:
   - Public pages
   - Artist Dashboard
   - Store Manager

   Saved MongoDB data takes priority over these defaults.
=================================================== */
function defaultStore() {
  return {
    site: {
      logo: "Mba Logos/MusicBusiness Logo.png",
      title: "MusicBusiness Arena",
      tagline: "Where Artists Connect. Fans Support. Music Thrives.",
      intro: "Discover releases from independent artists.",
      primaryCta: "Browse Music",
      secondaryCta: "Upload",
      footerTagline: "Artist Profiles. Music Downloads. Streaming Links.",
      footerDescription: "MusicBusiness Arena is a platform for artists to showcase their music, share streaming links, and sell downloadable songs directly to fans.",
      copyrightText: "© 2026 MusicBusiness Arena. All rights reserved.",
      favicon: "Mba Logos/MBA Favicon.png",
      socials: {
        x: "",
        facebook: "",
        instagram: "",
        youtube: "",
        tiktok: "",
        twitch: "",
      },
      legalPages: {},
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
    auditLogs: [],
    contactMessages: [],
    artistAccounts: [],
    storeManagerAccounts: [],
  };
}

/* ===================================================
   DATABASE AND FILE STORAGE

   Controls how MusicBusiness Arena reads and saves data.
   The backend prefers MongoDB when configured, with the
   local JSON file used as a fallback.

   Used by:
   - Artist uploads
   - Analytics
   - Store Manager
   - Public pages
=================================================== */
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

/* ===================================================
   SAFE DATA MERGING AND PERMANENCE

   Controls how saved website data is protected and merged.
   This section helps prevent existing releases, artist data,
   analytics, and payment records from being erased by mistake.

   Used whenever the website saves store data.
=================================================== */
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
    auditLogs: Array.isArray(store?.auditLogs) ? store.auditLogs : [],
    contactMessages: Array.isArray(store?.contactMessages) ? store.contactMessages : [],
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
  sanitized.auditLogs = [];
  sanitized.contactMessages = [];
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
    auditLogs: mergeEntityLists(existing.auditLogs, incoming.auditLogs || [], options),
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

function parseRequestBody(bodyText, request) {
  const contentType = String(request.headers["content-type"] || "").toLowerCase();
  if (!bodyText) return {};
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(bodyText).entries());
  }
  return JSON.parse(bodyText);
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

/* ===================================================
   UPLOAD FILE SAVING

   Saves uploaded images and audio files into the uploads
   folder and returns the public URL used by the website.

   Used by:
   - Artwork uploads
   - Song file uploads
   - Artist profile images
=================================================== */
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
  normalized.site.favicon = await saveDataUrl(normalized.site.favicon, "images", "mba-favicon.png");

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

/* ===================================================
   ANALYTICS RECORDING

   Updates visits, download counts, streaming clicks, and
   platform-specific click records.

   Used by:
   - Artist Dashboard analytics
   - Store Manager analytics
   - Listen and download pages
=================================================== */
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

/* ===================================================
   AUTHENTICATION, PASSWORDS, AND SESSIONS

   Controls cookies, password hashing, login sessions, and
   route protection for artists and Store Managers.

   Artist sessions and Store Manager sessions are separate.
=================================================== */
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
  delete sanitized.auditLogs;
  delete sanitized.contactMessages;
  sanitized.artists = (sanitized.artists || []).map((artist) => {
    const publicArtist = { ...artist };
    delete publicArtist.stripeAccountId;
    delete publicArtist.stripeAccountStatus;
    delete publicArtist.stripeChargesEnabled;
    delete publicArtist.stripePayoutsEnabled;
    delete publicArtist.stripeDetailsSubmitted;
    delete publicArtist.stripeRequirementsDue;
    delete publicArtist.stripeLastCheckedAt;
    return publicArtist;
  });
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
  const maxAge = options.clear ? 0 : ARTIST_SESSION_MAX_AGE_SECONDS;
  const expires = options.clear
    ? new Date(0)
    : new Date(Date.now() + ARTIST_SESSION_MAX_AGE_SECONDS * 1000);
  const parts = [
    `${ARTIST_SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId || "")}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    `Expires=${expires.toUTCString()}`,
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

function encodeSessionPayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signSessionPayload(encodedPayload) {
  return crypto
    .createHmac("sha256", SESSION_SIGNING_SECRET)
    .update(encodedPayload)
    .digest("base64url");
}

function signedArtistSessionToken(session) {
  const encodedPayload = encodeSessionPayload(session);
  return `${encodedPayload}.${signSessionPayload(encodedPayload)}`;
}

function verifySignedSessionToken(token, expectedRole) {
  const [encodedPayload, signature] = String(token || "").split(".");
  if (!encodedPayload || !signature) return null;
  const expectedSignature = signSessionPayload(encodedPayload);
  const submitted = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (submitted.length !== expected.length || !crypto.timingSafeEqual(submitted, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!session || session.role !== expectedRole) return null;
    return session;
  } catch {
    return null;
  }
}

function verifySignedArtistSessionToken(token) {
  const session = verifySignedSessionToken(token, "artist");
  if (!session) return null;
  try {
    if (!session.accountId || !session.artistId) return null;
    return session;
  } catch {
    return null;
  }
}

function cleanupArtistSessions() {
  for (const [sessionId, session] of artistSessions.entries()) {
    if (!session || !session.accountId || !session.artistId || session.role !== "artist") {
      artistSessions.delete(sessionId);
    }
  }
}

function createArtistSession(account) {
  cleanupArtistSessions();
  const session = {
    accountId: account.id,
    artistId: account.artistId,
    role: "artist",
    createdAt: Date.now(),
    persistent: true,
  };
  const sessionId = signedArtistSessionToken(session);
  artistSessions.set(sessionId, session);
  return sessionId;
}

function getArtistSession(request) {
  cleanupArtistSessions();
  const cookies = parseCookies(request.headers.cookie || "");
  const sessionId = cookies[ARTIST_SESSION_COOKIE_NAME];
  if (!sessionId) return null;
  const session = artistSessions.get(sessionId) || verifySignedArtistSessionToken(sessionId);
  if (!session) return null;
  if (!session.accountId || !session.artistId || session.role === "store-manager") {
    artistSessions.delete(sessionId);
    return null;
  }
  artistSessions.set(sessionId, session);
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

function contactInquiryLabel(inquiryType) {
  return {
    general: "General Inquiry",
    copyright: "Copyright / DMCA",
    artistSupport: "Artist Support",
    payout: "Payout / Download Support",
    technical: "Technical Issue",
  }[inquiryType] || "General Inquiry";
}

function normalizeContactInquiryType(value) {
  const key = String(value || "").trim().toLowerCase();
  if (["copyright", "dmca", "copyright-dmca", "copyright_dmca"].includes(key)) return "copyright";
  if (["artist", "artist-support", "artist_support", "support"].includes(key)) return "artistSupport";
  if (["payout", "download", "payment", "payout-download", "payout_download"].includes(key)) return "payout";
  if (["technical", "tech", "bug", "technical-issue", "technical_issue"].includes(key)) return "technical";
  return "general";
}

function inferContactInquiryType(inquiryType, subject, message) {
  const explicitType = normalizeContactInquiryType(inquiryType);
  if (explicitType !== "general") return explicitType;
  const text = `${subject || ""} ${message || ""}`.toLowerCase();
  if (/\b(dmca|copyright|infringement|takedown|stolen|unauthorized)\b/.test(text)) return "copyright";
  if (/\b(artist|profile|upload|account|login|password|song|beat|instrumental)\b/.test(text)) return "artistSupport";
  if (/\b(payout|payment|stripe|paid|download|refund|purchase|money|earning|revenue)\b/.test(text)) return "payout";
  if (/\b(error|bug|broken|technical|website|page|not working|issue)\b/.test(text)) return "technical";
  return "general";
}

function contactRecipientForType(inquiryType) {
  return {
    general: CONTACT_GENERAL_EMAIL,
    copyright: CONTACT_COPYRIGHT_EMAIL,
    artistSupport: CONTACT_ARTIST_SUPPORT_EMAIL,
    payout: CONTACT_PAYOUT_EMAIL,
    technical: CONTACT_TECHNICAL_EMAIL,
  }[inquiryType] || CONTACT_GENERAL_EMAIL;
}

function contactAutoReplyBody({ name, inquiryType, inquiryLabel, subject }) {
  const greeting = name ? `Hello ${name},` : "Hello,";
  const baseLines = [
    greeting,
    "",
    "Thank you for contacting MusicBusiness Arena. We received your message and routed it to the correct support channel.",
    "",
    `Inquiry Type: ${inquiryLabel}`,
    `Subject: ${subject}`,
    "",
  ];

  const typeLines = {
    general: [
      "Our team will review your message and reply if more information is needed.",
      "If your message is about a specific artist, release, download, payment, or account, please keep the artist name, song title, page link, and any receipt or screenshot available so we can review it faster.",
    ],
    copyright: [
      "We received your copyright / DMCA message. MusicBusiness Arena will review copyright reports under the platform policies and applicable notice-and-takedown procedures.",
      "Please keep the exact artist name, song or video title, public page link, proof of ownership or authorization, and any supporting documents available. If more information is needed, the platform may ask you for those details before taking action.",
      "If the report concerns content uploaded by an artist, the platform may notify the artist/uploader and give them a chance to respond. MusicBusiness Arena may hide, reject, remove, suspend, or delete content or accounts when appropriate, but this confirmation email is not a final decision on the claim.",
      "For privacy and security, MusicBusiness Arena does not automatically share private artist account details from this public contact form.",
    ],
    artistSupport: [
      "For artist account, upload, release, beat, instrumental, video, streaming link, download, login, or profile questions, please also check your Artist Dashboard for the latest account and release status.",
      "If your question is about a specific release, include the release title and the page link when replying. Our team will review your message and reply if account-specific help is needed.",
    ],
    payout: [
      "We received your payout / download-support message. Please check your Artist Dashboard for your current downloads, earnings, Stripe status, and payout information.",
      "MusicBusiness Arena generally processes artist payouts according to the platform payout policy. If an eligible payout is still pending, please allow normal processing time. Bank, Stripe, and business-day timing can sometimes take a few days after payout processing begins.",
      "If you believe a payout is missing, please keep the artist name, registered artist email, release title, download/payment details, and any Stripe or receipt information available. Our team will review the account record before giving a payout-specific answer.",
      "For security, detailed payout decisions are not sent from the public contact form unless the artist account can be verified.",
    ],
    technical: [
      "For technical issues, our team will review the page, account, or feature you reported.",
      "If possible, keep a screenshot, the exact page link, your device/browser, and the steps that caused the issue available in case we need more information.",
    ],
  }[inquiryType] || [];

  return [
    ...baseLines,
    ...typeLines,
    "",
    "MusicBusiness Arena",
    "https://musicbusinessarena.com",
  ].join("\n");
}

async function sendContactEmail(to, subject, body, replyTo) {
  if (RESEND_API_KEY) {
    try {
      const payload = {
        from: CONTACT_EMAIL_FROM,
        to: [to],
        subject,
        text: body,
      };
      if (replyTo) payload.reply_to = replyTo;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) return true;
      console.warn(`[Contact email] Resend failed with ${response.status}: ${await response.text()}`);
    } catch (error) {
      console.warn(`[Contact email] Resend request failed: ${error.message}`);
    }
    return false;
  }
  console.log(`[Contact email] To: ${to}\nSubject: ${subject}\n${body}`);
  return true;
}

async function submitContactMessage(request, response) {
  const bodyText = await readRequestBody(request);
  const body = parseRequestBody(bodyText, request);
  const name = String(body.name || "").trim();
  const email = normalizeEmail(body.email);
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();
  const inquiryType = inferContactInquiryType(body.inquiryType, subject, message);
  const inquiryLabel = contactInquiryLabel(inquiryType);
  const recipient = contactRecipientForType(inquiryType);

  if (!name || !email || !subject || !message) {
    sendJson(response, 400, { error: "Full name, email address, subject, and message are required." });
    return;
  }

  if (!recipient) {
    sendJson(response, 500, { error: "Contact email routing is not configured." });
    return;
  }

  const createdAt = new Date().toISOString();
  const record = {
    id: `contact-${Date.now()}-${randomToken().slice(0, 8)}`,
    name,
    email,
    inquiryType,
    inquiryLabel,
    subject,
    message,
    recipient,
    status: "pending",
    createdAt,
  };

  const emailSubject = `[${inquiryLabel}] ${subject}`;
  const emailBody = [
    "New MusicBusiness Arena contact message",
    "",
    `Inquiry Type: ${inquiryLabel}`,
    `Name: ${name}`,
    `Email: ${email}`,
    `Submitted: ${createdAt}`,
    "",
    "Subject:",
    subject,
    "",
    "Message:",
    message,
  ].join("\n");

  const delivered = await sendContactEmail(recipient, emailSubject, emailBody, email);
  record.status = delivered ? "sent" : "email_failed";
  let autoReplyDelivered = false;
  if (delivered) {
    autoReplyDelivered = await sendContactEmail(
      email,
      `We received your MusicBusiness Arena message: ${subject}`,
      contactAutoReplyBody({ name, inquiryType, inquiryLabel, subject }),
      recipient
    );
    record.autoReplyStatus = autoReplyDelivered ? "sent" : "email_failed";
  }
  await mutateStore((store) => {
    store.contactMessages = Array.isArray(store.contactMessages) ? store.contactMessages : [];
    store.contactMessages.unshift(record);
    store.contactMessages = store.contactMessages.slice(0, 500);
  });
  if (!delivered) {
    sendJson(response, 502, {
      error: "Your message was saved, but email delivery failed. Please try again later.",
      inquiryType,
    });
    return;
  }
  sendJson(response, 200, {
    ok: true,
    message: "Your message has been sent. Thank you for contacting MusicBusiness Arena.",
    inquiryType,
  });
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
  const maxAge = options.clear ? 0 : STORE_MANAGER_SESSION_MAX_AGE_SECONDS;
  const expires = options.clear
    ? new Date(0)
    : new Date(Date.now() + STORE_MANAGER_SESSION_MAX_AGE_SECONDS * 1000);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId || "")}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    `Expires=${expires.toUTCString()}`,
  ];
  if (isProduction) parts.push("Secure");
  return parts.join("; ");
}

function cleanupAdminSessions() {
  for (const [sessionId, session] of adminSessions.entries()) {
    if (!session || session.role !== "store-manager") adminSessions.delete(sessionId);
  }
}

function signedAdminSessionToken(session) {
  const encodedPayload = encodeSessionPayload(session);
  return `${encodedPayload}.${signSessionPayload(encodedPayload)}`;
}

function verifySignedAdminSessionToken(token) {
  const session = verifySignedSessionToken(token, "store-manager");
  if (!session) return null;
  if (!session.accountId) return null;
  return session;
}

function createAdminSession(account = null) {
  cleanupAdminSessions();
  const session = {
    accountId: account?.id || "legacy-admin",
    email: account?.email || "",
    role: account?.role || "store-manager",
    createdAt: Date.now(),
    persistent: true,
  };
  const sessionId = signedAdminSessionToken(session);
  adminSessions.set(sessionId, session);
  return sessionId;
}

function getAdminSession(request) {
  cleanupAdminSessions();
  const cookies = parseCookies(request.headers.cookie || "");
  const sessionId = cookies[SESSION_COOKIE_NAME];
  if (!sessionId) return null;
  const session = adminSessions.get(sessionId) || verifySignedAdminSessionToken(sessionId);
  if (!session) return null;
  if (session.role !== "store-manager") {
    adminSessions.delete(sessionId);
    return null;
  }
  adminSessions.set(sessionId, session);
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

function adminAuditLogEntry(session, action, reason) {
  return {
    id: `audit-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
    createdAt: new Date().toISOString(),
    action,
    storeManagerAccountId: session?.accountId || "legacy-admin",
    storeManagerEmail: session?.email || "",
    reason,
  };
}

function auditReasonForAdminSave(payload = {}) {
  const reasons = [];
  const deletions = payload.deletions || {};
  if ((deletions.artistIds || []).length) reasons.push(`deleted artists: ${deletions.artistIds.join(", ")}`);
  if ((deletions.releaseIds || []).length) reasons.push(`deleted releases: ${deletions.releaseIds.join(", ")}`);
  if ((payload.clears || []).length) reasons.push("cleared saved fields");
  if (payload.resetAnalytics === true) reasons.push("reset analytics records");
  return reasons.join("; ");
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

/* ===================================================
   ARTIST ACCOUNT APIS

   Handles artist registration, email verification, login,
   logout, password reset, and account settings.

   Used by:
   - Artist Registration
   - Artist Login
   - Artist Dashboard
=================================================== */
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
  const body = parseRequestBody(bodyText, request);
  const email = normalizeEmail(body.email || body.artistEmail);
  const password = String(body.password || body.artistPassword || "");
  const wantsHtml = String(request.headers.accept || "").includes("text/html");
  const next = String(body.next || "").startsWith("/artist-dashboard") ? String(body.next) : "/artist-dashboard";
  const store = await readStore();
  const account = accountByEmail(store, email);
  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    if (wantsHtml) {
      redirect(response, "/artist-login?error=invalid");
      return;
    }
    sendJson(response, 401, { error: "Incorrect email or password." });
    return;
  }
  if (!account.emailVerified) {
    if (wantsHtml) {
      redirect(response, "/artist-login?error=verify");
      return;
    }
    sendJson(response, 403, { error: "Verify your email address before logging in." });
    return;
  }
  const sessionId = createArtistSession(account);
  if (wantsHtml) {
    response.writeHead(302, {
      "Cache-Control": "no-store",
      Location: next,
      "Set-Cookie": artistSessionCookie(sessionId),
    });
    response.end();
    return;
  }
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
  const noStore = { "Cache-Control": "no-store" };
  if (!artistSession) {
    sendJsonWithHeaders(response, 200, { authenticated: false }, noStore);
    return;
  }
  const store = await readStore();
  const account = (store.artistAccounts || []).find((item) => item.id === artistSession.session.accountId);
  if (!account) {
    artistSessions.delete(artistSession.sessionId);
    sendJsonWithHeaders(response, 200, { authenticated: false }, {
      ...noStore,
      "Set-Cookie": artistSessionCookie("", { clear: true }),
    });
    return;
  }
  sendJsonWithHeaders(response, 200, {
    authenticated: true,
    artistId: account.artistId,
    account: publicAccount(account),
  }, {
    ...noStore,
    "Set-Cookie": artistSessionCookie(artistSession.sessionId),
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

/* ===================================================
   STORE MANAGER ACCOUNT APIS

   Handles Store Manager login, logout, password reset, and
   session checks.

   Used by:
   - Store Manager Login
   - Store Manager Dashboard

   This does not authenticate artist accounts.
=================================================== */
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

/* ===================================================
   ARTIST DASHBOARD DATA APIS

   Sends and saves the website data an artist is allowed to
   manage from the Artist Dashboard.

   Used by:
   - Upload Song
   - Profile
   - Songs
   - Videos
   - Analytics
   - Earnings
=================================================== */
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

/* ===================================================
   STRIPE PAYMENTS AND STRIPE CONNECT

   Controls paid downloads, checkout sessions, platform fees,
   artist payout calculations, and Stripe Connect onboarding.

   Used by:
   - Download pages
   - Artist Earnings
   - Store Manager payout monitoring

   This section should not be changed unless working on payments.
=================================================== */
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

function fromMinorUnits(amount, currency) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? value : value / 100;
}

function salePayoutBreakdownMinor(amountMinor) {
  const amount = Number(amountMinor || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      artistPayout: 0,
      platformServiceFee: 0,
      paymentProcessingFee: 0,
      platformOperationsFee: 0,
      totalDeductions: 0,
    };
  }
  const artistPayout = Math.max(0, Math.round(amount * (ARTIST_PAYOUT_PERCENT / 100)));
  const totalDeductions = Math.max(0, amount - artistPayout);
  const platformServiceFee = Math.max(0, Math.round(amount * (PLATFORM_SERVICE_FEE_PERCENT / 100)));
  const paymentProcessingFee = Math.max(0, Math.round(amount * (PAYMENT_PROCESSING_FEE_PERCENT / 100)));
  const platformOperationsFee = Math.max(0, totalDeductions - platformServiceFee - paymentProcessingFee);
  return {
    artistPayout,
    platformServiceFee,
    paymentProcessingFee,
    platformOperationsFee,
    totalDeductions,
  };
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

function stripeAccountStatus(account = {}) {
  if (!account || !account.id) return "not_connected";
  if (account.charges_enabled && account.payouts_enabled && account.details_submitted) return "connected";
  if (account.details_submitted || account.requirements?.currently_due?.length || account.requirements?.eventually_due?.length) {
    return "pending_verification";
  }
  return "not_connected";
}

function stripeConnectErrorMessage(error, fallback = "Unable to open Stripe Connect onboarding.") {
  const message = String(error?.message || "");
  if (/dashboard\.stripe\.com\/connect|signed up for Connect|create new accounts/i.test(message)) {
    return "Stripe Connect is enabled, but Stripe rejected connected account creation for the configured API key. Confirm Render is using the live secret key from this Stripe Connect platform account.";
  }
  return message || fallback;
}

function saveArtistStripeSnapshot(artist, account = {}) {
  if (!artist || !account?.id) return artist;
  artist.stripeAccountId = account.id;
  artist.stripeAccountStatus = stripeAccountStatus(account);
  artist.stripeChargesEnabled = Boolean(account.charges_enabled);
  artist.stripePayoutsEnabled = Boolean(account.payouts_enabled);
  artist.stripeDetailsSubmitted = Boolean(account.details_submitted);
  artist.stripeRequirementsDue = [
    ...(account.requirements?.currently_due || []),
    ...(account.requirements?.past_due || []),
  ];
  artist.stripeLastCheckedAt = new Date().toISOString();
  return artist;
}

async function refreshArtistStripeStatus(store, artist) {
  if (!artist?.stripeAccountId || !stripeConnectReady) return artist;
  try {
    const account = await stripe.accounts.retrieve(artist.stripeAccountId);
    saveArtistStripeSnapshot(artist, account);
    await writeStore(store);
  } catch {
    artist.stripeAccountStatus = "pending_verification";
    artist.stripeLastCheckedAt = new Date().toISOString();
  }
  return artist;
}

function transactionGrossAmount(transaction) {
  return Number(transaction?.grossAmount ?? transaction?.amount ?? 0);
}

function transactionArtistPayout(transaction) {
  const gross = transactionGrossAmount(transaction);
  if (transaction?.payoutModel === "mba_80_20" && Number.isFinite(Number(transaction.artistPayout))) {
    return Number(transaction.artistPayout || 0);
  }
  return Math.max(0, gross * (ARTIST_PAYOUT_PERCENT / 100));
}

function artistPayoutSummary(store, artistId) {
  const transactions = (store.transactions || []).filter((transaction) => String(transaction.artistId) === String(artistId));
  const downloadTransactions = transactions.filter((transaction) => transaction.type === "download");
  const totalEarnings = downloadTransactions.reduce((sum, transaction) => sum + transactionArtistPayout(transaction), 0);
  const totalPaidOut = downloadTransactions
    .filter((transaction) => transaction.payoutStatus === "paid")
    .reduce((sum, transaction) => sum + transactionArtistPayout(transaction), 0);
  const pendingBalance = downloadTransactions
    .filter((transaction) => transaction.payoutStatus === "processing")
    .reduce((sum, transaction) => sum + transactionArtistPayout(transaction), 0);
  const availableBalance = Math.max(0, totalEarnings - totalPaidOut - pendingBalance);
  const payoutHistory = downloadTransactions
    .filter((transaction) => transaction.payoutStatus || transaction.paidOutAt)
    .slice()
    .sort((a, b) => new Date(b.paidOutAt || b.createdAt || 0) - new Date(a.paidOutAt || a.createdAt || 0))
    .map((transaction) => ({
      id: transaction.id,
      amount: transactionArtistPayout(transaction),
      status: transaction.payoutStatus || "pending",
      date: transaction.paidOutAt || transaction.createdAt || "",
      releaseId: transaction.releaseId || "",
    }));
  return {
    totalEarnings,
    totalPaidOut,
    availableBalance,
    pendingBalance,
    nextEstimatedPayoutDate: "",
    payoutHistory,
  };
}

async function sendArtistStripeStatus(request, response) {
  const artistSession = getArtistSession(request);
  if (!artistSession) {
    sendArtistUnauthorized(response);
    return;
  }
  const store = await readStore();
  const artist = (store.artists || []).find((item) => String(item.id) === String(artistSession.session.artistId));
  if (!artist) {
    sendJson(response, 404, { error: "Artist profile not found." });
    return;
  }
  await refreshArtistStripeStatus(store, artist);
  sendJson(response, 200, {
    ok: true,
    stripeConfigured: stripeConnectReady,
    stripeMode: stripeApiMode,
    status: artist.stripeAccountStatus || (artist.stripeAccountId ? "pending_verification" : "not_connected"),
    accountId: artist.stripeAccountId || "",
    chargesEnabled: Boolean(artist.stripeChargesEnabled),
    payoutsEnabled: Boolean(artist.stripePayoutsEnabled),
    detailsSubmitted: Boolean(artist.stripeDetailsSubmitted),
    requirementsDue: artist.stripeRequirementsDue || [],
    ...artistPayoutSummary(store, artist.id),
  });
}

async function createArtistStripeAccountLink(request, response) {
  const artistSession = getArtistSession(request);
  if (!artistSession) {
    sendArtistUnauthorized(response);
    return;
  }
  if (!stripeConnectReady) {
    sendJson(response, 503, {
      error: "Stripe Connect is not configured. Add a valid STRIPE_SECRET_KEY in Render environment variables.",
    });
    return;
  }

  const store = await readStore();
  const account = (store.artistAccounts || []).find((item) => item.id === artistSession.session.accountId);
  const artist = (store.artists || []).find((item) => String(item.id) === String(artistSession.session.artistId));
  if (!account || !artist) {
    sendJson(response, 404, { error: "Artist account not found." });
    return;
  }

  if (!artist.stripeAccountId) {
    let stripeAccount;
    try {
      stripeAccount = await stripe.accounts.create({
        type: "express",
        email: account.email || undefined,
        business_profile: {
          name: artist.name || account.artistName || "MusicBusiness Arena Artist",
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          artistId: artist.id,
          artistName: artist.name || account.artistName || "",
          platform: "MusicBusiness Arena",
        },
      });
    } catch (error) {
      sendJson(response, 400, {
        error: stripeConnectErrorMessage(error, "Unable to create a Stripe Connect Express account."),
      });
      return;
    }
    saveArtistStripeSnapshot(artist, stripeAccount);
    await writeStore(store);
  } else {
    await refreshArtistStripeStatus(store, artist);
    if ((artist.stripeAccountStatus || "") === "connected") {
      try {
        const loginLink = await stripe.accounts.createLoginLink(artist.stripeAccountId);
        sendJson(response, 200, { ok: true, url: loginLink.url, mode: "dashboard" });
      } catch (error) {
        sendJson(response, 400, { error: stripeConnectErrorMessage(error, "Unable to open Stripe Express Dashboard.") });
      }
      return;
    }
  }

  const origin = requestOrigin(request);
  let accountLink;
  try {
    accountLink = await stripe.accountLinks.create({
      account: artist.stripeAccountId,
      refresh_url: `${origin}/artist-dashboard?section=earnings&stripe=refresh`,
      return_url: `${origin}/artist-dashboard?section=earnings&stripe=return`,
      type: "account_onboarding",
    });
  } catch (error) {
    sendJson(response, 400, { error: stripeConnectErrorMessage(error, "Unable to open Stripe Connect onboarding.") });
    return;
  }
  sendJson(response, 200, { ok: true, url: accountLink.url });
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
  if (artist.stripeAccountId) await refreshArtistStripeStatus(store, artist);
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
  const payoutBreakdown = salePayoutBreakdownMinor(unitAmount);
  const connectedAccountId =
    artist.stripeAccountStatus === "connected" && artist.stripeAccountId
      ? artist.stripeAccountId
      : "";
  const artistTransferMinor = connectedAccountId ? payoutBreakdown.artistPayout : 0;
  const productName = `Download ${release.title || "song"} by ${artistLabel}`;
  const metadata = {
    checkoutType,
    releaseId: release.id,
    artistId: release.artistId || "",
    artistName: artistLabel,
    releaseTitle: release.title || "",
    artistPayoutPercent: String(ARTIST_PAYOUT_PERCENT),
    platformFeePercent: String(PLATFORM_SERVICE_FEE_PERCENT),
    paymentProcessingFeePercent: String(PAYMENT_PROCESSING_FEE_PERCENT),
    platformOperationsFeePercent: String(PLATFORM_OPERATIONS_FEE_PERCENT),
    platformFeeMinor: String(payoutBreakdown.platformServiceFee),
    paymentProcessingFeeMinor: String(payoutBreakdown.paymentProcessingFee),
    platformOperationsFeeMinor: String(payoutBreakdown.platformOperationsFee),
    totalDeductionMinor: String(payoutBreakdown.totalDeductions),
    artistTransferMinor: String(artistTransferMinor),
    stripeTransferDestination: connectedAccountId,
    stripeTransferMode: connectedAccountId ? "automatic_destination" : "pending_connect",
  };
  const productData = {
    name: productName,
    description: `Paid music download on MusicBusiness Arena.`,
  };
  const imageUrl = checkoutImageUrl(origin, release.cover);
  if (imageUrl) productData.images = [imageUrl];
  const downloadPath = releasePublicPath("download", release, artist);

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
    success_url: `${origin}${downloadPath}?checkout=success&type=${checkoutType}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${downloadPath}?checkout=cancelled`,
  };

  if (connectedAccountId && checkoutType === "download") {
    sessionParams.payment_intent_data.application_fee_amount = payoutBreakdown.totalDeductions;
    sessionParams.payment_intent_data.transfer_data = {
      destination: connectedAccountId,
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  sendJson(response, 200, { url: session.url });
}

/* ===================================================
   PAID DOWNLOAD ACCESS

   Controls one-time paid download access after a successful
   Stripe payment.

   Used by:
   - Download Song File button
   - Download Count analytics
=================================================== */
async function paidDownloadPurchase(sessionId, releaseId) {
  if (!stripe || !hasValidStripeSecretKey) {
    return { status: 503, error: "Stripe is not configured." };
  }

  if (!sessionId) return { status: 400, error: "Stripe checkout session is required." };

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "payment_intent.latest_charge.balance_transaction"],
    });
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
    const currency = normalizedCurrency(session.currency || release.currency || "usd");
    const amountMinor = Number(session.amount_total || 0);
    const amount = fromMinorUnits(amountMinor, currency);
    const paymentIntent = typeof session.payment_intent === "string" ? null : session.payment_intent;
    const balanceTransaction = paymentIntent?.latest_charge?.balance_transaction;
    const stripeActualFee = fromMinorUnits(Number(balanceTransaction?.fee || 0), currency);
    const payoutBreakdown = salePayoutBreakdownMinor(amountMinor);
    const platformFee = fromMinorUnits(
      Number(session.metadata?.platformFeeMinor || payoutBreakdown.platformServiceFee),
      currency
    );
    const paymentProcessingFee = fromMinorUnits(
      Number(session.metadata?.paymentProcessingFeeMinor || payoutBreakdown.paymentProcessingFee),
      currency
    );
    const platformOperationsFee = fromMinorUnits(
      Number(session.metadata?.platformOperationsFeeMinor || payoutBreakdown.platformOperationsFee),
      currency
    );
    const totalDeductions = fromMinorUnits(
      Number(session.metadata?.totalDeductionMinor || payoutBreakdown.totalDeductions),
      currency
    );
    const artistPayout = fromMinorUnits(
      Number(session.metadata?.artistTransferMinor || payoutBreakdown.artistPayout),
      currency
    );
    const stripeTransferDestination = session.metadata?.stripeTransferDestination || "";
    transaction = {
      id: `txn-${session.id}`,
      releaseId: release.id,
      artistId: release.artistId || "",
      type: "download",
      amount,
      grossAmount: amount,
      paymentProcessingFee,
      platformFee,
      platformOperationsFee,
      totalDeductions,
      artistPayout,
      artistPayoutPercent: ARTIST_PAYOUT_PERCENT,
      platformFeePercent: PLATFORM_SERVICE_FEE_PERCENT,
      paymentProcessingFeePercent: PAYMENT_PROCESSING_FEE_PERCENT,
      platformOperationsFeePercent: PLATFORM_OPERATIONS_FEE_PERCENT,
      stripeActualFee,
      stripeApplicationFeeAmount: totalDeductions,
      stripeTransferAmount: artistPayout,
      stripeTransferDestination,
      stripeTransferMode: session.metadata?.stripeTransferMode || (stripeTransferDestination ? "automatic_destination" : "pending_connect"),
      currency,
      checkoutSessionId: session.id,
      paymentIntentId,
      paymentStatus: "paid",
      downloaded: false,
      downloadedAt: "",
      payoutStatus: stripeTransferDestination ? "processing" : "pending",
      payoutModel: "mba_80_20",
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

/* ===================================================
   PUBLIC ROUTES AND STATIC FILE SERVING

   Maps clean public URLs to the correct HTML files and static
   assets.

   Used by:
   - Homepage
   - Artist pages
   - Music pages
   - Video pages
   - Upload and login pages
=================================================== */
const CLEAN_ROUTES = {
  "/dashboard": "/main dashboard.html",
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

function redirect(response, location, status = 302) {
  response.writeHead(status, {
    Location: location,
    "Cache-Control": "no-store",
  });
  response.end();
}

function artistSlug(artist = {}) {
  return slugify(artist.slug || artist.handle || artist.name || artist.id || "artist");
}

function releaseSlug(release = {}) {
  return slugify(release.slug || release.title || release.id || "song");
}

function releasePublicPath(type, release = {}, artist = {}) {
  const artistPart = artistSlug(artist);
  const releasePart = releaseSlug(release);
  return artistPart ? `/${type}/${artistPart}/${releasePart}` : `/${type}/${releasePart}`;
}

function artistBySlug(store, slug) {
  const wanted = slugify(slug);
  return (store.artists || []).find((artist) => artistSlug(artist) === wanted);
}

function cleanReleaseRouteForPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.some((part) => part.includes("."))) return null;
  const [type] = parts;
  if (type === "listen") return { file: "/artist-page-2.html", type };
  if (type === "download") return { file: "/download.html", type };
  return null;
}

async function artistRouteForPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length || parts.length > 2) return null;
  if (parts.some((part) => part.includes("."))) return null;
  let [slug, section = "profile"] = parts;
  if (parts.length === 1 && /-dashboard$/i.test(slug)) {
    slug = slug.replace(/-dashboard$/i, "");
    section = "dashboard";
  }
  if (!["profile", "music", "beats", "videos", "video", "dashboard"].includes(section)) return null;
  const store = await readStore();
  const artist = artistBySlug(store, slug);
  if (!artist) return null;
  if (section === "beats") section = "music";
  const normalizedSection = section === "video" ? "videos" : section;
  const file =
    normalizedSection === "music"
      ? "/artist-page.html"
      : normalizedSection === "videos"
        ? "/videos.html"
        : normalizedSection === "dashboard"
          ? "/artist-dashboard.html"
          : "/index.html";
  return { artist, file, section: normalizedSection };
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

  if (requestedPath === "/" || requestedPath === "/home") {
  redirect(response, "/dashboard");
  return;
}

  if ((requestedPath === "/upload" || requestedPath === "/upload.html") && getArtistSession(request)) {
    redirect(response, "/artist-dashboard");
    return;
  }

  if ((requestedPath === "/artist-login" || requestedPath === "/artist-login.html") && getArtistSession(request)) {
    redirect(response, "/artist-dashboard");
    return;
  }

  if (LEGACY_REDIRECTS[requestedPath]) {
    redirect(response, `${LEGACY_REDIRECTS[requestedPath]}${url.search}`);
    return;
  }

  if (isArtistDashboardRequest(request) && !getArtistSession(request)) {
    redirect(response, "/artist-login");
    return;
  }

  const artistRoute = await artistRouteForPath(requestedPath);
  const cleanReleaseRoute = cleanReleaseRouteForPath(requestedPath);
  if (artistRoute?.section === "dashboard") {
    if (!getArtistSession(request)) {
      redirect(response, "/artist-login?next=/artist-dashboard");
      return;
    }
    redirect(response, `/artist-dashboard${url.search}`);
    return;
  }

  const pathname = cleanReleaseRoute?.file || artistRoute?.file || CLEAN_ROUTES[requestedPath] || requestedPath;
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

/* ===================================================
   API ROUTER

   Decides what should happen for each browser request.
   This section connects URLs to the correct backend function
   or public file.

   Used by every page request and every API request.
=================================================== */
async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (
      url.pathname === "/store-manager-login" ||
      url.pathname === "/store-manager-login.html" ||
      url.pathname === "/store-manager-forgot-password" ||
      url.pathname === "/store-manager-forgot-password.html" ||
      url.pathname === "/store-manager-reset-password" ||
      url.pathname === "/store-manager-reset-password.html"
    ) {
      redirect(response, "/store-manager");
      return;
    }

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

    if (url.pathname === "/api/contact-message" && request.method === "POST") {
      await submitContactMessage(request, response);
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

    if ((url.pathname === "/artist-login" || url.pathname === "/artist-login.html") && request.method === "POST") {
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

    if (url.pathname === "/api/artist/stripe-status" && request.method === "GET") {
      await sendArtistStripeStatus(request, response);
      return;
    }

    if (url.pathname === "/api/artist/connect-stripe" && request.method === "POST") {
      await createArtistStripeAccountLink(request, response);
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
      sendJsonWithHeaders(response, 200, {
        authenticated: true,
        configured: false,
        account: {
          id: "open-store-manager",
          email: "",
          role: "store-manager",
        },
      }, {
        "Cache-Control": "no-store",
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

    if (url.pathname === "/api/admin/store" && request.method === "GET") {
      sendJson(response, 200, await readStore());
      return;
    }

    if (url.pathname === "/api/admin/logout" && request.method === "POST") {
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
      const body = await readRequestBody(request);
      const payload = JSON.parse(body);
      const incoming = await normalizeUploads(payload.store || payload);
      const auditReason = auditReasonForAdminSave(payload);
      if (auditReason) {
        incoming.auditLogs = [
          ...(incoming.auditLogs || []),
          adminAuditLogEntry(adminSession.session, "Store Manager data update", auditReason),
        ];
      }
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
