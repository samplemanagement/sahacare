const year = document.getElementById("year");
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const waitlistForm = document.getElementById("waitlist-form");
const formMessage = document.getElementById("form-message");
const turnstileContainer = document.getElementById("turnstile-widget");
const revealElements = document.querySelectorAll(".reveal");
const toneSections = document.querySelectorAll("[data-section-tone]");

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
      turnstileToken = "";
      renderMessage("You are in. Check your email for confirmation.", "success");
    } catch (_error) {
      renderMessage("Network issue. Please try again in a moment.", "error");
    }
  });
}

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

initTurnstile();
initReveal();
initToneTransitions();

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

function initReveal() {
  revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index * 80, 280)}ms`;
  });

  if (!("IntersectionObserver" in window) || !revealElements.length) {
    revealElements.forEach((element) => element.classList.add("visible"));
    return;
  }

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
      threshold: 0.14,
      rootMargin: "0px 0px -72px 0px",
    },
  );

  revealElements.forEach((element) => observer.observe(element));
}

function initToneTransitions() {
  if (!toneSections.length) {
    return;
  }

  const updateTone = () => {
    const viewportMid = window.scrollY + window.innerHeight * 0.45;
    let currentTone = 0;

    toneSections.forEach((section) => {
      if (section.offsetTop <= viewportMid) {
        currentTone = Number(section.dataset.sectionTone || 0);
      }
    });

    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const scrollProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll));

    document.body.style.setProperty("--tone", String(currentTone));
    document.body.style.setProperty("--scroll-progress", String(scrollProgress));
  };

  updateTone();
  window.addEventListener("scroll", updateTone, { passive: true });
  window.addEventListener("resize", updateTone);
}
