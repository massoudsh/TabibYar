#!/usr/bin/env python3
"""Evaluate word error rate for Persian clinical STT transcripts."""

import argparse
import json
import re
import unicodedata
from pathlib import Path

PERSIAN_TRANSLATION = str.maketrans({
    'ي': 'ی', 'ك': 'ک', 'ى': 'ی', 'ة': 'ه',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
})


def normalize(text):
    text = unicodedata.normalize('NFKC', text).translate(PERSIAN_TRANSLATION)
    text = re.sub(r'[\u064b-\u065f\u0670]', '', text)
    return re.sub(r'[^\w]+', ' ', text.casefold()).strip().split()


def alignment(reference, hypothesis):
    previous = list(range(len(hypothesis) + 1))
    trace = [previous]
    for i, ref_word in enumerate(reference, start=1):
        current = [i]
        for j, hyp_word in enumerate(hypothesis, start=1):
            current.append(min(
                previous[j] + 1,
                current[j - 1] + 1,
                previous[j - 1] + (ref_word != hyp_word),
            ))
        trace.append(current)
        previous = current

    substitutions = deletions = insertions = 0
    i, j = len(reference), len(hypothesis)
    while i or j:
        if i and j and trace[i][j] == trace[i - 1][j - 1] and reference[i - 1] == hypothesis[j - 1]:
            i, j = i - 1, j - 1
        elif i and j and trace[i][j] == trace[i - 1][j - 1] + 1:
            substitutions += 1
            i, j = i - 1, j - 1
        elif i and trace[i][j] == trace[i - 1][j] + 1:
            deletions += 1
            i -= 1
        else:
            insertions += 1
            j -= 1
    return substitutions, deletions, insertions


def evaluate(samples):
    totals = {'reference_words': 0, 'substitutions': 0, 'deletions': 0, 'insertions': 0}
    for sample in samples:
        reference = normalize(sample['reference'])
        hypothesis = normalize(sample['hypothesis'])
        substitutions, deletions, insertions = alignment(reference, hypothesis)
        totals['reference_words'] += len(reference)
        totals['substitutions'] += substitutions
        totals['deletions'] += deletions
        totals['insertions'] += insertions
    if not totals['reference_words']:
        raise ValueError('At least one sample must contain a non-empty reference transcript.')
    errors = totals['substitutions'] + totals['deletions'] + totals['insertions']
    return {**totals, 'wer': round(errors / totals['reference_words'], 4)}


def main():
    parser = argparse.ArgumentParser(description='Calculate WER from JSONL clinical STT samples.')
    parser.add_argument('samples', type=Path, help='JSONL file with reference and hypothesis fields')
    parser.add_argument('--output', type=Path, help='Optional JSON results file')
    args = parser.parse_args()

    with args.samples.open(encoding='utf-8') as source:
        samples = [json.loads(line) for line in source if line.strip()]
    result = evaluate(samples)
    output = json.dumps(result, ensure_ascii=False, indent=2)
    print(output)
    if args.output:
        args.output.write_text(output + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
