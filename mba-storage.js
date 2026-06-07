const MBA_DEFAULT_STORE = {
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

const MBA_STORAGE_KEY = "musicbusiness-arena-store";
const MBA_API_BASE = window.location.protocol === "file:" ? "http://127.0.0.1:8010" : "";

function apiUrl(path) {
  return `${MBA_API_BASE}${path}`;
}

function cloneDefaultStore() {
  return JSON.parse(JSON.stringify(MBA_DEFAULT_STORE));
}

async function loadStore() {
  try {
    const response = await fetch(apiUrl("/api/store"));
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // File mode fallback.
  }

  try {
    return JSON.parse(localStorage.getItem(MBA_STORAGE_KEY)) || cloneDefaultStore();
  } catch {
    return cloneDefaultStore();
  }
}

async function saveStore(store) {
  try {
    const response = await fetch(apiUrl("/api/store"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(store),
    });

    if (response.ok) {
      const saved = await response.json();
      try {
        localStorage.setItem(MBA_STORAGE_KEY, JSON.stringify(saved));
      } catch {
        // Large media saves to the local server; browser storage is only a small convenience cache.
      }
      return saved;
    }
  } catch (error) {
    if (window.location.protocol === "file:") {
      throw new Error("Open http://127.0.0.1:8010/artist-dashboard.html so uploads save to your computer.");
    }
  }

  try {
    localStorage.setItem(MBA_STORAGE_KEY, JSON.stringify(store));
    return store;
  } catch {
    throw new Error("The browser storage is full. Use http://127.0.0.1:8010/artist-dashboard.html for uploads.");
  }
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function approvedReleases(store) {
  return (store.releases || []).filter((release) => release.status === "approved");
}

window.MBA = {
  loadStore,
  saveStore,
  uid,
  approvedReleases,
  defaults: cloneDefaultStore,
};
