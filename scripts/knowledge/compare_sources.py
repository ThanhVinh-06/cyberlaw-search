"""Produce a review list; never silently correct the pinned primary source."""
from pathlib import Path
import difflib
import json
import re
from extract_law import ROOT, OUT, normalized


def compare():
    official = json.loads((OUT/'extracted.json').read_text(encoding='utf-8'))
    text = (ROOT/'data/interim/extracted/luat-116-2025-web-export.txt').read_text(encoding='utf-8')
    lines = [normalized(x) for x in text.splitlines() if x.strip() and not re.match(r'^(--- PAGE |9/18/26,|https://luatvietnam.vn/)', x)]
    text = '\n'.join(lines)
    starts = list(re.finditer(r'^Điều (\d+)\. ', text, re.M))
    assert [int(m[1]) for m in starts] == list(range(1,46))
    differences=[]
    for i, article in enumerate(official['articles']):
        web = text[starts[i].start():starts[i+1].start() if i+1<len(starts) else len(text)]
        web = re.split(r'\nChương [IVX]+\n|\n_{3,}', web)[0]
        source = normalized(article['heading']['text']+' '+' '.join(p['text'] for p in article['paragraphs']))
        web = normalized(web)
        a,b=source.split(),web.split()
        ops = difflib.SequenceMatcher(a=a,b=b,autojunk=False).get_opcodes()
        for tag,i1,i2,j1,j2 in ops:
            if tag != 'equal':
                differences.append({'so_dieu':article['so_dieu'],'official':' '.join(a[i1:i2]),'web_export':' '.join(b[j1:j2]),'context_before':' '.join(a[max(0,i1-6):i1]),'context_after':' '.join(a[i2:i2+6])})
    (OUT/'source-differences.json').write_text(json.dumps(differences,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for d in differences: print(json.dumps(d,ensure_ascii=False))
    print('Differences:',len(differences))


if __name__ == '__main__': compare()
