const siteForm = document.querySelector("#siteForm");
const siteMessage = document.querySelector("#siteMessage");
const storeManagerLogout = document.querySelector("#storeManagerLogout");
const storeManagerSidebarLogout = document.querySelector("#storeManagerSidebarLogout");
const managerWorkspaceTitle = document.querySelector("#managerWorkspaceTitle");
const managerSections = [...document.querySelectorAll(".manager-dashboard-section")];
const managerNavLinks = [...document.querySelectorAll("[data-manager-section]")];

const artistSearchInput = document.querySelector("#artistSearchInput");
const artistStatusFilter = document.querySelector("#artistStatusFilter");
const artistSortSelect = document.querySelector("#artistSortSelect");
const songSearchInput = document.querySelector("#songSearchInput");
const songArtistFilter = document.querySelector("#songArtistFilter");
const songStatusFilter = document.querySelector("#songStatusFilter");
const songGenreFilter = document.querySelector("#songGenreFilter");
const downloadSearchInput = document.querySelector("#downloadSearchInput");
const downloadArtistFilter = document.querySelector("#downloadArtistFilter");
const downloadCountryFilter = document.querySelector("#downloadCountryFilter");

const managerArtistTable = document.querySelector("#managerArtistTable");
const managerSongTable = document.querySelector("#managerSongTable");
const managerVideoTable = document.querySelector("#managerVideoTable");
const managerDownloadTable = document.querySelector("#managerDownloadTable");
const managerPayoutTable = document.querySelector("#managerPayoutTable");
const managerSupportTable = document.querySelector("#managerSupportTable");
const managerReportTable = document.querySelector("#managerReportTable");
const managerArtistForm = document.querySelector("#managerArtistForm");
const managerSongForm = document.querySelector("#managerSongForm");
const managerArtistMessage = document.querySelector("#managerArtistMessage");
const managerSongMessage = document.querySelector("#managerSongMessage");

let currentStore = window.MBA.defaults();

async function requireStoreManagerSession() {
  const response = await fetch("/api/admin/session", { credentials: "same-origin" });
  const session = response.ok ? await response.json() : { authenticated: false };
  if (!session.authenticated) {
    window.location.assign("/store-manager-login");
    return false;
  }
  return true;
}

async function saveAdminStore(store) {
  const response = await fetch("/api/admin/store", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(store),
  });

  if (response.status === 401) {
    window.location.assign("/store-manager-login");
    throw new Error("Store Manager login required.");
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Unable to save Store Manager changes.");
  }

  return response.json();
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function escapeText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}

function message(node, text, type = "success") {
  if (!node) return;
  node.textContent = text;
  node.dataset.type = type;
}

function normalizeLink(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("@")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes(".") && !trimmed.includes(" ")) return `https://${trimmed}`;
  return trimmed;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function formatDate(value) {
  if (!value) return "Not recorded";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
}

function releaseRevenue(release) {
  return Number(release.earnings || 0) || Number(release.downloads || 0) * Number(release.price || 0);
}

function artistReleases(artistId) {
  return currentStore.releases.filter((release) => release.artistId === artistId);
}

function artistRevenue(artistId) {
  return artistReleases(artistId).reduce((sum, release) => sum + releaseRevenue(release), 0);
}

function artistDownloads(artistId) {
  return artistReleases(artistId).reduce((sum, release) => sum + Number(release.downloads || 0), 0);
}

function videoEntries() {
  return (currentStore.artists || []).flatMap((artist) => {
    const videos = artist.videos || currentStore.site?.videos || {};
    return [
      ["YouTube", videos.mainVideoTitle || "Featured video", videos.mainVideoUrl],
      ["YouTube Shorts", "Short video", videos.shortVideoUrl],
      ["TikTok / Reels", "Short-form video", videos.tiktokUrl],
    ]
      .filter(([, , url]) => url)
      .map(([platform, title, url]) => ({ artist, platform, title, url, status: "approved", createdAt: artist.updatedAt || artist.createdAt }));
  });
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function emptyState(text) {
  return `<p class="empty-state">${escapeText(text)}</p>`;
}

function showManagerSection(sectionId) {
  managerSections.forEach((section) => section.classList.toggle("is-active", section.id === sectionId));
  managerNavLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.managerSection === sectionId));
  const section = managerSections.find((item) => item.id === sectionId);
  if (managerWorkspaceTitle && section) managerWorkspaceTitle.textContent = section.dataset.sectionTitle || "Store Manager";
}

function applyLogo() {
  document.querySelectorAll("[data-logo]").forEach((img) => {
    img.src = currentStore.site?.logo || "Mba Logos/MusicBusiness Logo.png";
  });
}

function fillSiteForm() {
  const site = currentStore.site || {};
  siteForm.title.value = site.title || "";
  siteForm.tagline.value = site.tagline || "";
  siteForm.intro.value = site.intro || "";
  siteForm.primaryCta.value = site.primaryCta || "";
  siteForm.secondaryCta.value = site.secondaryCta || "";
  siteForm.commissionRate.value = site.commissionRate ?? 10;
  if (siteForm.googleAnalytics) siteForm.googleAnalytics.value = site.googleAnalytics || "";
  if (siteForm.facebookPixel) siteForm.facebookPixel.value = site.facebookPixel || "";
  if (siteForm.stripeSettings) siteForm.stripeSettings.value = site.stripeSettings || "";
  if (siteForm.emailSettings) siteForm.emailSettings.value = site.emailSettings || "";
}

function populateFilters() {
  const artists = currentStore.artists || [];
  const genres = [...new Set((currentStore.releases || []).map((release) => release.genre).filter(Boolean))].sort();
  const countries = [...new Set((currentStore.releases || []).map((release) => release.country).filter(Boolean))].sort();

  [songArtistFilter, downloadArtistFilter].forEach((select) => {
    if (!select) return;
    const value = select.value;
    select.replaceChildren(new Option("All artists", ""));
    artists.forEach((artist) => select.append(new Option(artist.name || artist.handle || "Untitled artist", artist.id)));
    select.value = [...select.options].some((option) => option.value === value) ? value : "";
  });

  if (songGenreFilter) {
    const value = songGenreFilter.value;
    songGenreFilter.replaceChildren(new Option("All genres", ""));
    genres.forEach((genre) => songGenreFilter.append(new Option(genre, genre)));
    songGenreFilter.value = genres.includes(value) ? value : "";
  }

  if (downloadCountryFilter) {
    const value = downloadCountryFilter.value;
    downloadCountryFilter.replaceChildren(new Option("All countries", ""));
    countries.forEach((country) => downloadCountryFilter.append(new Option(country, country)));
    downloadCountryFilter.value = countries.includes(value) ? value : "";
  }
}

function renderList(containerId, items, emptyText) {
  const container = document.querySelector(containerId);
  if (!container) return;
  container.innerHTML = items.length
    ? items.map((item) => `<article><strong>${escapeText(item.title)}</strong><span>${escapeText(item.meta)}</span></article>`).join("")
    : emptyState(emptyText);
}

function renderDashboard() {
  const artists = currentStore.artists || [];
  const releases = currentStore.releases || [];
  const videos = videoEntries();
  const downloads = releases.reduce((sum, release) => sum + Number(release.downloads || 0), 0);
  const revenue = releases.reduce((sum, release) => sum + releaseRevenue(release), 0);
  const pendingReviews = releases.filter((release) => (release.status || "pending") === "pending").length;

  setText("#managerTotalArtists", String(artists.length));
  setText("#managerTotalSongs", String(releases.length));
  setText("#managerTotalVideos", String(videos.length));
  setText("#managerTotalDownloads", String(downloads));
  setText("#managerTotalRevenue", money(revenue));
  setText("#managerPendingPayouts", "0");
  setText("#managerPendingReviews", String(pendingReviews));
  setText("#managerOpenTickets", String((currentStore.supportTickets || []).filter((ticket) => ticket.status !== "closed").length));

  renderList("#managerRecentActivity", releases.slice(0, 5).map((release) => ({ title: release.title || "Untitled song", meta: `${release.status || "pending"} | ${formatDate(release.updatedAt || release.createdAt)}` })), "Recent activity will appear here.");
  renderList("#managerNewestArtists", artists.slice(-5).reverse().map((artist) => ({ title: artist.name || artist.handle || "Untitled artist", meta: formatDate(artist.createdAt) })), "Newest artists will appear here.");
  renderList("#managerNewestSongs", releases.slice(0, 5).map((release) => ({ title: release.title || "Untitled song", meta: release.artistName || "Artist" })), "Newest songs will appear here.");
  renderList("#managerNewestDownloads", releases.filter((release) => Number(release.downloads || 0) > 0).slice(0, 5).map((release) => ({ title: release.title || "Untitled song", meta: `${release.downloads} downloads` })), "Newest downloads will appear here.");
  renderList("#managerNewestSupport", currentStore.supportTickets || [], "Newest support requests will appear here.");
}

function filteredArtists() {
  const query = String(artistSearchInput?.value || "").toLowerCase();
  const status = artistStatusFilter?.value || "";
  const sort = artistSortSelect?.value || "joinDate";
  let artists = (currentStore.artists || []).filter((artist) => {
    const haystack = [artist.name, artist.handle, artist.status].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (!status || (artist.status || "approved") === status);
  });
  artists = artists.slice().sort((a, b) => {
    if (sort === "revenue") return artistRevenue(b.id) - artistRevenue(a.id);
    if (sort === "downloads") return artistDownloads(b.id) - artistDownloads(a.id);
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
  return artists;
}

function renderArtists() {
  if (!managerArtistTable) return;
  const artists = filteredArtists();
  managerArtistTable.innerHTML = artists.length
    ? `
      <div class="manager-table-header artist-columns">
        <span>Artist Name</span><span>Join Date</span><span>Songs</span><span>Videos</span><span>Downloads</span><span>Revenue</span><span>Status</span><span>Actions</span>
      </div>
      ${artists.map((artist) => `
        <article class="manager-table-row artist-columns" data-id="${artist.id}">
          <strong>${escapeText(artist.name || artist.handle || "Untitled artist")}</strong>
          <span>${formatDate(artist.createdAt)}</span>
          <span>${artistReleases(artist.id).length}</span>
          <span>${videoEntries().filter((video) => video.artist.id === artist.id).length}</span>
          <span>${artistDownloads(artist.id)}</span>
          <span>${money(artistRevenue(artist.id))}</span>
          <mark>${escapeText(artist.status || "approved")}</mark>
          <div class="manager-row-actions">
            <a href="/music" target="_blank" rel="noreferrer">View Artist</a>
            <a href="/upload" target="_blank" rel="noreferrer">Open Dashboard</a>
            <button type="button" data-edit-artist="${artist.id}">Edit Artist</button>
            <button type="button" data-artist-status="suspended">Suspend Artist</button>
            <button type="button" data-artist-status="approved">Reactivate Artist</button>
            <button type="button" data-delete-artist="${artist.id}">Delete Artist</button>
            <button type="button" data-message-artist="${artist.id}">Send Message</button>
          </div>
        </article>
      `).join("")}
    `
    : emptyState("No artists match the current filters.");
}

function filteredSongs() {
  const query = String(songSearchInput?.value || "").toLowerCase();
  const artistId = songArtistFilter?.value || "";
  const status = songStatusFilter?.value || "";
  const genre = songGenreFilter?.value || "";
  return (currentStore.releases || []).filter((release) => {
    const haystack = [release.title, release.artistName, release.genre].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (!artistId || release.artistId === artistId)
      && (!status || (release.status || "pending") === status)
      && (!genre || release.genre === genre);
  });
}

function renderSongs() {
  if (!managerSongTable) return;
  const releases = filteredSongs();
  managerSongTable.innerHTML = releases.length
    ? `
      <div class="manager-table-header song-columns">
        <span>Artwork</span><span>Song Title</span><span>Artist</span><span>Price</span><span>Downloads</span><span>Revenue</span><span>Status</span><span>Date</span><span>Actions</span>
      </div>
      ${releases.map((release) => `
        <article class="manager-table-row song-columns" data-id="${release.id}">
          <img src="${escapeAttr(release.cover || "Mba Logos/MusicBusiness Logo.png")}" alt="">
          <strong>${escapeText(release.title || "Untitled song")}</strong>
          <span>${escapeText(release.artistName || "Artist")}</span>
          <span>${money(release.price || 0)}</span>
          <span>${Number(release.downloads || 0)}</span>
          <span>${money(releaseRevenue(release))}</span>
          <mark>${escapeText(release.status || "pending")}</mark>
          <span>${formatDate(release.createdAt || release.releaseDate)}</span>
          <div class="manager-row-actions">
            <a href="/music" target="_blank" rel="noreferrer">View</a>
            <button type="button" data-edit-song="${release.id}">Edit</button>
            <button type="button" data-song-status="approved">Approve</button>
            <button type="button" data-song-status="denied">Reject</button>
            <button type="button" data-song-status="hidden">Hide</button>
            <button type="button" data-delete-song="${release.id}">Delete</button>
            <button type="button" data-feature-song="${release.id}">Feature</button>
          </div>
        </article>
      `).join("")}
    `
    : emptyState("No songs match the current filters.");
}

function renderVideos() {
  if (!managerVideoTable) return;
  const videos = videoEntries();
  managerVideoTable.innerHTML = videos.length
    ? `
      <div class="manager-table-header video-columns"><span>Thumbnail</span><span>Artist</span><span>Video Title</span><span>Platform</span><span>Date Added</span><span>Status</span><span>Actions</span></div>
      ${videos.map((video) => `
        <article class="manager-table-row video-columns">
          <span class="manager-thumb">Video</span>
          <strong>${escapeText(video.artist.name || "Artist")}</strong>
          <span>${escapeText(video.title)}</span>
          <span>${escapeText(video.platform)}</span>
          <span>${formatDate(video.createdAt)}</span>
          <mark>${escapeText(video.status)}</mark>
          <div class="manager-row-actions"><button type="button">Approve</button><button type="button">Reject</button><button type="button">Remove</button><button type="button">Feature</button><button type="button">Edit</button><button type="button">Delete</button></div>
        </article>
      `).join("")}
    `
    : emptyState("Artist video links will appear here.");
}

function filteredDownloads() {
  const query = String(downloadSearchInput?.value || "").toLowerCase();
  const artistId = downloadArtistFilter?.value || "";
  const country = downloadCountryFilter?.value || "";
  return (currentStore.releases || []).filter((release) => Number(release.downloads || 0) > 0)
    .filter((release) => (!artistId || release.artistId === artistId) && (!country || release.country === country))
    .filter((release) => !query || [release.title, release.artistName, release.country].join(" ").toLowerCase().includes(query));
}

function renderDownloads() {
  if (!managerDownloadTable) return;
  const rows = filteredDownloads();
  managerDownloadTable.innerHTML = rows.length
    ? `
      <div class="manager-table-header download-columns"><span>Song</span><span>Artist</span><span>Customer</span><span>Country</span><span>Amount</span><span>Date</span><span>Status</span><span>Actions</span></div>
      ${rows.map((release) => `
        <article class="manager-table-row download-columns">
          <strong>${escapeText(release.title || "Untitled song")}</strong>
          <span>${escapeText(release.artistName || "Artist")}</span>
          <span>Fan purchase</span>
          <span>${escapeText(release.country || "United States")}</span>
          <span>${money(releaseRevenue(release))}</span>
          <span>${formatDate(release.updatedAt || release.createdAt)}</span>
          <mark>complete</mark>
          <div class="manager-row-actions"><button type="button">View</button><button type="button">Export</button></div>
        </article>
      `).join("")}
    `
    : emptyState("Purchase records will appear here after downloads are unlocked.");
}

function renderPayouts() {
  if (!managerPayoutTable) return;
  const platformFeePercent = Number(currentStore.site?.commissionRate || 10);
  const artists = currentStore.artists || [];
  managerPayoutTable.innerHTML = artists.length
    ? `
      <div class="manager-table-header payout-columns"><span>Artist</span><span>Downloads</span><span>Revenue</span><span>Platform Fee</span><span>Net Earnings</span><span>Available Balance</span><span>Pending Balance</span><span>Payout Status</span><span>Actions</span></div>
      ${artists.map((artist) => {
        const revenue = artistRevenue(artist.id);
        const platformFee = revenue * platformFeePercent / 100;
        return `
          <article class="manager-table-row payout-columns">
            <strong>${escapeText(artist.name || artist.handle || "Artist")}</strong>
            <span>${artistDownloads(artist.id)}</span>
            <span>${money(revenue)}</span>
            <span>${money(platformFee)}</span>
            <span>${money(revenue - platformFee)}</span>
            <span>${money(revenue - platformFee)}</span>
            <span>${money(0)}</span>
            <mark>pending</mark>
            <div class="manager-row-actions"><button type="button">Approve Payout</button><button type="button">Reject Payout</button><button type="button">Mark Paid</button></div>
          </article>
        `;
      }).join("")}
    `
    : emptyState("Payout records will appear when artists earn revenue.");
}

function renderAnalytics() {
  const topArtist = (currentStore.artists || []).slice().sort((a, b) => artistRevenue(b.id) - artistRevenue(a.id))[0];
  const topSong = (currentStore.releases || []).slice().sort((a, b) => releaseRevenue(b) - releaseRevenue(a))[0];
  const topPlatform = (currentStore.releases || []).flatMap((release) => Object.entries(release.streaming || {}).filter(([, value]) => value)).map(([key]) => key)[0] || "None";
  const topCountry = (currentStore.releases || []).find((release) => release.country)?.country || "None";
  setText("#analyticsTotalArtists", String((currentStore.artists || []).length));
  setText("#analyticsTotalSongs", String((currentStore.releases || []).length));
  setText("#analyticsTotalDownloads", String((currentStore.releases || []).reduce((sum, release) => sum + Number(release.downloads || 0), 0)));
  setText("#analyticsTotalRevenue", money((currentStore.releases || []).reduce((sum, release) => sum + releaseRevenue(release), 0)));
  setText("#analyticsTopArtist", topArtist?.name || "None");
  setText("#analyticsTopSong", topSong?.title || "None");
  setText("#analyticsTopCountry", topCountry);
  setText("#analyticsTopPlatform", topPlatform);
}

function renderSupportAndReports() {
  if (managerSupportTable) {
    managerSupportTable.innerHTML = emptyState("Support tickets will appear here with Ticket ID, Artist, Subject, Date, Priority, Status, and Actions.");
  }
  if (managerReportTable) {
    managerReportTable.innerHTML = `
      <div class="manager-report-grid">
        ${["Copyright Claims", "Fraud Reports", "Artist Violations", "DMCA Requests", "Content Complaints"].map((label) => `<article><strong>${label}</strong><span>No open reports</span><div class="manager-row-actions"><button type="button">Review</button><button type="button">Approve</button><button type="button">Reject</button><button type="button">Remove Content</button><button type="button">Suspend Artist</button></div></article>`).join("")}
      </div>
    `;
  }
  renderList("#adminLoginHistory", [{ title: "Current session", meta: "Store Manager authenticated" }], "Admin login history will appear here.");
  renderList("#failedLoginAttempts", [], "Failed login attempts will appear here.");
  renderList("#artistLoginActivity", [], "Artist login activity will appear after artist accounts are added.");
  renderList("#ipLogs", [], "IP logs will appear here.");
  renderList("#auditLogs", [], "Audit logs will appear after admin actions are recorded.");
}

function renderAll() {
  applyLogo();
  fillSiteForm();
  populateFilters();
  renderDashboard();
  renderArtists();
  renderSongs();
  renderVideos();
  renderDownloads();
  renderPayouts();
  renderAnalytics();
  renderSupportAndReports();
}

async function saveAndRender() {
  currentStore = await saveAdminStore(currentStore);
  renderAll();
}

siteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message(siteMessage, "Saving platform settings...", "pending");
  const logo = await fileToDataUrl(siteForm.logo.files[0]);
  currentStore.site = {
    ...(currentStore.site || {}),
    title: siteForm.title.value.trim(),
    tagline: siteForm.tagline.value.trim(),
    intro: siteForm.intro.value.trim(),
    primaryCta: siteForm.primaryCta.value.trim(),
    secondaryCta: siteForm.secondaryCta.value.trim(),
    commissionRate: Number(siteForm.commissionRate.value || 10),
    googleAnalytics: siteForm.googleAnalytics?.value.trim() || "",
    facebookPixel: siteForm.facebookPixel?.value.trim() || "",
    stripeSettings: siteForm.stripeSettings?.value.trim() || "",
    emailSettings: siteForm.emailSettings?.value.trim() || "",
  };
  if (logo) currentStore.site.logo = logo;
  currentStore = await saveAdminStore(currentStore);
  applyLogo();
  fillSiteForm();
  siteForm.logo.value = "";
  message(siteMessage, "Platform settings saved.");
});

managerArtistTable?.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-id]");
  if (!row) return;
  const artist = currentStore.artists.find((item) => item.id === row.dataset.id);
  if (!artist) return;

  if (event.target.closest("[data-edit-artist]")) {
    managerArtistForm.id.value = artist.id;
    managerArtistForm.name.value = artist.name || "";
    managerArtistForm.bio.value = artist.bio || "";
    managerArtistForm.status.value = artist.status || "approved";
  }

  const statusButton = event.target.closest("[data-artist-status]");
  if (statusButton) {
    artist.status = statusButton.dataset.artistStatus;
    await saveAndRender();
  }

  if (event.target.closest("[data-delete-artist]")) {
    currentStore.artists = currentStore.artists.filter((item) => item.id !== artist.id);
    currentStore.releases = currentStore.releases.filter((release) => release.artistId !== artist.id);
    await saveAndRender();
  }

  if (event.target.closest("[data-message-artist]")) {
    message(managerArtistMessage, `Message workflow selected for ${artist.name || "artist"}.`, "pending");
  }
});

managerArtistForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const artist = currentStore.artists.find((item) => item.id === managerArtistForm.id.value);
  if (!artist) {
    message(managerArtistMessage, "Choose an artist to edit first.", "error");
    return;
  }
  artist.name = managerArtistForm.name.value.trim();
  artist.bio = managerArtistForm.bio.value.trim();
  artist.status = managerArtistForm.status.value;
  await saveAndRender();
  message(managerArtistMessage, "Artist saved.");
});

managerSongTable?.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-id]");
  if (!row) return;
  const release = currentStore.releases.find((item) => item.id === row.dataset.id);
  if (!release) return;

  if (event.target.closest("[data-edit-song]")) {
    managerSongForm.id.value = release.id;
    managerSongForm.title.value = release.title || "";
    managerSongForm.artistName.value = release.artistName || "";
    managerSongForm.genre.value = release.genre || "";
    managerSongForm.price.value = release.price || 0;
    managerSongForm.status.value = release.status || "pending";
    managerSongForm.songBio.value = release.songBio || "";
  }

  const statusButton = event.target.closest("[data-song-status]");
  if (statusButton) {
    release.status = statusButton.dataset.songStatus;
    await saveAndRender();
  }

  if (event.target.closest("[data-delete-song]")) {
    currentStore.releases = currentStore.releases.filter((item) => item.id !== release.id);
    await saveAndRender();
  }

  if (event.target.closest("[data-feature-song]")) {
    const artist = currentStore.artists.find((item) => item.id === release.artistId);
    if (artist) {
      artist.featuredReleaseId = release.id;
      artist.bannerReleaseId = "";
      await saveAndRender();
    }
  }
});

managerSongForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const release = currentStore.releases.find((item) => item.id === managerSongForm.id.value);
  if (!release) {
    message(managerSongMessage, "Choose a song to edit first.", "error");
    return;
  }
  release.title = managerSongForm.title.value.trim();
  release.artistName = managerSongForm.artistName.value.trim();
  release.genre = managerSongForm.genre.value.trim();
  release.price = Number(managerSongForm.price.value || 0);
  release.status = managerSongForm.status.value;
  release.songBio = managerSongForm.songBio.value.trim();
  release.updatedAt = new Date().toISOString();
  await saveAndRender();
  message(managerSongMessage, "Song saved.");
});

[artistSearchInput, artistStatusFilter, artistSortSelect].forEach((control) => {
  control?.addEventListener("input", renderArtists);
  control?.addEventListener("change", renderArtists);
});

[songSearchInput, songArtistFilter, songStatusFilter, songGenreFilter].forEach((control) => {
  control?.addEventListener("input", renderSongs);
  control?.addEventListener("change", renderSongs);
});

[downloadSearchInput, downloadArtistFilter, downloadCountryFilter].forEach((control) => {
  control?.addEventListener("input", renderDownloads);
  control?.addEventListener("change", renderDownloads);
});

managerNavLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showManagerSection(link.dataset.managerSection);
  });
});

document.querySelector("#exportDownloadsCsv")?.addEventListener("click", () => {
  const rows = filteredDownloads();
  const header = ["Song", "Artist", "Country", "Amount", "Downloads", "Status"];
  const lines = rows.map((release) => [release.title, release.artistName, release.country, releaseRevenue(release), release.downloads, "complete"].map((value) => `"${String(value || "").replace(/"/g, '""')}"`).join(","));
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "musicbusinessarena-downloads.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});

async function logoutStoreManager() {
  await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
  window.location.assign("/store-manager-login");
}

storeManagerLogout?.addEventListener("click", logoutStoreManager);
storeManagerSidebarLogout?.addEventListener("click", logoutStoreManager);

async function initStoreManager() {
  const hasSession = await requireStoreManagerSession();
  if (!hasSession) return;
  currentStore = await window.MBA.loadStore();
  renderAll();
  showManagerSection("managerDashboard");
}

initStoreManager();
