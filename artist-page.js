const artistPhoto = document.querySelector("#artistPhoto");
const artistCoverGlow = document.querySelector(".artist-cover-glow");
const artistName = document.querySelector("#artistName");
const artistBio = document.querySelector("#artistBio");
const socialLinks = document.querySelector("#socialLinks");
const artistTrackList = document.querySelector("#artistTrackList");
const artistMoreList = document.querySelector("#artistMoreList");
const artistReleaseList = document.querySelector("#artistReleaseList");
const artistReleaseCount = document.querySelector("#artistReleaseCount");
const artistDownloadCount = document.querySelector("#artistDownloadCount");
const artistEarningsCount = document.querySelector("#artistEarningsCount");
let activePreviewAudio = null;
let activePreviewButton = null;

function applySite(store) {
  document.querySelectorAll("[data-logo]").forEach((img) => {
    img.src = store.site?.logo || "Mba Logos/MusicBusiness Logo.png";
  });
}

const SIMPLE_SOCIAL_ICONS = {
  instagram: "https://cdn.simpleicons.org/instagram/FFFFFF",
  facebook: "https://cdn.simpleicons.org/facebook/FFFFFF",
  x: "https://cdn.simpleicons.org/x/FFFFFF",
  youtube: "https://cdn.simpleicons.org/youtube/FFFFFF",
  tiktok: "https://cdn.simpleicons.org/tiktok/FFFFFF",
  soundcloud: "https://cdn.simpleicons.org/soundcloud/FFFFFF",
  website: "https://cdn.simpleicons.org/linktree/FFFFFF",
};

function iconLink(label, href, icon) {
  if (!href) return null;
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.title = label;
  link.innerHTML = icon ? `<img src="${icon}" alt="${label}">` : `<span>${label}</span>`;
  return link;
}

function renderSocials(artist) {
  if (!socialLinks) return;
  socialLinks.replaceChildren();
  SOCIAL_LINKS.forEach(([label, key]) => {
    const link = iconLink(label, artist.socials?.[key], SIMPLE_SOCIAL_ICONS[key]);
    if (link) socialLinks.append(link);
  });
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function streamingLinks(release) {
  const wrap = document.createElement("div");
  wrap.className = "streaming-list";
  STREAMING_LINKS.forEach(([label, key, icon]) => {
    const href = release.streaming?.[key];
    if (!href) return;
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.innerHTML = `<img src="${icon}" alt=""> <span>${label}</span>`;
    wrap.append(link);
  });
  return wrap;
}

function trackTags(release) {
  const primaryGenre = release.genre || "Music";
  const genreLookup = String(primaryGenre).toLowerCase();
  const secondGenre =
    release.secondaryGenre ||
    release.subGenre ||
    (genreLookup.includes("afro") ? "Afropop" : release.releaseType || "Independent");
  const location = release.location || release.artistLocation || "Chicago, Illinois";
  const moods = release.moods || release.mood || ["Motivation", "Happy"];
  const moodTags = Array.isArray(moods)
    ? moods
    : String(moods)
        .split(",")
        .map((item) => item.trim());

  const tags = [location, primaryGenre, secondGenre, ...moodTags.slice(0, 2)]
    .filter(Boolean)
    .filter((tag, index, list) => list.findIndex((item) => String(item).toLowerCase() === String(tag).toLowerCase()) === index)
    .slice(0, 5);

  return tags.map((tag) => `<span>#${tag}</span>`).join("");
}

function selectedRelease(releases) {
  const params = new URLSearchParams(window.location.search);
  const releaseId = params.get("release");
  return releases.find((release) => release.id === releaseId) || releases[0];
}

function trackRow(release, artist, allReleases = []) {
  const row = document.createElement("article");
  row.className = "artist-track-row";
  const releaseDate = release.releaseDate
    ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${release.releaseDate}T00:00:00`))
    : release.createdAt
      ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(release.createdAt))
      : "Release date coming soon";

  row.innerHTML = `
    <div class="track-star-frame">
      <img class="track-cover" src="${release.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="${release.title} cover">
    </div>
    <div class="track-copy">
      <p>${artist?.name || release.artistName || "Independent Artist"}</p>
      <h3>${release.title || "Untitled track"}</h3>
      <span>Release Date: ${releaseDate} by ${artist?.name || release.artistName || "MusicBusiness Arena"}</span>
      <div class="track-tags">${trackTags(release)}</div>
    </div>
    <a class="track-listen" href="/listen?release=${encodeURIComponent(release.id)}">Listen</a>
    <div class="track-options">
      <button class="track-menu" type="button" aria-label="Track options">⋮</button>
      <div class="track-menu-panel">
        <strong>Use as top display</strong>
        ${allReleases
          .map(
            (item) => `
              <button type="button" data-use-banner="${item.id}">
                <span>${item.artistName || artist?.name || "Artist"}</span>
                ${item.title || "Untitled track"}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
  return row;
}

function renderTopTracks(releases, artist) {
  if (!artistTrackList) return;
  artistTrackList.replaceChildren();
  const featuredRelease = releases.find((release) => release.id === artist?.featuredReleaseId);
  const tracks = [featuredRelease || releases[0]].filter(Boolean);

  if (!tracks.length) {
    artistTrackList.innerHTML = `<p class="empty-state">Top tracks will appear here after songs are uploaded.</p>`;
    return;
  }

  tracks.forEach((release) => artistTrackList.append(trackRow(release, artist, releases)));
}

function renderMoreFromArtist(releases, artist) {
  if (!artistMoreList) return;
  artistMoreList.replaceChildren();
  const moreReleases = releases.slice(0, 4);
  const artistLabel = artist?.name || "Independent Artist";

  if (!moreReleases.length) {
    artistMoreList.innerHTML = `<p class="empty-state">More songs from this artist will appear here.</p>`;
    return;
  }

  moreReleases.forEach((release) => {
    const card = document.createElement("article");
    card.className = "artist-more-circle-card";
    card.innerHTML = `
      <a class="artist-more-circle-link" href="/listen?release=${encodeURIComponent(release.id)}">
        <span class="artist-more-cover">
          <img src="${release.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="${release.title} cover" loading="lazy" decoding="async">
        </span>
        <strong>${release.artistName || artistLabel}</strong>
        <span>${release.title || "Untitled track"}</span>
      </a>
    `;
    artistMoreList.append(card);
  });
}

async function useReleaseAsBanner(releaseId) {
  const store = await window.MBA.loadStore({ force: true });
  const artist = store.artists?.[0];
  if (!artist) return;
  artist.bannerReleaseId = releaseId;
  artist.featuredReleaseId = releaseId;
  await window.MBA.saveStore(store);
  await renderArtistPage(true);
}

function releasePanel(release) {
  const article = document.createElement("article");
  article.className = "artist-release";
  article.innerHTML = `
    <div class="release-head">
      <img class="release-cover-large" src="${release.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="${release.title} cover" loading="lazy" decoding="async">
      <p class="release-status">${release.status || "pending"}</p>
      <p class="eyebrow">${release.releaseType || "Single"} | ${release.genre || "Music"}</p>
      <h3>${release.title}</h3>
      <span>${release.artistName || "Independent Artist"}</span>
    </div>
    <div class="release-detail">
      <p>${release.songBio || "Song details will appear here."}</p>
      ${
        release.audioUrl
          ? `<audio class="modern-audio" controls src="${release.audioUrl}"></audio>`
          : `<p class="empty-state">No audio file has been uploaded yet.</p>`
      }
      <div class="download-row">
        <button class="primary-button unlock-button" type="button">Pay ${new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(release.price || 0)} to Unlock</button>
        <a class="secondary-button download-link disabled" href="${release.audioUrl || "#"}" download>Download</a>
        ${release.donationLink ? `<a class="secondary-button" href="${release.donationLink}" target="_blank" rel="noreferrer">Donate</a>` : ""}
      </div>
    </div>
  `;
  article.append(streamingLinks(release));

  const unlock = article.querySelector(".unlock-button");
  const download = article.querySelector(".download-link");
  unlock.addEventListener("click", async () => {
    const store = await window.MBA.loadStore({ force: true });
    const saved = store.releases.find((item) => item.id === release.id);
    const commissionRate = Number(store.site?.commissionRate || 15);
    const price = Number(release.price || 0);
    if (saved) {
      saved.downloads = Number(saved.downloads || 0) + 1;
      saved.earnings = Number(saved.earnings || 0) + price * (1 - commissionRate / 100);
      store.transactions.push({
        id: window.MBA.uid("txn"),
        releaseId: release.id,
        type: "download",
        amount: price,
        platformFee: price * (commissionRate / 100),
        artistPayout: price * (1 - commissionRate / 100),
        createdAt: new Date().toISOString(),
      });
      await window.MBA.saveStore(store);
    }
    download.classList.remove("disabled");
    download.textContent = "Download Now";
  });

  return article;
}

function linkHubPage(release, artist) {
  const wrap = document.createElement("article");
  wrap.className = "link-hub-card";
  const artistLabel = artist?.name || release.artistName || "Independent Artist";
  const downloadAmount = money(release.price || 0);
  const donationAmount = Number(release.donationAmount || release.donationPrice || release.supportAmount || 0);
  const donationLabel = donationAmount > 0 ? money(donationAmount) : "Any amount";
  const platformAction = (key) => (key === "itunes" ? "Download" : "Play");
  const platformRows = STREAMING_LINKS.map(([label, key, icon]) => {
    const href = release.streaming?.[key];
    if (!href) return "";
    return `
      <a class="service-row" href="${href}" target="_blank" rel="noreferrer">
        <span class="service-brand">
          <img src="${icon}" alt="">
          <strong>${label}</strong>
        </span>
        <span class="service-action">${platformAction(key)}</span>
      </a>
    `;
  }).join("");

  wrap.innerHTML = `
    <div class="link-cover-wrap">
      <img src="${release.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="${release.title} cover">
      ${
        release.audioUrl
          ? `<div class="cover-player" aria-label="Song preview player">
              <div class="cover-progress"><span></span></div>
              <div class="cover-meta">
                <strong>${artistLabel}</strong>
                <span>${release.title || "Untitled track"}</span>
              </div>
              <span class="cover-time">0:00</span>
              <div class="cover-controls">
                <button class="cover-skip-back" type="button" aria-label="Go back 10 seconds">|◀</button>
                <button class="link-play-preview" type="button" aria-label="Play preview">▶</button>
                <button class="cover-skip-forward" type="button" aria-label="Go forward 10 seconds">▶|</button>
              </div>
            </div>`
          : ""
      }
    </div>
    <div class="link-hub-title">
      <p>${artistLabel}</p>
      <h1>${release.title || "Untitled track"}</h1>
      <span>Choose music service</span>
    </div>
    <div class="service-list">
      ${
        release.audioUrl
          ? `<a class="service-row service-row-download" href="${release.audioUrl}" download data-download-release="${release.id}">
              <span class="service-brand"><span class="service-download-icon">↓</span><strong>Download <em>${downloadAmount}</em></strong></span>
              <span class="service-action">Download</span>
            </a>`
          : ""
      }
      <a class="service-row service-row-donate" href="${release.donationLink || "#"}" ${release.donationLink ? 'target="_blank" rel="noreferrer"' : 'aria-disabled="true"'}>
        <span class="service-brand"><span class="service-download-icon">♥</span><strong>Donate <em>${donationLabel}</em></strong></span>
        <span class="service-action">Support</span>
      </a>
      ${platformRows || `<p class="empty-state">Streaming links will appear here after they are added.</p>`}
    </div>
  `;

  const preview = wrap.querySelector(".link-play-preview");
  if (preview && release.audioUrl) {
    const audio = new Audio(release.audioUrl);
    const time = wrap.querySelector(".cover-time");
    const progress = wrap.querySelector(".cover-progress span");
    const skipBack = wrap.querySelector(".cover-skip-back");
    const skipForward = wrap.querySelector(".cover-skip-forward");
    let playCounted = false;
    let playStarting = false;
    const recordPlay = async () => {
      if (playCounted) return;
      playCounted = true;
      const store = await window.MBA.loadStore({ force: true });
      const saved = store.releases.find((item) => item.id === release.id);
      if (!saved) return;
      saved.plays = Number(saved.plays || 0) + 1;
      await window.MBA.saveStore(store);
    };
    const formatTime = (seconds) => {
      if (!Number.isFinite(seconds)) return "0:00";
      const minutes = Math.floor(seconds / 60);
      const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
      return `${minutes}:${remaining}`;
    };
    const updatePlayer = () => {
      if (time) time.textContent = formatTime(audio.currentTime);
      if (progress) {
        const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        progress.style.width = `${Math.min(percent, 100)}%`;
      }
    };
    const setPreviewPlaying = (isPlaying) => {
      preview.textContent = isPlaying ? "❚❚" : "▶";
      preview.setAttribute("aria-label", isPlaying ? "Pause preview" : "Play preview");
      preview.classList.toggle("is-playing", isPlaying);
    };

    preview.addEventListener("click", async () => {
      if (playStarting) return;

      if (!audio.paused) {
        audio.pause();
        return;
      }

      if (activePreviewAudio && activePreviewAudio !== audio) {
        activePreviewAudio.pause();
        if (activePreviewButton) activePreviewButton.textContent = "▶";
        activePreviewButton?.setAttribute("aria-label", "Play preview");
        activePreviewButton?.classList.remove("is-playing");
      }

      playStarting = true;
      activePreviewAudio = audio;
      activePreviewButton = preview;
      setPreviewPlaying(true);

      try {
        await audio.play();
        recordPlay();
      } catch {
        if (activePreviewAudio === audio) activePreviewAudio = null;
        if (activePreviewButton === preview) activePreviewButton = null;
        setPreviewPlaying(false);
      } finally {
        playStarting = false;
      }
    });
    skipBack?.addEventListener("click", () => {
      audio.currentTime = Math.max(0, audio.currentTime - 10);
      updatePlayer();
    });
    skipForward?.addEventListener("click", () => {
      audio.currentTime = Math.min(audio.duration || audio.currentTime + 10, audio.currentTime + 10);
      updatePlayer();
    });
    audio.addEventListener("timeupdate", updatePlayer);
    audio.addEventListener("loadedmetadata", updatePlayer);
    audio.addEventListener("play", () => setPreviewPlaying(true));
    audio.addEventListener("pause", () => {
      setPreviewPlaying(false);
    });
    audio.addEventListener("ended", () => {
      if (activePreviewAudio === audio) activePreviewAudio = null;
      if (activePreviewButton === preview) activePreviewButton = null;
      setPreviewPlaying(false);
      updatePlayer();
    });
  }

  wrap.querySelector("[data-download-release]")?.addEventListener("click", async () => {
    const store = await window.MBA.loadStore({ force: true });
    const saved = store.releases.find((item) => item.id === release.id);
    if (!saved) return;
    saved.downloads = Number(saved.downloads || 0) + 1;
    await window.MBA.saveStore(store);
  });

  return wrap;
}

let lastArtistSnapshot = "";

async function renderArtistPage(force = false) {
  const previewSessionActive = activePreviewAudio && !activePreviewAudio.ended;
  const audioIsPlaying =
    [...document.querySelectorAll("audio")].some((audio) => !audio.paused) ||
    previewSessionActive;
  if (!force && audioIsPlaying) return;

  const store = await window.MBA.loadStore({ force });
  const snapshot = JSON.stringify(store);
  if (!force && snapshot === lastArtistSnapshot) return;
  lastArtistSnapshot = snapshot;

  const artist = store.artists[0];
  applySite(store);

  if (!artist || artist.status === "denied") {
    if (artistTrackList) artistTrackList.innerHTML = `<p class="empty-state">No artist profile has been saved yet.</p>`;
    if (artistReleaseList) artistReleaseList.innerHTML = `<p class="empty-state">No artist profile has been saved yet.</p>`;
    return;
  }

  if (artistName) artistName.textContent = artist.name || "Independent Artist";
  if (artistBio) artistBio.textContent = artist.bio || "Artist biography will appear here.";
  if (artistPhoto) artistPhoto.src = artist.photo || "Mba Logos/MusicBusiness Logo.png";
  renderSocials(artist);

  const releases = (store.releases || []).filter((release) => release.artistId === artist.id && release.status === "approved");
  if (artistCoverGlow) {
    const selectedBannerRelease = releases.find((release) => release.id === artist.bannerReleaseId);
    const bannerCover =
      selectedBannerRelease?.cover ||
      artist.banner ||
      releases.find((release) => release.cover)?.cover ||
      artist.photo ||
      "Mba Logos/MusicBusiness Logo.png";
    artistCoverGlow.style.setProperty("--artist-banner", `url("${bannerCover}")`);
  }
  if (artistReleaseCount) artistReleaseCount.textContent = String(releases.reduce((sum, release) => sum + Number(release.plays || 0), 0));
  if (artistDownloadCount) artistDownloadCount.textContent = String(releases.reduce((sum, release) => sum + Number(release.downloads || 0), 0));
  if (artistEarningsCount) artistEarningsCount.textContent = String(artist.followers || artist.follows || 0);
  renderTopTracks(releases, artist);
  renderMoreFromArtist(releases, artist);
  if (!artistReleaseList) return;

  artistReleaseList.replaceChildren();

  if (!releases.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Songs saved from Artist Dashboard will appear here.";
    artistReleaseList.append(empty);
    return;
  }

  if (document.querySelector(".artist-catalog-page")) {
    const currentRelease = selectedRelease(releases);
    artistReleaseList.append(linkHubPage(currentRelease, artist));
    return;
  }

  releases.forEach((release) => artistReleaseList.append(releasePanel(release)));
}

document.addEventListener("click", (event) => {
  const bannerButton = event.target.closest("[data-use-banner]");
  if (!bannerButton) return;
  event.preventDefault();
  event.stopPropagation();
  useReleaseAsBanner(bannerButton.dataset.useBanner);
});

renderArtistPage(true);

window.addEventListener("mba:store-saved", () => {
  if (!activePreviewAudio || activePreviewAudio.ended) renderArtistPage(true);
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && (!activePreviewAudio || activePreviewAudio.ended)) renderArtistPage(true);
});
window.addEventListener("focus", () => {
  if (!activePreviewAudio || activePreviewAudio.ended) renderArtistPage(true);
});
