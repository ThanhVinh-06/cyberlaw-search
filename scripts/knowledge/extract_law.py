"""Extract the pinned official PDF without changing legal words or punctuation."""
from pathlib import Path
import hashlib
import json
import re
import unicodedata

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'data/raw/laws/2025/official/116-2025-qh15-congbao.pdf'
OUT = ROOT / 'data/interim/verification/law116'
SOURCE_SHA = '8e19e14fd57666baec8f16b7ca2832cbf7f24030a5e6ee0c574e15d0d48ad971'


def normalized(text):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', text)).strip()


def extract(write=True):
    assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SOURCE_SHA, 'Source changed; review required'
    doc = pymupdf.open(SOURCE)
    assert len(doc) == 37
    lines = []
    for number, page in enumerate(doc, 1):
        current = []
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                text = normalized(''.join(span['text'] for span in line['spans']))
                # Printed gazette header and digital signature are above the body.
                if not text or line['bbox'][1] < 40:
                    continue
                spans = [s for s in line['spans'] if s['text'].strip()]
                current.append({'text': text, 'page': number, 'bbox': [round(v, 2) for v in line['bbox']],
                                'bold': all('Bold' in s['font'] for s in spans)})
        lines.extend(sorted(current, key=lambda x: (round(x['bbox'][1], 1), x['bbox'][0])))
    paragraphs = []
    for line in lines:
        # Official PDF: 121pt first-line indent, 85pt continuation. Bold headings can wrap.
        start = line['bbox'][0] > 110
        if paragraphs and line['bold'] and paragraphs[-1]['bold'] and not re.match(r'^(Điều \d+\.|Chương [IVX]+$)', line['text']):
            # Chapter titles are separate from the "Chương" line.
            start = bool(re.match(r'^Chương [IVX]+$', paragraphs[-1]['text']))
        if not paragraphs or start:
            paragraphs.append({'text': line['text'], 'bold': line['bold'], 'lines': [line]})
        else:
            paragraphs[-1]['text'] += ' ' + line['text']
            paragraphs[-1]['lines'].append(line)
    chapters, articles, preamble, ending = [], [], [], []
    current, chapter, finished = None, None, False
    for para in paragraphs:
        text = para['text']
        match = re.match(r'^Chương ([IVX]+)$', text)
        if match:
            chapter = {'so_chuong': match[1], 'tieu_de': '', 'trang': para['lines'][0]['page']}
            chapters.append(chapter)
            continue
        if chapter and not chapter['tieu_de']:
            chapter['tieu_de'] = text
            continue
        match = re.match(r'^Điều (\d+)\. (.+)$', text)
        if match and para['bold']:
            current = {'so_dieu': match[1], 'tieu_de': match[2], 'chuong': chapter['so_chuong'],
                       'heading': para, 'paragraphs': []}
            articles.append(current)
        elif text.startswith('Luật này được Quốc hội'):
            finished = True
            ending.append(para)
        elif finished:
            ending.append(para)
        elif current:
            current['paragraphs'].append(para)
        else:
            preamble.append(para)
    assert [int(a['so_dieu']) for a in articles] == list(range(1, 46)), 'Article boundary mismatch'
    assert [c['so_chuong'] for c in chapters] == ['I','II','III','IV','V','VI','VII','VIII']
    assert len(ending) >= 2
    result = {'source_sha256': SOURCE_SHA, 'chapters': chapters, 'articles': articles, 'preamble': preamble, 'ending': ending}
    if write:
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT/'extracted.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
        (OUT/'readable.txt').write_text('\n\n'.join(f"Điều {a['so_dieu']}. {a['tieu_de']}\n"+'\n'.join(p['text'] for p in a['paragraphs']) for a in articles)+'\n',encoding='utf-8')
        print(json.dumps({'articles': len(articles),'chapters':len(chapters),'paragraphs':sum(len(a['paragraphs']) for a in articles),'pymupdf':pymupdf.VersionBind}))
    return result


if __name__ == '__main__':
    extract()
