/* ===================================================
   STORE MANAGER DASHBOARD SCRIPT

   CODE OWNER GUIDE

   Controls admin-only platform management, statistics, moderation tables, reports, and Store Manager settings.
   Used by: store-manager.html.
   Does not control artist uploads directly.
=================================================== */

/* ===================================================
   STORE MANAGER ELEMENTS AND STATE

   Collects the admin page elements and keeps the current
   Store Manager session and loaded website data.

   Used by:
   - store-manager.html
=================================================== */
const siteForm = document.querySelector("#siteForm");
const ARTIST_PAYOUT_PERCENT = 80;
const PLATFORM_SERVICE_FEE_PERCENT = 10;
const PAYMENT_PROCESSING_FEE_PERCENT = 5;
const PLATFORM_OPERATIONS_FEE_PERCENT = 5;
const siteMessage = document.querySelector("#siteMessage");
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
const managerAnalyticsArtistSelect = document.querySelector("#managerAnalyticsArtistSelect");

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
const managerPayoutMessage = document.querySelector("#managerPayoutMessage");

let currentStore = window.MBA.defaults();

/* ===================================================
   STORE MANAGER DIRECT ACCESS

   Opens the Store Manager directly.

   There is no Store Manager login, password, or logout gate.
=================================================== */
async function requireStoreManagerSession() {
  return true;
}

/* ===================================================
   ADMIN DATA LOAD AND SAVE

   Reads and saves platform-wide data that only the Store
   Manager can manage.

   Used by:
   - Artist management
   - Release management
   - Reports
   - Platform settings
=================================================== */
async function saveAdminStore(store, options = {}) {
  const response = await fetch("/api/admin/store", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      store,
      deletions: options.deletions || {},
      clears: options.clears || [],
      resetAnalytics: options.resetAnalytics === true,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Unable to save Store Manager changes.");
  }

  return response.json();
}

async function loadAdminStore() {
  const response = await fetch("/api/admin/store", { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load Store Manager data.");
  return response.json();
}

/* ===================================================
   SHARED STORE MANAGER HELPERS

   Formats money, dates, safe text, links, files, revenue,
   and payout calculations for the admin dashboard.
=================================================== */
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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function artistSlug(artist) {
  return slugify(artist?.slug || artist?.handle || artist?.name || artist?.id || "artist");
}

function isDownloadOnlyRelease(release) {
  return release?.downloadOnly === true || release?.releaseType === "Beat / Instrumental";
}

function catalogLabelForArtist(artist, releases = currentStore.releases || []) {
  const approvedReleases = releases.filter((release) => release.artistId === artist?.id && (release.status || "approved") === "approved");
  if (approvedReleases.length && approvedReleases.every(isDownloadOnlyRelease)) return "Beats";
  return "Music";
}

function artistCatalogPath(artist) {
  const slug = artistSlug(artist);
  const label = catalogLabelForArtist(artist);
  return label === "Beats" ? `/${slug}/beats` : `/${slug}/music`;
}

function releaseCatalogPath(release) {
  const artist = (currentStore.artists || []).find((item) => item.id === release.artistId);
  return artist ? artistCatalogPath(artist) : "/music";
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

function artistTransactions(artistId) {
  return (currentStore.transactions || []).filter((transaction) => String(transaction.artistId) === String(artistId));
}

function transactionGross(transaction) {
  return Number(transaction.grossAmount ?? transaction.amount ?? 0);
}

function transactionProcessorFee(transaction) {
  if (transaction.payoutModel === "mba_80_20" && Number.isFinite(Number(transaction.paymentProcessingFee))) {
    return Number(transaction.paymentProcessingFee || 0);
  }
  return transactionGross(transaction) * (PAYMENT_PROCESSING_FEE_PERCENT / 100);
}

function transactionPlatformFee(transaction) {
  if (transaction.payoutModel === "mba_80_20" && Number.isFinite(Number(transaction.platformFee))) {
    return Number(transaction.platformFee || 0);
  }
  return transactionGross(transaction) * (PLATFORM_SERVICE_FEE_PERCENT / 100);
}

function transactionOperationsFee(transaction) {
  if (transaction.payoutModel === "mba_80_20" && Number.isFinite(Number(transaction.platformOperationsFee))) {
    return Number(transaction.platformOperationsFee || 0);
  }
  return transactionGross(transaction) * (PLATFORM_OPERATIONS_FEE_PERCENT / 100);
}

function transactionNet(transaction) {
  if (transaction.payoutModel === "mba_80_20" && Number.isFinite(Number(transaction.artistPayout))) {
    return Number(transaction.artistPayout || 0);
  }
  return Math.max(0, transactionGross(transaction) * (ARTIST_PAYOUT_PERCENT / 100));
}

function payoutSummaryForArtist(artist) {
  const artistTxns = artistTransactions(artist.id);
  const grossSales = artistTxns.length
    ? artistTxns.reduce((sum, transaction) => sum + transactionGross(transaction), 0)
    : artistRevenue(artist.id);
  const processorFees = artistTxns.length
    ? artistTxns.reduce((sum, transaction) => sum + transactionProcessorFee(transaction), 0)
    : grossSales * (PAYMENT_PROCESSING_FEE_PERCENT / 100);
  const platformFees = artistTxns.length
    ? artistTxns.reduce((sum, transaction) => sum + transactionPlatformFee(transaction), 0)
    : grossSales * (PLATFORM_SERVICE_FEE_PERCENT / 100);
  const operationsFees = artistTxns.length
    ? artistTxns.reduce((sum, transaction) => sum + transactionOperationsFee(transaction), 0)
    : grossSales * (PLATFORM_OPERATIONS_FEE_PERCENT / 100);
  const netEarnings = artistTxns.length
    ? artistTxns.reduce((sum, transaction) => sum + transactionNet(transaction), 0)
    : grossSales * (ARTIST_PAYOUT_PERCENT / 100);
  const payableTransactions = artistTxns.filter((transaction) => transaction.payoutStatus !== "paid" && transaction.payoutStatus !== "processing");
  const availableBalance = payableTransactions.reduce((sum, transaction) => sum + transactionNet(transaction), 0) || (artistTxns.length ? 0 : netEarnings);
  const payoutStatus = artist.stripeAccountStatus === "connected"
    ? (availableBalance > 0 ? "pending" : "ready")
    : stripeStatusLabel(artist.stripeAccountStatus);
  return {
    artist,
    grossSales,
    processorFees,
    platformFees,
    operationsFees,
    netEarnings,
    availableBalance,
    payoutStatus,
    payableTransactions,
  };
}

function downloadCsv(filename, header, rows) {
  const lines = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","));
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function payoutCsvRows(artists) {
  return artists.map((artist) => {
    const summary = payoutSummaryForArtist(artist);
    return [
      artist.name || artist.handle || "Artist",
      stripeStatusLabel(artist.stripeAccountStatus),
      artistDownloads(artist.id),
      summary.grossSales,
      summary.processorFees,
      summary.platformFees,
      summary.operationsFees,
      summary.netEarnings,
      summary.availableBalance,
      summary.payoutStatus,
    ];
  });
}

function exportPayoutCsv(artists, filename = "musicbusinessarena-payouts.csv") {
  const header = ["Artist", "Stripe", "Downloads", "Gross Sales", "Processing 5%", "Service 10%", "Operations 5%", "Net 80%", "Available", "Payout Status"];
  downloadCsv(filename, header, payoutCsvRows(artists));
}

function stripeStatusLabel(status) {
  if (status === "connected") return "connected";
  if (status === "pending_verification") return "pending verification";
  return "not connected";
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

function scopedAnalyticsArtist() {
  const artistId = managerAnalyticsArtistSelect?.value || "";
  return artistId ? (currentStore.artists || []).find((artist) => String(artist.id) === String(artistId)) || null : null;
}

function scopedAnalyticsReleases() {
  const artist = scopedAnalyticsArtist();
  const releases = currentStore.releases || [];
  return artist ? releases.filter((release) => String(release.artistId) === String(artist.id)) : releases;
}

function scopedAnalyticsTransactions() {
  const artist = scopedAnalyticsArtist();
  const transactions = currentStore.transactions || [];
  return artist ? transactions.filter((transaction) => String(transaction.artistId) === String(artist.id)) : transactions;
}

function scopedAnalyticsArtists() {
  const artist = scopedAnalyticsArtist();
  return artist ? [artist] : (currentStore.artists || []);
}

function platformClickItems(releases) {
  const totals = {};
  releases.forEach((release) => {
    Object.entries(release.platformClicks || {}).forEach(([platform, count]) => {
      totals[platform] = Number(totals[platform] || 0) + Number(count || 0);
    });
  });
  return Object.entries(totals)
    .map(([platform, clicks]) => ({ title: platformLabel(platform), clicks }))
    .filter((item) => item.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks || a.title.localeCompare(b.title));
}

function platformLabel(key) {
  return String(key || "Platform")
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function artistVisitTotals(artists) {
  return artists.reduce(
    (totals, artist) => ({
      profileViews: totals.profileViews + Number(artist.profileViews || artist.followers || 0),
      artistPageVisits: totals.artistPageVisits + Number(artist.artistPageVisits || 0),
      musicPageVisits: totals.musicPageVisits + Number(artist.musicPageVisits || 0),
      videoPageVisits: totals.videoPageVisits + Number(artist.videoPageVisits || 0),
      downloadPageVisits: totals.downloadPageVisits + Number(artist.downloadPageVisits || 0),
    }),
    { profileViews: 0, artistPageVisits: 0, musicPageVisits: 0, videoPageVisits: 0, downloadPageVisits: 0 }
  );
}

function analyticsFinancials(releases, transactions) {
  const hasTransactions = transactions.length > 0;
  const gross = hasTransactions
    ? transactions.reduce((sum, transaction) => sum + transactionGross(transaction), 0)
    : releases.reduce((sum, release) => sum + releaseRevenue(release), 0);
  const processingFees = hasTransactions
    ? transactions.reduce((sum, transaction) => sum + transactionProcessorFee(transaction), 0)
    : gross * (PAYMENT_PROCESSING_FEE_PERCENT / 100);
  const platformFees = hasTransactions
    ? transactions.reduce((sum, transaction) => sum + transactionPlatformFee(transaction), 0)
    : gross * (PLATFORM_SERVICE_FEE_PERCENT / 100);
  const operationsFees = hasTransactions
    ? transactions.reduce((sum, transaction) => sum + transactionOperationsFee(transaction), 0)
    : gross * (PLATFORM_OPERATIONS_FEE_PERCENT / 100);
  const net = hasTransactions
    ? transactions.reduce((sum, transaction) => sum + transactionNet(transaction), 0)
    : gross * (ARTIST_PAYOUT_PERCENT / 100);
  return { gross, processingFees, platformFees, operationsFees, net };
}

function showArtistAnalytics(artistId) {
  if (managerAnalyticsArtistSelect) managerAnalyticsArtistSelect.value = artistId || "";
  renderAnalytics();
  showManagerSection("managerAnalytics");
}

/* ===================================================
   STORE MANAGER NAVIGATION AND PAGE SETUP

   Controls switching between admin sidebar sections and
   filling global site settings forms.
=================================================== */
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
  document.title = `Store Manager | ${currentStore.site?.title || "MusicBusiness Arena"}`;
  document.querySelectorAll("[data-logo]").forEach((img) => {
    img.src = currentStore.site?.logo || "Mba Logos/MusicBusiness Logo.png";
  });
  const favicon = document.querySelector('link[rel~="icon"]');
  if (favicon) favicon.href = currentStore.site?.favicon || "Mba Logos/MBA Favicon.png";
}

function fillSiteForm() {
  const site = currentStore.site || {};
  siteForm.title.value = site.title || "";
  siteForm.tagline.value = site.tagline || "";
  siteForm.intro.value = site.intro || "";
  siteForm.primaryCta.value = site.primaryCta || "";
  siteForm.secondaryCta.value = site.secondaryCta || "";
  siteForm.footerTagline.value = site.footerTagline || "";
  siteForm.footerDescription.value = site.footerDescription || "";
  siteForm.copyrightText.value = site.copyrightText || "";
  siteForm.commissionRate.value = site.commissionRate ?? 10;
  if (siteForm.socialX) siteForm.socialX.value = site.socials?.x || "";
  if (siteForm.socialFacebook) siteForm.socialFacebook.value = site.socials?.facebook || "";
  if (siteForm.socialInstagram) siteForm.socialInstagram.value = site.socials?.instagram || "";
  if (siteForm.socialYoutube) siteForm.socialYoutube.value = site.socials?.youtube || "";
  if (siteForm.socialTiktok) siteForm.socialTiktok.value = site.socials?.tiktok || "";
  if (siteForm.socialTwitch) siteForm.socialTwitch.value = site.socials?.twitch || "";
  if (siteForm.legalPrivacy) siteForm.legalPrivacy.value = site.legalPages?.privacy || "";
  if (siteForm.legalTerms) siteForm.legalTerms.value = site.legalPages?.terms || "";
  if (siteForm.legalCopyright) siteForm.legalCopyright.value = site.legalPages?.copyright || "";
  if (siteForm.legalDmca) siteForm.legalDmca.value = site.legalPages?.dmca || "";
  if (siteForm.legalContact) siteForm.legalContact.value = site.legalPages?.contact || "";
  if (siteForm.legalArtistAgreement) siteForm.legalArtistAgreement.value = site.legalPages?.artistAgreement || "";
  if (siteForm.legalPayoutPolicy) siteForm.legalPayoutPolicy.value = site.legalPages?.payoutPolicy || "";
  if (siteForm.legalNoRefundPolicy) siteForm.legalNoRefundPolicy.value = site.legalPages?.noRefundPolicy || "";
  if (siteForm.legalAbout) siteForm.legalAbout.value = site.legalPages?.about || "";
  if (siteForm.googleAnalytics) siteForm.googleAnalytics.value = site.googleAnalytics || "";
  if (siteForm.facebookPixel) siteForm.facebookPixel.value = site.facebookPixel || "";
  if (siteForm.stripeSettings) siteForm.stripeSettings.value = site.stripeSettings || "";
  if (siteForm.emailSettings) siteForm.emailSettings.value = site.emailSettings || "";
}

function populateFilters() {
  const artists = currentStore.artists || [];
  const genres = [...new Set((currentStore.releases || []).map((release) => release.genre).filter(Boolean))].sort();
  const countries = [...new Set((currentStore.releases || []).map((release) => release.country).filter(Boolean))].sort();

  [songArtistFilter, downloadArtistFilter, managerAnalyticsArtistSelect].forEach((select) => {
    if (!select) return;
    const value = select.value;
    select.replaceChildren(new Option(select === managerAnalyticsArtistSelect ? "All artists analytics" : "All artists", ""));
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

/* ===================================================
   DASHBOARD OVERVIEW

   Renders the Store Manager homepage cards and recent activity
   lists for total artists, releases, videos, downloads, revenue,
   payouts, and newest records.
=================================================== */
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

  renderList("#managerRecentActivity", releases.slice(0, 5).map((release) => ({ title: release.title || "Untitled release", meta: `${release.status || "pending"} | ${formatDate(release.updatedAt || release.createdAt)}` })), "Recent activity will appear here.");
  renderList("#managerNewestArtists", artists.slice(-5).reverse().map((artist) => ({ title: artist.name || artist.handle || "Untitled artist", meta: formatDate(artist.createdAt) })), "Newest artists will appear here.");
  renderList("#managerNewestSongs", releases.slice(0, 5).map((release) => ({ title: release.title || "Untitled release", meta: release.artistName || "Artist" })), "Newest releases will appear here.");
  renderList("#managerNewestDownloads", releases.filter((release) => Number(release.downloads || 0) > 0).slice(0, 5).map((release) => ({ title: release.title || "Untitled release", meta: `${release.downloads} downloads` })), "Newest downloads will appear here.");
  renderList("#managerNewestSupport", currentStore.supportTickets || [], "Newest support requests will appear here.");
}

/* ===================================================
   ARTIST MANAGEMENT

   Controls artist search, filters, profile rows, suspend,
   reactivate, delete, and artist statistics shown to the
   Store Manager.
=================================================== */
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
        <span>Artist Name</span><span>Join Date</span><span>Releases</span><span>Videos</span><span>Downloads</span><span>Revenue</span><span>Status</span><span>Actions</span>
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
            <a href="${escapeAttr(artistCatalogPath(artist))}" target="_blank" rel="noreferrer">View Artist</a>
            <a href="/upload" target="_blank" rel="noreferrer">Open Dashboard</a>
            <button type="button" data-artist-analytics="${artist.id}">Analytics</button>
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

/* ===================================================
   RELEASE MANAGEMENT

   Controls release search, artist filters, status filters,
   edit actions, remove actions, download counts, and streaming
   click totals for each release.
=================================================== */
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
        <span>Artwork</span><span>Release Title</span><span>Artist</span><span>Type</span><span>Price</span><span>Downloads</span><span>Revenue</span><span>Status</span><span>Date</span><span>Actions</span>
      </div>
      ${releases.map((release) => `
        <article class="manager-table-row song-columns" data-id="${release.id}">
          <img src="${escapeAttr(release.cover || "Mba Logos/MusicBusiness Logo.png")}" alt="">
          <strong>${escapeText(release.title || "Untitled release")}</strong>
          <span>${escapeText(release.artistName || "Artist")}</span>
          <span>${escapeText(release.releaseType || "Single")}</span>
          <span>${money(release.price || 0)}</span>
          <span>${Number(release.downloads || 0)}</span>
          <span>${money(releaseRevenue(release))}</span>
          <mark>${escapeText(release.status || "pending")}</mark>
          <span>${formatDate(release.createdAt || release.releaseDate)}</span>
          <div class="manager-row-actions">
            <a href="${escapeAttr(releaseCatalogPath(release))}" target="_blank" rel="noreferrer">View</a>
            <button type="button" data-release-analytics="${release.id}">Analytics</button>
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
    : emptyState("No releases match the current filters.");
}

/* ===================================================
   VIDEO MANAGEMENT

   Shows uploaded artist videos and video links for Store
   Manager review.
=================================================== */
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

/* ===================================================
   DOWNLOAD ANALYTICS

   Shows download records, download filters, recent downloads,
   and artist/release download totals.
=================================================== */
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
      <div class="manager-table-header download-columns"><span>Release</span><span>Artist</span><span>Customer</span><span>Country</span><span>Amount</span><span>Date</span><span>Status</span><span>Actions</span></div>
      ${rows.map((release) => `
        <article class="manager-table-row download-columns">
          <strong>${escapeText(release.title || "Untitled release")}</strong>
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

/* ===================================================
   PAYOUTS AND REVENUE MONITORING

   Shows Stripe Connect status, artist payout readiness,
   gross sales, platform fees, processing fees, and artist
   net earnings.

   This section does not expose artist bank information.
=================================================== */
function renderPayouts() {
  if (!managerPayoutTable) return;
  const artists = currentStore.artists || [];
  const transactions = currentStore.transactions || [];
  const connectedCount = artists.filter((artist) => artist.stripeAccountStatus === "connected").length;
  const pendingPayoutTotal = transactions
    .filter((transaction) => transaction.payoutStatus !== "paid")
    .reduce((sum, transaction) => sum + transactionNet(transaction), 0);
  const completedPayoutTotal = transactions
    .filter((transaction) => transaction.payoutStatus === "paid")
    .reduce((sum, transaction) => sum + transactionNet(transaction), 0);
  const failedPayoutCount = transactions.filter((transaction) => transaction.payoutStatus === "failed").length;

  setText("#payoutStripeConnected", String(connectedCount));
  setText("#payoutStripeNotConnected", String(Math.max(0, artists.length - connectedCount)));
  setText("#payoutPendingTotal", money(pendingPayoutTotal));
  setText("#payoutCompletedTotal", money(completedPayoutTotal));
  setText("#payoutFailedCount", String(failedPayoutCount));

  managerPayoutTable.innerHTML = artists.length
    ? `
      <div class="manager-table-header payout-columns"><span>Artist</span><span>Stripe</span><span>Downloads</span><span>Gross Sales</span><span>Processing 5%</span><span>Service 10%</span><span>Operations 5%</span><span>Net 80%</span><span>Available</span><span>Payout Status</span><span>Actions</span></div>
      ${artists.map((artist) => {
        const summary = payoutSummaryForArtist(artist);
        return `
          <article class="manager-table-row payout-columns" data-id="${artist.id}">
            <strong>${escapeText(artist.name || artist.handle || "Artist")}</strong>
            <span>${escapeText(stripeStatusLabel(artist.stripeAccountStatus))}</span>
            <span>${artistDownloads(artist.id)}</span>
            <span>${money(summary.grossSales)}</span>
            <span>${money(summary.processorFees)}</span>
            <span>${money(summary.platformFees)}</span>
            <span>${money(summary.operationsFees)}</span>
            <span>${money(summary.netEarnings)}</span>
            <span>${money(summary.availableBalance)}</span>
            <mark>${escapeText(summary.payoutStatus)}</mark>
            <div class="manager-row-actions">
              <button type="button" data-payout-view="${artist.id}">View</button>
              <button type="button" data-payout-export="${artist.id}">Export</button>
              <button type="button" data-payout-paid="${artist.id}">Mark Paid</button>
            </div>
          </article>
        `;
      }).join("")}
    `
    : emptyState("Payout records will appear when artists earn revenue.");
}

/* ===================================================
   PLATFORM ANALYTICS

   Shows Store Manager summaries for visits, downloads,
   streaming platform clicks, and overall website activity.
=================================================== */
function renderAnalytics() {
  const selectedArtist = scopedAnalyticsArtist();
  const artists = scopedAnalyticsArtists();
  const releases = scopedAnalyticsReleases();
  const transactions = scopedAnalyticsTransactions();
  const financials = analyticsFinancials(releases, transactions);
  const visitTotals = artistVisitTotals(artists);
  const topArtist = artists.slice().sort((a, b) => artistRevenue(b.id) - artistRevenue(a.id))[0];
  const topRelease = releases.slice().sort((a, b) => releaseRevenue(b) - releaseRevenue(a) || Number(b.downloads || 0) - Number(a.downloads || 0))[0];
  const platformItems = platformClickItems(releases);
  const topCountry = releases.find((release) => release.country)?.country || "None";
  const downloads = releases.reduce((sum, release) => sum + Number(release.downloads || 0), 0);
  const streamingClicks = releases.reduce((sum, release) => sum + Number(release.streamingClicks || 0), 0);

  setText("#analyticsTotalArtists", String(selectedArtist ? 1 : (currentStore.artists || []).length));
  setText("#analyticsTotalSongs", String(releases.length));
  setText("#analyticsTotalDownloads", String(downloads));
  setText("#analyticsTotalRevenue", money(financials.gross));
  setText("#analyticsTopArtist", topArtist?.name || topArtist?.handle || "None");
  setText("#analyticsTopSong", topRelease?.title || "None");
  setText("#analyticsTopCountry", topCountry);
  setText("#analyticsTopPlatform", platformItems[0]?.title || "None");
  setText("#analyticsProfileViews", String(visitTotals.profileViews));
  setText("#analyticsArtistVisits", String(visitTotals.artistPageVisits));
  setText("#analyticsMusicVisits", String(visitTotals.musicPageVisits || releases.reduce((sum, release) => sum + Number(release.plays || 0), 0)));
  setText("#analyticsVideoVisits", String(visitTotals.videoPageVisits));
  setText("#analyticsDownloadVisits", String(visitTotals.downloadPageVisits));
  setText("#analyticsStreamingClicks", String(streamingClicks));
  setText("#analyticsNetEarnings", money(financials.net));
  setText("#analyticsPlatformFees", money(financials.platformFees + financials.processingFees + financials.operationsFees));
  setText("#analyticsTrafficSources", selectedArtist?.trafficSources || "Direct");

  renderList(
    "#analyticsTopReleaseList",
    releases
      .slice()
      .sort((a, b) => Number(b.downloads || 0) - Number(a.downloads || 0) || Number(b.streamingClicks || 0) - Number(a.streamingClicks || 0))
      .slice(0, 8)
      .map((release) => ({
        title: release.title || "Untitled release",
        meta: `${release.artistName || "Artist"} | ${Number(release.downloads || 0)} downloads | ${Number(release.streamingClicks || 0)} stream clicks | ${money(releaseRevenue(release))}`,
      })),
    "Release analytics will appear after artists upload audio."
  );
  renderList(
    "#analyticsRevenueBreakdown",
    [
      { title: "Gross sales", meta: money(financials.gross) },
      { title: "Artist net", meta: money(financials.net) },
      { title: "Processing fees", meta: money(financials.processingFees) },
      { title: "Service fees", meta: money(financials.platformFees) },
      { title: "Operations fees", meta: money(financials.operationsFees) },
    ],
    "Revenue data will appear after sales."
  );
  renderList(
    "#analyticsPlatformBreakdown",
    platformItems.slice(0, 8).map((item) => ({ title: item.title, meta: `${item.clicks} clicks` })),
    "Streaming click analytics will appear after fans click platform links."
  );
  renderList(
    "#analyticsVisitBreakdown",
    [
      { title: "Profile views", meta: String(visitTotals.profileViews) },
      { title: "Artist home visits", meta: String(visitTotals.artistPageVisits) },
      { title: "Music / beats visits", meta: String(visitTotals.musicPageVisits) },
      { title: "Video visits", meta: String(visitTotals.videoPageVisits) },
      { title: "Download page visits", meta: String(visitTotals.downloadPageVisits) },
    ],
    "Visit analytics will appear after public page traffic."
  );
  renderList(
    "#analyticsRecentDownloads",
    releases
      .filter((release) => Number(release.downloads || 0) > 0)
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 8)
      .map((release) => ({
        title: release.title || "Untitled release",
        meta: `${release.artistName || "Artist"} | ${release.downloads} downloads | ${release.country || "United States"}`,
      })),
    "Download analytics will appear after purchases."
  );
  renderList(
    "#analyticsArtistSummary",
    artists
      .slice()
      .sort((a, b) => artistRevenue(b.id) - artistRevenue(a.id))
      .slice(0, 8)
      .map((artist) => ({
        title: artist.name || artist.handle || "Untitled artist",
        meta: `${artistReleases(artist.id).length} releases | ${artistDownloads(artist.id)} downloads | ${money(artistRevenue(artist.id))}`,
      })),
    "Artist analytics will appear after artists join."
  );
}

/* ===================================================
   SUPPORT, REPORTS, AND EXPORTS

   Renders support placeholders and report/export sections
   for artists, releases, downloads, and streaming activity.
=================================================== */
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
  renderList(
    "#auditLogs",
    (currentStore.auditLogs || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 20)
      .map((entry) => ({
        title: entry.action || "Store Manager action",
        meta: `${formatDate(entry.createdAt)} | ${entry.storeManagerEmail || "Store Manager"} | ${entry.reason || "No reason recorded"}`,
      })),
    "Audit logs will appear after admin actions are recorded."
  );
}

/* ===================================================
   FULL STORE MANAGER RENDER

   Refreshes every Store Manager section after data is loaded
   or saved.
=================================================== */
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

/* ===================================================
   STORE MANAGER ACTIONS AND FORM HANDLERS

   Handles admin save buttons, table actions, moderation
   actions, settings changes, and delete confirmations.
=================================================== */
async function saveAndRender(options = {}) {
  currentStore = await saveAdminStore(currentStore, options);
  renderAll();
}

siteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message(siteMessage, "Saving platform settings...", "pending");
  const logo = await fileToDataUrl(siteForm.logo.files[0]);
  const favicon = await fileToDataUrl(siteForm.favicon.files[0]);
  currentStore.site = {
    ...(currentStore.site || {}),
    title: siteForm.title.value.trim(),
    tagline: siteForm.tagline.value.trim(),
    intro: siteForm.intro.value.trim(),
    primaryCta: siteForm.primaryCta.value.trim(),
    secondaryCta: siteForm.secondaryCta.value.trim(),
    footerTagline: siteForm.footerTagline.value.trim(),
    footerDescription: siteForm.footerDescription.value.trim(),
    copyrightText: siteForm.copyrightText.value.trim(),
    socials: {
      ...(currentStore.site?.socials || {}),
      x: normalizeLink(siteForm.socialX?.value || ""),
      facebook: normalizeLink(siteForm.socialFacebook?.value || ""),
      instagram: normalizeLink(siteForm.socialInstagram?.value || ""),
      youtube: normalizeLink(siteForm.socialYoutube?.value || ""),
      tiktok: normalizeLink(siteForm.socialTiktok?.value || ""),
      twitch: normalizeLink(siteForm.socialTwitch?.value || ""),
    },
    legalPages: {
      ...(currentStore.site?.legalPages || {}),
      privacy: siteForm.legalPrivacy?.value.trim() || "",
      terms: siteForm.legalTerms?.value.trim() || "",
      copyright: siteForm.legalCopyright?.value.trim() || "",
      dmca: siteForm.legalDmca?.value.trim() || "",
      contact: siteForm.legalContact?.value.trim() || "",
      artistAgreement: siteForm.legalArtistAgreement?.value.trim() || "",
      payoutPolicy: siteForm.legalPayoutPolicy?.value.trim() || "",
      noRefundPolicy: siteForm.legalNoRefundPolicy?.value.trim() || "",
      about: siteForm.legalAbout?.value.trim() || "",
    },
    commissionRate: Number(siteForm.commissionRate.value || 10),
    googleAnalytics: siteForm.googleAnalytics?.value.trim() || "",
    facebookPixel: siteForm.facebookPixel?.value.trim() || "",
    stripeSettings: siteForm.stripeSettings?.value.trim() || "",
    emailSettings: siteForm.emailSettings?.value.trim() || "",
  };
  if (logo) currentStore.site.logo = logo;
  if (favicon) currentStore.site.favicon = favicon;
  currentStore = await saveAdminStore(currentStore);
  applyLogo();
  fillSiteForm();
  siteForm.logo.value = "";
  siteForm.favicon.value = "";
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

  if (event.target.closest("[data-artist-analytics]")) {
    showArtistAnalytics(artist.id);
  }

  const statusButton = event.target.closest("[data-artist-status]");
  if (statusButton) {
    artist.status = statusButton.dataset.artistStatus;
    await saveAndRender();
  }

  if (event.target.closest("[data-delete-artist]")) {
    const releaseIds = currentStore.releases
      .filter((release) => release.artistId === artist.id)
      .map((release) => release.id);
    currentStore.artists = currentStore.artists.filter((item) => item.id !== artist.id);
    currentStore.releases = currentStore.releases.filter((release) => release.artistId !== artist.id);
    await saveAndRender({ deletions: { artistIds: [artist.id], releaseIds } });
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

  if (event.target.closest("[data-release-analytics]")) {
    showArtistAnalytics(release.artistId);
  }

  const statusButton = event.target.closest("[data-song-status]");
  if (statusButton) {
    release.status = statusButton.dataset.songStatus;
    await saveAndRender();
  }

  if (event.target.closest("[data-delete-song]")) {
    currentStore.releases = currentStore.releases.filter((item) => item.id !== release.id);
    await saveAndRender({ deletions: { releaseIds: [release.id] } });
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
    message(managerSongMessage, "Choose a release to edit first.", "error");
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
  message(managerSongMessage, "Release saved.");
});

managerPayoutTable?.addEventListener("click", async (event) => {
  const row = event.target.closest("[data-id]");
  if (!row) return;
  const artist = currentStore.artists.find((item) => item.id === row.dataset.id);
  if (!artist) return;

  if (event.target.closest("[data-payout-view]")) {
    showArtistAnalytics(artist.id);
  }

  if (event.target.closest("[data-payout-export]")) {
    exportPayoutCsv([artist], `musicbusinessarena-payout-${artistSlug(artist)}.csv`);
    message(managerPayoutMessage, `Exported payout report for ${artist.name || artist.handle || "artist"}.`);
  }

  if (event.target.closest("[data-payout-paid]")) {
    const summary = payoutSummaryForArtist(artist);
    if (!summary.payableTransactions.length) {
      message(managerPayoutMessage, `No unpaid manual payout records for ${artist.name || artist.handle || "artist"}.`, "pending");
      return;
    }
    const paidAt = new Date().toISOString();
    summary.payableTransactions.forEach((transaction) => {
      transaction.payoutStatus = "paid";
      transaction.paidOutAt = paidAt;
      transaction.updatedAt = paidAt;
    });
    currentStore.auditLogs = [
      ...(currentStore.auditLogs || []),
      {
        id: `payout-paid-${artist.id}-${Date.now().toString(36)}`,
        action: "Marked artist payout paid",
        artistId: artist.id,
        artistName: artist.name || artist.handle || "Artist",
        amount: summary.payableTransactions.reduce((sum, transaction) => sum + transactionNet(transaction), 0),
        createdAt: paidAt,
        reason: "Store Manager payout action",
      },
    ];
    await saveAndRender();
    message(managerPayoutMessage, `Marked ${summary.payableTransactions.length} payout record(s) paid for ${artist.name || artist.handle || "artist"}.`);
  }
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

managerAnalyticsArtistSelect?.addEventListener("change", renderAnalytics);

managerNavLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showManagerSection(link.dataset.managerSection);
  });
});

document.querySelector("#exportDownloadsCsv")?.addEventListener("click", () => {
  const rows = filteredDownloads();
  const header = ["Release", "Artist", "Country", "Gross Sales", "Processing Fee 5%", "Service Fee 10%", "Operations Fee 5%", "Artist Net 80%", "Downloads", "Status"];
  const lines = rows.map((release) => {
    const txns = (currentStore.transactions || []).filter((transaction) => String(transaction.releaseId) === String(release.id));
    const grossSales = txns.length ? txns.reduce((sum, transaction) => sum + transactionGross(transaction), 0) : releaseRevenue(release);
    const processingFees = txns.length ? txns.reduce((sum, transaction) => sum + transactionProcessorFee(transaction), 0) : grossSales * (PAYMENT_PROCESSING_FEE_PERCENT / 100);
    const serviceFees = txns.length ? txns.reduce((sum, transaction) => sum + transactionPlatformFee(transaction), 0) : grossSales * (PLATFORM_SERVICE_FEE_PERCENT / 100);
    const operationsFees = txns.length ? txns.reduce((sum, transaction) => sum + transactionOperationsFee(transaction), 0) : grossSales * (PLATFORM_OPERATIONS_FEE_PERCENT / 100);
    const artistNet = txns.length ? txns.reduce((sum, transaction) => sum + transactionNet(transaction), 0) : grossSales * (ARTIST_PAYOUT_PERCENT / 100);
    return [
      release.title,
      release.artistName,
      release.country,
      grossSales,
      processingFees,
      serviceFees,
      operationsFees,
      artistNet,
      release.downloads,
      "complete",
    ].map((value) => `"${String(value || "").replace(/"/g, '""')}"`).join(",");
  });
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "musicbusinessarena-downloads.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector("#exportPayoutsCsv")?.addEventListener("click", () => {
  exportPayoutCsv(currentStore.artists || []);
  message(managerPayoutMessage, "Exported platform payout report.");
});

/* ===================================================
   STARTUP

   Starts the Store Manager dashboard directly.
=================================================== */
async function initStoreManager() {
  const hasSession = await requireStoreManagerSession();
  if (!hasSession) return;
  currentStore = await loadAdminStore();
  renderAll();
  showManagerSection("managerDashboard");
}

initStoreManager();
