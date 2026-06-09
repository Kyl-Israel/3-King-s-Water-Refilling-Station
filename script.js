const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const body = document.body;
const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = [...document.querySelectorAll(".nav-links a[data-page]")];
const revealItems = [...document.querySelectorAll("[data-reveal]")];
const backToTop = document.querySelector(".back-to-top");
const quickOrderButton = document.querySelector(".floating-order");
const faqTriggers = [...document.querySelectorAll(".faq-trigger")];
const counters = [...document.querySelectorAll("[data-counter]")];
const orderForm = document.querySelector("#order-form");
const formFeedback = document.querySelector("#form-feedback");
const contactMessageForm = document.querySelector("#contact-message-form");
const contactMessageFeedback = document.querySelector("#contact-message-feedback");
const currentPage = body?.dataset.page || "home";
const pageLoadedAt = Date.now();

const COOKIE_CONSENT_KEY = "threeKingsCookieConsent";
const ORDER_COOLDOWN_KEY = "threeKingsOrderCooldown";
const CONTACT_COOLDOWN_KEY = "threeKingsContactCooldown";
const SUBMIT_COOLDOWN_MS = 2 * 60 * 1000;
const MINIMUM_FORM_TIME_MS = 3000;

let isMenuOpen = false;

const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // localStorage can be unavailable in private or restricted browsing modes.
    }
  },
};

const updateHeaderState = () => {
  const isScrolled = window.scrollY > 24;
  header?.classList.toggle("scrolled", isScrolled);
  backToTop?.classList.toggle("is-visible", window.scrollY > 520);
};

const setActiveNavLink = () => {
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.page === currentPage);
  });
};

const toggleMenu = (forceOpen) => {
  const nextState = typeof forceOpen === "boolean" ? forceOpen : !isMenuOpen;
  isMenuOpen = nextState;
  body.classList.toggle("nav-open", isMenuOpen);
  body.classList.toggle("is-locked", isMenuOpen);
  navToggle?.setAttribute("aria-expanded", String(isMenuOpen));
  navToggle?.setAttribute("aria-label", isMenuOpen ? "Close navigation menu" : "Open navigation menu");
};

const setFeedback = (element, message, isSuccess = false) => {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.toggle("is-success", isSuccess);
};

const getRemainingCooldown = (key) => {
  const lastSubmission = Number(storage.get(key) || 0);
  if (!Number.isFinite(lastSubmission) || lastSubmission <= 0) {
    return 0;
  }

  return Math.max(SUBMIT_COOLDOWN_MS - (Date.now() - lastSubmission), 0);
};

const blockIfTooFast = (feedbackElement) => {
  if (Date.now() - pageLoadedAt >= MINIMUM_FORM_TIME_MS) {
    return false;
  }

  setFeedback(feedbackElement, "Please wait a moment before sending another request.");
  return true;
};

const blockIfCoolingDown = (key, feedbackElement) => {
  const remaining = getRemainingCooldown(key);
  if (remaining <= 0) {
    return false;
  }

  setFeedback(feedbackElement, "Please wait a moment before sending another request.");
  return true;
};

const postJson = async (url, payload) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Unable to send your request right now.");
  }

  return result;
};

const showPrivacyNotice = () => {
  if (storage.get(COOKIE_CONSENT_KEY)) {
    return;
  }

  const notice = document.createElement("section");
  notice.className = "privacy-notice glass-card";
  notice.setAttribute("aria-label", "Cookie and local storage notice");
  notice.innerHTML = `
    <p>This site uses basic local storage/cookies to remember your preference and reduce repeated prompts. Your form details are not stored in the browser after submission.</p>
    <div class="privacy-notice-actions">
      <button class="button button-primary ripple-target" type="button" data-consent="accepted">Accept</button>
      <button class="button button-secondary ripple-target" type="button" data-consent="declined">Decline</button>
    </div>
  `;

  notice.addEventListener("click", (event) => {
    const button = event.target.closest("[data-consent]");
    if (!(button instanceof HTMLElement)) {
      return;
    }

    storage.set(COOKIE_CONSENT_KEY, button.dataset.consent || "declined");
    notice.remove();
  });

  body.append(notice);
  notice.querySelectorAll(".ripple-target").forEach((button) => {
    button.addEventListener("pointerdown", createRipple);
  });
};

const createRipple = (event) => {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const ripple = document.createElement("span");
  const size = Math.max(rect.width, rect.height) * 1.1;
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  ripple.className = "button-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  button.append(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
};

setActiveNavLink();
updateHeaderState();
showPrivacyNotice();
window.addEventListener("scroll", updateHeaderState, { passive: true });

navToggle?.addEventListener("click", () => {
  toggleMenu();
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (isMenuOpen) {
      toggleMenu(false);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isMenuOpen) {
    toggleMenu(false);
    navToggle?.focus();
  }
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealItems.forEach((item) => {
    if (item.dataset.reveal === "hero" || prefersReducedMotion.matches) {
      item.classList.add("is-visible");
      return;
    }

    revealObserver.observe(item);
  });
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const animateCounter = (element) => {
  const target = Number(element.dataset.target || 0);
  const suffix = element.dataset.suffix || "";
  const duration = prefersReducedMotion.matches ? 0 : 1600;
  const start = performance.now();

  const update = (time) => {
    const progress = duration === 0 ? 1 : Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);
    element.textContent = `${value}${suffix}`;

    if (progress < 1) {
      window.requestAnimationFrame(update);
    }
  };

  window.requestAnimationFrame(update);
};

if ("IntersectionObserver" in window) {
  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.6,
    }
  );

  counters.forEach((counter) => {
    if (prefersReducedMotion.matches) {
      counter.textContent = `${counter.dataset.target || 0}${counter.dataset.suffix || ""}`;
      return;
    }

    counterObserver.observe(counter);
  });
} else {
  counters.forEach((counter) => {
    counter.textContent = `${counter.dataset.target || 0}${counter.dataset.suffix || ""}`;
  });
}

faqTriggers.forEach((trigger) => {
  const panel = trigger.nextElementSibling;
  if (panel) {
    panel.setAttribute("aria-hidden", String(trigger.getAttribute("aria-expanded") !== "true"));
  }

  trigger.addEventListener("click", () => {
    const isExpanded = trigger.getAttribute("aria-expanded") === "true";

    faqTriggers.forEach((item) => {
      const panel = item.nextElementSibling;
      const shouldExpand = item === trigger ? !isExpanded : false;

      item.setAttribute("aria-expanded", String(shouldExpand));
      if (panel) {
        panel.setAttribute("aria-hidden", String(!shouldExpand));
      }
    });
  });
});

backToTop?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? "auto" : "smooth" });
});

quickOrderButton?.addEventListener("click", (event) => {
  const quickOrderTarget = quickOrderButton.getAttribute("href");
  if (!quickOrderTarget || !quickOrderTarget.startsWith("#")) {
    return;
  }

  const section = document.querySelector(quickOrderTarget);
  if (!section) {
    return;
  }

  event.preventDefault();
  section.scrollIntoView({
    behavior: prefersReducedMotion.matches ? "auto" : "smooth",
    block: "start",
  });
});

document.querySelectorAll(".ripple-target").forEach((button) => {
  button.addEventListener("pointerdown", createRipple);
});

if (orderForm && formFeedback) {
  orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (blockIfTooFast(formFeedback) || blockIfCoolingDown(ORDER_COOLDOWN_KEY, formFeedback)) {
      return;
    }

    const formData = new FormData(orderForm);
    const requiredFields = ["name", "contact", "address", "gallons", "fulfillment", "date", "time"];
    const missingField = requiredFields.some((field) => {
      const value = formData.get(field);
      return typeof value !== "string" || !value.trim();
    });

    if (missingField || !orderForm.checkValidity()) {
      setFeedback(formFeedback, "Please complete the required fields before submitting your order.");
      orderForm.reportValidity();
      return;
    }

    const orderSummary = [
      `Name: ${String(formData.get("name") || "").trim()}`,
      `Contact: ${String(formData.get("contact") || "").trim()}`,
      `Gallons: ${String(formData.get("gallons") || "").trim()}`,
      `Method: ${String(formData.get("fulfillment") || "").trim()}`,
      `Date: ${String(formData.get("date") || "").trim()}`,
      `Time: ${String(formData.get("time") || "").trim()}`,
    ].join("\n");

    const confirmed = window.confirm(`Submit this order now?\n\n${orderSummary}`);
    if (!confirmed) {
      setFeedback(formFeedback, "Order submission cancelled.");
      return;
    }

    const submitButton = orderForm.querySelector('button[type="submit"]');
    if (!submitButton) {
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    setFeedback(formFeedback, "Sending your order request...");

    const payload = {
      name: String(formData.get("name") || "").trim(),
      contact: String(formData.get("contact") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      gallons: String(formData.get("gallons") || "").trim(),
      fulfillment: String(formData.get("fulfillment") || "").trim(),
      date: String(formData.get("date") || "").trim(),
      time: String(formData.get("time") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      website: String(formData.get("website") || "").trim(),
    };

    try {
      const result = await postJson("/.netlify/functions/send-order-email", payload);
      orderForm.reset();
      storage.set(ORDER_COOLDOWN_KEY, String(Date.now()));
      setFeedback(
        formFeedback,
        result.message || "Thank you! Your order request has been sent. We will contact you shortly.",
        true
      );
    } catch (error) {
      setFeedback(formFeedback, error.message || "Something went wrong while sending the order request.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit Order";
    }
  });
}

if (contactMessageForm && contactMessageFeedback) {
  contactMessageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (blockIfTooFast(contactMessageFeedback) || blockIfCoolingDown(CONTACT_COOLDOWN_KEY, contactMessageFeedback)) {
      return;
    }

    const formData = new FormData(contactMessageForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const contactNumber = String(formData.get("contactNumber") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const website = String(formData.get("website") || "").trim();

    if (!name || !email || !message || !contactMessageForm.checkValidity()) {
      setFeedback(contactMessageFeedback, "Please complete the required fields before sending your message.");
      contactMessageForm.reportValidity();
      return;
    }

    const submitButton = contactMessageForm.querySelector('button[type="submit"]');
    if (!submitButton) {
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    setFeedback(contactMessageFeedback, "Sending your message...");

    try {
      const result = await postJson("/.netlify/functions/send-contact-email", {
        name,
        email,
        contactNumber,
        message,
        website,
      });

      contactMessageForm.reset();
      storage.set(CONTACT_COOLDOWN_KEY, String(Date.now()));
      setFeedback(
        contactMessageFeedback,
        result.message || "Thank you! Your message has been sent. We will get back to you shortly.",
        true
      );
    } catch (error) {
      setFeedback(contactMessageFeedback, error.message || "Something went wrong while sending your message.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send Message";
    }
  });
}
