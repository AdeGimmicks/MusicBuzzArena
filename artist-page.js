const artistTrackList = document.querySelector("#artistTrackList");
const artistReleaseList = document.querySelector("#artistReleaseList");
let activePreviewAudio = null;
let activePreviewButton = null;

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

function artistForPage(store, approvedReleases) {
  const params = new URLSearchParams(window.location.search);
  const releaseId = params.get("release");
  const artistId = params.get("artist");
  const release = releaseId ? approvedReleases.find((item) => item.id === releaseId) : null;

  return (
    store.artists.find((artist) => artist.id === release?.artistId) ||
    store.artists.find((artist) => artist.id === artistId) ||
    store.artists.find((artist) => artist.id === store.site?.featuredArtistId) ||
    store.artists[0]
  );
}

function trackRow(release, artist) {
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
    <div class="track-actions" aria-label="${release.title || "Song"} actions">
      <a class="track-action track-action-listen" href="/listen?release=${encodeURIComponent(release.id)}">Listen</a>
      <a class="track-action track-action-download" href="/listen?release=${encodeURIComponent(release.id)}#download">Download</a>
      <a class="track-action track-action-support" href="/listen?release=${encodeURIComponent(release.id)}#support">Support</a>
    </div>
  `;
  return row;
}

function renderTopTracks(releases, artist) {
  if (!artistTrackList) return;
  artistTrackList.replaceChildren();

  if (!releases.length) {
    artistTrackList.innerHTML = `<p class="empty-state">Songs will appear here after they are uploaded and approved.</p>`;
    return;
  }

  const selectedRelease =
    releases.find((release) => release.id === artist?.featuredReleaseId) ||
    releases.find((release) => release.id === artist?.bannerReleaseId) ||
    releases[0];
  artistTrackList.append(trackRow(selectedRelease, artist));
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
  const pageMode = window.location.hash === "#download" ? "download" : window.location.hash === "#support" ? "support" : "listen";
  const artistLabel = artist?.name || release.artistName || "Independent Artist";
  const artistHandle = artist?.handle || `@${artistLabel.replace(/\s+/g, "").toLowerCase()}`;
  const artistPhotoSrc = artist?.photo || release.cover || "Mba Logos/MusicBusiness Logo.png";
  const downloadAmount = money(release.price || 0);
  const donationAmount = Number(release.donationAmount || release.donationPrice || release.supportAmount || 0);
  const shareUrl = `${window.location.origin}/listen?release=${encodeURIComponent(release.id)}`;
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const encodedShareText = encodeURIComponent(`Listen to ${release.title || "this song"} by ${artistLabel}`);
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
    return `
      <a class="service-row" href="${href}" target="_blank" rel="noreferrer">
        <span class="service-brand">
          <img src="${icon}" alt="">
          <strong>${label}</strong>
        </span>
        <span class="service-action">Play</span>
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
            <button type="button" data-payment-placeholder data-payment-label="Pay with Stripe">Pay with Stripe</button>
            <button type="button" data-payment-placeholder data-payment-label="Pay with PayPal">Pay with PayPal</button>
          </div>
          <small>After payment is connected, this section will unlock the song file automatically.</small>
        </section>
      `
      : pageMode === "support"
        ? `
          <section class="payment-panel" id="support" aria-label="Support ${artistLabel}">
            <p class="eyebrow">Support</p>
            <h2>Support ${artistLabel}</h2>
            <p>Send any amount to support the artist directly.</p>
            <label class="support-amount">
              <span>Support amount</span>
              <input type="number" min="1" step="1" value="${donationAmount > 0 ? donationAmount : 5}" aria-label="Support amount">
            </label>
            <div class="payment-actions">
              <button type="button" data-payment-placeholder data-payment-label="Support with Stripe">Support with Stripe</button>
              <button type="button" data-payment-placeholder data-payment-label="Support with PayPal">Support with PayPal</button>
            </div>
            <small>Artist payment links will be connected from Upload when payment setup is ready.</small>
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
      <img class="link-artist-photo" src="${artistPhotoSrc}" alt="${artistLabel} profile photo">
      <h1>${artistHandle}</h1>
      <div class="link-socials" aria-label="${artistLabel} social links">
        ${socialRows || `<span class="empty-state">Social links will appear here.</span>`}
      </div>
      <span class="link-followers">${Number(artist?.followers || artist?.follows || 0).toLocaleString()} followers</span>
    </section>
    <div class="featured-listing-card">
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
        <h2>${release.title || "Untitled track"}</h2>
        <span>Song · ${artistLabel}</span>
      </div>
    </div>
    ${paymentSection}
    ${
      pageMode === "listen"
        ? `<div class="service-list">
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
          <img src="${release.cover || artistPhotoSrc}" alt="">
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

  wrap.querySelectorAll("[data-payment-placeholder]").forEach((button) => {
    button.addEventListener("click", () => {
      const label = button.dataset.paymentLabel || button.textContent;
      button.textContent = "Payment setup coming";
      window.setTimeout(() => {
        button.textContent = label;
      }, 1400);
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

  const approvedReleases = (store.releases || []).filter((release) => release.status === "approved");
  const artist = artistForPage(store, approvedReleases);
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
