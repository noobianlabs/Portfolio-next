/** @template {{id: string}} T @param {string} hash @param {readonly T[]} projects */
export function projectFromHash(hash, projects) {
  let id;
  try {
    id = decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return null;
  }
  // A fragment is data, never a CSS selector.
  return projects.find(project => project.id === id) || null;
}

/** @param {{group: string}} project @param {string} filter */
export function matchesProjectFilter(project, filter) {
  return filter === 'all' || project.group === filter;
}

/**
 * Only the same-origin room may receive readiness and Escape messages.
 * @param {{href: string, parentHref: string | null, isFramed: boolean}} input
 */
export function embeddedContext({ href, parentHref, isFramed }) {
  if (!isFramed || !parentHref) return null;
  try {
    const current = new URL(href);
    const parent = new URL(parentHref);
    const params = current.searchParams;
    const attempt = params.get('_studioAttempt');
    if (current.origin !== parent.origin || parent.pathname !== '/studio-runtime/index.html') return null;
    if (params.getAll('embedded').length !== 1 || params.get('embedded') !== '1') return null;
    if (params.getAll('_studioAttempt').length !== 1 || !attempt || !/^\d+$/.test(attempt)) return null;
    return { origin: current.origin, attempt };
  } catch {
    return null;
  }
}

/**
 * Mount only from a React effect: server HTML stays useful without claiming that
 * the interactive view is ready. Cleanup supports navigation and Strict Mode.
 * @param {{page: HTMLElement, window: Window}} input
 */
export function mountPortfolioBridge({ page, window }) {
  let parentHref = null;
  try {
    if (window.parent !== window) parentHref = window.parent.location.href;
  } catch {
    // A cross-origin frame is not a trusted studio host.
  }
  const context = embeddedContext({ href: window.location.href, parentHref, isFramed: window.parent !== window });
  page.setAttribute('data-portfolio-ready', '1');
  if (context) window.parent.postMessage({ type: 'studio:portfolio-ready', attempt: context.attempt }, context.origin);

  /** @param {KeyboardEvent} event */
  function closeOnEscape(event) {
    if (event.key !== 'Escape' || event.defaultPrevented || !context) return;
    window.parent.postMessage({ type: 'studio:close-computer', attempt: context.attempt }, context.origin);
  }
  window.addEventListener('keydown', closeOnEscape);
  return {
    embedded: Boolean(context),
    cleanup() {
      window.removeEventListener('keydown', closeOnEscape);
      page.removeAttribute('data-portfolio-ready');
    },
  };
}
