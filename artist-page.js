const artistTrackList = document.querySelector("#artistTrackList");
const artistReleaseList = document.querySelector("#artistReleaseList");
let activePreviewAudio = null;
let activePreviewButton = null;
let renderedMusicReleases = [];
let renderedMusicArtist = null;

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

function releaseSlug(release) {
  return slugify(release?.slug || release?.title || release?.id || "song");
}

function releasePublicUrl(type, release, artist) {
  const artistPart = artistSlug(artist);
  const releasePart = releaseSlug(release);
  return artistPart ? `/${type}/${artistPart}/${releasePart}` : `/${type}/${releasePart}`;
}

function artistSlugFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[1] === "music") return parts[0];
  if ((parts[0] === "listen" || parts[0] === "download") && parts.length >= 3) return parts[1];
  return "";
}

function setArtistNav(artist) {
  const nav = document.querySelector("#siteNav");
  if (!nav || !artist) return;
  const slug = artistSlug(artist);
  nav.innerHTML = `
    <a href="/${slug}">${artist.name || "Artist"}</a>
    <a href="/${slug}/music">Music</a>
    <a href="/${slug}/videos">Videos</a>
    <a href="/${slug}-dashboard">Upload</a>
  `;
}

function applySite(store) {
  document.querySelectorAll("[data-logo]").forEach((img) => {
    img.src = store.site?.logo || "Mba Logos/MusicBusiness Logo.png";
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
    link.rel = "noopener noreferrer";
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
  const parts = window.location.pathname.split("/").filter(Boolean);
  const pathReleaseSlug = parts[0] === "listen" || parts[0] === "download"
    ? parts.length >= 3
      ? parts[2]
      : parts[1]
    : "";
  return (
    releases.find((release) => release.id === releaseId) ||
    releases.find((release) => releaseSlug(release) === pathReleaseSlug) ||
    releases[0]
  );
}

function releaseFromPath(store, approvedReleases) {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] !== "listen" && parts[0] !== "download") return null;
  const pathArtistSlug = parts.length >= 3 ? parts[1] : "";
  const pathReleaseSlug = parts.length >= 3 ? parts[2] : parts[1] || "";
  if (!pathReleaseSlug) return null;
  const pathArtist = pathArtistSlug
    ? (store.artists || []).find((artist) => artistSlug(artist) === pathArtistSlug)
    : null;
  return approvedReleases.find((release) => {
    if (releaseSlug(release) !== pathReleaseSlug) return false;
    return pathArtist ? release.artistId === pathArtist.id : true;
  }) || null;
}

function artistForPage(store, approvedReleases) {
  const params = new URLSearchParams(window.location.search);
  const releaseId = params.get("release");
  const artistId = params.get("artist");
  const pathSlug = artistSlugFromPath();
  const release =
    (releaseId ? approvedReleases.find((item) => item.id === releaseId) : null) ||
    releaseFromPath(store, approvedReleases);

  return (
    store.artists.find((artist) => artist.id === release?.artistId) ||
    store.artists.find((artist) => artistSlug(artist) === pathSlug) ||
    store.artists.find((artist) => artist.id === artistId) ||
    store.artists.find((artist) => artist.id === store.site?.featuredArtistId) ||
    store.artists[0]
  );
}

function formattedReleaseDate(release) {
  if (release.releaseDate) {
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
      new Date(`${release.releaseDate}T00:00:00`),
    );
  }
  if (release.createdAt) {
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(release.createdAt));
  }
  return "Release date coming soon";
}

function releaseYear(release) {
  const source = release.releaseDate || release.createdAt;
  if (!source) return new Date().getFullYear();
  const date = release.releaseDate ? new Date(`${release.releaseDate}T00:00:00`) : new Date(source);
  return Number.isNaN(date.getFullYear()) ? new Date().getFullYear() : date.getFullYear();
}

function releasePlatformLinks(release) {
  return STREAMING_LINKS.map(([label, key, icon]) => {
    const href = release.streaming?.[key];
    if (!href) return "";
    return `
      <a class="music-platform-link streaming-link" href="${href}" target="_blank" rel="noopener noreferrer" data-release-id="${release.id}" data-platform-key="${key}">
        <img src="${icon}" alt="">
        <span>${label}</span>
      </a>
    `;
  }).join("");
}

function releaseTracks(release) {
  const tracks = Array.isArray(release.tracks) ? release.tracks : [];
  if (tracks.length) {
    return tracks
      .slice()
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((track, index) => ({
        ...track,
        title: track.title || `Track ${index + 1}`,
      }));
  }
  return release.audioUrl
    ? [{
        id: `${release.id}-single-track`,
        title: release.title || "Untitled track",
        audioUrl: release.audioUrl,
        audioName: release.audioName || "",
        order: 1,
      }]
    : [];
}

function trackRow(release, artist, artistReleases = []) {
  const row = document.createElement("article");
  row.className = "music-release-page";
  const artistName = artist?.name || release.artistName || "Independent Artist";
  const title = release.title || "Untitled track";
  const releaseType = release.releaseType || "Single";
  const releaseDate = formattedReleaseDate(release);
  const primaryGenre = release.genre || "Music";
  const secondaryGenre = release.secondaryGenre || release.subGenre || "";
  const savedMoods = release.moods || release.mood || [];
  const moods = (Array.isArray(savedMoods) ? savedMoods : String(savedMoods).split(","))
    .map((mood) => String(mood).trim())
    .filter(Boolean)
    .slice(0, 2);
  const otherReleases = artistReleases.filter((item) => item.id !== release.id).slice(0, 8);
  const platformLinks = releasePlatformLinks(release);
  const tracks = releaseTracks(release);
  const trackList = tracks.length > 1
    ? `<div class="music-track-list">
        <p>Track List</p>
        ${tracks
          .map(
            (track, index) => `
              <div class="music-track-list-row">
                <span>${index + 1}</span>
                <strong>${track.title}</strong>
              </div>
            `
          )
          .join("")}
      </div>`
    : "";

  row.innerHTML = `
    <section class="music-release-hero" aria-label="${title} release">
      <div class="music-release-artwork">
        <img class="music-release-cover" src="${release.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="${title} cover" loading="eager" decoding="async">
      </div>
      <div class="music-release-info">
        <p class="music-release-kicker">Featured release</p>
        <h1>${title}</h1>
        <dl class="music-release-facts">
          <div><dt>Released</dt><dd>${releaseDate}</dd></div>
          <div><dt>Type</dt><dd>${releaseType}</dd></div>
          <div class="music-release-artist-fact"><dt>Artist</dt><dd>${artistName}</dd></div>
          <div><dt>Genre 1</dt><dd>${primaryGenre}</dd></div>
          ${secondaryGenre ? `<div><dt>Genre 2</dt><dd>${secondaryGenre}</dd></div>` : ""}
          ${moods[0] ? `<div><dt>Mood 1</dt><dd>${moods[0]}</dd></div>` : ""}
          ${moods[1] ? `<div><dt>Mood 2</dt><dd>${moods[1]}</dd></div>` : ""}
        </dl>
        <div class="music-release-actions" aria-label="${title} actions">
          <a class="music-capsule music-capsule-listen" href="${releasePublicUrl("listen", release, artist)}">Listen</a>
          <a class="music-capsule music-capsule-download" href="${releasePublicUrl("download", release, artist)}">Download</a>
        </div>
        ${trackList}
        ${
          platformLinks
            ? `<div class="music-platforms">
                <p>Streaming Platforms</p>
                <div class="music-platform-grid">${platformLinks}</div>
              </div>`
            : ""
        }
      </div>
    </section>
    ${
      otherReleases.length
        ? `<section class="music-more-by" aria-label="More releases from ${artistName}">
            <h2>More from ${artistName}</h2>
            <div class="music-more-grid">
              ${otherReleases
                .map(
                  (item) => `
                    <a class="music-more-card" href="/${artistSlug(artist)}/music?release=${encodeURIComponent(item.id)}" data-release-id="${item.id}">
                      <img src="${item.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="${item.title || "Song"} cover" loading="lazy" decoding="async">
                      <strong>${item.title || "Untitled track"}</strong>
                      <span>${releaseYear(item)}</span>
                    </a>
                  `,
                )
                .join("")}
            </div>
          </section>`
        : ""
    }
  `;

  row.querySelectorAll(".streaming-link").forEach((link) => {
    link.addEventListener("click", () => {
      fetch("/api/streaming-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId: link.dataset.releaseId, platformKey: link.dataset.platformKey }),
        keepalive: true,
      }).catch(() => {});
    });
  });

  return row;
}

function renderTopTracks(releases, artist) {
  if (!artistTrackList) return;
  renderedMusicReleases = releases;
  renderedMusicArtist = artist;
  artistTrackList.setAttribute("aria-busy", "false");
  artistTrackList.replaceChildren();

  if (!releases.length) {
    artistTrackList.innerHTML = `<p class="empty-state">Songs will appear here after they are uploaded and approved.</p>`;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const requestedReleaseId = params.get("release");
  const selectedRelease =
    (requestedReleaseId ? releases.find((release) => release.id === requestedReleaseId) : null) ||
    releases.find((release) => release.id === artist?.featuredReleaseId) ||
    releases.find((release) => release.id === artist?.bannerReleaseId) ||
    releases[0];
  document.title = `${selectedRelease.title || "Music"} | MusicBusiness Arena`;
  artistTrackList.append(trackRow(selectedRelease, artist, releases));
  artistTrackList.querySelectorAll(".music-more-card").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const releaseId = link.dataset.releaseId;
      if (!releaseId) return;
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("release", releaseId);
      nextUrl.searchParams.delete("artist");
      window.history.pushState({}, "", `${nextUrl.pathname}${nextUrl.search}`);
      renderTopTracks(releases, artist);
      document.querySelector(".music-release-hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
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
      </div>
    </div>
  `;
  article.append(streamingLinks(release));

  const unlock = article.querySelector(".unlock-button");
  const download = article.querySelector(".download-link");
  unlock.addEventListener("click", async () => {
    const store = await window.MBA.loadStore({ force: true });
    const saved = store.releases.find((item) => item.id === release.id);
    const commissionRate = Number(store.site?.commissionRate || 10);
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
  const pageMode = window.location.hash === "#download" ? "download" : "listen";
  const artistLabel = artist?.name || release.artistName || "Independent Artist";
  const artistHandle = artist?.handle || `@${artistLabel.replace(/\s+/g, "").toLowerCase()}`;
  const releaseCoverSrc = release.cover || "Mba Logos/MusicBusiness Logo.png";
  const artistPhotoSrc = releaseCoverSrc;
  const downloadAmount = money(release.price || 0);
  const shareUrl = `${window.location.origin}${releasePublicUrl("listen", release, artist)}`;
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const encodedShareText = encodeURIComponent(`Listen to ${release.title || "this song"} by ${artistLabel}`);
  const tracks = releaseTracks(release);
  const hubTrackList = tracks.length > 1
    ? `<div class="link-track-list">
        <p>${release.releaseType || "Release"} Tracks</p>
        ${tracks
          .map(
            (track, index) => `
              <div class="link-track-row">
                <span>${index + 1}</span>
                <strong>${track.title}</strong>
              </div>
            `
          )
          .join("")}
      </div>`
    : "";
  const socialRows = SOCIAL_LINKS.map(([label, key, icon]) => {
    const href = artist?.socials?.[key];
    if (!href) return "";
    return `
      <a href="${href}" target="_blank" rel="noreferrer" aria-label="${label}">
        ${icon ? `<img src="${icon}" alt="">` : `<span>↗</span>`}
      </a>
    `;
  }).join("");
  const platformRows = STREAMING_LINKS.map(([label, key, icon]) => {
    const href = release.streaming?.[key];
    if (!href) return "";
    const actionLabel = key === "itunes" ? "Download" : "Play";
    return `
      <a class="service-row streaming-link"
   data-release-id="${release.id}"
   data-platform-key="${key}"
   href="${href}"
   target="_blank"
   rel="noopener noreferrer">
        <span class="service-brand">
          <img src="${icon}" alt="">
          <strong>${label}</strong>
        </span>
        <span class="service-action">${actionLabel}</span>
      </a>
    `;
  }).join("");
  const paymentSection =
    pageMode === "download"
      ? `
        <section class="payment-panel" id="download" aria-label="Download ${release.title || "song"}">
          <p class="eyebrow">Download</p>
          <h2>Download ${release.title || "this song"}</h2>
          <p>Pay ${downloadAmount} to unlock the full audio download set by ${artistLabel}.</p>
          <div class="payment-price">${downloadAmount}</div>
          <div class="payment-actions">
            <button type="button" data-checkout-type="download" data-payment-label="Pay Now">Pay Now</button>
          </div>
          <small>After payment is connected, this section will unlock the song file automatically.</small>
        </section>
      `
      : "";

  wrap.innerHTML = `
    <div class="link-profile-actions">
      <button class="link-subscribe" type="button" data-open-subscribe>
        Subscribe
      </button>
      <button class="link-share-button" type="button" data-share-release="${release.id}" aria-label="Share this song">⇧</button>
    </div>
    <section class="link-profile-head" aria-label="Artist profile links">
      <img class="link-artist-photo" src="${artistPhotoSrc}" alt="${release.title || artistLabel} cover">
      <h1>${artistHandle}</h1>
      <div class="link-socials" aria-label="${artistLabel} social links">
        ${socialRows || `<span class="empty-state">Social links will appear here.</span>`}
      </div>
      <span class="link-followers">${Number(artist?.followers || artist?.follows || 0).toLocaleString()} followers</span>
    </section>
    ${
      pageMode === "listen"
        ? ""
        : `<div class="featured-listing-card">
            <div class="link-cover-wrap">
              <img src="${releaseCoverSrc}" alt="${release.title} cover">
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
              <h2>${release.title || "Untitled track"}</h2>
              <span>Song · ${artistLabel}</span>
            </div>
          </div>`
    }
    ${paymentSection}
    ${
      pageMode === "listen"
        ? `<div class="service-list">
            ${hubTrackList}
            ${platformRows || `<p class="empty-state">Streaming links will appear here after they are added.</p>`}
          </div>`
        : ""
    }
    <div class="link-modal" data-subscribe-modal aria-hidden="true">
      <div class="link-modal-card" role="dialog" aria-modal="true" aria-labelledby="subscribeTitle">
        <button class="link-modal-close" type="button" data-close-modal aria-label="Close">×</button>
        <img class="link-modal-photo" src="${artistPhotoSrc}" alt="">
        <h2 id="subscribeTitle">Subscribe to ${artistLabel}</h2>
        <p>Get updates when ${artistLabel} shares new music, videos, or important news.</p>
        <label class="subscribe-email">
          <span>Email</span>
          <input type="email" placeholder="you@example.com" autocomplete="email">
        </label>
        <label class="subscribe-consent">
          <input type="checkbox">
          <span>I agree to share my contact details with ${artistLabel}. Optional.</span>
        </label>
        <button class="modal-primary" type="button" data-submit-subscribe>Subscribe</button>
      </div>
    </div>
    <div class="link-modal" data-share-modal aria-hidden="true">
      <div class="link-modal-card share-modal-card" role="dialog" aria-modal="true" aria-labelledby="shareTitle">
        <button class="link-modal-close" type="button" data-close-modal aria-label="Close">×</button>
        <h2 id="shareTitle">Share this song</h2>
        <div class="share-preview-card">
          <img src="${releaseCoverSrc}" alt="">
          <strong>${artistHandle}</strong>
          <span>${release.title || "Untitled track"}</span>
        </div>
        <div class="share-options">
          <button type="button" data-copy-link>🔗<span>Copy link</span></button>
          <a href="https://twitter.com/intent/tweet?text=${encodedShareText}&url=${encodedShareUrl}" target="_blank" rel="noreferrer">𝕏<span>X</span></a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}" target="_blank" rel="noreferrer">f<span>Facebook</span></a>
          <a href="https://wa.me/?text=${encodedShareText}%20${encodedShareUrl}" target="_blank" rel="noreferrer">☘<span>WhatsApp</span></a>
          <a href="mailto:?subject=${encodedShareText}&body=${encodedShareUrl}">✉<span>Email</span></a>
        </div>
      </div>
    </div>
  `;

  const preview = wrap.querySelector(".link-play-preview");
  if (preview && release.audioUrl) {
    const audio = new Audio(release.audioUrl);
    const time = wrap.querySelector(".cover-time");
    const progress = wrap.querySelector(".cover-progress span");
    const skipBack = wrap.querySelector(".cover-skip-back");
    const skipForward = wrap.querySelector(".cover-skip-forward");
    const previewStart = Math.max(0, Number(release.previewStart || 0));
    const requestedPreviewEnd = Number(release.previewEnd || previewStart + Number(release.previewDuration || 60));
    const configuredPreviewEnd = requestedPreviewEnd > previewStart ? requestedPreviewEnd : previewStart + 60;
    const previewEnd = () =>
      Number.isFinite(audio.duration) ? Math.min(configuredPreviewEnd, audio.duration) : configuredPreviewEnd;
    let playCounted = false;
    let playStarting = false;
    const recordPlay = async () => {
      if (playCounted) return;
      playCounted = true;
      const result = await window.MBA.incrementAnalytics("release", release.id, "plays");
      if (result) release.plays = result.value;
    };
    const formatTime = (seconds) => {
      if (!Number.isFinite(seconds)) return "0:00";
      const minutes = Math.floor(seconds / 60);
      const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
      return `${minutes}:${remaining}`;
    };
    const updatePlayer = () => {
      const previewLength = Math.max(1, previewEnd() - previewStart);
      const elapsed = Math.max(0, Math.min(audio.currentTime - previewStart, previewLength));
      if (time) time.textContent = formatTime(elapsed);
      if (progress) {
        const percent = (elapsed / previewLength) * 100;
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
      if (audio.currentTime < previewStart || audio.currentTime >= previewEnd()) {
        audio.currentTime = previewStart;
      }
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
      audio.currentTime = Math.max(previewStart, audio.currentTime - 10);
      updatePlayer();
    });
    skipForward?.addEventListener("click", () => {
      audio.currentTime = Math.min(previewEnd(), audio.currentTime + 10);
      updatePlayer();
    });
    audio.addEventListener("timeupdate", () => {
      if (audio.currentTime >= previewEnd()) {
        audio.pause();
        audio.currentTime = previewStart;
      }
      updatePlayer();
    });
    audio.addEventListener("loadedmetadata", () => {
      audio.currentTime = previewStart;
      updatePlayer();
    });
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

  wrap.querySelectorAll("[data-checkout-type]").forEach((button) => {
    button.addEventListener("click", async () => {
      const label = button.dataset.paymentLabel || button.textContent;
      button.disabled = true;
      button.textContent = "Opening Stripe...";

      try {
        const response = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            releaseId: release.id,
            type: "download",
          }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.url) throw new Error(payload.error || "Stripe checkout could not be started.");
        window.location.href = payload.url;
      } catch (error) {
        button.textContent = error.message || "Payment setup issue";
        window.setTimeout(() => {
          button.disabled = false;
          button.textContent = label;
        }, 2400);
      }
    });
  });

  const closeModals = () => {
    wrap.querySelectorAll(".link-modal").forEach((modal) => modal.setAttribute("aria-hidden", "true"));
  };
  wrap.querySelector("[data-open-subscribe]")?.addEventListener("click", () => {
    wrap.querySelector("[data-subscribe-modal]")?.setAttribute("aria-hidden", "false");
  });
  wrap.querySelector("[data-share-release]")?.addEventListener("click", async () => {
    wrap.querySelector("[data-share-modal]")?.setAttribute("aria-hidden", "false");
  });
  wrap.querySelector("[data-copy-link]")?.addEventListener("click", async (event) => {
    await navigator.clipboard.writeText(shareUrl);
    event.currentTarget.querySelector("span").textContent = "Copied";
    window.setTimeout(() => {
      const label = event.currentTarget.querySelector("span");
      if (label) label.textContent = "Copy link";
    }, 1400);
  });
  wrap.querySelector("[data-submit-subscribe]")?.addEventListener("click", (event) => {
    event.currentTarget.textContent = "Subscribed";
    window.setTimeout(closeModals, 900);
  });
  wrap.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModals));
  wrap.querySelectorAll(".link-modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModals();
    });
  });

  wrap.querySelectorAll(".streaming-link").forEach((link) => {
    link.addEventListener("click", () => {
      const releaseId = link.dataset.releaseId;
      const platformKey = link.dataset.platformKey;
      if (!releaseId || !platformKey) return;

      fetch("/api/streaming-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId, platformKey }),
        keepalive: true,
      })
        .then((response) => {
          if (response.ok) window.MBA.loadStore({ force: true });
        })
        .catch(() => {});
    });
  });

  return wrap;
}
let lastArtistSnapshot = "";
let musicPageVisitRecorded = false;

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

  const approvedReleases = (store.releases || []).filter((release) => release.status === "approved");
  const artist = artistForPage(store, approvedReleases);
  setArtistNav(artist);

  if (artist) {
    const result = await window.MBA.incrementAnalytics(
      "artist",
      artist.id,
      "artistPageVisits"
    );
    if (result) artist.artistPageVisits = result.value;

    if ((window.location.pathname === "/music" || window.location.pathname.endsWith("/music")) && !musicPageVisitRecorded) {
      musicPageVisitRecorded = true;
      const musicResult = await window.MBA.incrementAnalytics(
        "artist",
        artist.id,
        "musicPageVisits"
      );
      if (musicResult) artist.musicPageVisits = musicResult.value;
    }
  }

  applySite(store);

  if (!artist || artist.status === "denied") {
    if (artistTrackList) artistTrackList.innerHTML = `<p class="empty-state">No artist profile has been saved yet.</p>`;
    if (artistReleaseList) artistReleaseList.innerHTML = `<p class="empty-state">No artist profile has been saved yet.</p>`;
    return;
  }

  const releases = approvedReleases.filter((release) => release.artistId === artist.id);
  renderTopTracks(releases, artist);
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
window.addEventListener("hashchange", () => {
  if (document.querySelector(".artist-catalog-page")) renderArtistPage(true);
});
window.addEventListener("popstate", () => {
  if (renderedMusicReleases.length && renderedMusicArtist) {
    renderTopTracks(renderedMusicReleases, renderedMusicArtist);
  }
});
