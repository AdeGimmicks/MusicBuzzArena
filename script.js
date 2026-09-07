/* ===================================================
   ARTIST HOME PAGE SCRIPT

   CODE OWNER GUIDE

   Loads artist profile details, artist songs, search behavior, and public artist navigation.
   Used by: index.html.
   Does not control Stripe checkout, artist login, or Store Manager pages.
=================================================== */

/* ===================================================
   HOMEPAGE HELPERS

   Shared helpers for writing text, creating slugs, building
   clean public links, and applying site-wide content.

   Used by:
   - index.html
=================================================== */
function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    if (value) node.textContent = value;
  });
}

function applySiteContent(store) {
  const site = store.site || {};
  document.title = site.title || "MusicBusiness Arena";
  document.querySelectorAll("[data-logo]").forEach((img) => {
    img.src = site.logo || "Mba Logos/MusicBusiness Logo.png";
  });
  Object.entries(site).forEach(([key, value]) => setText(`[data-site="${key}"]`, value));
}

const SIMPLE_SOCIAL_ICONS = {
  instagram: "https://cdn.simpleicons.org/instagram/FFFFFF",
  facebook: "https://cdn.simpleicons.org/facebook/FFFFFF",
  x: "https://cdn.simpleicons.org/x/FFFFFF",
  youtube: "https://cdn.simpleicons.org/youtube/FFFFFF",
  tiktok: "https://cdn.simpleicons.org/tiktok/FFFFFF",
  spotify: "https://cdn.simpleicons.org/spotify/FFFFFF",
  audiomack: "https://cdn.simpleicons.org/audiomack/FFFFFF",
  soundcloud: "https://cdn.simpleicons.org/soundcloud/FFFFFF",
  threads: "https://cdn.simpleicons.org/threads/FFFFFF",
  linkedin: "https://cdn.simpleicons.org/linkedin/FFFFFF",
  snapchat: "https://cdn.simpleicons.org/snapchat/FFFFFF",
  whatsapp: "https://cdn.simpleicons.org/whatsapp/FFFFFF",
  telegram: "https://cdn.simpleicons.org/telegram/FFFFFF",
  email: "https://cdn.simpleicons.org/maildotru/FFFFFF",
  website: "https://cdn.simpleicons.org/linktree/FFFFFF",
};

function slugify(value) {
  return String(value || "artist")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function artistSlug(artist) {
  return slugify(artist?.slug || artist?.handle || artist?.name || artist?.id);
}

function releaseSlug(release) {
  return slugify(release?.slug || release?.title || release?.id || "song");
}

function releasePublicUrl(type, release, artist) {
  const artistPart = artistSlug(artist);
  const releasePart = releaseSlug(release);
  return artistPart ? `/${type}/${artistPart}/${releasePart}` : `/${type}/${releasePart}`;
}

function isDownloadOnlyRelease(release) {
  return release?.downloadOnly === true || release?.releaseType === "Beat / Instrumental";
}

let activeArtworkAudio = null;
let activeArtworkButton = null;
const COMPLIMENTARY_GATE_SECONDS = 30;

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function canPlayComplimentaryRelease(release) {
  return release?.allowComplimentaryFullListen === true && Boolean(release.audioUrl);
}

function listenerEmailKey(artist) {
  return `mba-listener-email:${artist?.id || "artist"}`;
}

function storedListenerEmail(artist) {
  try {
    return localStorage.getItem(listenerEmailKey(artist)) || localStorage.getItem("mba-listener-email") || "";
  } catch {
    return "";
  }
}

function storeListenerEmail(artist, email) {
  try {
    localStorage.setItem(listenerEmailKey(artist), email);
    localStorage.setItem("mba-listener-email", email);
  } catch {
    // The server still records the email even when browser storage is unavailable.
  }
}

async function complimentaryListenStatus(artist, release, email) {
  if (!email) return { registered: false, completed: false };
  const params = new URLSearchParams({
    artistId: artist?.id || "",
    releaseId: release?.id || "",
    email,
  });
  const response = await fetch(`/api/complimentary-listen-status?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) return { registered: false, completed: false };
  return response.json();
}

async function markComplimentaryListenComplete(artist, release, email) {
  const response = await fetch("/api/complimentary-listen-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      artistId: artist?.id || "",
      releaseId: release?.id || "",
      email,
    }),
  });
  return response.json().catch(() => ({}));
}

function ensureComplimentaryModal() {
  let modal = document.querySelector("[data-complimentary-modal]");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.className = "link-modal complimentary-listen-modal";
  modal.dataset.complimentaryModal = "";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="link-modal-card complimentary-listen-card" role="dialog" aria-modal="true" aria-labelledby="complimentaryListenTitle">
      <button class="link-modal-close" type="button" data-close-complimentary-modal aria-label="Close">×</button>
      <h2 id="complimentaryListenTitle"></h2>
      <p data-complimentary-message></p>
      <label class="subscribe-email" data-complimentary-email-field>
        <span>Email</span>
        <input type="email" placeholder="you@example.com" autocomplete="email">
      </label>
      <label class="subscribe-consent" data-complimentary-consent-field>
        <input type="checkbox">
        <span>I agree to receive updates from MusicBusiness Arena about this artist.</span>
      </label>
      <p class="subscribe-status" data-complimentary-status aria-live="polite"></p>
      <button class="modal-primary" type="button" data-submit-complimentary-email>Continue Listening</button>
      <a class="modal-primary complimentary-download-link" data-complimentary-download href="#">Download</a>
    </div>
  `;
  document.body.append(modal);
  modal.querySelector("[data-close-complimentary-modal]")?.addEventListener("click", () => {
    modal.setAttribute("aria-hidden", "true");
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.setAttribute("aria-hidden", "true");
  });
  return modal;
}

function showComplimentarySubscribeModal(artist, release, onSubscribed) {
  const modal = ensureComplimentaryModal();
  modal.querySelector("#complimentaryListenTitle").textContent = "Subscribe to keep listening";
  modal.querySelector("[data-complimentary-message]").textContent =
    `Enter your email to finish listening to ${release.title || "this song"} by ${artist?.name || release.artistName || "this artist"}.`;
  modal.querySelector("[data-complimentary-email-field]").hidden = false;
  modal.querySelector("[data-complimentary-consent-field]").hidden = false;
  modal.querySelector("[data-submit-complimentary-email]").hidden = false;
  modal.querySelector("[data-complimentary-download]").hidden = true;
  modal.querySelector("[data-complimentary-status]").textContent = "";
  modal.querySelector(".subscribe-email input").value = storedListenerEmail(artist);
  modal.querySelector(".subscribe-consent input").checked = false;
  modal.setAttribute("aria-hidden", "false");
  modal.querySelector(".subscribe-email input")?.focus();
  modal.querySelector("[data-submit-complimentary-email]").onclick = async (event) => {
    const button = event.currentTarget;
    const emailInput = modal.querySelector(".subscribe-email input");
    const consentInput = modal.querySelector(".subscribe-consent input");
    const status = modal.querySelector("[data-complimentary-status]");
    const email = String(emailInput?.value || "").trim();
    if (!email) {
      status.textContent = "Please enter your email address.";
      emailInput?.focus();
      return;
    }
    if (!consentInput?.checked) {
      status.textContent = "Please confirm that MusicBusiness Arena can email you about this artist.";
      consentInput?.focus();
      return;
    }
    button.disabled = true;
    button.textContent = "Saving...";
    try {
      const response = await fetch("/api/artist-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist?.id || "",
          releaseId: release?.id || "",
          email,
          sourceUrl: window.location.href,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Subscription could not be saved.");
      storeListenerEmail(artist, email);
      modal.setAttribute("aria-hidden", "true");
      onSubscribed(email, payload);
    } catch (error) {
      status.textContent = error.message || "Subscription could not be saved.";
    } finally {
      button.disabled = false;
      button.textContent = "Continue Listening";
    }
  };
}

function showComplimentaryUsedModal(artist, release) {
  const modal = ensureComplimentaryModal();
  const downloadUrl = releasePublicUrl("download", release, artist);
  modal.querySelector("#complimentaryListenTitle").textContent = "Complimentary listen used";
  modal.querySelector("[data-complimentary-message]").textContent =
    "You've enjoyed your complimentary full listen. Support the artist by downloading the song to keep listening anytime on your device.";
  modal.querySelector("[data-complimentary-email-field]").hidden = true;
  modal.querySelector("[data-complimentary-consent-field]").hidden = true;
  modal.querySelector("[data-submit-complimentary-email]").hidden = true;
  modal.querySelector("[data-complimentary-status]").textContent = "";
  const download = modal.querySelector("[data-complimentary-download]");
  download.hidden = false;
  download.href = downloadUrl;
  download.textContent = `Download ${money(release.price || 0)}`;
  modal.setAttribute("aria-hidden", "false");
}

function resetArtworkButton(button) {
  if (!button) return;
  button.classList.remove("is-playing");
  button.textContent = "▶ Play";
  button.setAttribute("aria-label", "Play song");
}

function stopActiveArtworkAudio(exceptAudio = null) {
  if (activeArtworkAudio && activeArtworkAudio !== exceptAudio) {
    activeArtworkAudio.pause();
    activeArtworkAudio.currentTime = 0;
    resetArtworkButton(activeArtworkButton);
  }
  if (!exceptAudio) {
    activeArtworkAudio = null;
    activeArtworkButton = null;
  }
}

function attachArtworkPlayer(button, release, artist) {
  if (!button || !release?.audioUrl) return;
  const audio = new Audio(release.audioUrl);
  audio.preload = "metadata";
  let listenerEmail = storedListenerEmail(artist);
  let registered = Boolean(listenerEmail);
  let completed = false;
  let prompted = false;
  let listenedSeconds = 0;
  let lastTime = 0;
  let hasStarted = false;
  const setPlaying = (isPlaying) => {
    button.classList.toggle("is-playing", isPlaying);
    button.textContent = isPlaying ? "❚❚ Pause" : "▶ Play";
    button.setAttribute("aria-label", `${isPlaying ? "Pause" : "Play"} ${release.title || "song"}`);
  };
  const canMarkComplete = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (!duration) return false;
    return listenedSeconds >= Math.max(1, duration - 2);
  };

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (listenerEmail) {
      const status = await complimentaryListenStatus(artist, release, listenerEmail);
      registered = Boolean(status.registered);
      completed = Boolean(status.completed);
      if (completed) {
        showComplimentaryUsedModal(artist, release);
        return;
      }
    }
    stopActiveArtworkAudio(audio);
    activeArtworkAudio = audio;
    activeArtworkButton = button;
    try {
      await audio.play();
    } catch {
      setPlaying(false);
    }
  });

  audio.addEventListener("timeupdate", () => {
    const currentTime = audio.currentTime;
    const delta = currentTime - lastTime;
    if (!audio.paused && delta > 0 && delta < 2.5) listenedSeconds += delta;
    lastTime = currentTime;
    if (!registered && !prompted && currentTime >= COMPLIMENTARY_GATE_SECONDS) {
      prompted = true;
      audio.pause();
      showComplimentarySubscribeModal(artist, release, async (email, payload) => {
        listenerEmail = email;
        registered = true;
        if (payload?.complimentaryListenCompleted) {
          completed = true;
          showComplimentaryUsedModal(artist, release);
          return;
        }
        try {
          await audio.play();
        } catch {
          setPlaying(false);
        }
      });
    }
  });
  audio.addEventListener("play", () => setPlaying(true));
  audio.addEventListener("pause", () => setPlaying(false));
  audio.addEventListener("playing", () => {
    if (!hasStarted) {
      hasStarted = true;
      lastTime = audio.currentTime;
    }
  });
  audio.addEventListener("seeked", () => {
    lastTime = audio.currentTime;
  });
  audio.addEventListener("ended", async () => {
    setPlaying(false);
    if (registered && listenerEmail && !completed && canMarkComplete()) {
      const payload = await markComplimentaryListenComplete(artist, release, listenerEmail);
      completed = payload?.completed === true;
    }
    if (activeArtworkAudio === audio) activeArtworkAudio = null;
    if (activeArtworkButton === button) activeArtworkButton = null;
  });
}

function artistFromPath(store) {
  const slug = window.location.pathname.split("/").filter(Boolean)[0];
  if (!slug || slug === "home") return null;
  return (store.artists || []).find((artist) => artistSlug(artist) === slug) || null;
}

function hasArtistSlugInPath() {
  const slug = window.location.pathname.split("/").filter(Boolean)[0];
  return Boolean(slug && slug !== "home");
}

function setArtistNav(artist) {
  if (!artist) return;
  window.MBAPublicContext?.applyPublicArtistNavigation(artist);
}

/* ===================================================
   ARTIST HOME PROFILE

   Controls the artist biography card, social icons, artist
   photo, and video button on the artist home page.
=================================================== */
function renderHomeArtist(artist) {
  const name = artist?.name || "Independent Artist";
  const photo = artist?.photo || "Mba Logos/MusicBusiness Logo.png";
  const bio = artist?.bio || "Artist biography will appear here after the artist saves a profile.";
  const photoNode = document.querySelector("#homeArtistPhoto");
  const nameNode = document.querySelector("#homeArtistName");
  const bioNode = document.querySelector("#homeArtistBio");
  const bioToggle = document.querySelector("#homeBioToggle");
  const songsHeading = document.querySelector("#homeSongsHeading");
  const socialsNode = document.querySelector("#homeSocialLinks");
  const videoLink = document.querySelector("#homeVideoLink");

  if (photoNode) {
    photoNode.src = photo;
    photoNode.alt = `${name} profile photo`;
  }
  if (nameNode) nameNode.textContent = name;
  if (songsHeading) songsHeading.textContent = `Singles by ${name}`;
  if (bioNode) {
    bioNode.textContent = bio;
    bioNode.classList.remove("is-expanded");
  }
  if (bioToggle) {
    const canExpand = bio.length > 118;
    bioToggle.hidden = !canExpand;
    bioToggle.textContent = "More";
    bioToggle.onclick = () => {
      const expanded = bioNode?.classList.toggle("is-expanded");
      bioToggle.textContent = expanded ? "Less" : "More";
    };
  }
  if (videoLink && artist?.id) videoLink.href = `/${artistSlug(artist)}/videos`;

  if (!socialsNode) return;
  socialsNode.replaceChildren();
  SOCIAL_LINKS.forEach(([label, key]) => {
    const href = artist?.socials?.[key];
    if (!href) return;
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.title = label;
    link.innerHTML = SIMPLE_SOCIAL_ICONS[key]
      ? `<img src="${SIMPLE_SOCIAL_ICONS[key]}" alt="${label}">`
      : `<span>${label}</span>`;
    socialsNode.append(link);
  });
}

/* ===================================================
   ARTIST HOME SONG CARDS

   Builds the round release cards and Listen buttons shown
   under the artist biography.
=================================================== */
function releaseCard(release, artist) {
  const card = document.createElement("article");
  card.className = "release-card";
  const actionUrl = releasePublicUrl(isDownloadOnlyRelease(release) ? "download" : "listen", release, artist);
  const actionLabel = isDownloadOnlyRelease(release) ? "Download" : "Listen";
  card.dataset.search = [
    release.title,
    artist?.name || release.artistName,
    release.genre,
    release.secondaryGenre,
    release.releaseType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  card.dataset.href = actionUrl;
  card.tabIndex = 0;
  card.setAttribute("role", "link");
  card.setAttribute("aria-label", `Open ${actionLabel} page for ${release.title || "Untitled release"}`);
  card.innerHTML = `
    <div class="release-cover-frame">
      <img class="release-cover" src="${release.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="${release.title} cover" loading="lazy" decoding="async" />
      ${
        canPlayComplimentaryRelease(release)
          ? `<button class="artwork-play-button" type="button" data-artwork-play aria-label="Play ${release.title || "song"}">▶ Play</button>`
          : ""
      }
    </div>
    <div class="release-body">
      <p class="release-meta">${release.releaseType || "Single"} | ${release.genre || "Music"}</p>
      <h3>${release.title || "Untitled release"}</h3>
      <span>${artist?.name || release.artistName || "Independent Artist"}</span>
      <div class="mini-actions">
        <a class="listen-action" href="${actionUrl}">${actionLabel}</a>
      </div>
    </div>
  `;
  card.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    window.location.href = actionUrl;
  });
  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    window.location.href = actionUrl;
  });
  attachArtworkPlayer(card.querySelector("[data-artwork-play]"), release, artist);
  return card;
}

function artistCard(artist, releases) {
  const card = document.createElement("article");
  card.className = "platform-artist-card";
  const slug = artistSlug(artist);
  const artistReleases = releases.filter((release) => release.artistId === artist.id);
  card.innerHTML = `
    <a href="/${slug}" aria-label="Open ${artist.name || "artist"} profile">
      <img src="${artist.photo || artistReleases[0]?.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="${artist.name || "Artist"} photo">
      <strong>${artist.name || "Independent Artist"}</strong>
      <span>${artistReleases.length} ${artistReleases.length === 1 ? "release" : "releases"}</span>
    </a>
  `;
  return card;
}

function applyHomeSearch() {
  const input = document.querySelector("#homeSearch");
  const grid = document.querySelector("#latestSongsGrid");
  if (!input || !grid) return;

  const query = input.value.trim().toLowerCase();
  const cards = [...grid.querySelectorAll(".release-card")];
  grid.querySelector(".search-empty-state")?.remove();

  cards.forEach((card) => {
    card.hidden = Boolean(query) && !card.dataset.search.includes(query);
  });

  if (query && cards.length && !cards.some((card) => !card.hidden)) {
    const empty = emptyShelf("No songs matched your search.");
    empty.classList.add("search-empty-state");
    grid.append(empty);
  }
}

function emptyShelf(text) {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = text;
  return empty;
}

function renderShelf(container, releases, store, emptyText) {
  if (!container) return;
  container.setAttribute("aria-busy", "false");
  container.replaceChildren();
  const visibleReleases = releases.slice(0, 20);
  stopActiveArtworkAudio();

  if (!visibleReleases.length) {
    container.append(emptyShelf(emptyText));
    return;
  }

  visibleReleases.forEach((release) => {
    const artist = store.artists.find((item) => item.id === release.artistId);
    container.append(releaseCard(release, artist));
  });
}

function currentStoreSnapshot(store) {
  const page = window.location.pathname || "/home";
  const releaseKey = (store.releases || [])
    .map((release) => `${release.id}:${release.title}:${release.genre}:${release.status}:${release.cover}:${release.audioUrl}:${release.allowComplimentaryFullListen}`)
    .join("|");
  const artistKey = (store.artists || []).map((artist) => `${artist.id}:${artist.status}`).join("|");
  return `${page}::${releaseKey}::${artistKey}`;
}

function renderedSnapshot(store) {
  try {
    return currentStoreSnapshot(store);
  } catch {
    return JSON.stringify(store);
  }
}

let lastHomeSnapshot = "";

/* ===================================================
   HOMEPAGE RENDER LOOP

   Loads saved website data, finds the current artist, renders
   the artist home page, and refreshes when data changes.
=================================================== */
async function renderHome(force = false) {
  const store = await window.MBA.loadStore({ force });
  const snapshot = renderedSnapshot(store);
  if (!force && snapshot === lastHomeSnapshot) return;
  lastHomeSnapshot = snapshot;

  applySiteContent(store);

  const approvedArtistList = store.artists.filter((artist) => (artist.status || "approved") === "approved");
  const approvedArtists = new Set(approvedArtistList.map((artist) => artist.id));
  const approved = window.MBA
    .approvedReleases(store)
    .filter((release) => approvedArtists.has(release.artistId))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const pathArtist = artistFromPath(store);
  const pageArtist = pathArtist || null;
  const artistHome = document.querySelector("#artistHome");

  if (artistHome) artistHome.hidden = false;
  if (pageArtist) {
    pageArtist.publicCatalogLabel = window.MBAPublicContext?.catalogLabelForArtist(pageArtist, approved) || "Music";
  }
  setArtistNav(pageArtist);
    const brand = document.querySelector(".brand");

  if (brand && pageArtist) {
    brand.href = `/${artistSlug(pageArtist)}`;
  }
  renderHomeArtist(pageArtist);

  const artistReleases = approved.filter((release) => release.artistId === pageArtist?.id);
  renderShelf(
    document.querySelector("#latestSongsGrid"),
    artistReleases,
    store,
    "Approved songs will appear here after this artist uploads music."
  );
  applyHomeSearch();
}

renderHome(true);

window.addEventListener("mba:store-saved", () => renderHome(true));
document.querySelector("#homeSearch")?.addEventListener("input", applyHomeSearch);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderHome(true);
});
window.addEventListener("focus", () => renderHome(true));
