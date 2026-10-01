"""Reject incomplete, changed, ungrounded or schema-incompatible draft datasets."""
import hashlib
import json
import re
import unicodedata
from pathlib import Path

from build_dataset import DEST, ROOT, SOURCE_SHA, build, key
from extract_law import extract

LIMITS = {
 'van_ban':dict(so_hieu=100,tieu_de=500,co_quan_ban_hanh=255,lien_ket_nguon=2048,duong_dan_tep=500),
 'dieu_khoan':dict(chuong=100,so_dieu=10,so_khoan=10,ky_hieu_diem=10,tieu_de=500),
 'tu_khoa':dict(cum_tu=191),
}


def check(condition, message):
    if not condition: raise ValueError(message)


def validate(bundle, canonical):
    # Full reconstruction is also the field/key allowlist. No silently dropped columns.
    expected, expected_canonical, counts = build(extract(write=False))
    check(bundle == expected, 'Dataset differs from reproducible pinned source/annotations')
    check(canonical == expected_canonical, 'Canonical hierarchy changed')
    check(counts == dict(van_ban=1,chuong=8,dieu=45,khoan=207,diem=282,doan_goc=494,
                        dieu_khoan=434,tu_khoa=60,dieu_khoan_tu_khoa=1326,quy_dinh=434), 'Inventory changed')
    check(hashlib.sha256((ROOT/bundle['van_ban']['duong_dan_tep']).read_bytes()).hexdigest()==SOURCE_SHA,'PDF hash')
    provisions={r['khoa']:r for r in bundle['dieu_khoan']}
    keywords={r['khoa']:r for r in bundle['tu_khoa']}
    check(len(provisions)==434 and len(keywords)==60,'Duplicate keys')
    check(len({r['du_lieu']['cum_tu'].casefold() for r in keywords.values()})==60,'Duplicate keyword')
    for table in ('van_ban','dieu_khoan','tu_khoa','quy_dinh'):
        rows=[bundle[table]] if table=='van_ban' else [r['du_lieu'] for r in bundle[table]]
        for fields in rows:
            for name,value in fields.items():
                if not isinstance(value,str): continue
                check(value==unicodedata.normalize('NFC',value),f'{table}.{name} not NFC')
                check(not re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\ufffd]',value),'Invalid control character')
                check(len(value)<=LIMITS.get(table,{}).get(name,16777215),f'{table}.{name} too long')
                if name in ('hanh_vi','chu_the','doi_tuong','dieu_kien','ngoai_le','trich_nguyen_van','dinh_nghia'):
                    check(len(value.encode('utf-8'))<=65535,f'{table}.{name} TEXT byte limit')
                check(not re.search(r'[;.:]Hướng dẫn|Hiệu lực: Đã biết',value),'Web UI contamination')
    for row in provisions.values():
        fields,source=row['du_lieu'],row['nguon']
        check(fields['trang_nguon']==min(source['trang_pdf']) and max(source['trang_pdf'])<=37,'Wrong page')
        check(fields['noi_dung']=='\n'.join(source['doan_ngu_canh']+source['doan_noi_dung']),'Context lost')
        check(row['khoa']==key(fields['so_dieu'],fields['so_khoan'],fields['ky_hieu_diem']),'Locator mismatch')
    for row in keywords.values():
        ref=row['dieu_khoan_dinh_nghia']
        if ref:
            check(row['du_lieu']['dinh_nghia'] in provisions[ref]['du_lieu']['noi_dung'],'Ungrounded definition')
    pairs=[(r['dieu_khoan'],r['tu_khoa']) for r in bundle['dieu_khoan_tu_khoa']]
    check(len(pairs)==len(set(pairs)),'Duplicate relationship')
    check(all(a in provisions and b in keywords for a,b in pairs),'Missing FK')
    for row in bundle['quy_dinh']:
        p=provisions[row['dieu_khoan']]['du_lieu']
        check(row['du_lieu']['trich_nguyen_van'] in p['noi_dung'],'Ungrounded quote')
    # Regression cases independently anchored to the visually inspected scan.
    check('Bộ trưởng Bộ Quốc phòng' in provisions[key(20,4,'b')]['du_lieu']['noi_dung'],'Lost d20 k4 b continuation')
    check('Bộ trưởng Bộ Quốc phòng' not in provisions[key(20,4,'c')]['du_lieu']['noi_dung'],'Continuation attached to wrong point')
    check('phải đặt chi nhánh' in provisions[key(25,3)]['du_lieu']['noi_dung'],'Lost d25 continuation')
    check('Ban Cơ yếu Chính phủ giúp' in provisions[key(27,6)]['du_lieu']['noi_dung'],'Lost d27 continuation')
    check('Bộ Quốc phòng, Ban Cơ yếu Chính phủ' in provisions[key(33,2)]['du_lieu']['noi_dung'],'Lost d33 continuation')
    check(provisions[key(43,16)]['du_lieu']['thu_tu']<provisions[key(43,17)]['du_lieu']['thu_tu'],'Web-export ordering error')
    for a,c,p,phrase in [(25,2,'a','chậm nhất là 03 giờ'),(25,2,'b','chậm nhất là 06 giờ'),
                       (34,2,'','trừ các cá nhân'),(38,1,'','tối thiểu 15%'),(45,1,'','12 tháng')]:
        check(phrase in provisions[key(a,c,p)]['du_lieu']['noi_dung'],'Lost time/condition/exception')
    return counts


def main():
    bundle=json.loads((DEST/'du-lieu-nap.json').read_text(encoding='utf-8'))
    canonical=json.loads((DEST/'toan-van-cau-truc.json').read_text(encoding='utf-8'))
    counts=validate(bundle,canonical)
    manifest=json.loads((DEST/'manifest.json').read_text(encoding='utf-8'))
    for name,digest in manifest['tep'].items():
        check(name in ('du-lieu-nap.json','toan-van-cau-truc.json','ai-chunks.jsonl'),'Unknown file')
        check(hashlib.sha256((DEST/name).read_bytes()).hexdigest()==digest,'File hash changed')
    chunks=[json.loads(l) for l in (DEST/'ai-chunks.jsonl').read_text(encoding='utf-8').splitlines()]
    check(len(chunks)==434 and len({c['id'] for c in chunks})==434,'Chunk duplicates/missing')
    check(all(c['duoc_phuc_vu'] is False and c['trang_thai']=='draft' for c in chunks),'Premature publication')
    report={'ket_qua':'PASS','thong_ke':counts,'bo_kiem_tra':'rebuild/schema/FK/quotes/pages/Unicode/continuations/hashes/draft',
            'gioi_han':'Không chứng nhận hiệu lực hợp nhất hay độ chính xác AI.'}
    (DEST/'kiem-tra.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))


if __name__=='__main__': main()
