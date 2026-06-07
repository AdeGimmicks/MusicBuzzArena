const MBA_STORE_DEFAULT = {
  branding: {
    logo: "Mba Logos/MusicBusiness Logo.png",
  },
  profile: {
    artistName: "",
    bio: "",
    artistPhoto: "",
    instagram: "",
    facebook: "",
    x: "",
    youtube: "",
    tiktok: "",
    soundcloud: "",
    website: "",
    threads: "",
    snapchat: "",
    linkedin: "",
    twitch: "",
  },
  releases: [],
};

const MBA_DB_NAME = "musicBusinessArena";
const MBA_DB_VERSION = 1;
const MBA_OBJECT_STORE = "content";
const MBA_CONTENT_KEY = "artistStore";

function cloneDefaultStore() {
  return JSON.parse(JSON.stringify(MBA_STORE_DEFAULT));
}

function openMbaDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = indexedDB.open(MBA_DB_NAME, MBA_DB_VERSION);

    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MBA_OBJECT_STORE)) {
        db.createObjectStore(MBA_OBJECT_STORE);
      }
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function readFromIndexedDb() {
  const db = await openMbaDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MBA_OBJECT_STORE, "readonly");
    const store = transaction.objectStore(MBA_OBJECT_STORE);
    const request = store.get(MBA_CONTENT_KEY);

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

async function writeToIndexedDb(value) {
  const db = await openMbaDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MBA_OBJECT_STORE, "readwrite");
    const store = transaction.objectStore(MBA_OBJECT_STORE);
    const request = store.put(value, MBA_CONTENT_KEY);

    request.addEventListener("success", () => resolve());
    request.addEventListener("error", () => reject(request.error));
  });
}

async function loadArtistStore() {
  try {
    const response = await fetch("/api/store");
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // When opened as a plain file, fall back to browser storage.
  }

  try {
    const saved = await readFromIndexedDb();
    return saved || cloneDefaultStore();
  } catch {
    try {
      return JSON.parse(window.localStorage?.getItem(MBA_CONTENT_KEY)) || cloneDefaultStore();
    } catch {
      return cloneDefaultStore();
    }
  }
}

async function saveArtistStore(store) {
  try {
    const response = await fetch("/api/store", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(store),
    });

    if (response.ok) {
      const saved = await response.json();
      await writeToIndexedDb(saved);
      return saved;
    }
  } catch {
    // When opened as a plain file, fall back to browser storage.
  }

  await writeToIndexedDb(store);

  try {
    window.localStorage?.setItem(MBA_CONTENT_KEY, JSON.stringify(store));
  } catch {
    // localStorage is only a compatibility fallback; IndexedDB is the source of truth.
  }

  return store;
}

window.MBAStorage = {
  loadArtistStore,
  saveArtistStore,
};
