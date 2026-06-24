const artistForm = document.querySelector("#artistForm");
const releaseForm = document.querySelector("#releaseForm");
const videoForm = document.querySelector("#videoForm");
const socialFields = document.querySelector("#socialFields");
const streamingFields = document.querySelector("#streamingFields");
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
const workspaceTitle = document.querySelector("#artistWorkspaceTitle");
const dashboardSections = [...document.querySelectorAll(".artist-dashboard-section")];
const dashboardNavLinks = [...document.querySelectorAll("[data-dashboard-section]")];
const openSongEditorButtons = document.querySelectorAll("[data-open-song-editor]");
const artistLogoutButtons = document.querySelectorAll("[data-artist-logout]");
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

let currentStore = window.MBA.defaults();
let activeArtistId = localStorage.getItem("mba-active-artist-id") || "";
let uploadWizardStep = 1;
let uploadWizardReady = false;
const DEFAULT_PREVIEW_START = 0;
const DEFAULT_PREVIEW_END = 60;
const COUNTRY_CODES = [
  "AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM", "AW", "AU", "AT", "AZ", "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM", "BT", "BO", "BQ", "BA", "BW", "BV", "BR", "IO", "BN", "BG", "BF", "BI", "CV", "KH", "CM", "CA", "KY", "CF", "TD", "CL", "CN", "CX", "CC", "CO", "KM", "CG", "CD", "CK", "CR", "CI", "HR", "CU", "CW", "CY", "CZ", "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF", "GA", "GM", "GE", "DE", "GH", "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY", "HT", "HM", "VA", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT", "JM", "JP", "JE", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MO", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX", "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NC", "NZ", "NI", "NE", "NG", "NU", "NF", "MK", "MP", "NO", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PN", "PL", "PT", "PR", "QA", "RE", "RO", "RU", "RW", "BL", "SH", "KN", "LC", "MF", "PM", "VC", "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS", "SS", "ES", "LK", "SD", "SR", "SJ", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TK", "TO", "TT", "TN", "TR", "TM", "TC", "TV", "UG", "UA", "AE", "GB", "US", "UM", "UY", "UZ", "VU", "VE", "VN", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW",
];
const analyticsTopLists = {
  songs: [],
  videos: [],
  platforms: [],
};

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
  const section = dashboardSections.find((item) => item.id === sectionId);
  if (workspaceTitle && section) workspaceTitle.textContent = section.dataset.sectionTitle || "Artist Dashboard";
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

function wizardPanels() {
  return [...document.querySelectorAll("[data-upload-step]")];
}

function updateWizardReview() {
  updateHomePreview();
  updateArtistPreview();
  updateVideoPreview();
}

function setUploadWizardStep(step) {
  uploadWizardStep = Math.min(7, Math.max(1, Number(step) || 1));
  const showReleaseShell = [2, 3, 4, 7].includes(uploadWizardStep);
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
  uploadWizardNext.hidden = uploadWizardStep === 7;
  uploadWizardNext.textContent =
    uploadWizardStep === 6 ? "Review" : "Next";
}

if (uploadWizardPublish) {
  uploadWizardPublish.style.display =
    uploadWizardStep === 7 ? "inline-flex" : "none";
}
  if (releaseFlowEyebrow) releaseFlowEyebrow.textContent = `Step ${uploadWizardStep} of 7`;
  const titles = ["Release Type", "Upload Audio & Artwork", "Song Information", "Streaming Links", "Artist Profile", "Video (Optional)", "Review & Publish"];
  const flowTitle = document.querySelector("#releaseFlowTitle");
  if (flowTitle) flowTitle.textContent = titles[uploadWizardStep - 1];
  if (uploadWizardStep === 7) updateWizardReview();
  songEditorSection?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupUploadWizard() {
  if (!songEditorSection || uploadWizardReady) return;
  [profileSection, videosSection].forEach((section) => {
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
    message(releaseMessage, "Choose Single Song or Album to continue.", "error");
    return false;
  }
  const invalid = visibleStepFields(step).find((field) => !field.disabled && !field.checkValidity());
  if (!invalid) return true;
  invalid.reportValidity();
  message(releaseMessage, "Complete the required fields in this step before continuing.", "error");
  return false;
}

function mergeNonEmptyLinks(existing = {}, next = {}) {
  const merged = {};

  Object.entries(next).forEach(([key, value]) => {
    if (value && value.trim()) {
      merged[key] = value.trim();
    }
  });

  return merged;
}

async function autoSaveReleaseDraft() {
  const artist = primaryArtist();
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
  const audioData = await fileToDataUrl(releaseForm.audio.files[0]);
  const textValues = {
    title: releaseForm.title.value.trim(),
    artistName: releaseForm.artistName.value.trim(),
    releaseType: releaseForm.releaseType.value,
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
  const moods = [releaseForm.moodPrimary.value, releaseForm.moodSecondary.value].filter(Boolean);
  if (moods.length) release.mood = moods;
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
  release.streaming = mergeNonEmptyLinks(release.streaming, formLinks(releaseForm, STREAMING_LINKS));
  if (cover) release.cover = cover;
  if (audioData) {
    release.audioData = audioData;
    release.audioUrl = audioData;
    release.audioName = releaseForm.audio.files[0].name;
  }
  release.updatedAt = new Date().toISOString();
  if (existingIndex >= 0) currentStore.releases[existingIndex] = release;
  else currentStore.releases.unshift(release);
  currentStore = await window.MBA.saveStore(currentStore);
  releaseForm.editingId.value = release.id;
  releaseForm.cover.required = !release.cover;
  releaseForm.audio.required = !(release.audioUrl || release.audioData);
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
  currentStore = await window.MBA.saveStore(currentStore);
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
  currentStore = await window.MBA.saveStore(currentStore);
  message(videoMessage, "Video links auto-saved.", "pending");
}

async function advanceUploadWizard() {
  if (!validateUploadWizardStep(uploadWizardStep)) return;
  const currentStep = uploadWizardStep;
  const nextLabel = uploadWizardNext.textContent;
  uploadWizardNext.disabled = true;
  uploadWizardNext.textContent = currentStep === 6 ? "Preparing..." : "Saving...";
  message(releaseMessage, currentStep >= 2 && currentStep <= 6 ? "Saving this step..." : "Moving to next step...", "pending");
  try {
    if (currentStep >= 2 && currentStep <= 4) await autoSaveReleaseDraft();
    if (currentStep === 5) await autoSaveArtistProfile();
    if (currentStep === 6) await autoSaveVideoLinks();
    setUploadWizardStep(currentStep + 1);
  } catch (error) {
    message(releaseMessage, error.message || "This step could not be saved.", "error");
  } finally {
    uploadWizardNext.disabled = false;
    if (uploadWizardStep === currentStep) uploadWizardNext.textContent = nextLabel;
  }
}

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
    localStorage.setItem("mba-active-artist-id", activeArtistId);
  }

  return artist;
}

function artistLabel(artist) {
  return artist.name || artist.handle || "Untitled artist";
}

function renderArtistAccountPicker() {
  if (!artistAccountSelect) return;
  const artist = primaryArtist();
  artistAccountSelect.replaceChildren();
  currentStore.artists.forEach((item) => {
    artistAccountSelect.append(new Option(artistLabel(item), item.id));
  });
  artistAccountSelect.value = artist.id;
}

function fillArtistForm() {
  const artist = primaryArtist();
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
  const selectedType = releaseType === "Album" ? "Album" : "Single";
  songUploadSection?.classList.remove("is-hidden");
  setSelectValue(releaseForm.releaseType, selectedType);
  releaseTypeOptions.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.startRelease === selectedType);
  });
  updateHomePreview();
  if (uploadWizardReady) setUploadWizardStep(releaseForm.editingId.value ? 3 : 2);
}

function clearReleaseForm() {
  releaseForm.reset();
  releaseForm.editingId.value = "";
  releaseTypeOptions.forEach((button) => button.classList.remove("is-selected"));
  populateCountrySelect();
  releaseForm.price.value = "0.99";
  releaseForm.previewStart.value = formatPreviewTime(DEFAULT_PREVIEW_START);
  releaseForm.previewEnd.value = formatPreviewTime(DEFAULT_PREVIEW_END);
  releaseForm.cover.required = true;
  releaseForm.audio.required = true;
  songBioCount.textContent = "0";
  renderLinkInputs(streamingFields, STREAMING_LINKS);
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

function fillReleaseForm(release) {
  releaseForm.editingId.value = release.id;
  const releaseType = release.releaseType === "Album" ? "Album" : "Single";
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
              <a href="/music" target="_blank" rel="noreferrer">Preview</a>
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

function renderArtistConsole() {
  const artist = primaryArtist();
  const releases = artistReleases();
  const historicalReleases = [...releases, ...archivedReleaseAnalytics(artist.id)];
  const videos = videoEntries(artist);
  const totalDownloads = historicalReleases.reduce((sum, release) => sum + Number(release.downloads || 0), 0);
  const totalRevenue = historicalReleases.reduce((sum, release) => sum + releaseRevenue(release), 0);
  const streamingClicks = historicalReleases.reduce((sum, release) => sum + Number(release.streamingClicks || 0), 0);
  const platformFee = totalRevenue * Number(currentStore.site?.commissionRate || 10) / 100;

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
  setText("#earningsAvailableBalance", money(Math.max(0, totalRevenue - platformFee)));
  setText("#earningsPendingBalance", money(0));
  setText("#earningsPlatformFees", money(platformFee));
  setText("#earningsNetRevenue", money(Math.max(0, totalRevenue - platformFee)));
  setText("#earningsDownloadRevenue", money(totalRevenue));

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
  renderVideosPanel();
  renderDownloadsPanel();
}

function analyticsListTitle(listKey) {
  if (listKey === "songs") return "Top Songs";
  if (listKey === "videos") return "Top Videos";
  if (listKey === "platforms") return "Top Streaming Platforms";
  return "Top Items";
}

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

    currentStore = await window.MBA.saveStore(currentStore);
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

clearReleaseButton?.addEventListener("click", () => {
  clearReleaseForm();
  message(releaseMessage, "Choose a release type to start a new upload.", "pending");
});

releaseTypeOptions.forEach((button) => {
  button.addEventListener("click", () => {
    const releaseType = button.dataset.startRelease || "Single";
    setSelectValue(releaseForm.releaseType, releaseType);
    releaseTypeOptions.forEach((option) => option.classList.toggle("is-selected", option === button));
    message(releaseMessage, `${releaseType === "Album" ? "Album" : "Single song"} selected. Choose Next to continue.`, "pending");
  });
});

uploadWizardBack?.addEventListener("click", () => setUploadWizardStep(uploadWizardStep - 1));
uploadWizardNext?.addEventListener("click", advanceUploadWizard);
uploadWizardPublish?.addEventListener("click", () => {
  for (const step of [2, 3]) {
    if (!validateUploadWizardStep(step)) {
      setUploadWizardStep(step);
      return;
    }
  }
  releaseForm.requestSubmit();
});

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
    const editingId = releaseForm.editingId.value;
    const existingIndex = currentStore.releases.findIndex((item) => item.id === editingId);
    const existing = existingIndex >= 0 ? currentStore.releases[existingIndex] : null;
    const cover = await fileToDataUrl(releaseForm.cover.files[0]);
    const audioData = await fileToDataUrl(releaseForm.audio.files[0]);

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
    release.releaseType = releaseForm.releaseType.value;
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
    if (audioData) {
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

    currentStore = await window.MBA.saveStore(currentStore);
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
  button.addEventListener("click", () => {
    localStorage.removeItem("mba-active-artist-id");
    window.location.assign("/home");
  });
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
  activeArtistId = artistAccountSelect.value;
  localStorage.setItem("mba-active-artist-id", activeArtistId);
  releaseForm.reset();
  fillArtistForm();
  fillVideoForm();
  clearReleaseForm();
  renderDashboardReleases();
  updateFeaturedReleasePreview();
  renderArtistConsole();
  message(artistAccountMessage, `${artistLabel(primaryArtist())} is selected. Upload now edits this artist.`);
});

createArtistProfile?.addEventListener("click", async () => {
  const artist = blankArtist();
  artist.name = `Artist ${currentStore.artists.length + 1}`;
  artist.handle = `@artist${currentStore.artists.length + 1}`;
  currentStore.artists.push(artist);
  activeArtistId = artist.id;
  localStorage.setItem("mba-active-artist-id", activeArtistId);
  currentStore = await window.MBA.saveStore(currentStore);
  renderArtistAccountPicker();
  fillArtistForm();
  fillVideoForm();
  clearReleaseForm();
  renderDashboardReleases();
  renderArtistConsole();
  message(artistAccountMessage, "New artist profile created. Edit the name, biography, social links, songs, and videos below.");
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

async function initDashboard() {
  currentStore = await window.MBA.loadStore();
  setupUploadWizard();
  populateCountrySelect();
  renderArtistAccountPicker();
  fillArtistForm();
  fillVideoForm();
  renderLinkInputs(streamingFields, STREAMING_LINKS);
  updateHomePreview();
  renderDashboardReleases();
  const editId = new URLSearchParams(window.location.search).get("edit");
  const editRelease = currentStore.releases.find((release) => release.id === editId);
  if (editRelease) {
    fillReleaseForm(editRelease);
    showDashboardSection("songEditorSection");
  } else {
    showDashboardSection("songEditorSection");
  }
}

initDashboard();
