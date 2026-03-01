const year = document.getElementById("year");
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const waitlistForm = document.getElementById("waitlist-form");
const formMessage = document.getElementById("form-message");
const turnstileContainer = document.getElementById("turnstile-widget");
let turnstileToken = "";
let turnstileRequired = false;

if (waitlistForm) {
  waitlistForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = new FormData(waitlistForm);
    const email = String(data.get("email") || "").trim();
    const role = String(data.get("role") || "").trim();
    const company = String(data.get("company") || "").trim();

    if (!email || !role) {
      renderMessage("Please add your email and role.", "error");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      renderMessage("Please enter a valid email.", "error");
      return;
    }

    if (turnstileRequired && !turnstileToken) {
      renderMessage("Please complete the security check.", "error");
      return;
    }

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role, company, turnstileToken }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        if (body.code === "RATE_LIMITED") {
          renderMessage("Too many attempts. Please try again in a little while.", "error");
          return;
        }

        if (body.code === "EMAIL_TEST_MODE_RESTRICTED") {
          renderMessage(
            "Signup saved. Confirmation email is temporarily restricted by email provider test mode.",
            "error",
          );
          return;
        }

        if (body.code === "EMAIL_DELIVERY_FAILED") {
          renderMessage("Signup saved, but confirmation email failed. Please retry shortly.", "error");
          return;
        }

        if (body.code === "TURNSTILE_FAILED") {
          renderMessage("Please complete the security check and try again.", "error");
          return;
        }

        renderMessage(body.error || "Could not join waitlist right now.", "error");
        return;
      }

      waitlistForm.reset();
      renderMessage("You are in. Check your email for confirmation.", "success");
    } catch (_error) {
      renderMessage("Network issue. Please try again in a moment.", "error");
    }
  });
}

initTurnstile();

const visitKey = `sahacare_visit_${window.location.pathname}`;
if (!sessionStorage.getItem(visitKey)) {
  fetch("/api/track-visit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: window.location.pathname }),
  }).catch(() => {
    // No-op: analytics should not block user experience.
  });

  sessionStorage.setItem(visitKey, "1");
}

function renderMessage(message, type) {
  if (!formMessage) {
    return;
  }

  formMessage.textContent = message;
  formMessage.classList.remove("success", "error");
  formMessage.classList.add(type);
}

async function initTurnstile() {
  if (!waitlistForm || !turnstileContainer) {
    return;
  }

  try {
    const response = await fetch("/api/public-config");
    const config = await response.json();
    if (!config.turnstileSiteKey) {
      return;
    }

    turnstileRequired = true;

    await waitForTurnstileScript();
    if (!window.turnstile) {
      turnstileRequired = false;
      return;
    }
    window.turnstile.render("#turnstile-widget", {
      sitekey: config.turnstileSiteKey,
      callback: (token) => {
        turnstileToken = token;
      },
      "error-callback": () => {
        turnstileToken = "";
      },
      "expired-callback": () => {
        turnstileToken = "";
      },
      theme: "light",
    });
  } catch (_error) {
    // Ignore non-blocking captcha bootstrap errors.
  }
}

function waitForTurnstileScript() {
  return new Promise((resolve) => {
    if (window.turnstile) {
      resolve();
      return;
    }

    let checks = 0;
    const timer = setInterval(() => {
      if (window.turnstile || checks > 120) {
        clearInterval(timer);
        resolve();
      }
      checks += 1;
    }, 50);
  });
}

const revealElements = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && revealElements.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      }
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -60px 0px",
    },
  );

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("visible"));
}
