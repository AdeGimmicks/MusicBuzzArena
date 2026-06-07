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

function markActiveGenreLink() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".genre-strip a").forEach((link) => {
    link.classList.toggle("is-current", link.getAttribute("href") === page);
  });
}

function currentGenre() {
  return document.body.dataset.genre || "";
}

function normalizeGenre(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized === "afrobeat" ? "afrobeats" : normalized;
}

function releaseCard(release, artist) {
  const card = document.createElement("article");
  card.className = "release-card";
  card.innerHTML = `
    <div class="release-cover-frame">
      <img class="release-cover" src="${release.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="${release.title} cover" />
    </div>
    <div class="release-body">
      <p class="release-meta">${release.releaseType || "Single"} | ${release.genre || "Music"}</p>
      <h3>${release.title || "Untitled release"}</h3>
      <span>${artist?.name || release.artistName || "Independent Artist"}</span>
      <div class="mini-actions">
        <a class="listen-action" href="artist-page-2.html?release=${encodeURIComponent(release.id)}">Listen</a>
      </div>
    </div>
  `;
  return card;
}

function emptyShelf(text) {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = text;
  return empty;
}

function renderShelf(container, releases, store, emptyText) {
  container.replaceChildren();
  const visibleReleases = releases.slice(0, 20);

  if (!visibleReleases.length) {
    container.append(emptyShelf(emptyText));
    return;
  }

  visibleReleases.forEach((release) => {
    const artist = store.artists.find((item) => item.id === release.artistId);
    container.append(releaseCard(release, artist));
  });
}

let featureReleases = [];
let featureSlideIndex = 0;

function rotateFeatureBanner() {
  const cover = document.querySelector("#featureCover");
  if (!cover || !featureReleases.length) return;

  const release = featureReleases[featureSlideIndex % featureReleases.length];
  if (!release?.cover) return;

  cover.classList.add("is-changing");
  window.setTimeout(() => {
    cover.src = release.cover;
    cover.classList.remove("is-changing");
  }, 140);
  featureSlideIndex = (featureSlideIndex + 1) % featureReleases.length;
}

function updateFeatureBanner(releases) {
  featureReleases = releases.filter((release) => release.cover).slice(0, 12);
  featureSlideIndex = 0;
  rotateFeatureBanner();
}

function currentStoreSnapshot(store) {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const releaseKey = (store.releases || [])
    .map((release) => `${release.id}:${release.title}:${release.genre}:${release.status}:${release.cover}`)
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

async function renderHome(force = false) {
  const store = await window.MBA.loadStore();
  const snapshot = renderedSnapshot(store);
  if (!force && snapshot === lastHomeSnapshot) return;
  lastHomeSnapshot = snapshot;

  applySiteContent(store);
  markActiveGenreLink();

  const approvedArtists = new Set(
    store.artists.filter((artist) => (artist.status || "approved") === "approved").map((artist) => artist.id)
  );
  const approved = window.MBA
    .approvedReleases(store)
    .filter((release) => approvedArtists.has(release.artistId))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const genre = currentGenre();
  const visible = genre ? approved.filter((release) => normalizeGenre(release.genre) === genre) : approved;
  const genreLabel = document.body.dataset.genreLabel;

  if (genreLabel) {
    setText("[data-genre-title]", `${genreLabel} music`);
  }

  renderShelf(
    document.querySelector("#latestSongsGrid"),
    visible,
    store,
    genreLabel
      ? `Approved ${genreLabel} songs will appear here after Store Manager approves uploads.`
      : "Approved songs will appear here after Store Manager approves uploads."
  );
  updateFeatureBanner(visible);
}

renderHome(true);
setInterval(() => renderHome(), 2000);
setInterval(rotateFeatureBanner, 4200);
