(function() {
  'use strict';

  // DEBUG MODE - Uncomment console.log lines below to enable debugging
  const DEBUG = true;
  // const DEBUG = false;
  function log() { if (DEBUG) console.log.apply(console, arguments); }
  function error() { if (DEBUG) console.error.apply(console, arguments); }

  const FIELDS = {
    marriage_status: '50aa1cce-bc06-419d-bc86-328a795993bd',
    spouse_send_email: '191b9a50-02bc-4f1a-ae3e-1c24884d2a85',
    afm: 'aa903600-6858-447c-ae9c-91220500b152',
    incoming_afm: 'd41b8d88-40e2-49be-ace5-7996ba1ea713',
    is_spouse: '90ef9493-e385-4e98-9061-1ee40f5538a0',
    name: '0f989032-f684-42c2-99c1-870afe25569b',
    name_spouse: 'c69c7bf2-b386-4f94-9f60-0151f815a5e6',
    separate_taxform: 'dc7501b3-bb46-4f78-beb6-1afc7673614b'
  };

  log('[FormSnippet] Script loaded');
  log('[FormSnippet] URL:', window.location.href);

  const url_params = new URLSearchParams(window.location.search);
  const incoming_afm_in_url = url_params.get(FIELDS.incoming_afm);
  log('[FormSnippet] incoming_afm in URL:', incoming_afm_in_url);

  if (incoming_afm_in_url) {
    log('[FormSnippet] Skip - incoming_afm present in URL, exiting');
    return;
  }

  log('[FormSnippet] Active - installing fetch interceptor');

  const _orig_fetch = window.fetch.bind(window);
  window.fetch = async function(url, options) {
    log('[FormSnippet] fetch called:', typeof url === 'string' ? url : '(non-string url)', 'method:', options && options.method);

    const is_form_submit = typeof url === 'string' &&
      url.includes('/api/forms/') &&
      url.includes('/answer') &&
      options && options.method === 'POST';

    if (!is_form_submit) {
      return _orig_fetch(url, options);
    }

    log('[FormSnippet] >>> Form submit fetch intercepted! URL:', url);
    log('[FormSnippet] Raw body:', options.body);

    let body;
    try {
      body = JSON.parse(options.body);
      log('[FormSnippet] Parsed body keys:', Object.keys(body));
      log('[FormSnippet] Full body:', body);
    } catch (e) {
      error('[FormSnippet] Body parse failed:', e);
      return _orig_fetch(url, options);
    }

    const marriage_status = body[FIELDS.marriage_status];
    const spouse_send_email = body[FIELDS.spouse_send_email];
    const separate_taxform = body[FIELDS.separate_taxform];
    const afm_value = body[FIELDS.afm];
    const name_value = body[FIELDS.name];

    log('[FormSnippet] Condition values:');
    log('  marriage_status:', marriage_status, '(want: ΕΓΓΑΜΟΣ/Η, match:', marriage_status === 'ΕΓΓΑΜΟΣ/Η', ')');
    log('  spouse_send_email:', spouse_send_email, '(want: falsy, is falsy:', !spouse_send_email, ')');
    log('  separate_taxform:', separate_taxform, '(want: falsy, is falsy:', !separate_taxform, ')');
    log('  afm:', afm_value);
    log('  name:', name_value);

    if (marriage_status !== 'ΕΓΓΑΜΟΣ/Η') {
      log('[FormSnippet] Condition NOT met: marriage_status mismatch, passing through');
      return _orig_fetch(url, options);
    }
    if (spouse_send_email) {
      log('[FormSnippet] Condition NOT met: spouse_send_email is set, passing through');
      return _orig_fetch(url, options);
    }
    if (separate_taxform) {
      log('[FormSnippet] Condition NOT met: separate_taxform is set, passing through');
      return _orig_fetch(url, options);
    }

    log('[FormSnippet] All conditions met! Submitting via intercepted fetch...');

    try {
      log('[FormSnippet] Calling _orig_fetch...');
      const response = await _orig_fetch(url, options);
      log('[FormSnippet] Got response, status:', response.status);

      const response_data = await response.clone().json();
      log('[FormSnippet] Response data:', response_data);

      if (response_data.type === 'success') {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.includes('pending-submission')) {
            localStorage.removeItem(k);
            log('[FormSnippet] Cleared localStorage key:', k);
          }
        }
        const base_url = window.location.pathname;
        const redirect_url = `${base_url}?${FIELDS.incoming_afm}=${encodeURIComponent(afm_value)}&${FIELDS.marriage_status}=${encodeURIComponent(marriage_status)}&${FIELDS.is_spouse}=true&${FIELDS.name_spouse}=${encodeURIComponent(name_value ?? '')}`;
        log('[FormSnippet] Success! Redirecting to:', redirect_url);
        window.location.href = redirect_url;
        return new Promise(() => {});
      }

      log('[FormSnippet] Response was not success type:', response_data.type, '- passing response back');
      return response;
    } catch (err) {
      error('[FormSnippet] Error during intercepted submit:', err);
      log('[FormSnippet] Falling back to plain fetch');
      return _orig_fetch(url, options);
    }
  };

  log('[FormSnippet] Fetch interceptor installed. Watching all fetch calls.');
})();
