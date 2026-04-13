(function() {
  'use strict';

  // DEBUG MODE - Uncomment console.log lines below to enable debugging
  // const DEBUG = true;
  const DEBUG = false;
  function log() { if (DEBUG) console.log.apply(console, arguments); }
  function error() { if (DEBUG) console.error.apply(console, arguments); }

  const FIELDS = {
    marriage_status: '50aa1cce-bc06-419d-bc86-328a795993bd',
    spouse_send_email: '191b9a50-02bc-4f1a-ae3e-1c24884d2a85',
    afm: 'aa903600-6858-447c-ae9c-91220500b152',
    incoming_afm: 'd41b8d88-40e2-49be-ace5-7996ba1ea713',
    is_spouse: '90ef9493-e385-4e98-9061-1ee40f5538a0'
  };

  const url_params = new URLSearchParams(window.location.search);
  if (url_params.get(FIELDS.incoming_afm)) {
    log('[FormSnippet] Skip - incoming_afm present in URL');
    return;
  }

  log('[FormSnippet] Active');

  let active_submission_key = null;
  let button_intercepted = false;

  // Intercept localStorage.setItem to track which key OpnForm is actively using
  const _orig_setItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    if (key && key.includes('pending-submission-')) {
      active_submission_key = key;
      log('[FormSnippet] Active key updated:', key);
    }
    return _orig_setItem(key, value);
  };

  function get_opnform_data() {
    if (!active_submission_key) {
      log('[FormSnippet] No active submission key tracked yet');
      return null;
    }

    try {
      const data = JSON.parse(localStorage.getItem(active_submission_key));
      log('[FormSnippet] Reading from:', active_submission_key);
      return data;
    } catch (e) {
      error('[FormSnippet] Parse error:', e);
      return null;
    }
  }

  function intercept_submit() {
    const data = get_opnform_data();
    if (!data) {
      log('[FormSnippet] No form data found');
      return null;
    }

    const marriage_status = data[FIELDS.marriage_status];
    const spouse_send_email = data[FIELDS.spouse_send_email];
    const afm_value = data[FIELDS.afm];

    log('[FormSnippet] Values:', { marriage_status, spouse_send_email, afm_value });

    if (marriage_status === 'ΕΓΓΑΜΟΣ/Η' && !spouse_send_email) {
      log('[FormSnippet] Condition met');
      return { afm_value, marriage_status };
    }

    log('[FormSnippet] Condition not met');
    return null;
  }

  function try_intercept() {
    const submit_button = document.querySelector('button[type="submit"]');
    if (!submit_button || button_intercepted) return;

    button_intercepted = true;
    log('[FormSnippet] Button found, adding listener');

    submit_button.addEventListener('click', async function(e) {
      log('[FormSnippet] Button clicked');

      const result = intercept_submit();

      if (result) {
        e.stopImmediatePropagation();
        e.preventDefault();

        try {
          const data = get_opnform_data();
          if (!data) return;

          data.completion_time = Math.floor(Date.now() / 1000);

          log('[FormSnippet] Submitting...');

          const response = await fetch('/api/forms/prototype/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
          });

          const response_data = await response.json();
          log('[FormSnippet] Result:', response_data);

          if (response_data.type === 'success') {
            log('[FormSnippet] Redirecting...');
            const base_url = window.location.pathname;
            const redirect_url = `${base_url}?${FIELDS.incoming_afm}=${encodeURIComponent(result.afm_value)}&${FIELDS.marriage_status}=${encodeURIComponent(result.marriage_status)}&${FIELDS.is_spouse}=true`;
            log('[FormSnippet] URL:', redirect_url);
            window.location.href = redirect_url;
          }
        } catch (err) {
          error('[FormSnippet] Error:', err);
        }
      }
    }, true);
  }

  const observer = new MutationObserver(try_intercept);
  observer.observe(document.body, { childList: true, subtree: true });

  log('[FormSnippet] Observer started');
  setTimeout(() => {
    observer.disconnect();
    log('[FormSnippet] Observer disconnected');
  }, 600000);
})();

