/* ===================================================
   PUBLIC UPLOAD ENTRY SCRIPT

   CODE OWNER GUIDE

   Decides whether a visitor should go to login, registration, or the dashboard upload workflow.
   Used by: upload.html.
   Does not create songs directly.
=================================================== */

/* ===================================================
   PUBLIC UPLOAD ENTRY PAGE

   Controls the public Upload page where visitors choose
   Single Song, EP, or Album before logging in or registering.

   Used by:
   - upload.html
=================================================== */
const uploadChoice = document.querySelector("#uploadAuthChoice");
const uploadChoiceText = document.querySelector("#uploadChoiceText");
const uploadCreateAccount = document.querySelector("#uploadCreateAccount");
const uploadLogin = document.querySelector("#uploadLogin");
const uploadEntryMessage = document.querySelector("#uploadEntryMessage");
const uploadExistingLogin = document.querySelector("#uploadExistingLogin");

const RELEASE_TYPES = new Set(["Single", "EP", "Album"]);

/* ===================================================
   UPLOAD TYPE AND AUTH LINKS

   Builds the correct Artist Dashboard, login, and registration
   links while remembering the selected release type.
=================================================== */
function cleanReleaseType(value) {
  return RELEASE_TYPES.has(value) ? value : "Single";
}

function dashboardUrl(type) {
  const releaseType = cleanReleaseType(type);
  return type ? `/artist-dashboard?start=${encodeURIComponent(releaseType)}` : "/artist-dashboard";
}

function authUrl(path, type) {
  return `${path}?start=${encodeURIComponent(cleanReleaseType(type))}`;
}

/* ===================================================
   RETURNING ARTIST CHECK

   Checks whether an artist is already logged in and sends them
   directly to the Artist Dashboard when appropriate.
=================================================== */
async function isLoggedIn() {
  try {
    const response = await fetch("/api/artist/session", { cache: "no-store", credentials: "same-origin" });
    const data = await response.json();
    return Boolean(data.authenticated);
  } catch {
    return false;
  }
}

async function redirectLoggedInArtist() {
  uploadEntryMessage.textContent = "Checking artist session...";
  if (await isLoggedIn()) {
    window.location.replace(dashboardUrl());
    return;
  }
  if (localStorage.getItem("mba-has-artist-account") === "true") {
    localStorage.removeItem("mba-pending-upload-type");
    window.location.replace("/artist-login?next=/artist-dashboard");
    return;
  }
  uploadEntryMessage.textContent = "";
}

if (uploadExistingLogin) {
  uploadExistingLogin.addEventListener("click", () => {
    localStorage.removeItem("mba-pending-upload-type");
  });
}

document.querySelectorAll("[data-upload-entry]").forEach((button) => {
  button.addEventListener("click", async () => {
    const type = cleanReleaseType(button.dataset.uploadEntry);
    localStorage.setItem("mba-pending-upload-type", type);
    uploadEntryMessage.textContent = "Checking artist account...";
    if (await isLoggedIn()) {
      window.location.assign(dashboardUrl(type));
      return;
    }
    uploadChoice.hidden = false;
    uploadChoiceText.textContent = `Continue with ${type === "Single" ? "Single Song" : type}. Create an artist account or log in.`;
    uploadCreateAccount.href = authUrl("/artist-register", type);
    uploadLogin.href = authUrl("/artist-login", type);
    uploadEntryMessage.textContent = "";
  });
});

redirectLoggedInArtist();
