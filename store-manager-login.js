/* ===================================================
   STORE MANAGER LOGIN SCRIPT

   CODE OWNER GUIDE

   Controls Store Manager login and redirects already-authenticated admins.
   Used by: store-manager-login.html.
   Does not affect artist sessions.
=================================================== */

/* ===================================================
   STORE MANAGER LOGIN PAGE

   Controls the Store Manager login form, login message, and
   redirect when an admin is already authenticated.

   Used by:
   - store-manager-login.html
=================================================== */
const loginForm = document.querySelector("#storeManagerLoginForm");
const loginMessage = document.querySelector("#storeManagerLoginMessage");
const loginButton = loginForm?.querySelector('button[type="submit"]');
const emailInput = loginForm?.querySelector('[name="storeManagerEmail"]');
const passwordInput = loginForm?.querySelector('[name="storeManagerPassword"]');
let loginInProgress = false;

function showLoginMessage(text, type = "pending") {
  if (!loginMessage) return;
  loginMessage.textContent = text;
  loginMessage.dataset.type = type;
}

async function redirectIfAuthenticated() {
  const response = await fetch("/api/admin/session", { cache: "no-store", credentials: "same-origin" }).catch(() => null);
  const session = response?.ok ? await response.json() : null;
  if (session?.authenticated) window.location.replace("/store-manager");
}

async function submitStoreManagerLogin() {
  if (!loginForm || loginInProgress) return;
  loginInProgress = true;
  if (loginButton) loginButton.disabled = true;
  showLoginMessage("Checking access...", "pending");

  const email = emailInput?.value || "";
  const password = passwordInput?.value || "";
  const response = await fetch("/api/admin/login", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  }).catch(() => null);

  if (!response) {
    showLoginMessage("Unable to reach the server. Try again.", "error");
    loginInProgress = false;
    if (loginButton) loginButton.disabled = false;
    return;
  }

  if (response.ok) {
    showLoginMessage("Access confirmed. Opening Store Manager...", "success");
    window.location.assign("/store-manager");
    return;
  }

  const payload = await response.json().catch(() => ({}));
  showLoginMessage(payload.error || "Unable to unlock Store Manager.", "error");
  loginInProgress = false;
  if (loginButton) loginButton.disabled = false;
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await submitStoreManagerLogin();
});

loginButton?.addEventListener("click", async (event) => {
  event.preventDefault();
  await submitStoreManagerLogin();
});

redirectIfAuthenticated();
