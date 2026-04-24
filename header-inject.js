const slug = window.location.pathname.split('/').filter(Boolean).pop();
if (!slug) throw new Error('header-inject: could not determine form slug from pathname');
const CACHE_KEY = `header:${slug}`;
const API_URL = `https://headers.home.codescar.eu/${slug}`;

const cachedHtml = localStorage.getItem(CACHE_KEY);

// Always fetch fresh HTML to keep cache current and re-apply if it changed
const apiFetchPromise = fetch(API_URL)
  .then(r => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  })
  .then(data => {
    if (typeof data?.html !== 'string') throw new Error('missing html in response');
    localStorage.setItem(CACHE_KEY, data.html);
    return data.html;
  })
  .catch(() => null);

// Place this script with defer in <head>, or at the end of <body>.
// A plain inline <head> script without defer will crash — document.body is null at parse time.
// Nested placeholders (a <p>.</p> inside another placeholder's container) are not supported —
// the inner placeholder becomes detached after the outer one is replaced.
function attachPlaceholder(p) {
  const container = p.closest('div') || p.parentElement;

  if (cachedHtml) {
    // Apply synchronously from cache — no async wait, no flash
    const sentinel = document.createComment('header-inject');
    container.before(sentinel);
    container.outerHTML = cachedHtml; // html is server-controlled and trusted

    // Re-apply when API responds in case the header changed
    apiFetchPromise.then(html => {
      if (!html || !sentinel.parentNode) return;
      let el = sentinel.nextSibling;
      while (el && el.nodeType !== Node.ELEMENT_NODE) el = el.nextSibling;
      if (el) el.outerHTML = html;
      sentinel.remove();
    }).catch(() => { if (sentinel.parentNode) sentinel.remove(); });
  } else {
    container.style.visibility = 'hidden';
    apiFetchPromise.then(html => {
      if (html) container.outerHTML = html;
      else container.style.visibility = '';
    }).catch(() => {});
  }
}

function scanRoot(root) {
  root.querySelectorAll('p').forEach(p => {
    if (p.textContent.trim() === '.') attachPlaceholder(p);
  });
}

scanRoot(document);

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.matches('p') && node.textContent.trim() === '.') {
        attachPlaceholder(node);
      } else {
        scanRoot(node);
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
