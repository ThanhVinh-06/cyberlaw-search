"""Local extractive retrieval. No network, model downloads, tools, or database access.

Laravel supplies only a bounded published snapshot via stdin. This module returns
IDs, never invented legal text. Scores are relevance signals, not legal accuracy.

`confidence` (0-100) is a retrieval-evidence signal only: how strongly the question
matched article/clause/point structure and keyword coverage. It is not a measure of
legal correctness and must never be presented as one.
"""
import json
import math
import re
import sys
import unicodedata
from collections import Counter

VERSION = 'lexical-v1'
STOP = set('la gi nao nhung cac cua va thi ma mot cho ve trong nay do duoc voi co can theo hay toi em anh xin hoi the nao'.split())


def normalize(value):
    value = unicodedata.normalize('NFD', value.lower().replace('đ', 'd'))
    return ' '.join(re.findall(r'[a-z0-9]+', ''.join(c for c in value if not unicodedata.combining(c))))


def features(value):
    words = normalize(value).split()
    return Counter([w for w in words if w not in STOP] +
                   [' '.join(words[i:i+n]) for n in (2, 3) for i in range(len(words)-n+1)])


def retrieve(question, chunks):
    q = normalize(question)
    # Product scope and unsupported requests, not a comprehensive injection detector.
    unsafe = ('bo qua', 'ignore previous', 'system prompt', 'api key', 'mat khau',
              'xoa tai khoan', 'hop nhat', 'hien hanh', 'hom nay', 'phat bao nhieu',
              'bao nhieu tien', 'may nam tu', 'bao nhieu nam tu')
    if any(x in q for x in unsafe):
        return {'status': 'no_basis', 'reason': 'unsupported', 'ids': [], 'confidence': 0, 'engine': VERSION}
    article = re.search(r'\bdieu\s+(\d{1,3})\b', q)
    clause = re.search(r'\bkhoan\s+(\d{1,3})\b', q)
    # Keep d and đ distinct in point identifiers before accent folding.
    point = re.search(r'\b(?:điểm|diem)\s+([a-zđ])\b', unicodedata.normalize('NFC', question.lower()))
    candidates = chunks
    if article:
        candidates = [c for c in chunks if c['article'] == str(int(article[1]))]
        if clause:
            candidates = [c for c in candidates if c['clause'] == str(int(clause[1]))]
        if point:
            candidates = [c for c in candidates if c['point'] == point[1]]
        if not candidates:
            return {'status': 'no_basis', 'reason': 'not_found', 'ids': [], 'confidence': 0, 'engine': VERSION}
        # Never present an incomplete requested article as a complete answer.
        if len(candidates) <= 4:
            return {'status': 'answered', 'reason': 'exact_reference', 'ids': [c['id'] for c in candidates],
                    'confidence': 95, 'engine': VERSION}
    if not candidates or len(q)<3:
        return {'status': 'no_basis', 'reason': 'not_found', 'ids': [], 'confidence': 0, 'engine': VERSION}
    docs = [features(c['title']+' '+c['text']) for c in candidates]
    df = Counter(t for doc in docs for t in doc)
    query = features(question)
    n = len(docs)
    idf = {t: math.log(1+(n-f+0.5)/(f+0.5)) for t,f in df.items()}
    avg = sum(sum(d.values()) for d in docs)/n
    ranked=[]
    for c,doc in zip(candidates,docs):
        length=sum(doc.values())
        score=sum(idf.get(t,0)*doc.get(t,0)*2.2/(doc.get(t,0)+1.2*(.25+.75*length/avg)) for t in query)
        title=normalize(c['title'])
        text=normalize(c['text'])
        # A definition's leading phrase is much more informative than ubiquitous words.
        definition = re.search(r'\b\d+\s+([a-z ]{3,100}?)\s+la\s', text)
        if c['article']=='2' and definition and definition[1] in q:
            score += 12+len(definition[1].split())*2
            if any(phrase in q for phrase in ('la gi', 'dinh nghia', 'the nao')):
                score += 40
        if 'hieu luc' in q and c['article']=='44': score+=10
        if 'doi tuong' in q and 'doi tuong' in title: score+=5
        singles={t for t in query if ' ' not in t and t not in {'luat','2025','116','qh15'}}
        coverage=len(singles & doc.keys())/max(1,len(singles))
        ranked.append((score,coverage,c))
    ranked.sort(key=lambda x:x[0],reverse=True)
    best=ranked[0]
    if not article and (best[0]<5 or best[1]<.45):
        return {'status':'no_basis','reason':'low_evidence','ids':[],'confidence':0,'engine':VERSION}
    selected=[c['id'] for score,coverage,c in ranked[:4] if score>=best[0]*.65 and (article or coverage>=.4)]
    # Coverage-based evidence signal, capped below certainty (88) and floored at 40.
    confidence=min(88, max(40, round(best[1]*100)))
    return {'status':'answered','reason':'relevant_excerpts','ids':selected,'confidence':confidence,'engine':VERSION}


def main():
    try:
        raw=sys.stdin.buffer.read(8*1024*1024+1)
        if len(raw)>8*1024*1024: raise ValueError()
        data=json.loads(raw)
        if not isinstance(data['question'],str) or not 1<=len(data['question'])<=1000: raise ValueError()
        chunks=data['chunks']
        if not isinstance(chunks,list) or len(chunks)>5000: raise ValueError()
        for c in chunks:
            if not all(isinstance(c.get(k),str) for k in ['id','title','text','article','clause','point']): raise ValueError()
        result=retrieve(data['question'],chunks)
        sys.stdout.buffer.write(json.dumps(result,ensure_ascii=False).encode('utf-8'))
    except Exception:
        # Never dump request contents or exception objects containing private input.
        sys.stderr.write('retrieval_failed\n')
        sys.exit(1)


if __name__=='__main__': main()
