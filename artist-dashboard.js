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

let currentStore = window.MBA.defaults();

function message(node, text, type = "success") {
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

function primaryArtist() {
  if (!currentStore.artists.length) {
    currentStore.artists.push({
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
    });
  }
  return currentStore.artists[0];
}

function fillArtistForm() {
  const artist = primaryArtist();
  artistForm.name.value = artist.name || "";
  artistForm.handle.value = artist.handle || "";
  artistForm.bio.value = artist.bio || "";
  artistBioCount.textContent = String(artistForm.bio.value.length);
  renderLinkInputs(socialFields, SOCIAL_LINKS, artist.socials || {});
}

function fillVideoForm() {
  const videos = currentStore.site?.videos || {};
  videoForm.mainVideoUrl.value = videos.mainVideoUrl || "https://www.youtube.com/watch?v=5-YcPo7bsqs";
  videoForm.mainVideoTitle.value = videos.mainVideoTitle || "Focuzman Video";
  videoForm.shortVideoUrl.value = videos.shortVideoUrl || "https://www.youtube.com/shorts/07x9uu4EQiA";
  videoForm.tiktokUrl.value = videos.tiktokUrl || "";
  videoForm.moreVideosUrl.value = videos.moreVideosUrl || "https://www.youtube.com/@Focuzman/videos";
  videoForm.moreShortsUrl.value = videos.moreShortsUrl || "https://www.youtube.com/@Focuzman/shorts";
}

function clearReleaseForm() {
  releaseForm.reset();
  releaseForm.editingId.value = "";
  releaseForm.price.value = "0.99";
  releaseForm.cover.required = true;
  releaseForm.audio.required = true;
  songBioCount.textContent = "0";
  renderLinkInputs(streamingFields, STREAMING_LINKS);
  updateHomePreview();
}

function updateHomePreview(coverSrc = "") {
  const artist = primaryArtist();
  const releaseType = releaseForm.releaseType.value || "Single";
  const genre = releaseForm.genre.value || "Music";
  homePreviewMeta.textContent = `${releaseType} | ${genre}`;
  homePreviewSong.textContent = releaseForm.title.value.trim() || "Song title";
  homePreviewArtist.textContent = releaseForm.artistName.value.trim() || artist.name || "Artist name";
  if (coverSrc) homePreviewCover.src = coverSrc;
  if (!releaseForm.cover.files.length && !coverSrc) homePreviewCover.src = "Mba Logos/MusicBusiness Logo.png";
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
  releaseForm.price.value = release.price ?? "0.99";
  releaseForm.donationAmount.value = release.donationAmount || "";
  releaseForm.donationLink.value = release.donationLink || "";
  releaseForm.cityState.value = release.cityState || "";
  releaseForm.cover.required = false;
  releaseForm.audio.required = false;
  songBioCount.textContent = String(releaseForm.songBio.value.length);
  renderLinkInputs(streamingFields, STREAMING_LINKS, release.streaming || {});
  updateHomePreview(release.cover || "");
  renderDashboardReleases();
  message(releaseMessage, "Editing latest release. Save when your changes are ready.", "pending");
  releaseForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function releaseSummary(release) {
  const card = document.createElement("article");
  card.className = "submitted-release";
  if (releaseForm.editingId.value === release.id) card.classList.add("is-editing");
  card.innerHTML = `
    <img src="${release.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="">
    <div>
      <p>${release.releaseType || "Single"} | ${release.genre || "Music"}</p>
      <h3>${release.title || "Untitled release"}</h3>
      <span>${release.audioName || "Audio saved"}</span>
    </div>
    <div class="item-actions">
      <button type="button" data-edit-release="${release.id}">${releaseForm.editingId.value === release.id ? "Editing" : "Edit"}</button>
    </div>
  `;
  return card;
}

function renderDashboardReleases() {
  const artist = primaryArtist();
  const releases = currentStore.releases.filter((release) => release.artistId === artist.id);
  releaseList.replaceChildren();

  if (!releases.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Your uploaded releases will appear here for editing.";
    releaseList.append(empty);
    return;
  }

  releases.forEach((release) => releaseList.append(releaseSummary(release)));
}

artistForm.bio.addEventListener("input", () => {
  artistBioCount.textContent = String(artistForm.bio.value.length);
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
    artist.socials = formLinks(artistForm, SOCIAL_LINKS);
    artist.status = "approved";
    if (photo) artist.photo = photo;
    if (banner) {
      artist.banner = banner;
      artist.bannerReleaseId = "";
      artist.featuredReleaseId = "";
    }

    currentStore = await window.MBA.saveStore(currentStore);
    fillArtistForm();
    message(artistMessage, "Artist profile saved. Artist Page 1 will update from this.");
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
    release.country = releaseForm.country.value;
    release.cityState = releaseForm.cityState.value.trim();
    release.location = [release.cityState, release.country].filter(Boolean).join(", ");
    release.price = Number(releaseForm.price.value || 0);
    release.donationAmount = Number(releaseForm.donationAmount.value || 0);
    release.donationLink = normalizeLink(releaseForm.donationLink.value);
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
        ? "Latest release updated. Home and artist pages will reflect the change."
        : "Latest release saved. It will now show on Home and the artist pages."
    );
  } catch (error) {
    message(releaseMessage, error.message || "Release did not save. Use the localhost website URL.", "error");
  }
});

releaseList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-release]");
  if (!editButton) return;
  const release = currentStore.releases.find((item) => item.id === editButton.dataset.editRelease);
  if (release) fillReleaseForm(release);
});

videoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message(videoMessage, "Saving video page...", "pending");

  try {
    currentStore.site = currentStore.site || {};
    currentStore.site.videos = {
      mainVideoUrl: normalizeLink(videoForm.mainVideoUrl.value),
      mainVideoTitle: videoForm.mainVideoTitle.value.trim(),
      shortVideoUrl: normalizeLink(videoForm.shortVideoUrl.value),
      tiktokUrl: normalizeLink(videoForm.tiktokUrl.value),
      moreVideosUrl: normalizeLink(videoForm.moreVideosUrl.value),
      moreShortsUrl: normalizeLink(videoForm.moreShortsUrl.value),
    };

    currentStore = await window.MBA.saveStore(currentStore);
    fillVideoForm();
    message(videoMessage, "Video page saved. The Video page will update from this.");
  } catch (error) {
    message(videoMessage, error.message || "Video page did not save. Use the localhost website URL.", "error");
  }
});

async function initDashboard() {
  currentStore = await window.MBA.loadStore();
  fillArtistForm();
  fillVideoForm();
  renderLinkInputs(streamingFields, STREAMING_LINKS);
  updateHomePreview();
  renderDashboardReleases();
  const editId = new URLSearchParams(window.location.search).get("edit");
  const editRelease = currentStore.releases.find((release) => release.id === editId);
  if (editRelease) fillReleaseForm(editRelease);
}

initDashboard();
