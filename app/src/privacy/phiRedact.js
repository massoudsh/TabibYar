/**
 * Redaction helpers for Persian clinical text (PHI / PII).
 * Synthetic-eval oriented: national ID (کد ملی), mobile, and common name labels.
 */

const NATIONAL_ID_RE = /\b\d{10}\b/g;
const IR_MOBILE_RE = /\b09\d{9}\b/g;
const LABELED_NAME_RE =
  /(?:نام(?:\s*و\s*نام\s*خانوادگی)?|بیمار|مراجع)\s*[:：]\s*[^\n,،]{2,40}/gi;

/**
 * @param {string} text
 * @returns {{ redacted: string, findings: Array<{ type: string, match: string }> }}
 */
export function redactPhi(text) {
  if (typeof text !== 'string') {
    return { redacted: '', findings: [] };
  }

  const findings = [];
  let redacted = text;

  redacted = redacted.replace(NATIONAL_ID_RE, (match) => {
    findings.push({ type: 'national_id', match });
    return '[REDACTED_NATIONAL_ID]';
  });

  redacted = redacted.replace(IR_MOBILE_RE, (match) => {
    findings.push({ type: 'mobile', match });
    return '[REDACTED_MOBILE]';
  });

  redacted = redacted.replace(LABELED_NAME_RE, (match) => {
    findings.push({ type: 'labeled_name', match });
    return match.replace(/[:：].+$/, ': [REDACTED_NAME]');
  });

  return { redacted, findings };
}

/**
 * True when redacted output still contains high-risk raw patterns.
 * @param {string} text
 */
export function hasResidualPhi(text) {
  // Avoid /g lastIndex pitfalls on shared RegExp instances.
  return /\b\d{10}\b/.test(text) || /\b09\d{9}\b/.test(text);
}
