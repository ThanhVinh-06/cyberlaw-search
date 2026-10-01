"""Offline development evaluation. Draft corpus is read ONLY here, never served."""
import json
from pathlib import Path
from retriever import retrieve, VERSION

ROOT=Path(__file__).resolve().parents[2]
rows=[json.loads(x) for x in (ROOT/'data/processed/luat-116-2025-v1/ai-chunks.jsonl').read_text(encoding='utf-8').splitlines()]
chunks=[dict(id=r['id'],title=r['tieu_de'],text=r['noi_dung'],article=r['so_dieu'],clause=r['so_khoan'],point=r['ky_hieu_diem']) for r in rows]
cases=[json.loads(x) for x in (ROOT/'data/evaluation/luat-116-phat-trien-v1.jsonl').read_text(encoding='utf-8').splitlines()]
results=[]
for case in cases:
    result=retrieve(case['cau_hoi'],chunks)
    expected=set(case.get('can_cu',[]))
    found=set(result['ids'])
    results.append({'id':case['id'],'status':result['status'],'ids':result['ids'],
        'hit':bool(expected & found) if expected else result['status']=='no_basis',
        'recall':len(expected & found)/len(expected) if expected else None})
print(json.dumps({'engine':VERSION,'split':'development (not independent test)',
    'cases':results,'hits':sum(r['hit'] for r in results),'total':len(results),
    'mean_recall':sum(r['recall'] for r in results if r['recall'] is not None)/sum(r['recall'] is not None for r in results)},ensure_ascii=False,indent=2))
