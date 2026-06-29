/* ===================================================
   ARTIST DASHBOARD SCRIPT

   CODE OWNER GUIDE

   Controls artist uploads, edits, profile updates, analytics cards, earnings, Stripe Connect, settings, and dashboard navigation.
   Used by: artist-dashboard.html.
   Does not control Store Manager tools.
=================================================== */

const artistForm = document.querySelector("#artistForm");
const ARTIST_PAYOUT_PERCENT = 80;
/* ===================================================
   DASHBOARD ELEMENTS AND STATE

   Collects the HTML elements used by the Artist Dashboard
   and stores the current artist, current website data, and
   upload wizard state.

   Used by:
   - artist-dashboard.html
=================================================== */
const PLATFORM_SERVICE_FEE_PERCENT = 10;
const PAYMENT_PROCESSING_FEE_PERCENT = 5;
const PLATFORM_OPERATIONS_FEE_PERCENT = 5;
const releaseForm = document.querySelector("#releaseForm");
const videoForm = document.querySelector("#videoForm");
const socialFields = document.querySelector("#socialFields");
const streamingFields = document.querySelector("#streamingFields");
const trackManager = document.querySelector("#trackManager");
const trackManagerHelp = document.querySelector("#trackManagerHelp");
const trackManagerList = document.querySelector("#trackManagerList");
const audioUploadHelp = document.querySelector("#audioUploadHelp");
const artistMessage = document.querySelector("#artistMessage");
const releaseMessage = document.querySelector("#releaseMessage");
const videoMessage = document.querySelector("#videoMessage");
const releaseList = document.querySelector("#dashboardReleaseList");
const songBioCount = document.querySelector("#songBioCount");
const artistBioCount = document.querySelector("#artistBioCount");
const homePreviewCover = document.querySelector("#homePreviewCover");
const homePreviewMeta = document.querySelector("#homePreviewMeta");
const homePreviewSong = document.querySelector("#homePreviewSong");
const homePreviewArtist = document.querySelector("#homePreviewArtist");
const artistPreviewPhoto = document.querySelector("#artistPreviewPhoto");
const artistPreviewTitle = document.querySelector("#artistPreviewTitle");
const artistPreviewBio = document.querySelector("#artistPreviewBio");
const artistPreviewSocials = document.querySelector("#artistPreviewSocials");
const featuredReleaseSelect = document.querySelector("#featuredReleaseSelect");
const saveFeaturedRelease = document.querySelector("#saveFeaturedRelease");
const featuredReleaseMessage = document.querySelector("#featuredReleaseMessage");
const musicPreviewCover = document.querySelector("#musicPreviewCover");
const musicPreviewArtist = document.querySelector("#musicPreviewArtist");
const musicPreviewTitle = document.querySelector("#musicPreviewTitle");
const musicPreviewDate = document.querySelector("#musicPreviewDate");
const musicPreviewTags = document.querySelector("#musicPreviewTags");
const videoPreviewMainFrame = document.querySelector("#videoPreviewMainFrame");
const videoPreviewShortFrame = document.querySelector("#videoPreviewShortFrame");
const videoPreviewMainTitle = document.querySelector("#videoPreviewMainTitle");
const artistAccountSelect = document.querySelector("#artistAccountSelect");
const createArtistProfile = document.querySelector("#createArtistProfile");
const artistAccountMessage = document.querySelector("#artistAccountMessage");
const uploadStatusTitle = document.querySelector("#uploadStatusTitle");
const uploadStatusText = document.querySelector("#uploadStatusText");
const clearReleaseButton = document.querySelector("[data-clear-release]");
const releaseTypeGate = document.querySelector("#releaseTypeGate");
const songUploadSection = document.querySelector("#songUpload");
const releaseTypeOptions = document.querySelectorAll("[data-start-release]");
const releaseFlowEyebrow = document.querySelector("#releaseFlowEyebrow");
const dashboardSections = [...document.querySelectorAll(".artist-dashboard-section")];
const dashboardNavLinks = [...document.querySelectorAll("[data-dashboard-section]")];
const openSongEditorButtons = document.querySelectorAll("[data-open-song-editor]");
const artistLogoutButtons = document.querySelectorAll("[data-artist-logout]");
const dashboardSiteNav = document.querySelector(".site-header .site-nav");
const dashboardBrandLink = document.querySelector(".site-header .brand");
const artistConsoleLinks = document.querySelector(".artist-console-links");
const songSearchInput = document.querySelector("#songSearchInput");
const songGenreFilter = document.querySelector("#songGenreFilter");
const songStatusFilter = document.querySelector("#songStatusFilter");
const songSortSelect = document.querySelector("#songSortSelect");
const artistSongTable = document.querySelector("#artistSongTable");
const deleteEditingSong = document.querySelector("#deleteEditingSong");
const artistVideoList = document.querySelector("#artistVideoList");
const artistDownloadTable = document.querySelector("#artistDownloadTable");
const recentActivityList = document.querySelector("#recentActivityList");
const recentDownloadsList = document.querySelector("#recentDownloadsList");
const recentUploadsList = document.querySelector("#recentUploadsList");
const payoutHistoryList = document.querySelector("#payoutHistoryList");
const connectStripeAccount = document.querySelector("#connectStripeAccount");
const stripeConnectStatus = document.querySelector("#stripeConnectStatus");
const stripeConnectDetails = document.querySelector("#stripeConnectDetails");
const stripeConnectNotice = document.querySelector("#stripeConnectNotice");
const earningsBreakdownTable = document.querySelector("#earningsBreakdownTable");
const analyticsTopModal = document.querySelector("#analyticsTopModal");
const analyticsTopModalTitle = document.querySelector("#analyticsTopModalTitle");
const analyticsTopModalList = document.querySelector("#analyticsTopModalList");
const songEditorSection = document.querySelector("#songEditorSection");
const profileSection = document.querySelector("#profileSection");
const videosSection = document.querySelector("#videosSection");
const uploadWizardProgress = document.querySelector("#uploadWizardProgress");
const uploadWizardActions = document.querySelector("#uploadWizardActions");
const uploadWizardBack = document.querySelector("#uploadWizardBack");
const uploadWizardNext = document.querySelector("#uploadWizardNext");
const uploadWizardPublish = document.querySelector("#uploadWizardPublish");
const artistAccountSettingsForm = document.querySelector("#artistAccountSettingsForm");
const artistAccountSettingsMessage = document.querySelector("#artistAccountSettingsMessage");

let currentStore = window.MBA.defaults();
let activeArtistId = "";
let artistSession = null;
let uploadWizardStep = 1;
let uploadWizardReady = false;
let uploadTracks = [];
const DEFAULT_PREVIEW_START = 0;
const DEFAULT_PREVIEW_END = 60;
const RELEASE_TRACK_LIMITS = {
  Single: { min: 1, max: 1 },
  EP: { min: 2, max: 6 },
  Album: { min: 7, max: 17 },
};
const COUNTRY_CODES = [
  "AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM", "AW", "AU", "AT", "AZ", "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM", "BT", "BO", "BQ", "BA", "BW", "BV", "BR", "IO", "BN", "BG", "BF", "BI", "CV", "KH", "CM", "CA", "KY", "CF", "TD", "CL", "CN", "CX", "CC", "CO", "KM", "CG", "CD", "CK", "CR", "CI", "HR", "CU", "CW", "CY", "CZ", "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF", "GA", "GM", "GE", "DE", "GH", "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY", "HT", "HM", "VA", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT", "JM", "JP", "JE", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MO", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX", "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NC", "NZ", "NI", "NE", "NG", "NU", "NF", "MK", "MP", "NO", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PN", "PL", "PT", "PR", "QA", "RE", "RO", "RU", "RW", "BL", "SH", "KN", "LC", "MF", "PM", "VC", "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS", "SS", "ES", "LK", "SD", "SR", "SJ", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TK", "TO", "TT", "TN", "TR", "TM", "TC", "TV", "UG", "UA", "AE", "GB", "US", "UM", "UY", "UZ", "VU", "VE", "VN", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW",
];
const analyticsTopLists = {
  songs: [],
  videos: [],
  platforms: [],
};

/* ===================================================
   SHARED HELPER FUNCTIONS

   Small utilities for formatting money, preview times,
   messages, links, escaped text, and file uploads.

   These helpers are reused throughout the Artist Dashboard.
=================================================== */
function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function formatPreviewTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds || 0)));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function parsePreviewTime(value, fallbackSeconds = 0) {
  const text = String(value || "").trim();
  if (!text) return fallbackSeconds;

  if (text.includes(":")) {
    const parts = text.split(":");
    if (parts.length !== 2) return NaN;
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || seconds < 0 || seconds > 59) return NaN;
    return minutes * 60 + seconds;
  }

  const seconds = Number(text);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : NaN;
}

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

function artistPublicUrls(artist = primaryArtist()) {
  const slug = artistSlug(artist);
  return {
    home: `/${slug}`,
    music: `/${slug}/music`,
    videos: `/${slug}/videos`,
    dashboard: `/${slug}-dashboard`,
  };
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function showDashboardSection(sectionId) {
  dashboardSections.forEach((section) => {
    section.classList.toggle("is-active", section.id === sectionId);
  });
  dashboardNavLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.dashboardSection === sectionId);
  });
}

function artistReleases() {
  const artist = primaryArtist();
  return currentStore.releases.filter((release) => release.artistId === artist.id);
}

function artistTransactions() {
  const releases = artistReleases();
  const releaseIds = new Set(releases.map((release) => release.id));
  return (currentStore.transactions || []).filter((transaction) => releaseIds.has(transaction.releaseId));
}

function releaseRevenue(release) {
  return Number(release.earnings || 0) || Number(release.downloads || 0) * Number(release.price || 0);
}

function archivedReleaseAnalytics(artistId) {
  return (currentStore.analyticsArchive || []).filter(
    (record) => record.entityType === "release" && record.artistId === artistId
  );
}

function message(node, text, type = "success") {
  node.textContent = text;
  node.dataset.type = type;
}

function normalizeLink(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^mailto:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("@")) return trimmed;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return `mailto:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.includes(".") && !trimmed.includes(" ")) return `https://${trimmed}`;
  return trimmed;
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

/* ===================================================
   RELEASE TYPE AND MULTI-TRACK UPLOADS

   Controls whether a release is a Single, EP, or Album.
   Also controls track limits, track list display, renaming,
   ordering, and per-track preview settings.

   Used by:
   - Upload Song wizard
=================================================== */
function releaseTypeValue() {
  const value = releaseForm?.releaseType?.value || "Single";
  return value === "Album" || value === "EP" ? value : "Single";
}

function isMultiTrackRelease(type = releaseTypeValue()) {
  return type === "Album" || type === "EP";
}

function trackLimits(type = releaseTypeValue()) {
  return RELEASE_TRACK_LIMITS[type] || RELEASE_TRACK_LIMITS.Single;
}

function titleFromFileName(fileName = "") {
  return String(fileName || "Untitled track")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Untitled track";
}

function normalizeTrack(track, index = 0) {
  const previewStart = Number.isFinite(Number(track.previewStart)) ? Number(track.previewStart) : DEFAULT_PREVIEW_START;
  const previewEnd = Number.isFinite(Number(track.previewEnd)) && Number(track.previewEnd) > previewStart
    ? Number(track.previewEnd)
    : DEFAULT_PREVIEW_END;
  return {
    id: track.id || window.MBA.uid("track"),
    title: track.title || titleFromFileName(track.audioName || track.name) || `Track ${index + 1}`,
    audioName: track.audioName || track.name || "",
    audioUrl: track.audioUrl || "",
    audioData: track.audioData || "",
    order: Number(track.order || index + 1),
    previewStart,
    previewEnd,
    previewDuration: previewEnd - previewStart,
    file: track.file || null,
  };
}

function syncTrackInputsToState() {
  if (!trackManagerList) return;
  trackManagerList.querySelectorAll("[data-track-id]").forEach((row, index) => {
    const track = uploadTracks.find((item) => item.id === row.dataset.trackId);
    if (!track) return;
    track.title = row.querySelector("[data-track-title]")?.value.trim() || `Track ${index + 1}`;
    track.previewStart = parsePreviewTime(row.querySelector("[data-track-preview-start]")?.value, DEFAULT_PREVIEW_START);
    track.previewEnd = parsePreviewTime(row.querySelector("[data-track-preview-end]")?.value, DEFAULT_PREVIEW_END);
  });
}

function renderTrackManager() {
  if (!trackManager || !trackManagerList) return;
  const type = releaseTypeValue();
  const multiTrack = isMultiTrackRelease(type);
  const limits = trackLimits(type);
  releaseForm.audio.multiple = multiTrack;
  trackManager.hidden = !multiTrack;
  if (audioUploadHelp) {
    audioUploadHelp.textContent = multiTrack
      ? `${type} uploads: select ${limits.min}-${limits.max} MP3/WAV files at once.`
      : "Supported files: MP3, WAV.";
  }
  if (trackManagerHelp) {
    trackManagerHelp.textContent = multiTrack
      ? `${type} requires ${limits.min}-${limits.max} tracks. Rename, reorder, remove, and set preview times before publishing.`
      : "Upload audio files to build the track list.";
  }
  trackManagerList.replaceChildren();
  if (!multiTrack) return;
  if (!uploadTracks.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No tracks selected yet.";
    trackManagerList.append(empty);
    return;
  }
  uploadTracks.forEach((track, index) => {
    const row = document.createElement("article");
    row.className = "track-manager-row";
    row.dataset.trackId = track.id;
    row.innerHTML = `
      <span class="track-number">${index + 1}</span>
      <label>
        Track title
        <input data-track-title type="text" value="${escapeAttr(track.title || `Track ${index + 1}`)}">
      </label>
      <label>
        Preview start
        <input data-track-preview-start type="text" inputmode="numeric" pattern="[0-9]+(:[0-5][0-9])?" value="${formatPreviewTime(track.previewStart)}">
      </label>
      <label>
        Preview stop
        <input data-track-preview-end type="text" inputmode="numeric" pattern="[0-9]+(:[0-5][0-9])?" value="${formatPreviewTime(track.previewEnd)}">
      </label>
      <div class="track-manager-actions">
        <button type="button" data-track-move="up" ${index === 0 ? "disabled" : ""}>Up</button>
        <button type="button" data-track-move="down" ${index === uploadTracks.length - 1 ? "disabled" : ""}>Down</button>
        <button type="button" data-track-remove>Remove</button>
      </div>
      <small>${escapeText(track.audioName || track.audioUrl || "Audio saved")}</small>
    `;
    trackManagerList.append(row);
  });
}

function applyReleaseTypeMode() {
  const type = releaseTypeValue();
  if (!isMultiTrackRelease(type)) uploadTracks = [];
  renderTrackManager();
}

function validateTrackList(type = releaseTypeValue()) {
  if (!isMultiTrackRelease(type)) return true;
  syncTrackInputsToState();
  const limits = trackLimits(type);
  const count = uploadTracks.length;
  if (count < limits.min || count > limits.max) {
    message(releaseMessage, `${type} uploads must include ${limits.min}-${limits.max} tracks. You currently have ${count}.`, "error");
    return false;
  }
  const badTrack = uploadTracks.find((track, index) => {
    const start = parsePreviewTime(track.previewStart, DEFAULT_PREVIEW_START);
    const end = parsePreviewTime(track.previewEnd, DEFAULT_PREVIEW_END);
    return !track.title || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || index >= limits.max;
  });
  if (badTrack) {
    message(releaseMessage, "Each track needs a title and valid preview times.", "error");
    return false;
  }
  return true;
}

async function serializedTracks() {
  syncTrackInputsToState();
  const tracks = [];
  for (let index = 0; index < uploadTracks.length; index += 1) {
    const track = normalizeTrack(uploadTracks[index], index);
    const audioData = track.file ? await fileToDataUrl(track.file) : track.audioData;
    const previewStart = parsePreviewTime(track.previewStart, DEFAULT_PREVIEW_START);
    const previewEnd = parsePreviewTime(track.previewEnd, DEFAULT_PREVIEW_END);
    tracks.push({
      id: track.id,
      title: track.title || `Track ${index + 1}`,
      audioName: track.audioName,
      audioUrl: track.audioUrl,
      audioData,
      order: index + 1,
      previewStart,
      previewEnd,
      previewDuration: previewEnd - previewStart,
    });
  }
  return tracks;
}

/* ===================================================
   VIDEO LINK HELPERS

   Reads YouTube, Shorts, TikTok, and video links so the
   dashboard can preview and save artist video information.

   Used by:
   - Upload wizard Video step
   - Artist Profile video settings
=================================================== */
function youtubeIdFromUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;

  try {
    const url = new URL(text);
    if (url.searchParams.get("v")) return url.searchParams.get("v");
    const parts = url.pathname.split("/").filter(Boolean);
    const marker = ["shorts", "embed", "video"].find((item) => parts.includes(item));
    if (marker) return parts[parts.indexOf(marker) + 1] || "";
    if (url.hostname.includes("youtu.be")) return parts[0] || "";
  } catch {
    return "";
  }

  return "";
}

function embedUrl(videoId) {
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : "";
}

function setFrameFromUrl(frame, url) {
  if (!frame) return;
  const nextSrc = embedUrl(youtubeIdFromUrl(url));
  if (nextSrc && frame.src !== nextSrc) frame.src = nextSrc;
}

function renderLinkInputs(container, links, values = {}) {
  container.replaceChildren();
  links.forEach(([label, key, icon]) => {
    const field = document.createElement("label");
    field.className = "link-input";
    field.innerHTML = `
      <span>${icon ? `<img src="${icon}" alt="">` : ""}${label}</span>
      <input name="${key}" type="text" placeholder="https://... or @username" value="${values[key] || ""}">
    `;
    container.append(field);
  });
}

function formLinks(form, links) {
  return links.reduce((result, [, key]) => {
    result[key] = normalizeLink(form[key]?.value);
    return result;
  }, {});
}

/* ===================================================
   UPLOAD WIZARD NAVIGATION

   Controls the numbered upload steps, Back button, Next
   button, Publish button, step validation, and auto-save
   while moving through the upload flow.

   Used by:
   - Upload Song section
=================================================== */
function wizardPanels() {
  return [...document.querySelectorAll("[data-upload-step]")];
}

function updateWizardReview() {
  updateHomePreview();
  updateArtistPreview();
  updateVideoPreview();
}

function setUploadWizardStep(step) {
  uploadWizardStep = Math.min(6, Math.max(1, Number(step) || 1));
  const showReleaseShell = [2, 3, 4, 6].includes(uploadWizardStep);
  songUploadSection?.classList.toggle("is-wizard-hidden", !showReleaseShell);
  wizardPanels().forEach((panel) => {
    panel.classList.toggle("is-active", Number(panel.dataset.uploadStep) === uploadWizardStep);
  });
  uploadWizardProgress?.querySelectorAll("[data-wizard-progress]").forEach((item) => {
    const itemStep = Number(item.dataset.wizardProgress);
    item.classList.toggle("is-active", itemStep === uploadWizardStep);
    item.classList.toggle("is-complete", itemStep < uploadWizardStep);
    if (itemStep === uploadWizardStep) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  if (uploadWizardBack) uploadWizardBack.hidden = uploadWizardStep === 1;
  if (uploadWizardNext) {
    uploadWizardNext.hidden = false;
    uploadWizardNext.textContent = uploadWizardStep === 6 ? "Publish" : uploadWizardStep === 5 ? "Review" : "Next";
    uploadWizardNext.setAttribute("aria-label", uploadWizardStep === 6 ? "Publish release" : "Continue to the next upload step");
  }

  if (uploadWizardPublish) {
    uploadWizardPublish.style.display = uploadWizardStep === 6 ? "inline-flex" : "none";
  }
  if (releaseFlowEyebrow) releaseFlowEyebrow.textContent = `Step ${uploadWizardStep} of 6`;
  const titles = ["Release Type", "Upload Audio & Artwork", "Song Information", "Streaming Links", "Video (Optional)", "Review & Publish"];
  const flowTitle = document.querySelector("#releaseFlowTitle");
  if (flowTitle) flowTitle.textContent = titles[uploadWizardStep - 1];
  if (uploadWizardStep === 6) updateWizardReview();
  songEditorSection?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupUploadWizard() {
  if (!songEditorSection || uploadWizardReady) return;
  [videosSection].forEach((section) => {
    if (!section) return;
    section.classList.remove("artist-dashboard-section", "is-active");
    uploadWizardActions?.before(section);
  });
  songUploadSection?.classList.remove("is-hidden");
  uploadWizardReady = true;
  setUploadWizardStep(1);
}

function visibleStepFields(step) {
  return wizardPanels()
    .filter((panel) => Number(panel.dataset.uploadStep) === step)
    .flatMap((panel) => [...panel.querySelectorAll("input, select, textarea")]);
}

function validateUploadWizardStep(step) {
  if (step === 1 && !document.querySelector("[data-start-release].is-selected")) {
    message(releaseMessage, "Choose Single Song, EP, or Album to continue.", "error");
    return false;
  }
  if (step === 2 && !validateTrackList()) return false;
  const invalid = visibleStepFields(step).find((field) => !field.disabled && !field.checkValidity());
  if (!invalid) return true;
  invalid.reportValidity();
  message(releaseMessage, "Complete the required fields in this step before continuing.", "error");
  return false;
}

async function autoSaveReleaseDraft() {
  const artist = primaryArtist();
  const type = releaseTypeValue();
  const editingId = releaseForm.editingId.value;
  const existingIndex = currentStore.releases.findIndex((item) => item.id === editingId);
  const existing = existingIndex >= 0 ? currentStore.releases[existingIndex] : null;
  const release = existing || {
    id: window.MBA.uid("release"),
    artistId: artist.id,
    downloads: 0,
    earnings: 0,
    donations: 0,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
  const cover = await fileToDataUrl(releaseForm.cover.files[0]);
  const audioData = isMultiTrackRelease(type) ? "" : await fileToDataUrl(releaseForm.audio.files[0]);
  const textValues = {
    title: releaseForm.title.value.trim(),
    artistName: releaseForm.artistName.value.trim(),
    releaseType: type,
    genre: releaseForm.genre.value,
    secondaryGenre: releaseForm.secondaryGenre.value,
    songBio: releaseForm.songBio.value.trim(),
    releaseDate: releaseForm.releaseDate.value,
    producer: releaseForm.producer.value.trim(),
    writer: releaseForm.writer?.value.trim() || "",
    country: releaseForm.country.value,
    cityState: releaseForm.cityState.value.trim(),
  };
    Object.entries(textValues).forEach(([key, value]) => {
      release[key] = value || "";
    });
  release.mood = [releaseForm.moodPrimary.value, releaseForm.moodSecondary.value].filter(Boolean);
  const price = Number(releaseForm.price.value);
  if (Number.isFinite(price)) release.price = price;
  const previewStart = parsePreviewTime(releaseForm.previewStart.value, DEFAULT_PREVIEW_START);
  const previewEnd = parsePreviewTime(releaseForm.previewEnd.value, DEFAULT_PREVIEW_END);
  if (Number.isFinite(previewStart) && Number.isFinite(previewEnd) && previewEnd > previewStart) {
    release.previewStart = previewStart;
    release.previewEnd = previewEnd;
    release.previewDuration = previewEnd - previewStart;
  }
  release.location = [release.cityState, release.country].filter(Boolean).join(", ");
  release.streaming = formLinks(releaseForm, STREAMING_LINKS);
  if (cover) release.cover = cover;
  if (isMultiTrackRelease(type)) {
    release.tracks = await serializedTracks();
    const firstTrack = release.tracks[0];
    if (firstTrack) {
      release.audioData = firstTrack.audioData || "";
      release.audioUrl = firstTrack.audioUrl || release.audioUrl || "";
      release.audioName = firstTrack.audioName || `${firstTrack.title || release.title}.mp3`;
    }
  } else {
    release.tracks = [];
  }
  if (!isMultiTrackRelease(type) && audioData) {
    release.audioData = audioData;
    release.audioUrl = audioData;
    release.audioName = releaseForm.audio.files[0].name;
  }
  release.updatedAt = new Date().toISOString();
  if (existingIndex >= 0) currentStore.releases[existingIndex] = release;
  else currentStore.releases.unshift(release);
  currentStore = await window.MBA.saveStore(currentStore, {
    clears: [
      { collection: "releases", id: release.id, fields: ["streaming", "mood", "tracks"], value: null },
      { collection: "releases", id: release.id, fields: ["streaming"], value: release.streaming },
      { collection: "releases", id: release.id, fields: ["mood"], value: release.mood || [] },
      { collection: "releases", id: release.id, fields: ["tracks"], value: release.tracks || [] },
    ],
  });
  releaseForm.editingId.value = release.id;
  releaseForm.cover.required = !release.cover;
  releaseForm.audio.required = isMultiTrackRelease(type)
    ? !(release.tracks || []).length
    : !(release.audioUrl || release.audioData);
  renderDashboardReleases();
  message(releaseMessage, "Draft auto-saved.", "pending");
}

async function autoSaveArtistProfile() {
  const artist = primaryArtist();
  const photo = await fileToDataUrl(artistForm.photo.files[0]);
  const banner = await fileToDataUrl(artistForm.banner.files[0]);
  const fields = {
    name: artistForm.name.value.trim(),
    handle: artistForm.handle.value.trim(),
    bio: artistForm.bio.value.trim(),
    location: artistForm.location?.value.trim() || "",
    email: artistForm.email?.value.trim() || "",
  };
  Object.entries(fields).forEach(([key, value]) => {
  artist[key] = value || "";
});
  artist.socials = formLinks(artistForm, SOCIAL_LINKS);
  if (artist.email && !artist.socials.email) artist.socials.email = `mailto:${artist.email}`;
  if (photo) artist.photo = photo;
  if (banner) artist.banner = banner;
  artist.status = "approved";
  currentStore = await window.MBA.saveStore(currentStore, {
    clears: [{ collection: "artists", id: artist.id, fields: ["socials"], value: artist.socials }],
  });
  message(artistMessage, "Artist profile auto-saved.", "pending");
}

async function autoSaveVideoLinks() {
  const artist = primaryArtist();
  const nextVideos = {
    mainVideoUrl: normalizeLink(videoForm.mainVideoUrl.value),
    mainVideoTitle: videoForm.mainVideoTitle.value.trim(),
    shortVideoUrl: normalizeLink(videoForm.shortVideoUrl.value),
    tiktokUrl: normalizeLink(videoForm.tiktokUrl.value),
    moreVideosUrl: normalizeLink(videoForm.moreVideosUrl.value),
    moreShortsUrl: normalizeLink(videoForm.moreShortsUrl.value),
  };
  artist.videos = { ...(artist.videos || {}) };
  Object.entries(nextVideos).forEach(([key, value]) => {
  artist.videos[key] = value || "";
});
  currentStore.site = currentStore.site || {};
  currentStore.site.videos = { ...artist.videos };
  currentStore = await window.MBA.saveStore(currentStore, {
    clears: [
      { collection: "artists", id: artist.id, fields: ["videos"], value: artist.videos },
      { collection: "site", fields: ["videos"], value: currentStore.site.videos },
    ],
  });
  message(videoMessage, "Video links auto-saved.", "pending");
}

async function autoSaveCurrentWizardStep() {
  if (uploadWizardStep >= 2 && uploadWizardStep <= 4) await autoSaveReleaseDraft();
  if (uploadWizardStep === 5) await autoSaveVideoLinks();
}

async function advanceUploadWizard() {
  if (uploadWizardStep === 6) {
    publishReleaseFromWizard();
    return;
  }
  if (!validateUploadWizardStep(uploadWizardStep)) return;
  const currentStep = uploadWizardStep;
  const nextLabel = uploadWizardNext.textContent;
  uploadWizardNext.disabled = true;
  uploadWizardNext.textContent = currentStep === 5 ? "Preparing..." : "Saving...";
  message(releaseMessage, currentStep >= 2 && currentStep <= 5 ? "Saving this step..." : "Moving to next step...", "pending");
  try {
    await autoSaveCurrentWizardStep();
    setUploadWizardStep(currentStep + 1);
  } catch (error) {
    message(releaseMessage, error.message || "This step could not be saved.", "error");
  } finally {
    uploadWizardNext.disabled = false;
    if (uploadWizardStep === currentStep) uploadWizardNext.textContent = nextLabel;
  }
}

async function goToUploadWizardStep(targetStep) {
  const nextStep = Math.min(6, Math.max(1, Number(targetStep) || 1));
  if (nextStep === uploadWizardStep) return;
  const editing = Boolean(releaseForm.editingId.value);
  if (!editing && nextStep > uploadWizardStep) return;
  if (uploadWizardStep >= 2 && uploadWizardStep <= 5) {
    if (!validateUploadWizardStep(uploadWizardStep)) return;
    await autoSaveCurrentWizardStep();
  }
  setUploadWizardStep(nextStep);
}

/* ===================================================
   ACTIVE ARTIST AND PROFILE DATA

   Finds the current artist, fills artist profile forms,
   prepares country lists, and updates profile previews.

   Used by:
   - Profile section
   - Upload wizard artist information
=================================================== */
function blankArtist() {
  return {
    id: window.MBA.uid("artist"),
    name: "",
    handle: "",
    bio: "",
    photo: "",
    banner: "",
    socials: {},
    status: "approved",
    followers: 0,
    createdAt: new Date().toISOString(),
  };
}

function primaryArtist() {
  if (!currentStore.artists.length) currentStore.artists.push(blankArtist());

  let artist = currentStore.artists.find((item) => item.id === activeArtistId);
  if (!artist) {
    artist = currentStore.artists[0];
    activeArtistId = artist.id;
  }

  return artist;
}

function artistLabel(artist) {
  return artist.name || artist.handle || "Untitled artist";
}

function renderArtistAccountPicker() {
  if (!artistAccountSelect) return;
  const artist = primaryArtist();
  updateArtistPublicLinks(artist);
  artistAccountSelect.replaceChildren();
  artistAccountSelect.append(new Option(artistLabel(artist), artist.id));
  artistAccountSelect.value = artist.id;
  artistAccountSelect.disabled = true;
  createArtistProfile?.setAttribute("hidden", "");
  if (artistAccountSettingsForm && artistSession?.account?.email) {
    artistAccountSettingsForm.email.value = artistSession.account.email;
  }
}

function updateArtistPublicLinks(artist = primaryArtist()) {
  if (!artist) return;
  const urls = artistPublicUrls(artist);

  if (dashboardBrandLink) dashboardBrandLink.href = urls.home;
  if (dashboardSiteNav) {
    dashboardSiteNav.innerHTML = `
      <a href="${urls.home}">Home</a>
      <a href="${urls.music}">Music</a>
      <a href="${urls.videos}">Video</a>
      <a href="${urls.dashboard}">Upload</a>
    `;
  }

  if (artistConsoleLinks) {
    const links = artistConsoleLinks.querySelectorAll("a");
    if (links[0]) links[0].href = urls.home;
    if (links[1]) links[1].href = urls.home;
  }

  document.querySelectorAll('a[href="/music"]').forEach((link) => {
    link.href = urls.music;
  });
  document.querySelectorAll('a[href="/home"]').forEach((link) => {
    link.href = urls.home;
  });
  document.querySelectorAll('a[href="/video"]').forEach((link) => {
    link.href = urls.videos;
  });
  document.querySelectorAll('a[href="/artist-dashboard"]').forEach((link) => {
    link.href = urls.dashboard;
  });
}

function fillArtistForm() {
  const artist = primaryArtist();
  updateArtistPublicLinks(artist);
  artistForm.name.value = artist.name || "";
  artistForm.handle.value = artist.handle || "";
  artistForm.bio.value = artist.bio || "";
  if (artistForm.location) artistForm.location.value = artist.location || artist.cityState || "";
  if (artistForm.email) artistForm.email.value = artist.email || artist.socials?.email?.replace(/^mailto:/i, "") || "";
  artistBioCount.textContent = String(artistForm.bio.value.length);
  renderLinkInputs(socialFields, SOCIAL_LINKS, artist.socials || {});
  updateArtistPreview();
}

function fillVideoForm() {
  const artist = primaryArtist();
  const videos = artist.videos || currentStore.site?.videos || {};
  videoForm.mainVideoUrl.value = videos.mainVideoUrl || "https://www.youtube.com/watch?v=5-YcPo7bsqs";
  videoForm.mainVideoTitle.value = videos.mainVideoTitle || "Focuzman Video";
  videoForm.shortVideoUrl.value = videos.shortVideoUrl || "https://www.youtube.com/shorts/07x9uu4EQiA";
  videoForm.tiktokUrl.value = videos.tiktokUrl || "";
  videoForm.moreVideosUrl.value = videos.moreVideosUrl || "https://www.youtube.com/@Focuzman/videos";
  videoForm.moreShortsUrl.value = videos.moreShortsUrl || "https://www.youtube.com/@Focuzman/shorts";
  updateVideoPreview();
}

function showReleaseTypeChoice() {
  songUploadSection?.classList.remove("is-hidden");
  if (uploadWizardReady) setUploadWizardStep(1);
}

function showReleaseForm(releaseType = "Single") {
  const selectedType = releaseType === "Album" || releaseType === "EP" ? releaseType : "Single";
  songUploadSection?.classList.remove("is-hidden");
  setSelectValue(releaseForm.releaseType, selectedType);
  releaseTypeOptions.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.startRelease === selectedType);
  });
  applyReleaseTypeMode();
  updateHomePreview();
  if (uploadWizardReady) setUploadWizardStep(releaseForm.editingId.value ? 3 : 2);
}

function clearReleaseForm() {
  releaseForm.reset();
  releaseForm.editingId.value = "";
  uploadTracks = [];
  releaseTypeOptions.forEach((button) => button.classList.remove("is-selected"));
  populateCountrySelect();
  releaseForm.price.value = "0.99";
  releaseForm.previewStart.value = formatPreviewTime(DEFAULT_PREVIEW_START);
  releaseForm.previewEnd.value = formatPreviewTime(DEFAULT_PREVIEW_END);
  releaseForm.cover.required = true;
  releaseForm.audio.required = true;
  songBioCount.textContent = "0";
  renderLinkInputs(streamingFields, STREAMING_LINKS);
  applyReleaseTypeMode();
  updateHomePreview();
  updateUploadStatus();
  showReleaseTypeChoice();
}

function updateHomePreview(coverSrc = "") {
  const artist = primaryArtist();
  const releaseType = releaseForm.releaseType.value || "Single";
  const genre = releaseForm.genre.value || "Music";
  const artworkSrc = String(coverSrc || "").includes("Mba Logos/MusicBusiness Logo.png") ? "" : coverSrc;
  if (homePreviewMeta) homePreviewMeta.textContent = `${releaseType} | ${genre}`;
  if (homePreviewSong) homePreviewSong.textContent = releaseForm.title.value.trim() || "Song title";
  if (homePreviewArtist) homePreviewArtist.textContent = releaseForm.artistName.value.trim() || artist.name || "Artist name";
  if (homePreviewCover) {
    homePreviewCover.closest(".upload-dropzone")?.classList.toggle("has-artwork", Boolean(artworkSrc));
    homePreviewCover.src = artworkSrc || "";
  }
  updateMusicPreview(coverSrc);
  updateUploadStatus();
}

function formatReleaseDate(value) {
  if (!value) return "choose a date";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

function tagList(values) {
  return values
    .filter(Boolean)
    .filter((tag, index, list) => list.findIndex((item) => String(item).toLowerCase() === String(tag).toLowerCase()) === index)
    .slice(0, 5);
}

function updateMusicPreview(coverSrc = "") {
  if (!musicPreviewTitle) return;
  const artist = primaryArtist();
  const artistName = releaseForm.artistName.value.trim() || artist.name || "Artist name";
  const title = releaseForm.title.value.trim() || "Song title";
  const cityState = releaseForm.cityState.value.trim();
  const country = releaseForm.country.value;
  const tags = tagList([
    [cityState, country].filter(Boolean).join(", "),
    releaseForm.genre.value,
    releaseForm.secondaryGenre.value,
    releaseForm.moodPrimary.value,
    releaseForm.moodSecondary.value,
  ]);

  musicPreviewArtist.textContent = artistName;
  musicPreviewTitle.textContent = title;
  musicPreviewDate.textContent = `Release Date: ${formatReleaseDate(releaseForm.releaseDate.value)} by ${artistName}`;
  musicPreviewTags.innerHTML = tags.length
    ? tags.map((tag) => `<span>#${tag}</span>`).join("")
    : `<span>#Location</span><span>#Genre</span><span>#SecondGenre</span><span>#Mood</span><span>#Mood</span>`;
  if (coverSrc) musicPreviewCover.src = coverSrc;
  if (!releaseForm.cover.files.length && !coverSrc && !releaseForm.editingId.value) musicPreviewCover.src = "Mba Logos/MusicBusiness Logo.png";
}

function updateUploadStatus() {
  if (!uploadStatusTitle || !uploadStatusText) return;
  const title = releaseForm.title.value.trim();
  const editing = Boolean(releaseForm.editingId.value);
  uploadStatusTitle.textContent = editing ? "Edit Song" : "Upload Song";
  uploadStatusText.textContent = editing ? "Edit mode" : title ? "Draft in progress" : "Ready to upload";
}

function socialIconFor(key, fallbackIcon) {
  const simpleIcons = {
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
  return simpleIcons[key] || fallbackIcon || "";
}

function renderSocialPreview(container, values) {
  if (!container) return;
  container.replaceChildren();
  SOCIAL_LINKS.forEach(([label, key, icon]) => {
    const href = normalizeLink(values[key]);
    if (!href) return;
    const item = document.createElement("span");
    item.title = label;
    const iconSrc = socialIconFor(key, icon);
    item.innerHTML = iconSrc ? `<img src="${iconSrc}" alt="${label}">` : `<span>${label}</span>`;
    container.append(item);
  });
}

function updateArtistPreview(photoSrc = "") {
  const artist = primaryArtist();
  const name = artistForm.name.value.trim() || artist.name || "Artist name";
  const bio = artistForm.bio.value.trim() || artist.bio || "Artist biography preview will appear here.";
  if (artistPreviewTitle) artistPreviewTitle.textContent = name;
  if (artistPreviewBio) artistPreviewBio.textContent = bio;
  if (artistPreviewPhoto) {
    artistPreviewPhoto.src = photoSrc || artist.photo || "Mba Logos/MusicBusiness Logo.png";
    artistPreviewPhoto.alt = `${name} profile photo`;
  }
  renderSocialPreview(artistPreviewSocials, formLinks(artistForm, SOCIAL_LINKS));
}

function setSelectValue(select, value) {
  const nextValue = String(value || "");
  if (nextValue && ![...select.options].some((option) => option.value === nextValue || option.textContent === nextValue)) {
    select.append(new Option(nextValue, nextValue));
  }
  select.value = nextValue;
}

function countryNames() {
  const displayNames = typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;
  return COUNTRY_CODES
    .map((code) => displayNames?.of(code) || code)
    .filter(Boolean)
    .filter((name, index, list) => list.indexOf(name) === index)
    .sort((a, b) => a.localeCompare(b));
}

function populateCountrySelect(selectedValue = "") {
  const select = releaseForm?.country;
  if (!select) return;
  const currentValue = selectedValue || select.value;
  const names = countryNames();
  select.replaceChildren(new Option("Choose country", ""));
  names.forEach((name) => select.append(new Option(name, name)));
  setSelectValue(select, currentValue);
}

/* ===================================================
   RELEASE FORM FILLING AND PREVIEWS

   Loads an existing song into the form for editing and
   updates the artwork, music, and homepage preview panels.

   Used by:
   - Editing existing songs
   - Upload Song section
=================================================== */
function fillReleaseForm(release) {
  releaseForm.editingId.value = release.id;
  const releaseType = release.releaseType === "Album" || release.releaseType === "EP" ? release.releaseType : "Single";
  showReleaseForm(releaseType);
  releaseForm.title.value = release.title || "";
  releaseForm.artistName.value = release.artistName || primaryArtist().name || "";
  setSelectValue(releaseForm.releaseType, releaseType);
  setSelectValue(releaseForm.genre, release.genre || "");
  setSelectValue(releaseForm.secondaryGenre, release.secondaryGenre || "");
  const moods = Array.isArray(release.mood) ? release.mood : String(release.mood || "").split(",").map((item) => item.trim());
  setSelectValue(releaseForm.moodPrimary, moods[0] || "");
  setSelectValue(releaseForm.moodSecondary, moods[1] || "");
  populateCountrySelect(release.country || "");
  releaseForm.songBio.value = release.songBio || "";
  releaseForm.releaseDate.value = release.releaseDate || "";
  releaseForm.producer.value = release.producer || "";
  if (releaseForm.writer) releaseForm.writer.value = release.writer || "";
  releaseForm.price.value = release.price ?? "0.99";
  const storedPreviewStart = Math.max(0, Number(release.previewStart ?? DEFAULT_PREVIEW_START));
  const storedPreviewEnd = Number(release.previewEnd ?? storedPreviewStart + Number(release.previewDuration || DEFAULT_PREVIEW_END));
  releaseForm.previewStart.value = formatPreviewTime(storedPreviewStart);
  releaseForm.previewEnd.value = formatPreviewTime(
    Number.isFinite(storedPreviewEnd) && storedPreviewEnd > storedPreviewStart
      ? storedPreviewEnd
      : storedPreviewStart + DEFAULT_PREVIEW_END
  );
  releaseForm.cityState.value = release.cityState || "";
  releaseForm.cover.required = false;
  releaseForm.audio.required = false;
  uploadTracks = Array.isArray(release.tracks) && release.tracks.length
    ? release.tracks.map((track, index) => normalizeTrack(track, index))
    : release.audioUrl
      ? [normalizeTrack({
          title: release.title || "Track 1",
          audioName: release.audioName || "",
          audioUrl: release.audioUrl || "",
          previewStart: release.previewStart ?? DEFAULT_PREVIEW_START,
          previewEnd: release.previewEnd ?? DEFAULT_PREVIEW_END,
        }, 0)]
      : [];
  renderTrackManager();
  songBioCount.textContent = String(releaseForm.songBio.value.length);
  renderLinkInputs(streamingFields, STREAMING_LINKS, release.streaming || {});
  updateHomePreview(release.cover || "");
  renderDashboardReleases();
  updateUploadStatus();
  message(releaseMessage, "Editing artist song. Save when your changes are ready.", "pending");
  releaseForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function releaseSummary(release) {
  const card = document.createElement("article");
  card.className = "submitted-release";
  if (releaseForm.editingId.value === release.id) card.classList.add("is-editing");
  const artist = primaryArtist();
  const isFeatured = artist.featuredReleaseId === release.id;
  card.innerHTML = `
    <img src="${release.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="">
    <div>
      <p>${release.releaseType || "Single"} | ${release.genre || "Music"}</p>
      <h3>${release.title || "Untitled release"}</h3>
      <span>${isFeatured ? "Music page landing song" : release.audioName || "Audio saved"}</span>
    </div>
    <div class="item-actions">
      <button type="button" data-edit-release="${release.id}">${releaseForm.editingId.value === release.id ? "Editing" : "Edit"}</button>
      <button type="button" data-feature-release="${release.id}">${isFeatured ? "Selected" : "Use for Music"}</button>
    </div>
  `;
  return card;
}

function renderFeaturedReleasePicker() {
  if (!featuredReleaseSelect) return;
  const artist = primaryArtist();
  const releases = currentStore.releases.filter((release) => release.artistId === artist.id);
  featuredReleaseSelect.replaceChildren(new Option("Use newest approved song", ""));
  releases.forEach((release) => {
    const option = new Option(`${release.title || "Untitled release"} - ${release.genre || "Music"}`, release.id);
    featuredReleaseSelect.append(option);
  });
  featuredReleaseSelect.value = artist.featuredReleaseId || "";
  updateFeaturedReleasePreview();
}

function updateFeaturedReleasePreview() {
  if (!featuredReleaseSelect || releaseForm.editingId.value) return;
  const artist = primaryArtist();
  const artistReleases = currentStore.releases.filter((item) => item.artistId === artist.id);
  const selectedId = featuredReleaseSelect.value || artist.featuredReleaseId;
  const release = artistReleases.find((item) => item.id === selectedId) || artistReleases[0];
  if (!release) {
    updateMusicPreview();
    return;
  }
  if (musicPreviewCover) musicPreviewCover.src = release.cover || "Mba Logos/MusicBusiness Logo.png";
  if (musicPreviewArtist) musicPreviewArtist.textContent = release.artistName || artist.name || "Artist name";
  if (musicPreviewTitle) musicPreviewTitle.textContent = release.title || "Song title";
  if (musicPreviewDate) {
    const artistName = release.artistName || artist.name || "Artist name";
    musicPreviewDate.textContent = `Release Date: ${formatReleaseDate(release.releaseDate)} by ${artistName}`;
  }
  if (musicPreviewTags) {
    const moods = Array.isArray(release.mood) ? release.mood : String(release.mood || "").split(",").map((item) => item.trim());
    const tags = tagList([release.location, release.genre, release.secondaryGenre, ...moods]);
    musicPreviewTags.innerHTML = tags.map((tag) => `<span>#${tag}</span>`).join("");
  }
}

/* ===================================================
   SONG LIST AND SONG MANAGEMENT

   Renders the artist's saved songs, search/filter controls,
   edit buttons, delete buttons, and release status details.

   Used by:
   - Songs section
   - Upload Song section
=================================================== */
function renderDashboardReleases() {
  const artist = primaryArtist();
  const releases = artistReleases();
  releaseList?.replaceChildren();
  renderFeaturedReleasePicker();

  if (releaseList && !releases.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Your uploaded releases will appear here for editing.";
    releaseList.append(empty);
  }

  if (releaseList && releases.length) releases.forEach((release) => releaseList.append(releaseSummary(release)));
  renderSongControls();
  renderSongTable();
  renderArtistConsole();
}

function renderSongControls() {
  if (!songGenreFilter) return;
  const currentValue = songGenreFilter.value;
  const genres = [...new Set(artistReleases().map((release) => release.genre).filter(Boolean))].sort();
  songGenreFilter.replaceChildren(new Option("All genres", ""));
  genres.forEach((genre) => songGenreFilter.append(new Option(genre, genre)));
  songGenreFilter.value = genres.includes(currentValue) ? currentValue : "";
}

function filteredArtistReleases() {
  let releases = artistReleases();
  const query = String(songSearchInput?.value || "").trim().toLowerCase();
  const genre = songGenreFilter?.value || "";
  const status = songStatusFilter?.value || "";
  const sort = songSortSelect?.value || "newest";

  if (query) {
    releases = releases.filter((release) =>
      [release.title, release.artistName, release.genre, release.secondaryGenre, release.songBio]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }
  if (genre) releases = releases.filter((release) => release.genre === genre);
  if (status) releases = releases.filter((release) => (release.status || "pending") === status);

  releases = releases.slice().sort((a, b) => {
    const aTime = new Date(a.createdAt || a.releaseDate || 0).getTime();
    const bTime = new Date(b.createdAt || b.releaseDate || 0).getTime();
    return sort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  return releases;
}

function renderSongTable() {
  if (!artistSongTable) return;
  const artist = primaryArtist();
  const releases = filteredArtistReleases();
  const urls = artistPublicUrls(artist);

  if (!releases.length) {
    artistSongTable.innerHTML = `<p class="empty-state">No songs match the current filters.</p>`;
    return;
  }

  artistSongTable.innerHTML = `
    <div class="song-table-header">
      <span>Artwork</span>
      <span>Song Title</span>
      <span>Genre</span>
      <span>Price</span>
      <span>Downloads</span>
      <span>Status</span>
      <span>Date Created</span>
      <span>Actions</span>
    </div>
    ${releases
      .map(
        (release) => `
          <article class="song-table-row">
            <img src="${escapeAttr(release.cover || "Mba Logos/MusicBusiness Logo.png")}" alt="">
            <strong>${escapeText(release.title || "Untitled song")}</strong>
            <span>${escapeText(release.genre || "Music")}</span>
            <span>${money(release.price || 0)}</span>
            <span>${Number(release.downloads || 0)}</span>
            <span><mark>${escapeText(release.status || "pending")}</mark></span>
            <span>${formatReleaseDate((release.createdAt || "").slice(0, 10) || release.releaseDate)}</span>
            <div class="song-row-actions">
              <button type="button" data-edit-release="${release.id}">Edit</button>
              <a href="${urls.music}" target="_blank" rel="noreferrer">Preview</a>
              <button type="button" data-delete-release="${release.id}">Delete</button>
              <button type="button" data-feature-release="${release.id}">${artist.featuredReleaseId === release.id ? "Featured" : "Feature"}</button>
              <button type="button" data-duplicate-release="${release.id}">Duplicate</button>
            </div>
          </article>
        `
      )
      .join("")}
  `;
}

function emptyLine(text) {
  return `<p class="empty-state">${escapeText(text)}</p>`;
}

function renderActivityList(container, items, emptyText) {
  if (!container) return;
  container.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article>
              <strong>${escapeText(item.title)}</strong>
              <span>${escapeText(item.meta)}</span>
            </article>
          `
        )
        .join("")
    : emptyLine(emptyText);
}

/* ===================================================
   EARNINGS AND STRIPE CONNECT

   Calculates gross sales, platform fees, processing fees,
   artist net earnings, Stripe Connect status, and payout
   history shown to the artist.

   Used by:
   - Earnings section
=================================================== */
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

function renderEarningsBreakdown() {
  const releases = artistReleases();
  const releaseById = new Map(releases.map((release) => [String(release.id), release]));
  const transactions = artistTransactions()
    .filter((transaction) => transaction.type === "download" && releaseById.has(String(transaction.releaseId)))
    .slice()
    .sort((a, b) => new Date(b.downloadedAt || b.createdAt || 0) - new Date(a.downloadedAt || a.createdAt || 0));
  const grossSales = transactions.reduce((sum, transaction) => sum + transactionGross(transaction), 0);
  const processorFees = transactions.reduce((sum, transaction) => sum + transactionProcessorFee(transaction), 0);
  const platformFees = transactions.reduce((sum, transaction) => sum + transactionPlatformFee(transaction), 0);
  const operationsFees = transactions.reduce((sum, transaction) => sum + transactionOperationsFee(transaction), 0);
  const netEarnings = transactions.reduce((sum, transaction) => sum + transactionNet(transaction), 0);

  setText("#breakdownTotalDownloads", String(transactions.length));
  setText("#breakdownGrossSales", money(grossSales));
  setText("#breakdownProcessorFees", money(processorFees));
  setText("#breakdownPlatformFees", money(platformFees));
  setText("#breakdownOperationsFees", money(operationsFees));
  setText("#breakdownNetEarnings", money(netEarnings));

  if (!earningsBreakdownTable) return;
  earningsBreakdownTable.innerHTML = transactions.length
    ? `
      <div class="earnings-table-header">
        <span>Release</span><span>Price</span><span>Processing</span><span>Service</span><span>Operations</span><span>Artist Net</span><span>Date</span>
      </div>
      ${transactions.map((transaction) => {
        const release = releaseById.get(String(transaction.releaseId)) || {};
        return `
          <article class="earnings-table-row">
            <strong>${escapeText(release.title || "Untitled release")}</strong>
            <span>${money(transactionGross(transaction))}</span>
            <span>${money(transactionProcessorFee(transaction))}</span>
            <span>${money(transactionPlatformFee(transaction))}</span>
            <span>${money(transactionOperationsFee(transaction))}</span>
            <span>${money(transactionNet(transaction))}</span>
            <span>${escapeText(formatReleaseDate(String(transaction.downloadedAt || transaction.createdAt || "").slice(0, 10)))}</span>
          </article>
        `;
      }).join("")}
    `
    : emptyLine("No completed paid downloads yet. Earnings will show zero until verified purchases are recorded.");
}

function stripeStatusLabel(status) {
  if (status === "connected") return "Connected";
  if (status === "pending_verification") return "Pending Verification";
  return "Not Connected";
}

function payoutStatusLabel(status) {
  if (status === "paid") return "paid";
  if (status === "processing") return "processing";
  if (status === "failed") return "failed";
  return "pending";
}

function stripeStatusDetails(payload) {
  if (!payload?.stripeConfigured) {
    return "Stripe Connect is not configured yet. Add a valid Stripe secret key in Render to enable artist onboarding.";
  }
  if (payload.status === "connected") {
    const modeText = payload.stripeMode === "live" ? " Live payouts can be processed securely through Stripe Connect." : " Payouts can be processed securely through Stripe Connect.";
    return `Stripe Account Connected.${modeText}`;
  }
  if (payload.status === "pending_verification") {
    return "Stripe is still reviewing or needs more information. Continue onboarding to finish verification.";
  }
  return "Connect a Stripe account to receive payouts. MusicBusiness Arena never stores bank details.";
}

function renderStripePayoutStatus(payload = {}) {
  if (stripeConnectStatus) {
    stripeConnectStatus.textContent = stripeStatusLabel(payload.status);
    stripeConnectStatus.dataset.status = payload.status || "not_connected";
  }
  if (stripeConnectDetails) stripeConnectDetails.textContent = stripeStatusDetails(payload);

  const hasEarnings = Number(payload.totalEarnings || 0) > 0;
  if (stripeConnectNotice) {
    if (!payload.stripeConfigured) {
      message(stripeConnectNotice, "Stripe Connect setup is waiting for the platform Stripe key.", "pending");
    } else if (payload.status === "connected") {
      message(stripeConnectNotice, "Your payout account is connected. Stripe handles bank details and verification.", "success");
    } else if (hasEarnings) {
      message(stripeConnectNotice, "You have earnings. Connect Stripe before payouts can be processed.", "pending");
    } else {
      message(stripeConnectNotice, "Artists can upload and publish music before connecting Stripe, but payouts require Stripe Connect.", "pending");
    }
  }

  if (connectStripeAccount) {
    connectStripeAccount.hidden = false;
    connectStripeAccount.disabled = !payload.stripeConfigured;
    connectStripeAccount.textContent = payload.status === "connected"
      ? "Open Stripe Dashboard"
      : payload.status === "pending_verification"
        ? "Continue Stripe Setup"
        : "Connect Stripe Account";
  }

  if (Number.isFinite(Number(payload.availableBalance))) setText("#earningsAvailableBalance", money(payload.availableBalance));
  if (Number.isFinite(Number(payload.pendingBalance))) setText("#earningsPendingBalance", money(payload.pendingBalance));
  if (Number.isFinite(Number(payload.totalPaidOut))) setText("#earningsTotalPaidOut", money(payload.totalPaidOut));
  setText("#earningsNextPayout", payload.nextEstimatedPayoutDate || "Not scheduled");

  const history = (payload.payoutHistory || []).map((item) => ({
    title: `${money(item.amount)} ${payoutStatusLabel(item.status)}`,
    meta: item.date ? formatReleaseDate(String(item.date).slice(0, 10)) : "Payout record",
  }));
  renderActivityList(payoutHistoryList, history, "Payout history will appear after payouts are processed.");
}

async function loadStripePayoutStatus() {
  if (!stripeConnectStatus) return;
  try {
    const response = await fetch("/api/artist/stripe-status", { cache: "no-store", credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Unable to load Stripe status.");
    renderStripePayoutStatus(payload);
  } catch (error) {
    if (stripeConnectDetails) stripeConnectDetails.textContent = error.message || "Unable to load Stripe status.";
    if (stripeConnectStatus) stripeConnectStatus.textContent = "Unavailable";
  }
}

/* ===================================================
   ANALYTICS CARDS

   Builds the analytics cards for top songs, top videos,
   top streaming platforms, downloads, visits, and modal
   detail lists.

   Used by:
   - Analytics section
=================================================== */
function videoEntries(artist) {
  const videos = artist.videos || currentStore.site?.videos || {};
  return [
    ["YouTube Video", videos.mainVideoTitle || "Featured video", videos.mainVideoUrl],
    ["YouTube Shorts", "Short video", videos.shortVideoUrl],
    ["TikTok / Instagram Reels", "Short-form video", videos.tiktokUrl],
  ].filter(([, , url]) => url);
}

function streamClickCount(release) {
  return Number(release.streamingClicks || 0);
}

function topSongItems(releases) {
  return releases
    .filter((release) => (release.status || "pending") === "approved")
    .map((release) => ({
      title: release.title || "Untitled song",
      downloads: Number(release.downloads || 0),
      streamClicks: streamClickCount(release),
    }))
    .sort((a, b) => b.downloads - a.downloads || b.streamClicks - a.streamClicks || a.title.localeCompare(b.title));
}

function videoActivityCount(artist, videoKey) {
  const videos = artist.videos || currentStore.site?.videos || {};
  const analytics = artist.videoAnalytics || videos.analytics || {};
  const directValue = videos[`${videoKey}Views`] ?? videos[`${videoKey}Clicks`] ?? analytics[videoKey];
  if (typeof directValue === "number") return directValue;
  if (directValue && typeof directValue === "object") return Number(directValue.views || directValue.clicks || 0);
  return 0;
}

function topVideoItems(artist) {
  const videos = artist.videos || currentStore.site?.videos || {};
  return [
    { title: videos.mainVideoTitle || "YouTube Video", type: "YouTube Video", count: videoActivityCount(artist, "mainVideo"), order: 0 },
    { title: "YouTube Shorts", type: "YouTube Shorts", count: videoActivityCount(artist, "shortVideo"), order: 1 },
    { title: "TikTok / Instagram Reels", type: "Short-form video", count: videoActivityCount(artist, "tiktok"), order: 2 },
  ]
    .filter((item, index) => [videos.mainVideoUrl, videos.shortVideoUrl, videos.tiktokUrl][index])
    .sort((a, b) => b.count - a.count || a.order - b.order);
}

function platformClickMapForRelease(release) {
  return release.platformClicks || {};
}

function topStreamingPlatformItems(artist, releases) {
  const totals = {};
  releases.forEach((release) => {
    const clickMap = platformClickMapForRelease(release);
    Object.entries(clickMap).forEach(([platform, count]) => {
      totals[platform] = Number(totals[platform] || 0) + Number(count || 0);
    });
  });

  return Object.entries(totals)
    .map(([platform, clicks]) => ({ title: platformLabel(platform), clicks: Number(clicks || 0) }))
    .filter((item) => item.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks || a.title.localeCompare(b.title));
}

function platformLabel(key) {
  const match = STREAMING_LINKS.find(([, value]) => value === key);
  return match?.[0] || String(key || "Platform").replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function renderExpandableAnalyticsCard(containerSelector, listKey, items, emptyText, formatMeta) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  analyticsTopLists[listKey] = items.map((item) => ({
    title: item.title,
    meta: formatMeta(item),
  }));

  if (!items.length) {
    container.innerHTML = `<strong>${escapeText(emptyText)}</strong>`;
    return;
  }

  const [firstItem] = items;
  container.innerHTML = `
    <strong>${escapeText(firstItem.title)}</strong>
    <span>${escapeText(formatMeta(firstItem))}</span>
    <button class="analytics-view-all" type="button" data-analytics-top-list="${listKey}">View All</button>
  `;
}

function renderVideosPanel() {
  if (!artistVideoList) return;
  const entries = videoEntries(primaryArtist());
  artistVideoList.innerHTML = entries.length
    ? entries
        .map(
          ([type, title, url]) => `
            <article>
              <div>
                <strong>${escapeText(title)}</strong>
                <span>${escapeText(type)}</span>
              </div>
              <a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">Open</a>
            </article>
          `
        )
        .join("")
    : emptyLine("Video links will appear here after they are saved.");
}

function renderDownloadsPanel() {
  const releases = artistReleases();
  const transactions = artistTransactions();
  const topRelease = releases.slice().sort((a, b) => Number(b.downloads || 0) - Number(a.downloads || 0))[0];
  const totalDownloads = releases.reduce((sum, release) => sum + Number(release.downloads || 0), 0);
  setText("#downloadsTotalCount", String(totalDownloads));
  setText("#downloadsTopSong", topRelease?.title || "None");
  setText("#downloadsRecent", transactions[0]?.createdAt ? formatReleaseDate(transactions[0].createdAt.slice(0, 10)) : "None");

  if (!artistDownloadTable) return;
  const rows = releases.filter((release) => Number(release.downloads || 0) > 0);
  artistDownloadTable.innerHTML = rows.length
    ? `
      <div class="download-table-header">
        <span>Song Name</span><span>Price</span><span>Downloads</span><span>Revenue</span><span>Purchase Date</span><span>Country</span>
      </div>
      ${rows
        .map(
          (release) => `
            <article class="download-table-row">
              <strong>${escapeText(release.title || "Untitled song")}</strong>
              <span>${money(release.price || 0)}</span>
              <span>${Number(release.downloads || 0)}</span>
              <span>${money(releaseRevenue(release))}</span>
              <span>${formatReleaseDate((release.updatedAt || release.createdAt || "").slice(0, 10))}</span>
              <span>${escapeText(release.country || "United States")}</span>
            </article>
          `
        )
        .join("")}
    `
    : emptyLine("Download records will appear here after fans purchase songs.");
}

/* ===================================================
   FULL DASHBOARD RENDER

   Refreshes every Artist Dashboard section after data is
   loaded or saved.

   Used by:
   - Profile
   - Songs
   - Upload Song
   - Videos
   - Analytics
   - Earnings
   - Settings
=================================================== */
function renderArtistConsole() {
  const artist = primaryArtist();
  const releases = artistReleases();
  const historicalReleases = [...releases, ...archivedReleaseAnalytics(artist.id)];
  const videos = videoEntries(artist);
  const totalDownloads = historicalReleases.reduce((sum, release) => sum + Number(release.downloads || 0), 0);
  const verifiedTransactions = artistTransactions().filter((transaction) => transaction.type === "download");
  const totalRevenue = verifiedTransactions.reduce((sum, transaction) => sum + transactionGross(transaction), 0);
  const streamingClicks = historicalReleases.reduce((sum, release) => sum + Number(release.streamingClicks || 0), 0);
  const totalDeductions = verifiedTransactions.reduce(
    (sum, transaction) => sum + transactionPlatformFee(transaction) + transactionProcessorFee(transaction) + transactionOperationsFee(transaction),
    0
  );
  const netRevenue = verifiedTransactions.reduce((sum, transaction) => sum + transactionNet(transaction), 0);

  setText("#artistTotalSongs", String(releases.length));
  setText("#artistTotalVideos", String(videos.length));
  setText("#artistTotalDownloads", String(totalDownloads));
  setText("#artistTotalRevenue", money(totalRevenue));
  setText("#artistProfileViews", String(Number(artist.profileViews || artist.followers || 0)));
  setText("#artistStreamingClicks", String(streamingClicks));

  setText("#analyticsProfileViews", String(Number(artist.profileViews || artist.followers || 0)));
  setText("#analyticsArtistVisits", String(Number(artist.artistPageVisits || 0)));
  setText("#analyticsMusicVisits", String(Number(artist.musicPageVisits || releases.reduce((sum, release) => sum + Number(release.plays || 0), 0))));
  setText("#analyticsVideoVisits", String(Number(artist.videoPageVisits || 0)));
  setText("#analyticsStreamingClicks", String(streamingClicks));

  const downloadPageVisits =
    Number(artist.downloadPageVisits || 0);

  setText("#analyticsDownloadVisits", String(downloadPageVisits));
  setText("#analyticsDownloadCount", String(totalDownloads));

  renderExpandableAnalyticsCard(
    "#analyticsTopSongs",
    "songs",
    topSongItems(releases),
    "No activity yet.",
    (item) => `${item.downloads} downloads · ${item.streamClicks} stream clicks`
  );
  renderExpandableAnalyticsCard(
    "#analyticsTopVideos",
    "videos",
    topVideoItems(artist),
    "No videos yet.",
    (item) => `${item.count} views · ${item.type}`
  );
  renderExpandableAnalyticsCard(
    "#analyticsTopPlatforms",
    "platforms",
    topStreamingPlatformItems(artist, releases),
    "No activity yet.",
    (item) => `${item.clicks} clicks`
  );
  setText("#analyticsTrafficSources", artist.trafficSources || "Direct");

  setText("#earningsTotalRevenue", money(totalRevenue));
  setText("#earningsAvailableBalance", money(netRevenue));
  setText("#earningsPendingBalance", money(0));
  setText("#earningsPlatformFees", money(totalDeductions));
  setText("#earningsNetRevenue", money(netRevenue));
  setText("#earningsDownloadRevenue", money(totalRevenue));
  setText("#earningsTotalPaidOut", money(0));
  setText("#earningsNextPayout", "Not scheduled");

  renderActivityList(
    recentActivityList,
    releases.slice(0, 5).map((release) => ({ title: release.title || "Untitled song", meta: `${release.status || "pending"} | ${formatReleaseDate((release.updatedAt || release.createdAt || "").slice(0, 10))}` })),
    "Recent activity will appear after songs are saved."
  );
  renderActivityList(
    recentDownloadsList,
    releases.filter((release) => Number(release.downloads || 0) > 0).slice(0, 5).map((release) => ({ title: release.title || "Untitled song", meta: `${release.downloads} downloads | ${money(releaseRevenue(release))}` })),
    "Recent downloads will appear after purchases."
  );
  renderActivityList(
    recentUploadsList,
    releases.slice(0, 5).map((release) => ({ title: release.title || "Untitled song", meta: formatReleaseDate((release.createdAt || "").slice(0, 10) || release.releaseDate) })),
    "Recent uploads will appear here."
  );
  renderActivityList(payoutHistoryList, [], "Payout history will appear after payouts are processed.");
  renderEarningsBreakdown();
  loadStripePayoutStatus();
  renderVideosPanel();
  renderDownloadsPanel();
}

function analyticsListTitle(listKey) {
  if (listKey === "songs") return "Top Songs";
  if (listKey === "videos") return "Top Videos";
  if (listKey === "platforms") return "Top Streaming Platforms";
  return "Top Items";
}

/* ===================================================
   ANALYTICS MODAL

   Controls the View All popup that shows top songs, top
   videos, and top streaming platforms without making the
   dashboard cards taller.
=================================================== */
function openAnalyticsTopModal(listKey) {
  if (!analyticsTopModal || !analyticsTopModalTitle || !analyticsTopModalList) return;
  const items = analyticsTopLists[listKey] || [];
  analyticsTopModalTitle.textContent = analyticsListTitle(listKey);
  analyticsTopModalList.innerHTML = items.length
    ? items
        .map(
          (item, index) => `
            <li>
              <strong>${index + 1}. ${escapeText(item.title)}</strong>
              <span>${escapeText(item.meta)}</span>
            </li>
          `
        )
        .join("")
    : `<li><strong>No activity yet.</strong></li>`;
  analyticsTopModal.setAttribute("aria-hidden", "false");
}

function closeAnalyticsTopModal() {
  analyticsTopModal?.setAttribute("aria-hidden", "true");
}

document.querySelector("#analyticsSection")?.addEventListener("click", (event) => {
  const viewAllButton = event.target.closest("[data-analytics-top-list]");
  if (viewAllButton) {
    openAnalyticsTopModal(viewAllButton.dataset.analyticsTopList);
    return;
  }

  if (event.target.closest("[data-close-analytics-modal]") || event.target === analyticsTopModal) {
    closeAnalyticsTopModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAnalyticsTopModal();
});

artistForm.bio.addEventListener("input", () => {
  artistBioCount.textContent = String(artistForm.bio.value.length);
  updateArtistPreview();
});

artistForm.addEventListener("input", (event) => {
  if (event.target.name === "bio" || event.target.type === "file") return;
  updateArtistPreview();
});

artistForm.photo.addEventListener("change", async () => {
  const photo = await fileToDataUrl(artistForm.photo.files[0]);
  updateArtistPreview(photo);
});

artistForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message(artistMessage, "Saving artist profile...", "pending");

  try {
    const artist = primaryArtist();
    const photo = await fileToDataUrl(artistForm.photo.files[0]);
    const banner = await fileToDataUrl(artistForm.banner.files[0]);
    artist.name = artistForm.name.value.trim();
    artist.handle = artistForm.handle.value.trim();
    artist.bio = artistForm.bio.value.trim();
    artist.location = artistForm.location?.value.trim() || "";
    artist.email = artistForm.email?.value.trim() || "";
    artist.socials = formLinks(artistForm, SOCIAL_LINKS);
    if (artist.email && !artist.socials.email) artist.socials.email = `mailto:${artist.email}`;
    artist.status = "approved";
    if (photo) artist.photo = photo;
    if (banner) {
      artist.banner = banner;
      artist.bannerReleaseId = "";
      artist.featuredReleaseId = "";
    }

    currentStore = await window.MBA.saveStore(currentStore, {
      clears: [{ collection: "artists", id: artist.id, fields: ["socials"], value: artist.socials }],
    });
    renderArtistAccountPicker();
    fillArtistForm();
    renderDashboardReleases();
    message(artistMessage, "Artist profile saved. Home, Music, Listen, Download, and Video will use this artist workspace.");
  } catch (error) {
    message(artistMessage, error.message || "Artist profile did not save. Use the localhost website URL.", "error");
  }
});

releaseForm.songBio.addEventListener("input", () => {
  songBioCount.textContent = String(releaseForm.songBio.value.length);
});

["input", "change"].forEach((eventName) => {
  releaseForm.addEventListener(eventName, (event) => {
    if (event.target.name === "cover") return;
    updateHomePreview();
  });
});

releaseForm.cover.addEventListener("change", async () => {
  const cover = await fileToDataUrl(releaseForm.cover.files[0]);
  updateHomePreview(cover);
});

releaseForm.releaseType.addEventListener("change", () => {
  releaseTypeOptions.forEach((option) => {
    option.classList.toggle("is-selected", option.dataset.startRelease === releaseTypeValue());
  });
  applyReleaseTypeMode();
});

releaseForm.audio.addEventListener("change", () => {
  const type = releaseTypeValue();
  if (!isMultiTrackRelease(type)) {
    uploadTracks = [];
    return;
  }
  uploadTracks = [...releaseForm.audio.files].map((file, index) =>
    normalizeTrack({
      title: titleFromFileName(file.name),
      audioName: file.name,
      file,
      previewStart: DEFAULT_PREVIEW_START,
      previewEnd: DEFAULT_PREVIEW_END,
    }, index)
  );
  renderTrackManager();
});

trackManagerList?.addEventListener("input", syncTrackInputsToState);
trackManagerList?.addEventListener("click", (event) => {
  const row = event.target.closest("[data-track-id]");
  if (!row) return;
  syncTrackInputsToState();
  const index = uploadTracks.findIndex((track) => track.id === row.dataset.trackId);
  if (index < 0) return;
  if (event.target.closest("[data-track-remove]")) {
    uploadTracks.splice(index, 1);
    renderTrackManager();
    return;
  }
  const move = event.target.closest("[data-track-move]")?.dataset.trackMove;
  if (move === "up" && index > 0) {
    [uploadTracks[index - 1], uploadTracks[index]] = [uploadTracks[index], uploadTracks[index - 1]];
    renderTrackManager();
  }
  if (move === "down" && index < uploadTracks.length - 1) {
    [uploadTracks[index], uploadTracks[index + 1]] = [uploadTracks[index + 1], uploadTracks[index]];
    renderTrackManager();
  }
});

clearReleaseButton?.addEventListener("click", () => {
  clearReleaseForm();
  message(releaseMessage, "Choose a release type to start a new upload.", "pending");
});

releaseTypeOptions.forEach((button) => {
  button.addEventListener("click", () => {
    const releaseType = button.dataset.startRelease || "Single";
    setSelectValue(releaseForm.releaseType, releaseType);
    releaseTypeOptions.forEach((option) => option.classList.toggle("is-selected", option === button));
    message(releaseMessage, `${releaseType === "Single" ? "Single song" : releaseType} selected. Continue with files.`, "pending");
    setUploadWizardStep(2);
  });
});

uploadWizardBack?.addEventListener("click", () => setUploadWizardStep(uploadWizardStep - 1));
uploadWizardNext?.addEventListener("click", advanceUploadWizard);
uploadWizardProgress?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-wizard-progress]");
  if (item) goToUploadWizardStep(item.dataset.wizardProgress);
});
uploadWizardProgress?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const item = event.target.closest("[data-wizard-progress]");
  if (!item) return;
  event.preventDefault();
  goToUploadWizardStep(item.dataset.wizardProgress);
});
/* ===================================================
   SAVE, PUBLISH, AND FORM ACTIONS

   Handles saving releases, publishing releases, deleting
   releases, saving artist profiles, saving videos, settings,
   and all dashboard button actions.

   This section changes saved data only when the artist clicks
   the related save/publish/delete action.
=================================================== */
function publishReleaseFromWizard() {
  for (const step of [2, 3]) {
    if (!validateUploadWizardStep(step)) {
      setUploadWizardStep(step);
      return;
    }
  }
  releaseForm.requestSubmit();
}

uploadWizardPublish?.addEventListener("click", publishReleaseFromWizard);

function updateVideoPreview() {
  const artistName = primaryArtist().name || "artist";
  setFrameFromUrl(videoPreviewMainFrame, videoForm.mainVideoUrl.value || "https://www.youtube.com/watch?v=5-YcPo7bsqs");
  setFrameFromUrl(videoPreviewShortFrame, videoForm.shortVideoUrl.value || "https://www.youtube.com/shorts/07x9uu4EQiA");
  if (videoPreviewMainTitle) videoPreviewMainTitle.textContent = videoForm.mainVideoTitle.value.trim() || `${artistName} Video`;
  document.querySelectorAll(".dashboard-video-preview .video-more-link").forEach((link, index) => {
    link.textContent = index === 0 ? `Watch more videos from ${artistName}` : `Watch more shorts from ${artistName}`;
  });
}

videoForm.addEventListener("input", updateVideoPreview);
videoForm.addEventListener("change", updateVideoPreview);

releaseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message(releaseMessage, "Saving release...", "pending");

  try {
    const artist = primaryArtist();
    const type = releaseTypeValue();
    if (!validateTrackList(type)) return;
    const editingId = releaseForm.editingId.value;
    const existingIndex = currentStore.releases.findIndex((item) => item.id === editingId);
    const existing = existingIndex >= 0 ? currentStore.releases[existingIndex] : null;
    const cover = await fileToDataUrl(releaseForm.cover.files[0]);
    const audioData = isMultiTrackRelease(type) ? "" : await fileToDataUrl(releaseForm.audio.files[0]);

    const release = existing || {
      id: window.MBA.uid("release"),
      artistId: artist.id,
      downloads: 0,
      earnings: 0,
      donations: 0,
      createdAt: new Date().toISOString(),
    };

    release.status = "approved";
    release.title = releaseForm.title.value.trim();
    release.artistName = releaseForm.artistName.value.trim() || artist.name;
    release.releaseType = type;
    release.genre = releaseForm.genre.value;
    release.secondaryGenre = releaseForm.secondaryGenre.value;
    release.mood = [releaseForm.moodPrimary.value, releaseForm.moodSecondary.value].filter(Boolean);
    release.songBio = releaseForm.songBio.value.trim();
    release.releaseDate = releaseForm.releaseDate.value;
    release.producer = releaseForm.producer.value.trim();
    release.writer = releaseForm.writer?.value.trim() || "";
    release.country = releaseForm.country.value;
    release.cityState = releaseForm.cityState.value.trim();
    release.location = [release.cityState, release.country].filter(Boolean).join(", ");
    release.price = Number(releaseForm.price.value || 0);
    const previewStart = parsePreviewTime(releaseForm.previewStart.value, DEFAULT_PREVIEW_START);
    const requestedPreviewEnd = parsePreviewTime(releaseForm.previewEnd.value, DEFAULT_PREVIEW_END);
    if (!Number.isFinite(previewStart) || !Number.isFinite(requestedPreviewEnd) || requestedPreviewEnd <= previewStart) {
      message(releaseMessage, "Enter preview times like 0:30 and 1:30. Preview stop must be after preview start.", "error");
      return;
    }
    release.previewStart = previewStart;
    release.previewEnd = requestedPreviewEnd;
    release.previewDuration = release.previewEnd - release.previewStart;
    releaseForm.previewStart.value = formatPreviewTime(previewStart);
    releaseForm.previewEnd.value = formatPreviewTime(requestedPreviewEnd);
    release.donationAmount = 0;
    release.donationLink = "";
    release.streaming = formLinks(releaseForm, STREAMING_LINKS);
    if (cover) release.cover = cover;
    if (isMultiTrackRelease(type)) {
      release.tracks = await serializedTracks();
      const firstTrack = release.tracks[0];
      if (firstTrack) {
        release.audioData = firstTrack.audioData || "";
        release.audioUrl = firstTrack.audioUrl || release.audioUrl || "";
        release.audioName = firstTrack.audioName || `${firstTrack.title || release.title}.mp3`;
      }
    } else {
      release.tracks = [];
    }
    if (!isMultiTrackRelease(type) && audioData) {
      release.audioData = audioData;
      release.audioUrl = audioData;
      release.audioName = releaseForm.audio.files[0].name;
    }
    release.updatedAt = new Date().toISOString();
    if (existingIndex >= 0) {
      currentStore.releases[existingIndex] = release;
    } else {
      currentStore.releases.unshift(release);
    }

    currentStore = await window.MBA.saveStore(currentStore, {
      clears: [
        { collection: "releases", id: release.id, fields: ["streaming"], value: release.streaming },
        { collection: "releases", id: release.id, fields: ["mood"], value: release.mood || [] },
        { collection: "releases", id: release.id, fields: ["tracks"], value: release.tracks || [] },
      ],
    });
    clearReleaseForm();
    fillArtistForm();
    renderDashboardReleases();
    showDashboardSection("songsSection");
    message(
      releaseMessage,
      existingIndex >= 0
        ? "Artist song updated. Home, Music, Listen, and Download will reflect the change."
        : "Artist song saved. It will now show on Home and can be selected for the Music page."
    );
  } catch (error) {
    message(releaseMessage, error.message || "Release did not save. Use the localhost website URL.", "error");
  }
});

releaseList?.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-release]");
  const featureButton = event.target.closest("[data-feature-release]");

  if (editButton) {
    const release = currentStore.releases.find((item) => item.id === editButton.dataset.editRelease);
    if (release) fillReleaseForm(release);
    return;
  }

  if (featureButton) {
    selectFeaturedRelease(featureButton.dataset.featureRelease);
  }
});

artistSongTable?.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-release]");
  const featureButton = event.target.closest("[data-feature-release]");
  const deleteButton = event.target.closest("[data-delete-release]");
  const duplicateButton = event.target.closest("[data-duplicate-release]");

  if (editButton) {
    const release = currentStore.releases.find((item) => item.id === editButton.dataset.editRelease);
    if (release) {
      fillReleaseForm(release);
      showDashboardSection("songEditorSection");
    }
    return;
  }

  if (featureButton) {
    await selectFeaturedRelease(featureButton.dataset.featureRelease);
    return;
  }

  if (deleteButton) {
    const releaseId = deleteButton.dataset.deleteRelease;
    currentStore.releases = currentStore.releases.filter((release) => release.id !== releaseId);
    if (releaseForm.editingId.value === releaseId) clearReleaseForm();
    currentStore = await window.MBA.saveStore(currentStore, {
      deletions: { releaseIds: [releaseId] },
    });
    renderDashboardReleases();
    message(releaseMessage, "Song deleted.", "pending");
    return;
  }

  if (duplicateButton) {
    const source = currentStore.releases.find((release) => release.id === duplicateButton.dataset.duplicateRelease);
    if (!source) return;
    const copy = {
      ...JSON.parse(JSON.stringify(source)),
      id: window.MBA.uid("release"),
      title: `${source.title || "Untitled song"} Copy`,
      status: "pending",
      downloads: 0,
      earnings: 0,
      donations: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    currentStore.releases.unshift(copy);
    currentStore = await window.MBA.saveStore(currentStore);
    renderDashboardReleases();
  }
});

[songSearchInput, songGenreFilter, songStatusFilter, songSortSelect].forEach((control) => {
  control?.addEventListener("input", renderSongTable);
  control?.addEventListener("change", renderSongTable);
});

dashboardNavLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showDashboardSection(link.dataset.dashboardSection);
  });
});

openSongEditorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    clearReleaseForm();
    showDashboardSection("songEditorSection");
  });
});

artistLogoutButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await fetch("/api/artist/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // Logout is best-effort; redirect either way.
    }
    window.location.assign("/artist-login");
  });
});

connectStripeAccount?.addEventListener("click", async () => {
  connectStripeAccount.disabled = true;
  const originalText = connectStripeAccount.textContent;
  connectStripeAccount.textContent = "Opening Stripe...";
  try {
    const response = await fetch("/api/artist/connect-stripe", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url) throw new Error(payload.error || "Unable to start Stripe onboarding.");
    window.location.assign(payload.url);
  } catch (error) {
    connectStripeAccount.disabled = false;
    connectStripeAccount.textContent = originalText || "Connect Stripe Account";
    if (stripeConnectNotice) message(stripeConnectNotice, error.message || "Unable to start Stripe onboarding.", "pending");
  }
});

artistAccountSettingsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  message(artistAccountSettingsMessage, "Saving account settings...", "pending");
  const payload = Object.fromEntries(new FormData(artistAccountSettingsForm).entries());
  try {
    const response = await fetch("/api/artist/account", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Account settings could not be saved.");
    artistSession.account = data.account || artistSession.account;
    artistAccountSettingsForm.currentPassword.value = "";
    artistAccountSettingsForm.newPassword.value = "";
    artistAccountSettingsForm.confirmPassword.value = "";
    message(artistAccountSettingsMessage, "Account settings saved.");
  } catch (error) {
    message(artistAccountSettingsMessage, error.message || "Account settings could not be saved.", "error");
  }
});

deleteEditingSong?.addEventListener("click", async () => {
  const releaseId = releaseForm.editingId.value;
  if (!releaseId) {
    clearReleaseForm();
    message(releaseMessage, "No saved song is selected.", "pending");
    return;
  }
  currentStore.releases = currentStore.releases.filter((release) => release.id !== releaseId);
  currentStore = await window.MBA.saveStore(currentStore, {
    deletions: { releaseIds: [releaseId] },
  });
  clearReleaseForm();
  renderDashboardReleases();
  showDashboardSection("songsSection");
});

async function selectFeaturedRelease(releaseId) {
  const artist = primaryArtist();
  artist.featuredReleaseId = releaseId || "";
  artist.bannerReleaseId = "";
  currentStore = await window.MBA.saveStore(currentStore);
  renderFeaturedReleasePicker();
  renderDashboardReleases();
  message(featuredReleaseMessage, releaseId ? "Music page landing song updated." : "Music page will use the newest approved song.");
}

saveFeaturedRelease?.addEventListener("click", () => {
  selectFeaturedRelease(featuredReleaseSelect.value);
});

featuredReleaseSelect?.addEventListener("change", updateFeaturedReleasePreview);

videoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message(videoMessage, "Saving video page...", "pending");

  try {
    const artist = primaryArtist();
    artist.videos = {
      mainVideoUrl: normalizeLink(videoForm.mainVideoUrl.value),
      mainVideoTitle: videoForm.mainVideoTitle.value.trim(),
      shortVideoUrl: normalizeLink(videoForm.shortVideoUrl.value),
      tiktokUrl: normalizeLink(videoForm.tiktokUrl.value),
      moreVideosUrl: normalizeLink(videoForm.moreVideosUrl.value),
      moreShortsUrl: normalizeLink(videoForm.moreShortsUrl.value),
    };

    currentStore.site = currentStore.site || {};
    currentStore.site.videos = artist.videos;

    currentStore = await window.MBA.saveStore(currentStore);
    fillVideoForm();
    message(videoMessage, "Video page saved. The Video page will update from this.");
  } catch (error) {
    message(videoMessage, error.message || "Video page did not save. Use the localhost website URL.", "error");
  }
});

artistAccountSelect?.addEventListener("change", () => {
  artistAccountSelect.value = activeArtistId;
  message(artistAccountMessage, "Artists can only manage their own account. Store Manager will manage all artists.", "pending");
});

createArtistProfile?.addEventListener("click", async () => {
  message(artistAccountMessage, "Create another artist from the Store Manager. This dashboard is locked to the logged-in artist.", "pending");
});

document.querySelector("#deleteVideoLinks")?.addEventListener("click", async () => {
  const artist = primaryArtist();
  artist.videos = {
    mainVideoUrl: "",
    mainVideoTitle: "",
    shortVideoUrl: "",
    tiktokUrl: "",
    moreVideosUrl: "",
    moreShortsUrl: "",
  };
  currentStore.site = currentStore.site || {};
  currentStore.site.videos = artist.videos;
  currentStore = await window.MBA.saveStore(currentStore, {
    clears: [
      { collection: "artists", id: artist.id, fields: ["videos"], value: {} },
      { collection: "site", fields: ["videos"], value: {} },
    ],
  });
  fillVideoForm();
  renderArtistConsole();
  message(videoMessage, "Video links removed.", "pending");
});

/* ===================================================
   DASHBOARD STARTUP AND LOGIN CHECK

   Loads the logged-in artist session, reads the saved store,
   applies any requested upload type, and starts the dashboard.

   Used when artist-dashboard.html first opens.
=================================================== */
async function getArtistSessionOrRedirect() {
  try {
    const response = await fetch("/api/artist/session", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("Not logged in");
    const data = await response.json();
    if (!data?.authenticated || !data.artistId) throw new Error("Not logged in");
    return data;
  } catch {
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    window.location.assign(`/artist-login?next=${next}`);
    return null;
  }
}

function applyRequestedUploadType() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("start") || localStorage.getItem("mba-pending-upload-type") || "";
  const matched = [...releaseTypeOptions].find((button) => button.dataset.startRelease?.toLowerCase() === requested.toLowerCase());
  if (!matched) return false;
  const releaseType = matched.dataset.startRelease || "Single";
  setSelectValue(releaseForm.releaseType, releaseType);
  releaseTypeOptions.forEach((option) => option.classList.toggle("is-selected", option === matched));
  applyReleaseTypeMode();
  localStorage.removeItem("mba-pending-upload-type");
  setUploadWizardStep(2);
  return true;
}

async function initDashboard() {
  artistSession = await getArtistSessionOrRedirect();
  if (!artistSession) return;
  activeArtistId = artistSession.artistId;
  currentStore = await window.MBA.loadStore({ artist: true, force: true });
  setupUploadWizard();
  populateCountrySelect();
  renderArtistAccountPicker();
  fillArtistForm();
  fillVideoForm();
  renderLinkInputs(streamingFields, STREAMING_LINKS);
  updateHomePreview();
  renderDashboardReleases();
  const params = new URLSearchParams(window.location.search);
  const editId = params.get("edit");
  const requestedSection = params.get("section");
  const editRelease = currentStore.releases.find((release) => release.id === editId);
  if (editRelease) {
    fillReleaseForm(editRelease);
    showDashboardSection("songEditorSection");
  } else if (applyRequestedUploadType()) {
    showDashboardSection("songEditorSection");
  } else if (requestedSection === "earnings") {
    showDashboardSection("earningsSection");
  } else {
    showDashboardSection("songEditorSection");
  }
}

initDashboard();
