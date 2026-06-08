const MBA_DEFAULT_STORE = {
  site: {
    logo: "Mba Logos/MusicBusiness Logo.png",
    title: "MusicBusiness Arena",
    tagline: "Where Artists Connect. Fans Support. Music Thrives.",
    intro: "Discover releases from independent artists.",
    primaryCta: "Browse Music",
    secondaryCta: "Upload",
    featuredArtistId: "artist-focuzman",
    commissionRate: 15,
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
      audioUrl: "assets/sample/audio/too-late-to-quit.wav",
      audioName: "too-late-to-quit.wav",
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
