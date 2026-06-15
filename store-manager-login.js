const loginForm = document.querySelector("#storeManagerLoginForm");
const loginMessage = document.querySelector("#storeManagerLoginMessage");

function showLoginMessage(text, type = "pending") {
  loginMessage.textContent = text;
  loginMessage.dataset.type = type;
}

async function redirectIfAuthenticated() {
  const response = await fetch("/api/admin/session", { credentials: "same-origin" }).catch(() => null);
  const session = response?.ok ? await response.json() : null;
  if (session?.authenticated) window.location.replace("/store-manager");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showLoginMessage("Checking access...", "pending");

  const password = loginForm.password.value;
  const response = await fetch("/api/admin/login", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  }).catch(() => null);

  if (!response) {
    showLoginMessage("Unable to reach the server. Try again.", "error");
    return;
  }

  if (response.ok) {
    showLoginMessage("Access confirmed. Opening Store Manager...", "success");
    window.location.assign("/store-manager");
    return;
  }

  const payload = await response.json().catch(() => ({}));
  showLoginMessage(payload.error || "Unable to unlock Store Manager.", "error");
});

redirectIfAuthenticated();
