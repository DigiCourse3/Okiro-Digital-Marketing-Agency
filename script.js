/* Send enquiries through FormSubmit and report only accepted submissions to GTM.
   Never pass names, emails, phone numbers, or message text to Analytics. */
window.okiroSubmitLead = async function (form, feedback, source) {
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton ? submitButton.textContent : '';
  if (submitButton) { submitButton.disabled = true; submitButton.setAttribute('aria-busy', 'true'); }
  if (feedback) feedback.textContent = 'Sending your enquiry…';
  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    payload._subject = 'New Okiro website enquiry';
    payload._template = 'table';
    const response = await fetch('https://formsubmit.co/ajax/hello@okiro.co.in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    const message = String(result.message || result.error || '');
    const accepted = response.ok && (result.success === true || result.success === 'true');
    if (!accepted) {
      if (feedback) feedback.textContent = message || 'We could not send your enquiry. Please email hello@okiro.co.in directly.';
      return false;
    }
    if (feedback) feedback.textContent = 'Thank you — your enquiry has been submitted successfully.';
    form.reset();
    // Allow GTM to process generate_lead before navigating to the thank-you page.
    let redirected = false;
    const goToThankYou = () => {
      if (redirected) return;
      redirected = true;
      window.location.assign('thank-you.html');
    };
    if (window.dataLayer && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: 'generate_lead',
        form_name: source,
        eventCallback: goToThankYou,
        eventTimeout: 1500
      });
      window.setTimeout(goToThankYou, 1800);
    } else {
      goToThankYou();
    }
    return true;
  } catch (error) {
    if (feedback) feedback.textContent = 'We could not send your enquiry. Please check your connection or email hello@okiro.co.in directly.';
    return false;
  } finally {
    if (submitButton) { submitButton.disabled = false; submitButton.removeAttribute('aria-busy'); submitButton.textContent = originalButtonText; }
  }
};

/* Okiro navigation: desktop hover + reliable touch/mobile menu. */
(() => {
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  const mobileQuery = window.matchMedia('(max-width: 700px)');

  const servicesItem = nav?.querySelector('.services-nav');
  const servicesTrigger = servicesItem?.querySelector(':scope > .nav-trigger');
  servicesTrigger?.setAttribute('aria-expanded', 'false');

  // Desktop: explicitly pin the Services menu open on click.
  // Do not rely on hover alone, because the pointer can briefly leave the trigger
  // while moving into a fixed-position mega-menu.
  servicesTrigger?.addEventListener('click', (event) => {
    if (mobileQuery.matches) return; // Touch/mobile dropdown behavior is handled below.
    event.preventDefault();
    const shouldOpen = !servicesItem.classList.contains('menu-open');
    servicesItem.classList.toggle('menu-open', shouldOpen);
    servicesTrigger.setAttribute('aria-expanded', String(shouldOpen));
  });

  // Close a pinned desktop menu only when the user clicks outside it.
  document.addEventListener('click', (event) => {
    if (mobileQuery.matches || !servicesItem?.classList.contains('menu-open')) return;
    if (!servicesItem.contains(event.target)) {
      servicesItem.classList.remove('menu-open');
      servicesTrigger?.setAttribute('aria-expanded', 'false');
    }
  });

  const setMenuOpen = (open) => {
    if (!nav || !menuToggle) return;
    nav.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };

  menuToggle?.addEventListener('click', (event) => {
    event.preventDefault();
    setMenuOpen(!nav?.classList.contains('open'));
  });

  // On touch layouts, the first tap opens a parent dropdown instead of
  // immediately navigating away. The dropdown's own links remain usable.
  nav?.querySelectorAll('.nav-item').forEach((item) => {
    const trigger = item.querySelector(':scope > .nav-trigger');
    const dropdown = item.querySelector(':scope > .dropdown');
    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', (event) => {
      if (!mobileQuery.matches) return; // Keep normal desktop link behavior.
      const alreadyOpen = item.classList.contains('open');
      if (!alreadyOpen) {
        event.preventDefault();
        nav.querySelectorAll('.nav-item.open').forEach((other) => {
          if (other !== item) other.classList.remove('open');
        });
        item.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      } else {
        // The second tap follows the parent page link.
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
  });

  // Close the mobile panel after choosing a destination, but don't close it
  // when tapping a parent item to expand its dropdown.
  nav?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      const parentTrigger = link.classList.contains('nav-trigger');
      if (mobileQuery.matches && parentTrigger && link.parentElement?.classList.contains('open')) return;
      if (mobileQuery.matches) {
        setMenuOpen(false);
        nav.querySelectorAll('.nav-item.open').forEach((item) => item.classList.remove('open'));
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMenuOpen(false);
      nav?.querySelectorAll('.nav-item.open').forEach((item) => item.classList.remove('open'));
      servicesItem?.classList.remove('menu-open');
      servicesTrigger?.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', (event) => {
    if (mobileQuery.matches && nav?.classList.contains('open') &&
        !nav.contains(event.target) && !menuToggle?.contains(event.target)) {
      setMenuOpen(false);
      nav.querySelectorAll('.nav-item.open').forEach((item) => item.classList.remove('open'));
    }
  });

  mobileQuery.addEventListener?.('change', () => {
    setMenuOpen(false);
    nav?.querySelectorAll('.nav-item.open').forEach((item) => item.classList.remove('open'));
  });

  const yearEl = document.querySelector('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const form = document.querySelector('#contactForm');
  const feedback = document.querySelector('#formFeedback');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const sent = await window.okiroSubmitLead(form, feedback, 'contact_form');
    if (sent) showToast('Your enquiry has been submitted successfully.');
  });

  function showToast(message) {
    const toast = document.querySelector('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 3800);
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();


/* Shared project enquiry modal: auto-opens after 15 seconds on desktop only,\n   and also opens from every Let's Talk / Start a Project button on all devices. */
(() => {
  const KEY = 'okiroProjectModalShownThisSession_v2';
  let modal;
  const safeGet = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch (_) { return false; } };
  const safeSet = () => { try { sessionStorage.setItem(KEY, '1'); } catch (_) {} };
  const buildModal = () => {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'project-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'presentation');
    modal.innerHTML = `
      <section class="project-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="projectModalTitle" aria-describedby="projectModalIntro">
        <button class="project-modal-close" type="button" aria-label="Close project enquiry form">×</button>
        <div class="project-modal-kicker">OKIRO / PROJECT ENQUIRY</div>
        <h2 id="projectModalTitle">Let's make your next move matter.</h2>
        <p class="project-modal-intro" id="projectModalIntro">Tell us a little about your goals. We'll help you find the right mix of strategy, creative and performance.</p>
        <form class="project-modal-form">
          <label for="projectModalName">Your name</label><input id="projectModalName" name="name" autocomplete="name" placeholder="Your name" required>
          <label for="projectModalEmail">Work email</label><input id="projectModalEmail" name="email" type="email" autocomplete="email" placeholder="you@company.com" required>
          <label for="projectModalMobile">Mobile number</label><input id="projectModalMobile" name="mobile" type="tel" inputmode="tel" autocomplete="tel" placeholder="e.g. +91 98765 43210" required>
          <label for="projectModalService">What do you need help with?</label>
          <select id="projectModalService" name="service" required><option value="" disabled selected>Select a service</option><option>SEO & Organic Growth</option><option>Paid Media & PPC</option><option>Social Media Marketing</option><option>Website Development</option><option>Analytics & Conversion</option><option>Content Marketing</option><option>Google Ads</option><option>Meta Ads</option><option>Other / Not sure yet</option></select>
          <label for="projectModalMessage">Project goals (optional)</label><textarea id="projectModalMessage" name="message" rows="3" placeholder="What would you like to achieve?"></textarea>
          <button class="project-modal-submit" type="submit">Send project enquiry <span aria-hidden="true">↗</span></button>
          <p class="project-modal-note">Submitting opens your email app with the enquiry details. No information is sent until you send that email.</p><p class="project-modal-feedback" aria-live="polite"></p>
        </form>
      </section>`;
    document.body.appendChild(modal);
    const close = () => { modal.hidden = true; document.body.classList.remove('project-modal-open'); };
    modal.querySelector('.project-modal-close').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) close(); });
    modal.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      await window.okiroSubmitLead(
        e.currentTarget,
        modal.querySelector('.project-modal-feedback'),
        'project_enquiry_modal'
      );
    });
    return modal;
  };
  const open = () => {
    const el = buildModal();
    el.hidden = false;
    document.body.classList.add('project-modal-open');
    safeSet();
    window.setTimeout(() => el.querySelector('input[name="name"]')?.focus({preventScroll:true}), 40);
  };
  document.addEventListener('click', e => {
    const trigger = e.target.closest('a.js-open-project-form, .header-cta, .button-primary, .mega-footer a');
    if (!trigger) return;
    const label = (trigger.textContent || '').toLowerCase();
    const explicit = trigger.classList.contains('js-open-project-form') || label.includes("let's talk") || label.includes('start a project');
    if (!explicit) return;
    e.preventDefault(); open();
  });
  const scheduleAutomaticOpen = () => {
    // Do not interrupt the mobile experience with a timed popup. Keep the 15-second
    // automatic enquiry popup on desktop; mobile users can open it from a CTA.
    if (window.matchMedia('(max-width: 680px)').matches) return;
    if (safeGet()) return;
    window.setTimeout(() => {
      if (!safeGet() && !document.hidden) open();
      else if (!safeGet() && document.hidden) {
        // If the visitor changes tabs during the delay, try again when they return.
        const onVisible = () => {
          if (!document.hidden && !safeGet()) { document.removeEventListener('visibilitychange', onVisible); open(); }
        };
        document.addEventListener('visibilitychange', onVisible);
      }
    }, 15000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleAutomaticOpen, { once: true });
  else scheduleAutomaticOpen();
})();


/* Testimonials carousel: show a small group of cards and navigate horizontally. */
(() => {
  const viewport = document.querySelector('.testimonials-viewport');
  const track = viewport?.querySelector('.testimonials-grid');
  const prev = document.querySelector('[data-testimonial-prev]');
  const next = document.querySelector('[data-testimonial-next]');
  if (!viewport || !track || !prev || !next) return;
  let index = 0;
  const visibleCount = () => window.matchMedia('(max-width: 680px)').matches ? 1 : (window.matchMedia('(max-width: 1000px)').matches ? 2 : 3);
  const maxIndex = () => Math.max(0, track.children.length - visibleCount());
  const stepSize = () => { const card = track.querySelector('.testimonial-card'); if (!card) return 0; const styles = getComputedStyle(track); return card.getBoundingClientRect().width + (parseFloat(styles.columnGap || styles.gap) || 0); };
  const render = () => { index = Math.min(index, maxIndex()); track.style.transform = `translateX(${-index * stepSize()}px)`; prev.disabled = index <= 0; next.disabled = index >= maxIndex(); };
  prev.addEventListener('click', () => { index = Math.max(0, index - visibleCount()); render(); });
  next.addEventListener('click', () => { index = Math.min(maxIndex(), index + visibleCount()); render(); });
  window.addEventListener('resize', render);
  render();
})();

/* Compact mobile contact bar: Call, WhatsApp, Email and Book. */
(() => {
  const mountMobileContactBar = () => {
    if (document.querySelector('.okiro-mobile-contact-bar')) return;
    const bar = document.createElement('nav');
    bar.className = 'okiro-mobile-contact-bar';
    bar.setAttribute('aria-label', 'Quick contact options');
    bar.innerHTML = `
      <a href="tel:+917997708801" aria-label="Call Okiro at +91 79977 08801">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.56 3.57.56a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.19 2.45.56 3.57a1 1 0 01-.25 1.02z"/></svg><span>Call</span>
      </a>
      <a href="https://wa.me/917997708801" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Okiro at +91 79977 08801">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.52 3.48A11.8 11.8 0 003.9 20.1L3 23l3-.8A11.8 11.8 0 1020.52 3.48zM12 21a9 9 0 01-4.6-1.26l-.33-.2-1.95.52.52-1.9-.22-.35A9 9 0 1112 21zm4.94-6.74c-.27-.14-1.6-.79-1.85-.88s-.43-.14-.61.14-.7.88-.86 1.06-.32.2-.59.07a7.4 7.4 0 01-2.18-1.35 8.2 8.2 0 01-1.5-1.86c-.16-.27-.02-.42.12-.56.12-.12.27-.32.4-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.52-.45-.45-.61-.46h-.52c-.18 0-.47.07-.72.34s-.95.93-.95 2.26.98 2.62 1.11 2.8c.14.18 1.92 2.93 4.65 4.11.65.28 1.16.45 1.56.57.65.2 1.24.17 1.71.1.52-.08 1.6-.66 1.83-1.29.23-.64.23-1.18.16-1.29-.07-.11-.25-.18-.52-.32z"/></svg><span>WhatsApp</span>
      </a>
      <a href="mailto:hello@okiro.co.in" aria-label="Email hello@okiro.co.in">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg><span>Email</span>
      </a>
      <a href="#project-enquiry" class="js-open-project-form" aria-label="Book a project enquiry">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h2v2h6V2h2v2h2a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h2zm12 8H5v10h14zM7 12h4v4H7z"/></svg><span>Book</span>
      </a>`;
    document.body.appendChild(bar);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountMobileContactBar, { once: true });
  else mountMobileContactBar();
})();
