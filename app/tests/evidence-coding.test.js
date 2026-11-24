import test from 'node:test';
import assert from 'node:assert/strict';
import { linkEvidence, splitSentences } from '../src/services/evidence.js';
import { suggestCodes } from '../src/services/coding.js';
import { DEMO_PATIENTS } from '../src/db/demo/patients.js';

test('splitSentences keeps meaningful Persian sentences', () => {
  const sentences = splitSentences('بیمار سرفه دارد. تب ندارد؟ آزمایش قند ناشتا انجام شود؛ بی‌حسی پا.');
  assert.equal(sentences.length, 4);
  assert.equal(sentences[0], 'بیمار سرفه دارد');
  assert.ok(splitSentences('').length === 0);
  assert.ok(splitSentences(null).length === 0);
});

test('linkEvidence links each section to the closest raw-input sentence', () => {
  const rawInput = [
    'بیمار از دو هفته پیش سرفه خشک شبانه دارد و خس‌خس سینه.',
    'بیمار سابقه دیابت نوع دو با متفورمین دارد.',
    'قند ناشتا ۱۴۰ و HbA1c هفت درصد.',
    'برنامه: ادامه متفورمین و پیگیری سه هفته بعد.',
  ].join(' ');
  const note = {
    history: 'سرفه خشک شبانه و خس‌خس سینه',
    findings: 'قند ناشتا ۱۴۰',
    treatment_plan: 'ادامه متفورمین و پیگیری',
    patient_summary: 'شمارهٔ تلفن ۰۹۱۲',
  };
  const evidence = linkEvidence({ rawInput, note });
  assert.equal(evidence.history.sentenceIndex, 0);
  assert.equal(evidence.findings.sentenceIndex, 2);
  assert.equal(evidence.treatment_plan.sentenceIndex, 3);
  assert.equal(evidence.patient_summary, undefined, 'no weak link is better than a wrong one');
  assert.match(evidence.history.quote, /سرفه/);
  assert.deepEqual(linkEvidence({}), {});
});

test('suggestCodes ranks documented conditions and never invents codes', () => {
  const note = {
    history: 'بیمار سابقه دیابت با متفورمین دارد',
    findings: 'قند ناشتا بالا، HbA1c هشت',
    treatment_plan: 'ادامه متفورمین',
    medications: [{ name: 'متفورمین' }],
  };
  const suggestions = suggestCodes(note);
  assert.equal(suggestions[0].code, 'E11.9');
  assert.ok(suggestions[0].matched.length >= 3);
  assert.ok(suggestions.length <= 4);
  for (const suggestion of suggestions) assert.ok(suggestion.matched.length > 0);
  assert.deepEqual(suggestCodes({ history: 'بیمار سالم است و هیچ شکایتی ندارد' }), []);
  assert.deepEqual(suggestCodes(null), []);
  assert.deepEqual(suggestCodes({ history: 'دیابت' }, { limit: 0 }), []);
});

test('every demo patient with a draft gets at least one deterministic code suggestion', () => {
  const withNotes = DEMO_PATIENTS.filter(p => p.visits?.some(v => v.draft));
  assert.ok(withNotes.length > 0);
  for (const patient of withNotes) {
    const draft = patient.visits.find(v => v.draft).draft;
    const first = suggestCodes(draft).map(s => s.code);
    assert.deepEqual(suggestCodes(draft).map(s => s.code), first);
    assert.ok(first.length > 0, `no suggestion for ${patient.fullName}`);
  }
});
