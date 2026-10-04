/* ===================================================
   ARTIST MUSIC AND LISTEN PAGE SCRIPT

   CODE OWNER GUIDE

   Loads releases, builds clean listen/download links, renders streaming-link pages, and updates music page content.
   Used by: artist-page.html.
   Does not control Artist Dashboard form saving.
=================================================== */

/* ===================================================
   MUSIC PAGE ELEMENTS AND URL HELPERS

   Collects page elements and creates clean artist/release
   links for listen and download pages.

   Used by:
   - artist-page.html
=================================================== */
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

function isDownloadOnlyRelease(release) {
  return release?.downloadOnly === true || release?.releaseType === "Beat / Instrumental";
}

function artistSlugFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && ["music", "beats"].includes(parts[1])) return parts[0];
  if ((parts[0] === "listen" || parts[0] === "download") && parts.length >= 3) return parts[1];
  return "";
}

function artistCatalogPath(artist) {
  const slug = artistSlug(artist);
  const label = artist?.publicCatalogLabel || "Music";
  return window.MBAPublicContext?.catalogPathForLabel?.(slug, label) || `/${slug}/music`;
}

function setArtistNav(artist) {
  if (!artist) return;
  window.MBAPublicContext?.applyPublicArtistNavigation(artist);
}

/* ===================================================
   NAVIGATION AND SITE BRANDING

   Applies logo, artist navigation links, and page labels for
   the artist currently being viewed.
=================================================== */
function applySite(store) {
  document.querySelectorAll("[data-logo]").forEach((img) => {
    img.src = store.site?.logo || "Mba Logos/MusicBusiness Logo.png";
  });
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function escapeAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function platformEmbedUrl(platformKey, savedEmbed) {
  return officialEmbedUrlForPlatform(platformKey, savedEmbed);
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

/* ===================================================
   FEATURED RELEASE SELECTION

   Decides which release should appear as the main featured
   release on the Music page.
=================================================== */
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

  const releaseArtist = store.artists.find((artist) => artist.id === release?.artistId);
  if (releaseArtist) return releaseArtist;

  if (pathSlug) {
    return store.artists.find((artist) => artistSlug(artist) === pathSlug) || null;
  }

  const queryArtist = artistId ? store.artists.find((artist) => artist.id === artistId) : null;
  if (queryArtist) return queryArtist;

  return null;
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

function platformLabel(key) {
  return String(key || "Streaming platform")
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

/* ===================================================
   PUBLIC RELEASE CARDS

   Builds release rows/cards, Listen buttons, Download buttons,
   preview controls, and release details.
=================================================== */
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
  const downloadUrl = releasePublicUrl("download", release, artist);
  const listenUrl = isDownloadOnlyRelease(release) ? downloadUrl : releasePublicUrl("listen", release, artist);
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
    <a class="music-mobile-back" href="/${artistSlug(artist)}" aria-label="Back to ${artistName}">Back to ${artistName}</a>
    <section class="music-release-hero" aria-label="${title} release">
      <div class="music-release-artwork">
        <img class="music-release-cover" src="${release.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="${title} cover" loading="eager" decoding="async">
      </div>
      <div class="music-release-info">
        <p class="music-release-kicker">${releaseType}</p>
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
          <a class="music-capsule music-capsule-listen" href="${listenUrl}">Listen</a>
          <a class="music-capsule music-capsule-download" href="${downloadUrl}">Download</a>
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
                    <article class="music-more-card" data-release-id="${item.id}">
                      <button class="music-more-select" type="button" data-release-id="${item.id}" aria-label="Show ${escapeAttribute(item.title || "song")}">
                        <img src="${item.cover || "Mba Logos/MusicBusiness Logo.png"}" alt="${item.title || "Song"} cover" loading="lazy" decoding="async">
                        <strong>${item.title || "Untitled track"}</strong>
                        <span class="music-more-year">${releaseYear(item)}</span>
                        <span class="music-more-artist">${artistName}</span>
                      </button>
                      <a class="music-more-listen" href="${isDownloadOnlyRelease(item) ? releasePublicUrl("download", item, artist) : releasePublicUrl("listen", item, artist)}" data-related-listen data-release-id="${item.id}">Listen</a>
                    </article>
                  `,
                )
                .join("")}
            </div>
          </section>`
        : ""
    }
  `;

  row.querySelector(".music-capsule-listen")?.addEventListener("click", () => {
    window.MBA.trackVisitorEvent({
      eventType: "listen_click",
      activity: "Clicked Listen",
      pageType: "music_page",
      artistId: artist?.id,
      artistName: artist?.name,
      releaseId: release.id,
      releaseTitle: release.title,
    });
  });
  row.querySelector(".music-capsule-download")?.addEventListener("click", () => {
    window.MBA.trackVisitorEvent({
      eventType: "download_click",
      activity: "Clicked Download",
      pageType: "music_page",
      artistId: artist?.id,
      artistName: artist?.name,
      releaseId: release.id,
      releaseTitle: release.title,
    });
  });

  row.querySelectorAll(".streaming-link").forEach((link) => {
    link.addEventListener("click", () => {
      window.MBA.trackVisitorEvent({
        eventType: "platform_external_click",
        activity: `Opened ${platformLabel(link.dataset.platformKey)} website/app`,
        pageType: "music_page",
        artistId: artist?.id,
        artistName: artist?.name,
        releaseId: release.id,
        releaseTitle: release.title,
        platformKey: link.dataset.platformKey,
        platformName: platformLabel(link.dataset.platformKey),
        playbackMeasurement: "not_applicable",
      });
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
  artistTrackList.querySelectorAll(".music-more-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("[data-related-listen]")) return;
      const releaseId = card.dataset.releaseId;
      if (!releaseId) return;
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("release", releaseId);
      nextUrl.searchParams.delete("artist");
      window.history.pushState({}, "", `${nextUrl.pathname}${nextUrl.search}`);
      renderTopTracks(releases, artist);
      document.querySelector(".music-release-hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  artistTrackList.querySelectorAll("[data-related-listen]").forEach((link) => {
    link.addEventListener("click", () => {
      const relatedRelease = releases.find((release) => String(release.id) === String(link.dataset.releaseId));
      window.MBA.trackVisitorEvent({
        eventType: "listen_click",
        activity: "Clicked related song Listen",
        pageType: "music_page",
        artistId: artist?.id,
        artistName: artist?.name,
        releaseId: relatedRelease?.id || link.dataset.releaseId,
        releaseTitle: relatedRelease?.title || "",
      });
    });
  });
}

/* ===================================================
   MUSIC PAGE FEATURE PANEL

   Builds the large featured release section with artwork,
   release metadata, buttons, streaming platforms, and track
   list.
=================================================== */
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

/* ===================================================
   LISTEN / STREAMING LINKS PAGE

   Builds the dedicated listen page where fans can open the
   artist's streaming platform links.
=================================================== */
const MEASURABLE_EMBED_PLATFORMS = new Set(["spotify", "youtubeMusic", "soundcloud"]);
let spotifyIframeApiPromise = null;
let youtubeIframeApiPromise = null;
let soundCloudWidgetApiPromise = null;

function appendPlayerScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.append(script);
  });
}

function loadSpotifyIframeApi() {
  if (window.SpotifyIframeApi) return Promise.resolve(window.SpotifyIframeApi);
  if (spotifyIframeApiPromise) return spotifyIframeApiPromise;
  spotifyIframeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      previousReady?.(api);
      window.SpotifyIframeApi = api;
      resolve(api);
    };
    appendPlayerScript("https://open.spotify.com/embed/iframe-api/v1")
      .catch(reject);
  });
  return spotifyIframeApiPromise;
}

function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise;
  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT);
    };
    appendPlayerScript("https://www.youtube.com/iframe_api").catch(reject);
  });
  return youtubeIframeApiPromise;
}

function loadSoundCloudWidgetApi() {
  if (window.SC?.Widget) return Promise.resolve(window.SC);
  if (!soundCloudWidgetApiPromise) {
    soundCloudWidgetApiPromise = appendPlayerScript("https://w.soundcloud.com/player/api.js").then(() => window.SC);
  }
  return soundCloudWidgetApiPromise;
}

function createStandardEmbed(frame, embedUrl, title) {
  const iframe = document.createElement("iframe");
  iframe.src = embedUrl;
  iframe.title = title;
  iframe.loading = "lazy";
  iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  iframe.setAttribute("allowfullscreen", "");
  frame.replaceChildren(iframe);
  return iframe;
}

function spotifyUriFromEmbed(embedUrl) {
  try {
    const parts = new URL(embedUrl).pathname.split("/").filter(Boolean);
    const offset = parts[0] === "embed" ? 1 : 0;
    return parts[offset] && parts[offset + 1] ? `spotify:${parts[offset]}:${parts[offset + 1]}` : "";
  } catch {
    return "";
  }
}

function youtubeEmbedWithApi(embedUrl) {
  try {
    const url = new URL(embedUrl);
    url.searchParams.set("enablejsapi", "1");
    url.searchParams.set("origin", window.location.origin);
    url.searchParams.set("playsinline", "1");
    return url.href;
  } catch {
    return embedUrl;
  }
}

function createPlaybackReporter(context) {
  const playbackSessionId = crypto.randomUUID?.() || `playback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let listeningSeconds = 0;
  let playingSince = 0;
  let lastReportedSeconds = 0;
  let positionSeconds = 0;
  let durationSeconds = 0;
  let started = false;
  let playing = false;

  const totalListeningSeconds = () => listeningSeconds + (playingSince ? (Date.now() - playingSince) / 1000 : 0);
  const commitPlayingTime = () => {
    if (!playingSince) return;
    listeningSeconds += (Date.now() - playingSince) / 1000;
    playingSince = 0;
  };
  const report = (eventType, activity) => window.MBA.trackVisitorEvent({
    ...context,
    eventType,
    activity,
    playbackSessionId,
    playbackMeasurement: "supported",
    listeningSeconds: Math.round(totalListeningSeconds() * 10) / 10,
    playbackPositionSeconds: Math.round(positionSeconds * 10) / 10,
    mediaDurationSeconds: Math.round(durationSeconds * 10) / 10,
  });
  const progress = (force = false) => {
    const seconds = totalListeningSeconds();
    if (seconds < 1 || (!force && seconds - lastReportedSeconds < 4.5)) return;
    lastReportedSeconds = seconds;
    report("platform_playback_progress", `Listened on ${context.platformName}`);
  };
  const pageHide = () => progress(true);
  const timer = window.setInterval(progress, 5000);
  window.addEventListener("pagehide", pageHide);

  return {
    sample(position, duration) {
      if (Number.isFinite(Number(position))) positionSeconds = Number(position);
      if (Number.isFinite(Number(duration))) durationSeconds = Number(duration);
    },
    play() {
      if (playing) return;
      playing = true;
      playingSince = Date.now();
      report(started ? "platform_playback_resume" : "platform_playback_start", `${started ? "Resumed" : "Started"} ${context.platformName} playback`);
      started = true;
    },
    pause() {
      if (!playing) return;
      commitPlayingTime();
      playing = false;
      progress(true);
      report("platform_playback_pause", `Paused ${context.platformName} playback`);
    },
    complete() {
      commitPlayingTime();
      playing = false;
      progress(true);
      report("platform_playback_complete", `Completed ${context.platformName} playback`);
    },
    destroy() {
      commitPlayingTime();
      playing = false;
      progress(true);
      window.clearInterval(timer);
      window.removeEventListener("pagehide", pageHide);
    },
  };
}

async function createTrackedPlatformPlayer(frame, row, context) {
  const { platformKey, platformName } = context;
  const embedUrl = row.dataset.embedUrl;
  const title = `${platformName} player`;
  const reporter = createPlaybackReporter(context);

  try {
  if (platformKey === "spotify") {
    const uri = spotifyUriFromEmbed(embedUrl);
    if (!uri) throw new Error("Spotify track URI is unavailable.");
    const api = await loadSpotifyIframeApi();
    return new Promise((resolve) => {
      api.createController(frame, { uri }, (controller) => {
        let lastPaused = true;
        controller.addListener("playback_started", () => reporter.play());
        controller.addListener("playback_update", ({ data = {} }) => {
          reporter.sample(Number(data.position || 0) / 1000, Number(data.duration || 0) / 1000);
          if (!data.isPaused && !data.isBuffering) reporter.play();
          if (data.isPaused && !lastPaused) {
            if (Number(data.duration || 0) > 0 && Number(data.position || 0) >= Number(data.duration || 0) - 500) reporter.complete();
            else reporter.pause();
          }
          lastPaused = Boolean(data.isPaused);
        });
        resolve({ destroy: () => { reporter.destroy(); controller.destroy(); } });
      });
    });
  }

  if (platformKey === "youtubeMusic") {
    const iframe = createStandardEmbed(frame, youtubeEmbedWithApi(embedUrl), title);
    const YT = await loadYouTubeIframeApi();
    let sampleTimer = 0;
    const player = new YT.Player(iframe, {
      events: {
        onReady: ({ target }) => {
          sampleTimer = window.setInterval(() => reporter.sample(target.getCurrentTime(), target.getDuration()), 1000);
        },
        onStateChange: ({ data, target }) => {
          reporter.sample(target.getCurrentTime(), target.getDuration());
          if (data === YT.PlayerState.PLAYING) reporter.play();
          if (data === YT.PlayerState.PAUSED) reporter.pause();
          if (data === YT.PlayerState.ENDED) reporter.complete();
        },
      },
    });
    return { destroy: () => { window.clearInterval(sampleTimer); reporter.destroy(); player.destroy(); } };
  }

  if (platformKey === "soundcloud") {
    const iframe = createStandardEmbed(frame, embedUrl, title);
    const SC = await loadSoundCloudWidgetApi();
    const widget = SC.Widget(iframe);
    widget.bind(SC.Widget.Events.PLAY, () => reporter.play());
    widget.bind(SC.Widget.Events.PAUSE, () => reporter.pause());
    widget.bind(SC.Widget.Events.FINISH, () => reporter.complete());
    widget.bind(SC.Widget.Events.PLAY_PROGRESS, (event = {}) => {
      reporter.sample(Number(event.currentPosition || 0) / 1000);
      widget.getDuration((duration) => reporter.sample(Number(event.currentPosition || 0) / 1000, Number(duration || 0) / 1000));
    });
    return { destroy: () => { reporter.destroy(); Object.values(SC.Widget.Events).forEach((eventName) => widget.unbind(eventName)); iframe.remove(); } };
  }

  reporter.destroy();
  const iframe = createStandardEmbed(frame, embedUrl, title);
  return { destroy: () => iframe.remove() };
  } catch (error) {
    reporter.destroy();
    throw error;
  }
}

function linkHubPage(release, artist) {
  if (isDownloadOnlyRelease(release) && window.location.pathname.split("/").filter(Boolean)[0] === "listen") {
    window.location.replace(releasePublicUrl("download", release, artist));
    return document.createElement("article");
  }
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
  const encodedEmailBody = encodeURIComponent(
    `Listen to ${release.title || "this song"} by ${artistLabel} on MusicBusiness Arena.\n\n${shareUrl}`
  );
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
    const embedUrl = platformEmbedUrl(key, release.streamingEmbeds?.[key]);
    if (!embedUrl) {
      return `
        <div class="service-platform">
          <a class="service-row streaming-link"
             data-release-id="${escapeAttribute(release.id)}"
             data-platform-key="${escapeAttribute(key)}"
             href="${escapeAttribute(href)}"
             target="_blank"
             rel="noopener noreferrer">
            <span class="service-brand">
              <img src="${escapeAttribute(icon)}" alt="">
              <strong>${label}</strong>
            </span>
            <span class="service-action">${actionLabel}</span>
          </a>
        </div>
      `;
    }
    return `
      <div class="service-platform" data-platform-player data-platform-key="${escapeAttribute(key)}">
        <button class="service-row service-player-row streaming-link" type="button"
                data-release-id="${escapeAttribute(release.id)}"
                data-platform-key="${escapeAttribute(key)}"
                data-platform-label="${escapeAttribute(label)}"
                data-embed-url="${escapeAttribute(embedUrl)}"
                aria-expanded="false">
          <span class="service-brand">
            <img src="${escapeAttribute(icon)}" alt="">
            <strong>${label}</strong>
          </span>
          <span class="service-action service-player-toggle-label">Play</span>
        </button>
        <div class="service-embed-panel" hidden>
          <div class="service-embed-toolbar">
            <strong>${label} player</strong>
            <a class="service-open-link streaming-link" data-release-id="${escapeAttribute(release.id)}"
               data-platform-key="${escapeAttribute(key)}" href="${escapeAttribute(href)}"
               target="_blank" rel="noopener noreferrer">Open in ${label} ↗</a>
          </div>
          <div class="service-embed-frame" data-embed-frame></div>
        </div>
      </div>
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
      <button class="link-share-button" type="button" data-share-release="${release.id}" aria-label="Share this song">Share</button>
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
          <span>I agree to receive updates from MusicBusiness Arena about ${artistLabel}.</span>
        </label>
        <p class="subscribe-status" data-subscribe-status aria-live="polite"></p>
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
          <button type="button" data-copy-link><span class="share-option-icon" aria-hidden="true">🔗</span><span>Copy link</span></button>
          <a href="https://twitter.com/intent/tweet?text=${encodedShareText}&url=${encodedShareUrl}" target="_blank" rel="noreferrer"><span class="share-option-icon" aria-hidden="true">𝕏</span><span>X</span></a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}" target="_blank" rel="noreferrer"><span class="share-option-icon" aria-hidden="true">f</span><span>Facebook</span></a>
          <a href="https://wa.me/?text=${encodedShareText}%20${encodedShareUrl}" target="_blank" rel="noreferrer"><span class="share-option-icon" aria-hidden="true">W</span><span>WhatsApp</span></a>
          <a href="mailto:?subject=${encodedShareText}&body=${encodedEmailBody}" title="Open your email app with this song ready to send"><span class="share-option-icon" aria-hidden="true">✉</span><span>Email</span></a>
          <button type="button" data-native-share hidden><span class="share-option-icon" aria-hidden="true">•••</span><span>More Apps</span></button>
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
  const nativeShareButton = wrap.querySelector("[data-native-share]");
  if (nativeShareButton && navigator.share) {
    nativeShareButton.hidden = false;
    nativeShareButton.addEventListener("click", async () => {
      try {
        await navigator.share({
          title: `${release.title || "Song"} by ${artistLabel}`,
          text: `Listen on MusicBusiness Arena`,
          url: shareUrl,
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          await navigator.clipboard.writeText(shareUrl);
          const label = nativeShareButton.querySelector("span:last-child");
          if (label) label.textContent = "Link copied";
        }
      }
    });
  }
  wrap.querySelector("[data-submit-subscribe]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const modal = wrap.querySelector("[data-subscribe-modal]");
    const emailInput = modal?.querySelector(".subscribe-email input");
    const consentInput = modal?.querySelector(".subscribe-consent input");
    const status = modal?.querySelector("[data-subscribe-status]");
    const originalText = button.textContent;
    const email = String(emailInput?.value || "").trim();

    if (status) status.textContent = "";
    if (!email) {
      if (status) status.textContent = "Please enter your email address.";
      emailInput?.focus();
      return;
    }
    if (!consentInput?.checked) {
      if (status) status.textContent = "Please confirm that MusicBusiness Arena can email you about this artist.";
      consentInput?.focus();
      return;
    }

    button.disabled = true;
    button.textContent = "Subscribing...";
    try {
      const response = await fetch("/api/artist-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: artist.id,
          releaseId: release.id,
          email,
          sourceUrl: window.location.href,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Subscription could not be saved.");
      const followerLabel = wrap.querySelector(".link-followers");
      if (followerLabel && Number.isFinite(Number(payload.followerCount))) {
        followerLabel.textContent = `${Number(payload.followerCount).toLocaleString()} followers`;
      }
      button.textContent = payload.alreadySubscribed ? "Already Subscribed" : "Subscribed";
      if (status) status.textContent = payload.message || "You are subscribed.";
      if (payload.welcomeEmailAttempted && !payload.welcomeEmailSent) {
        button.disabled = false;
        button.textContent = "Retry Email";
      }
    } catch (error) {
      if (status) status.textContent = error.message || "Subscription could not be saved.";
      button.disabled = false;
      button.textContent = originalText;
    }
  });
  wrap.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModals));

  const platformEventContext = (platformKey) => ({
    pageType: "listen_page",
    artistId: artist?.id,
    artistName: artist?.name,
    releaseId: release.id,
    releaseTitle: release.title,
    platformKey,
    platformName: platformLabel(platformKey),
  });

  const recordPlatformSelection = (releaseId, platformKey) => {
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
  };

  const recordExternalPlatformClick = (link) => {
    const releaseId = link.dataset.releaseId;
    const platformKey = link.dataset.platformKey;
    if (!releaseId || !platformKey) return;

    window.MBA.trackVisitorEvent({
      ...platformEventContext(platformKey),
      eventType: "platform_external_click",
      activity: `Opened ${platformLabel(platformKey)} website/app`,
      playbackMeasurement: "not_applicable",
    });
    recordPlatformSelection(releaseId, platformKey);
  };

  let openPlatformPlayer = null;
  let openPlayerController = null;
  let playerRequestId = 0;
  const closePlatformPlayer = (platform) => {
    if (!platform) return;
    playerRequestId += 1;
    const panel = platform.querySelector(".service-embed-panel");
    const frame = platform.querySelector("[data-embed-frame]");
    const row = platform.querySelector(".service-player-row");
    const label = platform.querySelector(".service-player-toggle-label");
    openPlayerController?.destroy?.();
    openPlayerController = null;
    if (frame) frame.replaceChildren();
    if (panel) panel.hidden = true;
    if (label) label.textContent = "Play";
    if (row) row.setAttribute("aria-expanded", "false");
    platform.classList.remove("is-open");
    if (openPlatformPlayer === platform) openPlatformPlayer = null;
  };

  wrap.querySelectorAll(".service-player-row").forEach((row) => {
    row.addEventListener("click", async () => {
      const platform = row.closest("[data-platform-player]");
      if (!platform) return;
      if (openPlatformPlayer === platform) {
        closePlatformPlayer(platform);
        return;
      }

      closePlatformPlayer(openPlatformPlayer);
      const panel = platform.querySelector(".service-embed-panel");
      const frame = platform.querySelector("[data-embed-frame]");
      const embedUrl = row.dataset.embedUrl;
      if (!panel || !frame || !embedUrl) return;

      panel.hidden = false;
      platform.classList.add("is-open");
      const label = platform.querySelector(".service-player-toggle-label");
      if (label) label.textContent = "Hide Player";
      row.setAttribute("aria-expanded", "true");
      openPlatformPlayer = platform;
      const platformKey = row.dataset.platformKey;
      const context = platformEventContext(platformKey);
      const measurementSupported = MEASURABLE_EMBED_PLATFORMS.has(platformKey);
      window.MBA.trackVisitorEvent({
        ...context,
        eventType: "platform_embed_open",
        activity: `Opened ${context.platformName} embedded player`,
        playbackMeasurement: measurementSupported ? "supported" : "unavailable",
      });
      recordPlatformSelection(row.dataset.releaseId, platformKey);
      if (!measurementSupported) {
        window.MBA.trackVisitorEvent({
          ...context,
          eventType: "platform_measurement_unavailable",
          activity: `${context.platformName} playback measurement unavailable`,
          playbackMeasurement: "unavailable",
        });
      }
      const requestId = ++playerRequestId;
      try {
        const controller = await createTrackedPlatformPlayer(frame, row, context);
        if (openPlatformPlayer !== platform || requestId !== playerRequestId) {
          controller?.destroy?.();
          return;
        }
        openPlayerController = controller;
      } catch {
        if (openPlatformPlayer !== platform || requestId !== playerRequestId) return;
        createStandardEmbed(frame, embedUrl, `${context.platformName} player`);
        window.MBA.trackVisitorEvent({
          ...context,
          eventType: "platform_measurement_unavailable",
          activity: `${context.platformName} playback measurement unavailable`,
          playbackMeasurement: "unavailable",
        });
      }
    });
  });

  wrap.querySelectorAll("a.streaming-link").forEach((link) => {
    link.addEventListener("click", () => {
      recordExternalPlatformClick(link);
    });
  });

  return wrap;
}
let lastArtistSnapshot = "";
let musicPageVisitRecorded = false;

/* ===================================================
   MUSIC PAGE RENDER LOOP

   Loads saved data, records music page visits when needed,
   and renders the correct artist music or listen page.
=================================================== */
async function renderArtistPage(force = false) {
  const embeddedPlayerIsOpen = Boolean(document.querySelector(".service-platform.is-open"));
  const modalIsOpen = Boolean(document.querySelector('.link-modal[aria-hidden="false"]'));
  if (embeddedPlayerIsOpen || modalIsOpen) return;
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
  if (artist) {
    artist.publicCatalogLabel = window.MBAPublicContext?.catalogLabelForArtist(artist, approvedReleases) || "Music";
  }
  setArtistNav(artist);

  if (artist) {
    const result = await window.MBA.incrementAnalytics(
      "artist",
      artist.id,
      "artistPageVisits"
    );
    if (result) artist.artistPageVisits = result.value;

    if ((window.location.pathname === "/music" || window.location.pathname.endsWith("/music") || window.location.pathname.endsWith("/beats")) && !musicPageVisitRecorded) {
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
  const viewedRelease = selectedRelease(releases);
  if (viewedRelease) {
    const listeningPage = window.location.pathname.startsWith("/listen/");
    window.MBA.trackVisitorEvent({
      eventType: "page_view",
      activity: listeningPage ? "Viewed listening links" : "Viewed song",
      pageType: listeningPage ? "listen_page" : "music_page",
      artistId: artist.id,
      artistName: artist.name,
      releaseId: viewedRelease.id,
      releaseTitle: viewedRelease.title,
    });
  }
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
