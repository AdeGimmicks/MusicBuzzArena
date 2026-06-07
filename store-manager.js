const siteForm = document.querySelector("#siteForm");
const siteMessage = document.querySelector("#siteMessage");
const approvalList = document.querySelector("#approvalList");
const artistManagerList = document.querySelector("#artistManagerList");
const recordsList = document.querySelector("#recordsList");
const totalArtists = document.querySelector("#totalArtists");
const pendingReleases = document.querySelector("#pendingReleases");
const totalDownloads = document.querySelector("#totalDownloads");
const totalEarnings = document.querySelector("#totalEarnings");

let currentStore = window.MBA.defaults();

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

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

function escapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

function linkEditorFields(links, values, dataName) {
  return links
    .map(
      ([label, key, icon]) => `
        <label class="link-input">
          <span>${icon ? `<img src="${icon}" alt="">` : ""}${label}</span>
          <input ${dataName}="${key}" type="text" placeholder="https://... or @username" value="${escapeAttr(values?.[key])}">
        </label>
      `
    )
    .join("");
}

function collectLinks(card, selector) {
  return [...card.querySelectorAll(selector)].reduce((links, input) => {
    const key = input.dataset.social || input.dataset.streaming;
    links[key] = normalizeLink(input.value);
    return links;
  }, {});
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
  siteForm.commissionRate.value = site.commissionRate ?? 15;
}

function releaseCard(release) {
  const artist = currentStore.artists.find((item) => item.id === release.artistId);
  const card = document.createElement("article");
  card.className = "admin-card";
  card.dataset.id = release.id;
  card.innerHTML = `
    <img src="${release.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="">
    <div class="admin-card-body">
      <p>${escapeText(artist?.name || release.artistName || "Artist")} | ${escapeText(release.releaseType || "Single")}</p>
      <div class="form-row">
        <label>Song or album title <input data-field="title" value="${escapeAttr(release.title)}"></label>
        <label>Artist name on release <input data-field="artistName" value="${escapeAttr(release.artistName)}"></label>
      </div>
      <div class="form-row">
        <label>Release type
          <select data-field="releaseType">
            <option>Single</option>
            <option>Album</option>
            <option>EP</option>
          </select>
        </label>
        <label>Genre <input data-field="genre" value="${escapeAttr(release.genre)}"></label>
      </div>
      <label>Song biography <textarea data-field="songBio" maxlength="280" rows="3">${escapeText(release.songBio)}</textarea></label>
      <div class="form-row">
        <label>Replace cover artwork <input data-cover-file type="file" accept="image/*"></label>
        <label>Replace audio file <input data-audio-file type="file" accept="audio/*"></label>
      </div>
      <div class="form-row">
        <label>Download price <input data-field="price" type="number" min="0" step="0.01" value="${release.price || 0}"></label>
        <label>Donation link <input data-field="donationLink" type="text" value="${escapeAttr(release.donationLink)}"></label>
      </div>
      <label>Status
        <select data-field="status">
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="denied">denied</option>
        </select>
      </label>
      <div class="link-fields manager-link-fields">${linkEditorFields(STREAMING_LINKS, release.streaming || {}, "data-streaming")}</div>
      <div class="item-actions">
        <button type="button" data-save-release="${release.id}">Save Changes</button>
        <button type="button" data-status="approved">Approve</button>
        <button type="button" data-status="denied">Deny</button>
        <button type="button" data-status="pending">Pending</button>
        <button type="button" data-delete-release="${release.id}">Remove</button>
      </div>
    </div>
  `;
  card.querySelector('[data-field="status"]').value = release.status || "pending";
  card.querySelector('[data-field="releaseType"]').value = release.releaseType || "Single";
  return card;
}

function artistCard(artist) {
  const card = document.createElement("article");
  card.className = "admin-card";
  card.dataset.id = artist.id;
  card.innerHTML = `
    <img src="${artist.photo || "Mba Logos/MusicBusiness Logo.png"}" alt="">
    <div class="admin-card-body">
      <p>Artist page content</p>
      <label>Artist name <input data-artist-field="name" value="${escapeAttr(artist.name)}"></label>
      <label>Artist biography <textarea data-artist-field="bio" rows="4">${escapeText(artist.bio)}</textarea></label>
      <label>Replace artist photo <input data-artist-photo type="file" accept="image/*"></label>
      <label>Status
        <select data-artist-field="status">
          <option value="approved">approved</option>
          <option value="pending">pending</option>
          <option value="denied">denied</option>
        </select>
      </label>
      <div class="link-fields manager-link-fields">${linkEditorFields(SOCIAL_LINKS, artist.socials || {}, "data-social")}</div>
      <div class="item-actions">
        <button type="button" data-save-artist="${artist.id}">Save Artist</button>
        <button type="button" data-delete-artist="${artist.id}">Remove Artist</button>
      </div>
    </div>
  `;
  card.querySelector('[data-artist-field="status"]').value = artist.status || "approved";
  return card;
}

function renderStats() {
  totalArtists.textContent = String(currentStore.artists.length);
  pendingReleases.textContent = String(currentStore.releases.filter((release) => (release.status || "pending") === "pending").length);
  totalDownloads.textContent = String(currentStore.releases.reduce((sum, release) => sum + Number(release.downloads || 0), 0));
  totalEarnings.textContent = money(currentStore.releases.reduce((sum, release) => sum + Number(release.earnings || 0), 0));
}

function renderApprovals() {
  approvalList.replaceChildren();
  if (!currentStore.releases.length) {
    approvalList.innerHTML = `<p class="empty-state">No songs have been submitted yet.</p>`;
    return;
  }
  currentStore.releases.forEach((release) => approvalList.append(releaseCard(release)));
}

function renderArtists() {
  artistManagerList.replaceChildren();
  if (!currentStore.artists.length) {
    artistManagerList.innerHTML = `<p class="empty-state">No artist profile has been saved yet.</p>`;
    return;
  }
  currentStore.artists.forEach((artist) => artistManagerList.append(artistCard(artist)));
}

function renderRecords() {
  recordsList.replaceChildren();
  if (!currentStore.transactions.length) {
    recordsList.innerHTML = `<p class="empty-state">Fan purchases will appear here after downloads are unlocked.</p>`;
    return;
  }

  currentStore.transactions.slice().reverse().forEach((transaction) => {
    const release = currentStore.releases.find((item) => item.id === transaction.releaseId);
    const row = document.createElement("article");
    row.className = "record-row";
    row.innerHTML = `
      <strong>${release?.title || "Release"}</strong>
      <span>${money(transaction.amount)} purchase</span>
      <span>${money(transaction.platformFee)} platform fee</span>
      <span>${money(transaction.artistPayout)} artist payout</span>
    `;
    recordsList.append(row);
  });
}

async function saveAndRender() {
  currentStore = await window.MBA.saveStore(currentStore);
  renderAll();
}

siteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  message(siteMessage, "Saving website settings...", "pending");

  const logo = await fileToDataUrl(siteForm.logo.files[0]);
  currentStore.site = {
    ...(currentStore.site || {}),
    title: siteForm.title.value.trim(),
    tagline: siteForm.tagline.value.trim(),
    intro: siteForm.intro.value.trim(),
    primaryCta: siteForm.primaryCta.value.trim(),
    secondaryCta: siteForm.secondaryCta.value.trim(),
    commissionRate: Number(siteForm.commissionRate.value || 15),
  };
  if (logo) currentStore.site.logo = logo;

  currentStore = await window.MBA.saveStore(currentStore);
  applyLogo();
  fillSiteForm();
  siteForm.logo.value = "";
  message(siteMessage, "Website settings saved. Public pages will update automatically.");
});

approvalList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  const card = event.target.closest(".admin-card");
  if (!button || !card) return;

  const release = currentStore.releases.find((item) => item.id === card.dataset.id);
  if (!release) return;

  if (button.dataset.status) {
    release.status = button.dataset.status;
  }

  if (button.dataset.saveRelease) {
    release.title = card.querySelector('[data-field="title"]').value.trim();
    release.artistName = card.querySelector('[data-field="artistName"]').value.trim();
    release.releaseType = card.querySelector('[data-field="releaseType"]').value;
    release.genre = card.querySelector('[data-field="genre"]').value.trim();
    release.songBio = card.querySelector('[data-field="songBio"]').value.trim();
    release.price = Number(card.querySelector('[data-field="price"]').value || 0);
    release.donationLink = normalizeLink(card.querySelector('[data-field="donationLink"]').value);
    release.status = card.querySelector('[data-field="status"]').value;
    release.streaming = collectLinks(card, "[data-streaming]");

    const coverFile = card.querySelector("[data-cover-file]")?.files?.[0];
    const audioFile = card.querySelector("[data-audio-file]")?.files?.[0];
    const cover = await fileToDataUrl(coverFile);
    const audioData = await fileToDataUrl(audioFile);

    if (cover) release.cover = cover;
    if (audioData) {
      release.audioData = audioData;
      release.audioName = audioFile.name;
    }
  }

  if (button.dataset.deleteRelease) {
    currentStore.releases = currentStore.releases.filter((item) => item.id !== release.id);
  }

  await saveAndRender();
});

artistManagerList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  const card = event.target.closest(".admin-card");
  if (!button || !card) return;

  const artist = currentStore.artists.find((item) => item.id === card.dataset.id);
  if (!artist) return;

  if (button.dataset.saveArtist) {
    artist.name = card.querySelector('[data-artist-field="name"]').value.trim();
    artist.bio = card.querySelector('[data-artist-field="bio"]').value.trim();
    artist.status = card.querySelector('[data-artist-field="status"]').value;
    artist.socials = collectLinks(card, "[data-social]");

    const photoFile = card.querySelector("[data-artist-photo]")?.files?.[0];
    const photo = await fileToDataUrl(photoFile);
    if (photo) artist.photo = photo;
  }

  if (button.dataset.deleteArtist) {
    currentStore.artists = currentStore.artists.filter((item) => item.id !== artist.id);
    currentStore.releases = currentStore.releases.filter((release) => release.artistId !== artist.id);
  }

  await saveAndRender();
});

function renderAll() {
  applyLogo();
  fillSiteForm();
  renderStats();
  renderApprovals();
  renderArtists();
  renderRecords();
}

async function initStoreManager() {
  currentStore = await window.MBA.loadStore();
  renderAll();
}

initStoreManager();
