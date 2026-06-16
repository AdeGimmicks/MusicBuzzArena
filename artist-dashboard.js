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

let currentStore = window.MBA.defaults();
let activeArtistId = localStorage.getItem("mba-active-artist-id") || "";
const DEFAULT_PREVIEW_START = 0;
const DEFAULT_PREVIEW_END = 60;

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
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

function clearReleaseForm() {
  releaseForm.reset();
  releaseForm.editingId.value = "";
  releaseForm.price.value = "0.99";
  releaseForm.previewStart.value = String(DEFAULT_PREVIEW_START);
  releaseForm.previewEnd.value = String(DEFAULT_PREVIEW_END);
  releaseForm.cover.required = true;
  releaseForm.audio.required = true;
  songBioCount.textContent = "0";
  renderLinkInputs(streamingFields, STREAMING_LINKS);
  updateHomePreview();
  updateUploadStatus();
}

function updateHomePreview(coverSrc = "") {
  const artist = primaryArtist();
  const releaseType = releaseForm.releaseType.value || "Single";
  const genre = releaseForm.genre.value || "Music";
  if (homePreviewMeta) homePreviewMeta.textContent = `${releaseType} | ${genre}`;
  if (homePreviewSong) homePreviewSong.textContent = releaseForm.title.value.trim() || "Song title";
  if (homePreviewArtist) homePreviewArtist.textContent = releaseForm.artistName.value.trim() || artist.name || "Artist name";
  if (coverSrc) homePreviewCover.src = coverSrc;
  if (!releaseForm.cover.files.length && !coverSrc) homePreviewCover.src = "Mba Logos/MusicBusiness Logo.png";
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
  uploadStatusTitle.textContent = title || (editing ? "Editing artist song" : "New artist song");
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

function fillReleaseForm(release) {
  releaseForm.editingId.value = release.id;
  releaseForm.title.value = release.title || "";
  releaseForm.artistName.value = release.artistName || primaryArtist().name || "";
  setSelectValue(releaseForm.releaseType, release.releaseType || "Single");
  setSelectValue(releaseForm.genre, release.genre || "");
  setSelectValue(releaseForm.secondaryGenre, release.secondaryGenre || "");
  const moods = Array.isArray(release.mood) ? release.mood : String(release.mood || "").split(",").map((item) => item.trim());
  setSelectValue(releaseForm.moodPrimary, moods[0] || "");
  setSelectValue(releaseForm.moodSecondary, moods[1] || "");
  setSelectValue(releaseForm.country, release.country || "");
  releaseForm.songBio.value = release.songBio || "";
  releaseForm.releaseDate.value = release.releaseDate || "";
  releaseForm.producer.value = release.producer || "";
  if (releaseForm.writer) releaseForm.writer.value = release.writer || "";
  releaseForm.price.value = release.price ?? "0.99";
  const storedPreviewStart = Math.max(0, Number(release.previewStart ?? DEFAULT_PREVIEW_START));
  const storedPreviewEnd = Number(release.previewEnd ?? storedPreviewStart + Number(release.previewDuration || DEFAULT_PREVIEW_END));
  releaseForm.previewStart.value = String(storedPreviewStart);
  releaseForm.previewEnd.value = String(
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
  const videos = videoEntries(artist);
  const totalDownloads = releases.reduce((sum, release) => sum + Number(release.downloads || 0), 0);
  const totalRevenue = releases.reduce((sum, release) => sum + releaseRevenue(release), 0);
  const streamingClicks = releases.reduce((sum, release) => sum + Number(release.streamingClicks || 0), 0);
  const topRelease = releases.slice().sort((a, b) => Number(b.plays || 0) + Number(b.downloads || 0) - (Number(a.plays || 0) + Number(a.downloads || 0)))[0];
  const topPlatform = releases.flatMap((release) => Object.entries(release.streaming || {}).filter(([, value]) => value)).map(([key]) => key)[0] || "None";
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
  setText("#analyticsDownloadVisits", String(totalDownloads));
  setText("#analyticsTopSong", topRelease?.title || "None");
  setText("#analyticsTopVideo", videos[0]?.[1] || "None");
  setText("#analyticsTopPlatform", topPlatform);
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
  message(releaseMessage, "Ready for a new song upload.", "pending");
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
    const previewStart = Math.max(0, Number(releaseForm.previewStart.value || DEFAULT_PREVIEW_START));
    const requestedPreviewEnd = Number(releaseForm.previewEnd.value || DEFAULT_PREVIEW_END);
    release.previewStart = previewStart;
    release.previewEnd = requestedPreviewEnd > previewStart ? requestedPreviewEnd : previewStart + DEFAULT_PREVIEW_END;
    release.previewDuration = release.previewEnd - release.previewStart;
    release.donationAmount = 0;
    release.donationLink = "";
    release.streaming = formLinks(releaseForm, STREAMING_LINKS);
    if (cover) release.cover = cover;
    if (audioData) {
      release.audioData = audioData;
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
    currentStore = await window.MBA.saveStore(currentStore);
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
  currentStore = await window.MBA.saveStore(currentStore);
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
  currentStore = await window.MBA.saveStore(currentStore);
  fillVideoForm();
  renderArtistConsole();
  message(videoMessage, "Video links removed.", "pending");
});

async function initDashboard() {
  currentStore = await window.MBA.loadStore();
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
    showDashboardSection("dashboardOverview");
  }
}

initDashboard();
