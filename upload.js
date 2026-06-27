const uploadChoice = document.querySelector("#uploadAuthChoice");
const uploadChoiceText = document.querySelector("#uploadChoiceText");
const uploadCreateAccount = document.querySelector("#uploadCreateAccount");
const uploadLogin = document.querySelector("#uploadLogin");
const uploadEntryMessage = document.querySelector("#uploadEntryMessage");
const uploadExistingLogin = document.querySelector("#uploadExistingLogin");

const RELEASE_TYPES = new Set(["Single", "EP", "Album"]);

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
