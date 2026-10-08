/* ===================================================
   PAID DOWNLOAD PAGE SCRIPT

   CODE OWNER GUIDE

   Controls preview playback, Stripe checkout start, download status, and one-time download button behavior.
   Used by: download.html.
   Does not control dashboard editing.
=================================================== */

(function () {
  /* ===================================================
     DOWNLOAD PAGE ELEMENTS AND URL STATE

     Collects the download page, checkout query values, and
     current preview audio player state.

     Used by:
     - download.html
  =================================================== */
  const page = document.getElementById("downloadPage");
  const params = new URLSearchParams(window.location.search);
  const queryReleaseId = params.get("release");
  const checkoutState = params.get("checkout");
  const checkoutSessionId = params.get("session_id");
  const supportState = params.get("support");
  const supportSessionId = params.get("support_session_id");
  let previewAudio = null;

  /* ===================================================
     DOWNLOAD PAGE HELPERS

     Formats safe text, money, release dates, preview times,
     clean links, and file names.
  =================================================== */
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

  function releaseDateLabel(release) {
    if (!release.releaseDate) return "Release date will appear here";
    const date = new Date(release.releaseDate);
    if (Number.isNaN(date.getTime())) return release.releaseDate;
    return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }

  function formatTime(value) {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
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

  /* ===================================================
     RELEASE LOOKUP

     Finds the song or release being purchased from the URL.
     Supports older query links and newer clean links.
  =================================================== */
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

  async function loadSupportState() {
    if (supportState !== "success" || !supportSessionId) return null;
    const response = await fetch(`/api/support-status?session_id=${encodeURIComponent(supportSessionId)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to verify this support payment.");
    return data;
  }

  function renderDownloadAction(release, isSuccess, downloadState, price) {
    if (!isSuccess) {
      return `<button class="pay-now-button" id="payNowButton" type="button"><span class="download-button-icon" aria-hidden="true">&#8595;</span> Buy &amp; Download — ${escapeHtml(price)}</button>`;
    }
    if (!checkoutSessionId) return `<button class="download-file-button" type="button" disabled>Download unavailable</button>`;
    if (downloadState?.downloaded) return `<button class="download-file-button" type="button" disabled>Downloaded ✓</button>`;
    return `<button class="download-file-button" id="downloadFileButton" type="button"><span class="download-button-icon" aria-hidden="true">&#8595;</span> Download Song File</button>`;
  }

  function downloadStatusText(isSuccess, isCancelled, downloadState) {
    if (downloadState?.downloaded) return "Thank you, this song has already been downloaded for this purchase.";
    if (isSuccess && !checkoutSessionId) return "Unable to verify this purchase. Please use the Stripe success link.";
    if (isSuccess) return "Payment complete. Your song file is ready.";
    if (isCancelled) return "Payment was cancelled. You can try again.";
    return "Own the high-quality audio file on your device.";
  }

  function renderStreamingLinks(release) {
    const definitions = Array.isArray(window.STREAMING_LINKS)
      ? window.STREAMING_LINKS
      : typeof STREAMING_LINKS !== "undefined"
        ? STREAMING_LINKS
        : [];
    const links = definitions
      .filter(([, key]) => release.streaming?.[key])
      .map(([label, key, icon]) => `
        <a class="download-platform-link" href="${escapeHtml(release.streaming[key])}" target="_blank" rel="noopener noreferrer" data-platform-key="${escapeHtml(key)}" data-platform-name="${escapeHtml(label)}">
          <img src="${escapeHtml(icon)}" alt="" />
          <span>${escapeHtml(label)}</span>
        </a>
      `)
      .join("");

    if (!links) return "";
    return `
      <section class="download-streaming-panel" aria-labelledby="streamingHeading">
        <div class="download-section-heading">
          <span class="download-section-icon" aria-hidden="true">&#9835;</span>
          <div>
            <h2 id="streamingHeading">Listen on Streaming Platforms</h2>
            <p>Also available on major streaming platforms.</p>
          </div>
        </div>
        <div class="download-platform-grid">${links}</div>
      </section>
    `;
  }

  /* ===================================================
     PAID DOWNLOAD SCREEN

     Renders artwork, title, price, preview player, Pay Now,
     streaming links, and post-payment download state.
  =================================================== */
  function renderPage(store, downloadState = null, verifiedSupport = null) {
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
    const supportMessage = verifiedSupport
      ? `Thank you for supporting ${artistName} with ${money(verifiedSupport.amount, verifiedSupport.currency)}.`
      : supportState === "cancelled"
        ? "Support payment was cancelled. You can choose another amount whenever you are ready."
        : "Your support goes directly toward the artist's work.";

    page.innerHTML = `
      <div class="download-storefront">
        <article class="download-card">
          <div class="download-artwork-wrap">
          <img class="download-artwork" src="${escapeHtml(artwork)}" alt="${escapeHtml(release.title)} artwork" />
          </div>
          <div class="download-info">
            <p class="download-eyebrow">Paid Download</p>
            <div class="download-title-row">
              <div>
                <h1>${escapeHtml(release.title || "Untitled Song")}</h1>
                <p class="download-subtitle">${escapeHtml(artistName)} · ${escapeHtml(releaseDateLabel(release))}</p>
              </div>
              <p class="download-price">${price}</p>
            </div>
            ${renderPreview(release)}
            <div class="download-notice">
              <span aria-hidden="true">i</span>
              <p>You can listen to this song in full once for free. To listen again, please download the song.</p>
            </div>
            <div class="download-actions">
              ${renderDownloadAction(release, isSuccess, downloadState, price)}
              <button class="download-secondary-link" id="supportScrollButton" type="button"><span aria-hidden="true">&#9829;</span> Support ${escapeHtml(artistName)}</button>
            </div>
            <p class="download-status ${isSuccess ? "is-success" : isCancelled ? "is-error" : ""}" id="downloadStatus">
              ${downloadStatusText(isSuccess, isCancelled, downloadState)}
            </p>
          </div>
        </article>

        <div class="download-lower-grid ${release.streaming && Object.values(release.streaming).some(Boolean) ? "" : "is-single"}">
          <section class="download-support-panel" id="supportArtist" aria-labelledby="supportHeading">
            <div class="download-section-heading">
              <span class="download-support-heart" aria-hidden="true">&#9829;</span>
              <div>
                <h2 id="supportHeading">Support ${escapeHtml(artistName)}</h2>
                <p>Enjoying this song? Support the artist with any amount you wish.</p>
              </div>
            </div>
            <form class="download-support-form" id="supportForm">
              <div class="download-support-presets" aria-label="Choose a support amount">
                <button type="button" data-support-amount="1">$1</button>
                <button type="button" data-support-amount="5">$5</button>
                <button type="button" data-support-amount="10">$10</button>
                <button type="button" data-support-amount="25">$25</button>
              </div>
              <p class="download-support-custom-label">Or enter a custom amount</p>
              <div class="download-support-checkout-row">
                <label class="download-support-amount">
                  <span aria-hidden="true">$</span>
                  <span class="sr-only">Custom support amount in US dollars</span>
                  <input id="supportAmount" name="amount" type="number" inputmode="decimal" min="1" step="0.01" value="5.00" aria-label="Custom support amount in US dollars" required />
                </label>
                <button class="download-support-button" id="supportButton" type="submit">Support Now</button>
              </div>
            </form>
            <p class="download-support-status ${verifiedSupport ? "is-success" : supportState === "cancelled" ? "is-error" : ""}" id="supportStatus">${escapeHtml(supportMessage)}</p>
          </section>
          ${renderStreamingLinks(release)}
        </div>
      </div>
    `;

    setupPreview(release);
    setupCheckout(release);
    setupPaidDownload(release);
    setupSupport(release);
    setupSupportScroll();
    setupStreamingTracking(release, artist);
  }

  /* ===================================================
     ONE-TIME FREE PLAYER

     Allows one complete browser play, preserves progress for
     pause/resume, and locks after the song finishes.
  =================================================== */
  function renderPreview(release) {
    if (!release.audioUrl) {
      return `<div class="preview-panel"><p>No preview audio is available for this release yet.</p></div>`;
    }

    return `
      <div class="preview-panel">
        <div class="preview-heading">
          <p>Listen to the full song <strong>(1 free play)</strong></p>
          <span>No account required</span>
        </div>
        <div class="preview-controls">
          <button class="preview-play-button" id="previewButton" type="button" aria-label="Play song"><span aria-hidden="true">&#9654;</span></button>
          <span class="preview-time" id="previewCurrent">0:00</span>
          <div class="preview-track" id="previewTrack" role="progressbar" aria-label="Song progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="previewFill"></span></div>
          <span class="preview-time" id="previewDuration">0:00</span>
          <label class="preview-volume">
            <span aria-hidden="true">&#9835;</span>
            <span class="sr-only">Volume</span>
            <input id="previewVolume" type="range" min="0" max="1" value="0.8" step="0.05" />
          </label>
        </div>
      </div>
    `;
  }

  function setupPreview(release) {
    const button = document.getElementById("previewButton");
    const track = document.getElementById("previewTrack");
    const fill = document.getElementById("previewFill");
    const currentLabel = document.getElementById("previewCurrent");
    const durationLabel = document.getElementById("previewDuration");
    const volume = document.getElementById("previewVolume");
    if (!button || !track || !fill || !currentLabel || !durationLabel || !release.audioUrl) return;

    if (previewAudio) {
      previewAudio.pause();
      previewAudio = null;
    }

    const storageKey = `mba-free-play-${release.id}`;
    const readPlayState = () => {
      try {
        return JSON.parse(localStorage.getItem(storageKey) || "{}") || {};
      } catch {
        return {};
      }
    };
    const savePlayState = (value) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        // Playback remains available when browser storage is unavailable.
      }
    };
    previewAudio = new Audio(release.audioUrl);
    previewAudio.preload = "metadata";
    previewAudio.playsInline = true;
    previewAudio.setAttribute("playsinline", "");
    previewAudio.volume = Number(volume?.value || 0.8);

    const setButtonState = (playing) => {
      button.innerHTML = playing ? `<span aria-hidden="true">&#10074;&#10074;</span>` : `<span aria-hidden="true">&#9654;</span>`;
      button.setAttribute("aria-label", playing ? "Pause song" : "Play song");
    };
    const setCompletedState = () => {
      button.disabled = true;
      button.innerHTML = `<span aria-hidden="true">&#10003;</span>`;
      button.setAttribute("aria-label", "Free play completed");
    };
    const updateProgress = () => {
      const duration = Number.isFinite(previewAudio.duration) ? previewAudio.duration : 0;
      const current = Math.min(previewAudio.currentTime || 0, duration || Infinity);
      const progress = duration ? Math.min(100, (current / duration) * 100) : 0;
      fill.style.width = `${progress}%`;
      track.setAttribute("aria-valuenow", String(Math.round(progress)));
      currentLabel.textContent = formatTime(current);
      durationLabel.textContent = formatTime(duration);
    };

    button.addEventListener("click", async () => {
      if (readPlayState().completed) {
        setCompletedState();
        return;
      }
      if (previewAudio.paused) {
        try {
          await previewAudio.play();
          setButtonState(true);
        } catch {
          const status = document.getElementById("downloadStatus");
          if (status) {
            status.textContent = "The song could not start. Please try again.";
            status.className = "download-status is-error";
          }
        }
      } else {
        previewAudio.pause();
        setButtonState(false);
      }
    });

    volume?.addEventListener("input", () => {
      previewAudio.volume = Number(volume.value);
    });
    previewAudio.addEventListener("timeupdate", () => {
      updateProgress();
      savePlayState({ position: previewAudio.currentTime, completed: false });
    });
    previewAudio.addEventListener("loadedmetadata", () => {
      const state = readPlayState();
      if (state.completed) {
        previewAudio.currentTime = previewAudio.duration || 0;
        setCompletedState();
      } else if (Number(state.position) > 0 && Number(state.position) < previewAudio.duration) {
        previewAudio.currentTime = Number(state.position);
      }
      updateProgress();
    });
    previewAudio.addEventListener("ended", () => {
      savePlayState({ position: previewAudio.duration || 0, completed: true });
      updateProgress();
      setCompletedState();
    });
    previewAudio.addEventListener("pause", () => {
      if (!readPlayState().completed) setButtonState(false);
    });
  }

  /* ===================================================
     STRIPE CHECKOUT START

     Starts Stripe checkout when a fan clicks Pay Now.
     The backend handles payment rules and Stripe Connect payout
     calculations.
  =================================================== */
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
        button.innerHTML = `<span class="download-button-icon" aria-hidden="true">&#8595;</span> Buy &amp; Download — ${escapeHtml(money(release.price, release.currency))}`;
      }
    });
  }

  function setupSupport(release) {
    const form = document.getElementById("supportForm");
    const amountInput = document.getElementById("supportAmount");
    const button = document.getElementById("supportButton");
    const status = document.getElementById("supportStatus");
    if (!form || !amountInput || !button || !status) return;

    const presetButtons = [...form.querySelectorAll("[data-support-amount]")];
    const startSupportCheckout = async (amount, trigger) => {
      if (!Number.isFinite(amount) || amount < 1) {
        status.textContent = "Enter at least USD 1.00 to continue.";
        status.className = "download-support-status is-error";
        amountInput.focus();
        return;
      }

      const originalText = trigger.textContent;
      button.disabled = true;
      presetButtons.forEach((item) => { item.disabled = true; });
      trigger.textContent = "Opening...";
      status.textContent = "Connecting to secure Stripe Checkout.";
      status.className = "download-support-status";

      try {
        const response = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            releaseId: release.id,
            type: "support",
            amount,
            currency: release.currency || "usd",
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.url) throw new Error(data.error || "Unable to start support checkout.");
        window.location.href = data.url;
      } catch (error) {
        status.textContent = error.message || "Unable to start support checkout.";
        status.className = "download-support-status is-error";
        button.disabled = false;
        presetButtons.forEach((item) => { item.disabled = false; });
        trigger.textContent = originalText;
      }
    };

    presetButtons.forEach((preset) => {
      preset.addEventListener("click", () => {
        startSupportCheckout(Number(preset.dataset.supportAmount), preset);
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      startSupportCheckout(Number(amountInput.value), button);
    });
  }

  function setupSupportScroll() {
    const button = document.getElementById("supportScrollButton");
    const panel = document.getElementById("supportArtist");
    if (!button || !panel) return;
    button.addEventListener("click", () => panel.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function setupStreamingTracking(release, artist) {
    document.querySelectorAll(".download-platform-link").forEach((link) => {
      link.addEventListener("click", () => {
        const platformKey = link.dataset.platformKey || "";
        const platformName = link.dataset.platformName || "Streaming platform";
        window.MBA.trackVisitorEvent({
          eventType: "platform_external_click",
          activity: `Clicked ${platformName} external link - opened website/app`,
          pageType: "download_page",
          artistId: artist?.id,
          artistName: artist?.name,
          releaseId: release.id,
          releaseTitle: release.title,
          platformKey,
          platformName,
          playbackMeasurement: "not_applicable",
        });
        fetch("/api/streaming-click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ releaseId: release.id, platformKey }),
          keepalive: true,
        }).catch(() => {});
      });
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

  /* ===================================================
     ONE-TIME DOWNLOAD CLAIM

     Allows a paid buyer to download the song once, then marks
     that specific Stripe checkout session as downloaded.
  =================================================== */
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

/* ===================================================
   DOWNLOAD PAGE STARTUP

   Loads saved website data, checks payment/download status,
   and displays the correct download page state.
=================================================== */
async function init() {
  try {
    const store = await window.MBA.loadStore({ force: true });

    const release = selectedRelease(store);
    const artist = selectedArtist(store, release);
    const slug = artistSlug(artist);

    if (artist?.id) window.MBAPublicContext?.applyPublicArtistNavigation(artist);

    if (artist) {
      const result = await window.MBA.incrementAnalytics(
        "artist",
        artist.id,
        "downloadPageVisits"
      );
      if (result) artist.downloadPageVisits = result.value;
    }

    if (release) {
      window.MBA.trackVisitorEvent({
        eventType: "page_view",
        activity: "Viewed download page",
        pageType: "download_page",
        artistId: artist?.id,
        artistName: artist?.name,
        releaseId: release.id,
        releaseTitle: release.title,
      });
    }

    const downloadState = await loadDownloadState(release?.id);
    let verifiedSupport = null;
    try {
      verifiedSupport = await loadSupportState();
    } catch (error) {
      verifiedSupport = { error: error.message || "Unable to verify this support payment." };
    }
    renderPage(store, downloadState, verifiedSupport?.error ? null : verifiedSupport);
    if (verifiedSupport?.error) {
      const supportStatus = document.getElementById("supportStatus");
      if (supportStatus) {
        supportStatus.textContent = verifiedSupport.error;
        supportStatus.className = "download-support-status is-error";
      }
    }
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
