const brandingForm = document.querySelector("#brandingForm");
const brandingLogoPreview = document.querySelector("#brandingLogoPreview");
const brandingMessage = document.querySelector("#brandingMessage");
const profileForm = document.querySelector("#profileForm");
const releaseForm = document.querySelector("#releaseForm");
const socialIconUploads = document.querySelector("#socialIconUploads");
const musicIconUploads = document.querySelector("#musicIconUploads");
const managedReleaseGrid = document.querySelector("#managedReleaseGrid");
const releaseTemplate = document.querySelector("#managedReleaseTemplate");
const releaseCount = document.querySelector("#managerReleaseCount");
const downloadCount = document.querySelector("#managerDownloadCount");
const earningsTotal = document.querySelector("#managerEarnings");
const profileMessage = document.querySelector("#profileMessage");
const releaseMessage = document.querySelector("#releaseMessage");
const cancelReleaseEdit = document.querySelector("#cancelReleaseEdit");
const releaseSubmitButton = releaseForm.querySelector('button[type="submit"]');
const localServerWarning = document.querySelector("#localServerWarning");
const songBioCounter = document.querySelector("#songBioCounter");
let editingReleaseId = "";

if (window.location.protocol === "file:") {
  localServerWarning.hidden = false;
}

function updateSongBioCounter() {
  songBioCounter.textContent = `${releaseForm.songBio.value.length} / 280`;
}

function iconSource(savedIcons, key, fallback) {
  return savedIcons?.[key] || fallback || "";
}

function renderIconUploadControls(container, platforms, savedIcons = {}, prefix) {
  container.replaceChildren();

  platforms.forEach(([label, key, fallback]) => {
    const source = iconSource(savedIcons, key, fallback);
    const row = document.createElement("label");
    row.className = "icon-upload-row";
    row.innerHTML = `
      <span class="icon-upload-preview">${source ? `<img src="${source}" alt="">` : `<strong>${label.slice(0, 2).toUpperCase()}</strong>`}</span>
      <span>${label} icon</span>
      <input name="${prefix}${key}Icon" type="file" accept="image/*">
    `;
    container.append(row);
  });
}

async function readIconUploads(form, platforms, prefix, existingIcons = {}) {
  const icons = { ...(existingIcons || {}) };

  for (const [, key] of platforms) {
    const file = form[`${prefix}${key}Icon`]?.files?.[0];
    if (file) {
      icons[key] = await readCompressedImage(file);
    }
  }

  return icons;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function showMessage(element, text, type = "success") {
  element.textContent = text;
  element.dataset.type = type;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = URL.createObjectURL(file);
  });
}

async function readCompressedImage(file) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) return "";

  const image = await loadImage(file);
  const maxSize = 1200;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);
  URL.revokeObjectURL(image.src);

  return canvas.toDataURL("image/jpeg", 0.82);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

async function fillProfileForm() {
  const { profile, branding } = await window.MBAStorage.loadArtistStore();
  brandingLogoPreview.src = branding?.logo || "Mba Logos/MusicBusiness Logo.png";
  profileForm.artistName.value = profile.artistName || "";
  profileForm.instagram.value = profile.instagram || "";
  profileForm.facebook.value = profile.facebook || "";
  profileForm.x.value = profile.x || "";
  profileForm.youtube.value = profile.youtube || "";
  profileForm.tiktok.value = profile.tiktok || "";
  profileForm.soundcloud.value = profile.soundcloud || "";
  profileForm.website.value = profile.website || "";
  profileForm.threads.value = profile.threads || "";
  profileForm.snapchat.value = profile.snapchat || "";
  profileForm.linkedin.value = profile.linkedin || "";
  profileForm.twitch.value = profile.twitch || "";
  renderIconUploadControls(socialIconUploads, SOCIAL_PLATFORMS, profile.socialIcons, "social");
}

brandingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage(brandingMessage, "Saving logo...", "pending");

  try {
    const store = await window.MBAStorage.loadArtistStore();
    const logo = await readCompressedImage(brandingForm.logo.files[0]);

    if (!logo) {
      showMessage(brandingMessage, "Choose a logo image first.", "error");
      return;
    }

    store.branding = {
      ...(store.branding || {}),
      logo,
    };

    const saved = await window.MBAStorage.saveArtistStore(store);
    brandingLogoPreview.src = saved.branding?.logo || logo;
    brandingForm.reset();
    showMessage(brandingMessage, "Logo saved. The website will now use this logo.");
    await applyBranding();
  } catch (error) {
    showMessage(brandingMessage, "Logo did not save. Try a smaller image or refresh and try again.", "error");
  }
});

async function renderManagedReleases() {
  const store = await window.MBAStorage.loadArtistStore();
  const downloads = store.releases.reduce((total, release) => total + (release.downloads || 0), 0);
  const earnings = store.releases.reduce((total, release) => total + (release.downloads || 0) * release.price * 0.85, 0);

  releaseCount.textContent = String(store.releases.length);
  downloadCount.textContent = String(downloads);
  earningsTotal.textContent = formatMoney(earnings);
  managedReleaseGrid.replaceChildren();

  if (!store.releases.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No releases yet. Upload your first song to publish it on the artist page.";
    managedReleaseGrid.append(empty);
    return;
  }

  store.releases.forEach((release) => {
    const node = releaseTemplate.content.cloneNode(true);
    const card = node.querySelector(".managed-release-card");
    const cover = node.querySelector(".managed-cover");
    const meta = node.querySelector(".managed-meta");
    const title = node.querySelector("h3");
    const price = node.querySelector(".managed-price");
    const audio = node.querySelector(".managed-audio");
    const websiteLink = node.querySelector(".managed-actions a");
    const demoDownload = node.querySelector(".demo-download-link");
    const audioSource = release.audioData || release.audioUrl || "";

    card.dataset.id = release.id;
    cover.style.backgroundImage = release.cover ? `url("${release.cover}")` : "";
    cover.textContent = release.cover ? "" : release.title.slice(0, 2).toUpperCase();
    meta.textContent = `${release.releaseType} | ${release.genre || "Genre not set"}`;
    title.textContent = release.title;
    price.textContent = `${formatMoney(release.price)} download | ${release.status || "published"}`;
    if (release.songBio) {
      price.textContent += ` | ${release.songBio.slice(0, 70)}${release.songBio.length > 70 ? "..." : ""}`;
    }
    websiteLink.href = `artist-page.html#release-${release.id}`;

    if (audioSource) {
      audio.src = audioSource;
      audio.title = release.audioName || release.title;
      demoDownload.href = audioSource;
      demoDownload.download = release.audioName || `${release.title}.mp3`;
    } else {
      audio.remove();
      demoDownload.textContent = "Audio not stored";
      demoDownload.removeAttribute("download");
      demoDownload.href = "#releaseForm";
    }

    managedReleaseGrid.append(node);
  });
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage(profileMessage, "Saving profile...", "pending");

  try {
    const store = await window.MBAStorage.loadArtistStore();
    const photo = await readCompressedImage(profileForm.artistPhoto.files[0]);

    store.profile = {
      artistName: profileForm.artistName.value.trim(),
      bio: store.profile.bio || "",
      artistPhoto: photo || store.profile.artistPhoto,
      instagram: profileForm.instagram.value.trim(),
      facebook: profileForm.facebook.value.trim(),
      x: profileForm.x.value.trim(),
      youtube: profileForm.youtube.value.trim(),
      tiktok: profileForm.tiktok.value.trim(),
      soundcloud: profileForm.soundcloud.value.trim(),
      website: profileForm.website.value.trim(),
      threads: profileForm.threads.value.trim(),
      snapchat: profileForm.snapchat.value.trim(),
      linkedin: profileForm.linkedin.value.trim(),
      twitch: profileForm.twitch.value.trim(),
      socialIcons: await readIconUploads(profileForm, SOCIAL_PLATFORMS, "social", store.profile.socialIcons),
    };

    await window.MBAStorage.saveArtistStore(store);
    await fillProfileForm();
    showMessage(profileMessage, "Profile saved. It is now reflected on the public Artist Page.");
  } catch (error) {
    showMessage(profileMessage, "Profile did not save. Try a smaller image or refresh and try again.", "error");
  }
});

releaseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage(releaseMessage, editingReleaseId ? "Saving release updates..." : "Submitting release...", "pending");

  try {
    const store = await window.MBAStorage.loadArtistStore();
    const cover = await readCompressedImage(releaseForm.cover.files[0]);
    const audioFile = releaseForm.audio.files[0];
    const audioData = audioFile ? await readFileAsDataUrl(audioFile) : "";
    const existingRelease = store.releases.find((release) => release.id === editingReleaseId);
    const releaseData = {
      id: existingRelease?.id || crypto.randomUUID(),
      title: releaseForm.title.value.trim(),
      releaseType: releaseForm.releaseType.value,
      genre: releaseForm.genre.value.trim(),
      songBio: releaseForm.songBio.value.trim(),
      price: Number(releaseForm.price.value || 0),
      cover: cover || existingRelease?.cover || "",
      audioName: audioFile?.name || existingRelease?.audioName || "",
      audioSize: audioFile?.size || existingRelease?.audioSize || 0,
      audioData: audioData || existingRelease?.audioData || "",
      audioUrl: audioData ? "" : existingRelease?.audioUrl || "",
      spotify: releaseForm.spotify.value.trim(),
      appleMusic: releaseForm.appleMusic.value.trim(),
      youtubeMusic: releaseForm.youtubeMusic.value.trim(),
      deezer: releaseForm.deezer.value.trim(),
      itunes: releaseForm.itunes.value.trim(),
      audiomack: releaseForm.audiomack.value.trim(),
      boomplay: releaseForm.boomplay.value.trim(),
      tidal: releaseForm.tidal.value.trim(),
      amazonMusic: releaseForm.amazonMusic.value.trim(),
      pandora: releaseForm.pandora.value.trim(),
      iheart: releaseForm.iheart.value.trim(),
      bandcamp: releaseForm.bandcamp.value.trim(),
      otherMusic: releaseForm.otherMusic.value.trim(),
      platformIcons: await readIconUploads(releaseForm, MUSIC_PLATFORMS, "music", existingRelease?.platformIcons),
      downloads: existingRelease?.downloads || 0,
      status: "approved",
      createdAt: existingRelease?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingReleaseId) {
      store.releases = store.releases.map((release) => (release.id === editingReleaseId ? releaseData : release));
    } else {
      store.releases.unshift(releaseData);
    }

    await window.MBAStorage.saveArtistStore(store);
    resetReleaseForm();
    await renderManagedReleases();
    showMessage(
      releaseMessage,
      audioFile
        ? "Release saved with audio. It is now live on the public Artist Page."
        : "Release saved. It is now live on the public Artist Page."
    );
  } catch (error) {
    showMessage(releaseMessage, "Release did not submit. Try smaller artwork or refresh and try again.", "error");
  }
});

function resetReleaseForm() {
  editingReleaseId = "";
  releaseForm.reset();
  releaseForm.price.value = "1.49";
  renderIconUploadControls(musicIconUploads, MUSIC_PLATFORMS, {}, "music");
  updateSongBioCounter();
  releaseSubmitButton.textContent = "Save Release to Website";
  cancelReleaseEdit.hidden = true;
}

function startReleaseEdit(release) {
  editingReleaseId = release.id;
  releaseForm.title.value = release.title || "";
  releaseForm.releaseType.value = release.releaseType || "Single";
  releaseForm.genre.value = release.genre || "";
  releaseForm.songBio.value = release.songBio || "";
  updateSongBioCounter();
  releaseForm.price.value = release.price ?? "1.49";
  releaseForm.spotify.value = release.spotify || "";
  releaseForm.appleMusic.value = release.appleMusic || "";
  releaseForm.youtubeMusic.value = release.youtubeMusic || "";
  releaseForm.deezer.value = release.deezer || "";
  releaseForm.itunes.value = release.itunes || "";
  releaseForm.audiomack.value = release.audiomack || "";
  releaseForm.boomplay.value = release.boomplay || "";
  releaseForm.tidal.value = release.tidal || "";
  releaseForm.amazonMusic.value = release.amazonMusic || "";
  releaseForm.pandora.value = release.pandora || "";
  releaseForm.iheart.value = release.iheart || "";
  releaseForm.bandcamp.value = release.bandcamp || "";
  releaseForm.otherMusic.value = release.otherMusic || "";
  renderIconUploadControls(musicIconUploads, MUSIC_PLATFORMS, release.platformIcons, "music");
  releaseSubmitButton.textContent = "Save Release Updates";
  cancelReleaseEdit.hidden = false;
  showMessage(releaseMessage, "Editing this release. Add new artwork or audio only if you want to replace the existing files.", "pending");
  releaseForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

cancelReleaseEdit.addEventListener("click", () => {
  resetReleaseForm();
  showMessage(releaseMessage, "Edit cancelled.", "pending");
});

releaseForm.songBio.addEventListener("input", updateSongBioCounter);

managedReleaseGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  const card = event.target.closest(".managed-release-card");

  if (!button || !card) return;

  const store = await window.MBAStorage.loadArtistStore();
  const release = store.releases.find((item) => item.id === card.dataset.id);

  if (button.dataset.action === "edit" && release) {
    startReleaseEdit(release);
    return;
  }

  if (button.dataset.action === "delete") {
    store.releases = store.releases.filter((item) => item.id !== card.dataset.id);
  }

  await window.MBAStorage.saveArtistStore(store);
  await renderManagedReleases();
});

async function initDashboard() {
  await fillProfileForm();
  renderIconUploadControls(musicIconUploads, MUSIC_PLATFORMS, {}, "music");
  await renderManagedReleases();
  updateSongBioCounter();
}

initDashboard();
