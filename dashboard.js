/* ===================================================
   PLATFORM DASHBOARD SCRIPT

   CODE OWNER GUIDE

   Loads featured artists, featured releases, and dashboard search behavior.
   Used by: dashboard.html.
   Does not control uploads or payments.
=================================================== */

/* ===================================================
   PLATFORM DASHBOARD HELPERS

   Creates clean artist links and applies shared website
   branding to the platform dashboard page.

   Used by:
   - dashboard.html
=================================================== */
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

function applySiteContent(store) {
  const site = store.site || {};
  document.title = `Dashboard | ${site.title || "MusicBusiness Arena"}`;
  document.querySelectorAll("[data-logo]").forEach((img) => {
    img.src = site.logo || "Mba Logos/MusicBusiness Logo.png";
  });
}

function emptyShelf(text) {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = text;
  return empty;
}

/* ===================================================
   PLATFORM ARTIST AND RELEASE CARDS

   Builds the artists, releases, and videos shown on the
   separate MusicBusiness Arena platform dashboard.
=================================================== */
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

function releaseCard(release, artist) {
  const card = document.createElement("article");
  card.className = "release-card";
  const listenUrl = `/listen?release=${encodeURIComponent(release.id)}`;
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
      <img class="release-cover" src="${release.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="${release.title || "Release"} cover" loading="lazy" decoding="async" />
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

function applyDashboardSearch() {
  const input = document.querySelector("#dashboardSearch");
  const grid = document.querySelector("#platformReleasesGrid");
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

function renderReleases(container, releases, store) {
  if (!container) return;
  container.setAttribute("aria-busy", "false");
  container.replaceChildren();
  if (!releases.length) {
    container.append(emptyShelf("Featured releases will appear here after Store Manager approves uploads."));
    return;
  }
  releases.slice(0, 20).forEach((release) => {
    const artist = (store.artists || []).find((item) => item.id === release.artistId);
    container.append(releaseCard(release, artist));
  });
}

/* ===================================================
   PLATFORM DASHBOARD RENDER

   Loads saved website data and refreshes Featured Artists,
   New Artists, Featured Releases, Trending Downloads, and
   Latest Videos.
=================================================== */
async function renderDashboard(force = false) {
  const store = await window.MBA.loadStore({ force });
  applySiteContent(store);
  const approvedArtists = (store.artists || []).filter((artist) => (artist.status || "approved") === "approved");
  const approvedArtistIds = new Set(approvedArtists.map((artist) => artist.id));
  const releases = window.MBA
    .approvedReleases(store)
    .filter((release) => approvedArtistIds.has(release.artistId))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const artistGrid = document.querySelector("#featuredArtistsGrid");
  if (artistGrid) {
    artistGrid.setAttribute("aria-busy", "false");
    artistGrid.replaceChildren();
    approvedArtists.slice(0, 8).forEach((artist) => artistGrid.append(artistCard(artist, releases)));
    if (!approvedArtists.length) artistGrid.append(emptyShelf("Artists will appear here after registration."));
  }

  renderReleases(document.querySelector("#platformReleasesGrid"), releases, store);
  applyDashboardSearch();
}

renderDashboard(true);
document.querySelector("#dashboardSearch")?.addEventListener("input", applyDashboardSearch);
window.addEventListener("mba:store-saved", () => renderDashboard(true));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderDashboard(true);
});
window.addEventListener("focus", () => renderDashboard(true));
