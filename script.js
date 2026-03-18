const year = document.getElementById("year");
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const waitlistForm = document.getElementById("waitlist-form");
const formMessage = document.getElementById("form-message");
const turnstileContainer = document.getElementById("turnstile-widget");
const waitlistSubmitButton = waitlistForm
  ? waitlistForm.querySelector('button[type="submit"]')
  : null;
const contactForm = document.getElementById("contact-form");
const contactMessage = document.getElementById("contact-message");
const contactSubmitButton = contactForm
  ? contactForm.querySelector('button[type="submit"]')
  : null;
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

    setSubmitting(true);
    renderMessage("Joining the waitlist...", "loading");

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
    } finally {
      setSubmitting(false);
    }
  });
}

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = new FormData(contactForm);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    const company = String(data.get("company") || "").trim();

    if (!name || !email || !message) {
      renderInlineMessage(contactMessage, "Please add your name, email, and message.", "error");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      renderInlineMessage(contactMessage, "Please enter a valid email.", "error");
      return;
    }

    setButtonState(contactSubmitButton, true, "Sending...");
    renderInlineMessage(contactMessage, "Sending your message...", "loading");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, message, company }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        renderInlineMessage(contactMessage, body.error || "Could not send your message right now.", "error");
        return;
      }

      contactForm.reset();
      renderInlineMessage(contactMessage, "Message sent. We will get back to you soon.", "success");
    } catch (_error) {
      renderInlineMessage(contactMessage, "Network issue. Please try again in a moment.", "error");
    } finally {
      setButtonState(contactSubmitButton, false, "Sending...", "Email us");
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
  renderInlineMessage(formMessage, message, type);
}

function renderInlineMessage(target, message, type) {
  if (!target) {
    return;
  }

  target.textContent = message;
  target.classList.remove("success", "error", "loading");
  target.classList.add(type);
}

function setButtonState(button, submitting, loadingLabel, idleLabel = null) {
  if (!button) {
    return;
  }

  button.disabled = submitting;
  if (submitting) {
    button.textContent = loadingLabel;
    return;
  }

  if (idleLabel) {
    button.textContent = idleLabel;
  }
}

function setSubmitting(submitting) {
  setButtonState(waitlistSubmitButton, submitting, "Joining...", "Join the Waitlist");
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
