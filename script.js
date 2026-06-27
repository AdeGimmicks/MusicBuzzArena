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

function artistFromPath(store) {
  const slug = window.location.pathname.split("/").filter(Boolean)[0];
  if (!slug || slug === "home") return null;
  return (store.artists || []).find((artist) => artistSlug(artist) === slug) || null;
}

function setArtistNav(artist) {
  const nav = document.querySelector("#siteNav");
  if (!nav) return;
  if (!artist) return;
  const slug = artistSlug(artist);
  nav.innerHTML = `
    <a href="/${slug}">${artist.name || "Artist"}</a>
    <a href="/${slug}/music">Music</a>
    <a href="/${slug}/videos">Videos</a>
    <a href="/${slug}-dashboard">Upload</a>
  `;
}

function renderHomeArtist(artist) {
  const name = artist?.name || "Independent Artist";
  const photo = artist?.photo || "Mba Logos/MusicBusiness Logo.png";
  const bio = artist?.bio || "Artist biography will appear here after the artist saves a profile.";
  const photoNode = document.querySelector("#homeArtistPhoto");
  const nameNode = document.querySelector("#homeArtistName");
  const bioNode = document.querySelector("#homeArtistBio");
  const bioToggle = document.querySelector("#homeBioToggle");
  const socialsNode = document.querySelector("#homeSocialLinks");
  const videoLink = document.querySelector("#homeVideoLink");

  if (photoNode) {
    photoNode.src = photo;
    photoNode.alt = `${name} profile photo`;
  }
  if (nameNode) nameNode.textContent = name;
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

function releaseCard(release, artist) {
  const card = document.createElement("article");
  card.className = "release-card";
  const listenUrl = releasePublicUrl("listen", release, artist);
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
  card.dataset.href = listenUrl;
  card.tabIndex = 0;
  card.setAttribute("role", "link");
  card.setAttribute("aria-label", `Open Listen page for ${release.title || "Untitled release"}`);
  card.innerHTML = `
    <div class="release-cover-frame">
      <img class="release-cover" src="${release.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="${release.title} cover" loading="lazy" decoding="async" />
    </div>
    <div class="release-body">
      <p class="release-meta">${release.releaseType || "Single"} | ${release.genre || "Music"}</p>
      <h3>${release.title || "Untitled release"}</h3>
      <span>${artist?.name || release.artistName || "Independent Artist"}</span>
      <div class="mini-actions">
        <a class="listen-action" href="${listenUrl}">Listen</a>
      </div>
    </div>
  `;
  card.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    window.location.href = listenUrl;
  });
  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    window.location.href = listenUrl;
  });
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
  const store = await window.MBA.loadStore({ force });
  const snapshot = renderedSnapshot(store);
  if (!force && snapshot === lastHomeSnapshot) return;
  lastHomeSnapshot = snapshot;

  applySiteContent(store);

  const approvedArtistList = store.artists.filter((artist) => (artist.status || "approved") === "approved");
  const approvedArtists = new Set(approvedArtistList.map((artist) => artist.id));
  const featuredArtist =
    approvedArtistList.find((artist) => artist.id === store.site?.featuredArtistId) || approvedArtistList[0] || store.artists[0];
  const approved = window.MBA
    .approvedReleases(store)
    .filter((release) => approvedArtists.has(release.artistId))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const pageArtist = artistFromPath(store) || featuredArtist;
  const artistHome = document.querySelector("#artistHome");

  if (artistHome) artistHome.hidden = false;
  setArtistNav(pageArtist);
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
