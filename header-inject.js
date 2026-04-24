const slug = window.location.pathname.split('/').filter(Boolean).pop();
if (!slug) throw new Error('header-inject: could not determine form slug from pathname');
const CACHE_KEY = `header:${slug}`;
const API_URL = `https://headers.home.codescar.eu/${slug}`;

function buildHtmlPromise() {
  const cached = localStorage.getItem(CACHE_KEY);

  if (cached) {
    fetch(API_URL)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.html) localStorage.setItem(CACHE_KEY, data.html); })
      .catch(() => {});
    return Promise.resolve(cached);
  }

  return fetch(API_URL)
    .then(r => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    })
    .then(data => {
      if (typeof data?.html !== 'string') throw new Error('missing html in response');
      localStorage.setItem(CACHE_KEY, data.html);
      return data.html;
    });
}

const htmlPromise = buildHtmlPromise();

// Place this script with defer in <head>, or at the end of <body>.
// A plain inline <head> script without defer will crash — document.body is null at parse time.
// The visibility hide suppresses the placeholder flash only if the script runs before first paint.
// Nested placeholders (a container that contains another placeholder <p>) are not supported —
// the inner placeholder's container reference becomes detached after the outer one is replaced.
function attachPlaceholder(p) {
  const container = p.closest('div') || p.parentElement;
  container.style.visibility = 'hidden'; // sync — suppresses placeholder flash

  htmlPromise
    .then(html => { container.outerHTML = html; }) // html is server-controlled and trusted
    .catch(() => { container.style.visibility = ''; });
}

function scanRoot(root) {
  root.querySelectorAll('p').forEach(p => {
    if (p.textContent.trim() === 'header-to-be-replaced') attachPlaceholder(p);
  });
}

scanRoot(document);

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.matches('p') && node.textContent.trim() === 'header-to-be-replaced') {
        attachPlaceholder(node);
      } else {
        scanRoot(node);
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
