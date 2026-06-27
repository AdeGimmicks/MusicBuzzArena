(function () {
  const page = document.getElementById("downloadPage");
  const params = new URLSearchParams(window.location.search);
  const queryReleaseId = params.get("release");
  const checkoutState = params.get("checkout");
  const checkoutSessionId = params.get("session_id");
  let previewAudio = null;

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function money(amount, currency) {
    const code = String(currency || "usd").toUpperCase();
    const value = Number(amount || 0.99);
    return `${code} ${Number.isFinite(value) ? value.toFixed(2) : "0.99"}`;
  }

  function parsePreviewTime(value, fallbackSeconds = 0) {
    if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallbackSeconds;
    const text = String(value ?? "").trim();
    if (!text) return fallbackSeconds;
    if (text.includes(":")) {
      const [minutesText, secondsText] = text.split(":");
      const minutes = Number(minutesText);
      const seconds = Number(secondsText);
      if (
        Number.isInteger(minutes) &&
        Number.isInteger(seconds) &&
        minutes >= 0 &&
        seconds >= 0 &&
        seconds < 60
      ) {
        return minutes * 60 + seconds;
      }
      return fallbackSeconds;
    }
    const seconds = Number(text);
    return Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : fallbackSeconds;
  }

  function releaseDateLabel(release) {
    if (!release.releaseDate) return "Release date will appear here";
    const date = new Date(release.releaseDate);
    if (Number.isNaN(date.getTime())) return release.releaseDate;
    return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }

  function approvedReleases(store) {
    return (store.releases || []).filter((release) => release.status === "approved");
  }

  function slugify(value) {
    return String(value || "song")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function artistSlug(artist) {
    return slugify(artist?.slug || artist?.handle || artist?.name || artist?.id || "artist");
  }

  function releaseSlug(release) {
    return slugify(release?.slug || release?.title || release?.id || "song");
  }

  function releasePublicUrl(type, release, artist) {
    const artistPart = artistSlug(artist);
    const releasePart = releaseSlug(release);
    return artistPart ? `/${type}/${artistPart}/${releasePart}` : `/${type}/${releasePart}`;
  }

  function releaseSlugFromPath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] !== "download" && parts[0] !== "listen") return "";
    return parts.length >= 3 ? parts[2] : parts[1] || "";
  }

  function artistSlugFromPath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] !== "download" && parts[0] !== "listen") return "";
    return parts.length >= 3 ? parts[1] : "";
  }

  function selectedRelease(store) {
    const releases = approvedReleases(store);
    const pathReleaseSlug = releaseSlugFromPath();
    const pathArtistSlug = artistSlugFromPath();
    const pathArtist = pathArtistSlug
      ? (store.artists || []).find((artist) => artistSlug(artist) === pathArtistSlug)
      : null;
    return (
      releases.find((release) => release.id === queryReleaseId) ||
      releases.find((release) => {
        if (releaseSlug(release) !== pathReleaseSlug) return false;
        return pathArtist ? release.artistId === pathArtist.id : true;
      }) ||
      releases[0] ||
      null
    );
  }

  function selectedArtist(store, release) {
    return (store.artists || []).find((artist) => artist.id === release?.artistId) || {};
  }

  function renderEmpty() {
    page.innerHTML = `
      <div class="download-empty">
        <p class="download-eyebrow">MusicBusiness Arena</p>
        <h1>No release selected</h1>
        <p>Approved songs will be available for paid download here.</p>
        <a class="pay-now-button" href="/home">Back to Home</a>
      </div>
    `;
  }

  function downloadStatusUrl(releaseId) {
    const query = new URLSearchParams({
      release: releaseId || "",
      session_id: checkoutSessionId || "",
    });
    return `/api/download-status?${query.toString()}`;
  }

  function claimDownloadUrl(releaseId) {
    const query = new URLSearchParams({
      release: releaseId || "",
      session_id: checkoutSessionId || "",
    });
    return `/api/claim-download?${query.toString()}`;
  }

  function filenameFromResponse(response, release) {
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="([^"]+)"/);
    return match?.[1] || `${String(release.title || "song").replace(/[^a-z0-9._-]+/gi, "-")}.mp3`;
  }

  async function loadDownloadState(releaseId) {
    if (checkoutState !== "success" || !checkoutSessionId) return null;
    const response = await fetch(downloadStatusUrl(releaseId));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to verify this purchase.");
    return data;
  }

  function renderDownloadAction(release, isSuccess, downloadState) {
    if (!isSuccess) return `<button class="pay-now-button" id="payNowButton" type="button">Pay Now</button>`;
    if (!checkoutSessionId) return `<button class="download-file-button" type="button" disabled>Download unavailable</button>`;
    if (downloadState?.downloaded) return `<button class="download-file-button" type="button" disabled>Downloaded ✓</button>`;
    return `<button class="download-file-button" id="downloadFileButton" type="button">Download Song File</button>`;
  }

  function downloadStatusText(isSuccess, isCancelled, downloadState) {
    if (downloadState?.downloaded) return "Thank you, this song has already been downloaded for this purchase.";
    if (isSuccess && !checkoutSessionId) return "Unable to verify this purchase. Please use the Stripe success link.";
    if (isSuccess) return "Payment complete. Your song file is ready.";
    if (isCancelled) return "Payment was cancelled. You can try again.";
    return "Preview the sample, then pay to unlock the download.";
  }

  function renderPage(store, downloadState = null) {
    const release = selectedRelease(store);
    if (!release) {
      renderEmpty();
      return;
    }

    const artist = selectedArtist(store, release);
    const artistName = artist.name || release.artistName || "Independent Artist";
    const artwork = release.cover || artist.photo || "Mba Logos/MusicBusiness Logo.png";
    const isSuccess = checkoutState === "success";
    const isCancelled = checkoutState === "cancelled";
    const price = money(release.price, release.currency);

    page.innerHTML = `
      <article class="download-card">
        <div>
          <img class="download-artwork" src="${escapeHtml(artwork)}" alt="${escapeHtml(release.title)} artwork" />
        </div>
        <div class="download-info">
          <p class="download-eyebrow">Paid Download</p>
          <h1>${escapeHtml(release.title || "Untitled Song")}</h1>
          <p class="download-subtitle">${escapeHtml(artistName)} · ${escapeHtml(releaseDateLabel(release))}</p>
          <p class="download-price">${price}</p>
          ${renderPreview(release)}
          <div class="download-actions">
            ${renderDownloadAction(release, isSuccess, downloadState)}
            <a class="download-secondary-link" href="${releasePublicUrl("listen", release, artist)}">Streaming Links</a>
          </div>
          <p class="download-status ${isSuccess ? "is-success" : isCancelled ? "is-error" : ""}" id="downloadStatus">
            ${downloadStatusText(isSuccess, isCancelled, downloadState)}
          </p>
        </div>
      </article>
    `;

    setupPreview(release);
    setupCheckout(release);
    setupPaidDownload(release);
  }

  function renderPreview(release) {
    if (!release.audioUrl) {
      return `<div class="preview-panel"><p>No preview audio is available for this release yet.</p></div>`;
    }

    return `
      <div class="preview-panel">
        <p>Preview before paying</p>
        <div class="preview-controls">
          <button class="preview-play-button" id="previewButton" type="button">Preview</button>
          <div class="preview-track" aria-label="Preview progress">
            <div class="preview-fill" id="previewFill"></div>
          </div>
        </div>
      </div>
    `;
  }

  function setupPreview(release) {
    const button = document.getElementById("previewButton");
    const fill = document.getElementById("previewFill");
    if (!button || !fill || !release.audioUrl) return;

    if (previewAudio) {
      previewAudio.pause();
      previewAudio = null;
    }

    const start = parsePreviewTime(release.previewStart, 0);
    const duration = Math.max(1, parsePreviewTime(release.previewDuration, 60));
    const defaultEnd = start + duration;
    const configuredEnd = parsePreviewTime(release.previewEnd, defaultEnd);
    const end = configuredEnd > start ? configuredEnd : defaultEnd;
    const isMobilePreview =
      window.matchMedia?.("(pointer: coarse)").matches ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

    previewAudio = new Audio(release.audioUrl);
    previewAudio.preload = "metadata";
    if (isMobilePreview) {
      previewAudio.playsInline = true;
      previewAudio.setAttribute("playsinline", "");
    }

    let mobileSeekPending = isMobilePreview;

    const previewEnd = () =>
      Number.isFinite(previewAudio.duration) ? Math.min(end, previewAudio.duration) : end;
    const previewStart = () =>
      Number.isFinite(previewAudio.duration) ? Math.min(start, Math.max(0, previewAudio.duration - 0.25)) : start;
    const seekToPreviewStart = () => {
      if (isMobilePreview) mobileSeekPending = true;
      try {
        previewAudio.currentTime = previewStart();
      } catch {
        return;
      }
      fill.style.width = "0%";
    };
    const confirmMobilePreviewStart = () => {
      if (!mobileSeekPending || previewAudio.readyState < 1) return;
      const target = previewStart();
      try {
        if (Math.abs(previewAudio.currentTime - target) > 0.2) {
          previewAudio.currentTime = target;
          return;
        }
        mobileSeekPending = false;
      } catch {
        // Mobile browsers retry when the next media readiness event fires.
      }
    };
    const waitForMetadata = () => {
      if (previewAudio.readyState >= 1) return Promise.resolve();
      previewAudio.load();
      return new Promise((resolve) => {
        previewAudio.addEventListener("loadedmetadata", resolve, { once: true });
        previewAudio.addEventListener("error", resolve, { once: true });
      });
    };

    button.addEventListener("click", async () => {
      if (previewAudio.paused) {
        await waitForMetadata();
        if (previewAudio.currentTime < previewStart() || previewAudio.currentTime >= previewEnd()) {
          seekToPreviewStart();
        }
        await previewAudio.play();
        button.textContent = "Pause";
      } else {
        previewAudio.pause();
        button.textContent = "Preview";
      }
    });

    previewAudio.addEventListener("timeupdate", () => {
      const currentStart = previewStart();
      const currentEnd = previewEnd();
      const progress = Math.max(0, Math.min(100, ((previewAudio.currentTime - currentStart) / (currentEnd - currentStart)) * 100));
      fill.style.width = `${progress}%`;
      if (previewAudio.currentTime >= currentEnd) {
        previewAudio.pause();
        seekToPreviewStart();
        button.textContent = "Preview";
      }
    });

    previewAudio.addEventListener("loadedmetadata", () => {
      seekToPreviewStart();
      confirmMobilePreviewStart();
    });
    if (isMobilePreview) {
      previewAudio.addEventListener("loadeddata", confirmMobilePreviewStart);
      previewAudio.addEventListener("canplay", confirmMobilePreviewStart);
      previewAudio.addEventListener("seeked", confirmMobilePreviewStart);
    }
    previewAudio.addEventListener("playing", () => {
      if (previewAudio.currentTime < previewStart()) seekToPreviewStart();
      confirmMobilePreviewStart();
    });

    previewAudio.addEventListener("ended", () => {
      seekToPreviewStart();
      button.textContent = "Preview";
    });
  }

  function setupCheckout(release) {
    const button = document.getElementById("payNowButton");
    const status = document.getElementById("downloadStatus");
    if (!button) return;

    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Opening Checkout...";
      status.textContent = "Connecting to secure checkout.";
      status.className = "download-status";

      try {
        const response = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            releaseId: release.id,
            type: "download",
            amount: Number(release.price || 0.99),
            currency: release.currency || "usd",
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.url) {
          throw new Error(data.error || "Unable to start checkout.");
        }
        window.location.href = data.url;
      } catch (error) {
        status.textContent = error.message || "Unable to start checkout.";
        status.className = "download-status is-error";
        button.disabled = false;
        button.textContent = "Pay Now";
      }
    });
  }

  function markDownloaded(message = "Thank you, this song has already been downloaded for this purchase.") {
    const button = document.getElementById("downloadFileButton");
    const status = document.getElementById("downloadStatus");
    if (button) {
      button.textContent = "Downloaded ✓";
      button.disabled = true;
      button.removeAttribute("id");
    }
    if (status) {
      status.textContent = message;
      status.className = "download-status is-success";
    }
  }

  function setupPaidDownload(release) {
    const button = document.getElementById("downloadFileButton");
    const status = document.getElementById("downloadStatus");
    if (!button) return;

    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Preparing download...";
      if (status) {
        status.textContent = "Preparing your one-time download.";
        status.className = "download-status";
      }

      try {
        const response = await fetch(claimDownloadUrl(release.id));
        if (response.status === 409) {
          const data = await response.json().catch(() => ({}));
          markDownloaded(data.error || "Thank you, this song has already been downloaded for this purchase.");
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Unable to download this song.");
        }

        const blob = await response.blob();
        const fileLink = document.createElement("a");
        const objectUrl = URL.createObjectURL(blob);
        fileLink.href = objectUrl;
        fileLink.download = filenameFromResponse(response, release);
        document.body.appendChild(fileLink);
        fileLink.click();
        fileLink.remove();
        URL.revokeObjectURL(objectUrl);
        markDownloaded();
        await window.MBA.loadStore({ force: true });
      } catch (error) {
        button.disabled = false;
        button.textContent = "Download Song File";
        if (status) {
          status.textContent = error.message || "Unable to download this song.";
          status.className = "download-status is-error";
        }
      }
    });
  }

async function init() {
  try {
    const store = await window.MBA.loadStore({ force: true });

    const release = selectedRelease(store);
    const artist = selectedArtist(store, release);

    if (artist) {
      const result = await window.MBA.incrementAnalytics(
        "artist",
        artist.id,
        "downloadPageVisits"
      );
      if (result) artist.downloadPageVisits = result.value;
    }

    const downloadState = await loadDownloadState(release?.id);
    renderPage(store, downloadState);
  } catch (error) {
      page.innerHTML = `
        <div class="download-empty">
          <p class="download-eyebrow">Download</p>
          <h1>Unable to load this release</h1>
          <p>${escapeHtml(error.message || "Please try again.")}</p>
        </div>
      `;
    }
  }

  init();
})();
