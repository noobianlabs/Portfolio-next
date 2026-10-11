// Shared across controller instances so an earlier frame cannot confirm a new attempt.
let attemptSequence = 0;

// The host owns the load listener, overlay, focus, and room history. Readiness here
// confirms the mounted reading route, not that every optional asset succeeded.
export function createPortfolioLoadController({
  frame, portfolioURL, onState, schedule = setTimeout, cancel = clearTimeout, delay = 9000,
}) {
  let phase = 'idle', isOpen = false, attemptURL = null, timer = null;
  const getState = () => ({ phase, isOpen, attemptURL });
  const emit = () => onState?.(getState());

  function clearTimer() {
    if (timer !== null) cancel(timer);
    timer = null;
  }

  function documentReady() {
    try {
      if (!attemptURL) return false;
      // iframe.src is only the requested URL; redirects and error pages can differ.
      const document = frame.contentDocument;
      if (document?.readyState !== 'complete') return false;
      if (!document.querySelector('[data-portfolio-ready="1"]')) return false;
      const actual = new URL(document.URL);
      const expected = new URL(attemptURL);
      return actual.origin === expected.origin && actual.pathname === expected.pathname &&
        actual.searchParams.getAll('embedded').length === 1 && actual.searchParams.get('embedded') === '1' &&
        actual.searchParams.getAll('_studioAttempt').length === 1 &&
        actual.searchParams.get('_studioAttempt') === expected.searchParams.get('_studioAttempt');
    } catch {
      return false;
    }
  }

  function handleLoad() {
    if (!isOpen) return;
    if (documentReady()) {
      if (phase === 'ready') return;
      clearTimer();
      phase = 'ready';
      emit();
    } else if (phase === 'ready') {
      // A later navigation lost confirmation; this is not a diagnosed load failure.
      phase = 'unconfirmed';
      emit();
    }
  }

  // Next may hydrate after the iframe load event. Only the mounted document from
  // this exact navigation may confirm readiness; stale retries stay unconfirmed.
  function handleMessage(event) {
    if (!isOpen || !attemptURL || event.source !== frame.contentWindow) return;
    const expected = new URL(attemptURL);
    if (event.origin !== expected.origin || event.data?.type !== 'studio:portfolio-ready' ||
        event.data.attempt !== expected.searchParams.get('_studioAttempt')) return;
    handleLoad();
  }

  function startAttempt() {
    clearTimer();
    const url = new URL(portfolioURL);
    url.searchParams.set('embedded', '1');
    url.searchParams.set('_studioAttempt', String(++attemptSequence));
    attemptURL = url.href;
    phase = 'loading';
    emit();
    const currentAttempt = attemptURL;
    timer = schedule(() => {
      if (!isOpen || phase !== 'loading' || attemptURL !== currentAttempt) return;
      timer = null;
      phase = 'slow';
      emit();
    }, delay);
    try {
      // Avoid adding an iframe navigation to the browser's joint Back history.
      frame.contentWindow.location.replace(attemptURL);
    } catch {
      clearTimer();
      phase = 'cannot-open';
      emit();
    }
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    // Also reuse a valid document that finished while the room view was closed.
    if (documentReady()) {
      phase = 'ready';
      emit();
    } else {
      startAttempt();
    }
  }

  function close() {
    if (!isOpen) return;
    clearTimer();
    isOpen = false;
    if (phase !== 'ready') phase = 'idle';
    emit();
  }

  function retry() {
    if (isOpen) startAttempt();
  }

  return { getState, open, close, retry, handleLoad, handleMessage };
}
