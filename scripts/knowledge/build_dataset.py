"""Build a reproducible draft of the original 116/2025/QH15 edition.

No database access, network requests, inferred deadlines or legal paraphrases.
Source paragraphs are retained, including continuations after a point marker.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import unicodedata

from extract_law import ROOT, OUT, SOURCE_SHA, normalized

DEST = ROOT / 'data/processed/luat-116-2025-v1'
PDF_URL = 'https://congbaocdn.chinhphu.vn/180507251028987904/2026/1/23/116signed-1769163678477753319408.pdf'
PAGE_URL = 'https://congbao.chinhphu.vn/van-ban/luat-so-116-2025-qh15-468678/61574.htm'
PREFIX = '116-2025-qh15'
LETTERS = list('abcdđeghiklmnopqrstuvxy')
# One primary navigation label per clause, manually selected from the original text.
# This is NOT a machine-executable legal inference rule or exhaustive semantic analysis.
TYPES = {
 '1':'oo','2':'o'*23,'3':'ooooo','4':'ooooo','5':'ma','6':'ooa','7':'p'*8,
 '8':'oa','9':'oobaa','10':'bmbbba','11':'baaa','12':'sobaa','13':'oooo',
 '14':'babba','15':'obbaaa','16':'rbbbbb','17':'bbbba','18':'obma','19':'bbbaaa',
 '20':'obms','21':'oma','22':'omba','23':'mb','24':'ob','25':'pbba','26':'oma',
 '27':'ossaaa','28':'ooa','29':'bba','30':'oa','31':'oob','32':'ooo','33':'oa',
 '34':'bbaaa','35':'obb','36':'or','37':'omoa','38':'bb','39':'aaaaaa','40':'bb',
 '41':'b'*7,'42':'b'*4,'43':'o'*17,'44':'ee','45':'eee',
}
TYPE_NAMES = dict(o='other', m='measure', a='authority', p='prohibition',
                  b='obligation', s='procedure', r='right', e='effectiveness')
# Verbatim subjects from headings / clause lead-ins, never guessed from a search hit.
SUBJECTS = {
 '11.1':'Chủ quản hệ thống thông tin quan trọng về an ninh quốc gia',
 '11.2':'Bộ Công an','16.1':'Trẻ em',
 '16.3':'Chủ quản hệ thống thông tin, doanh nghiệp cung cấp dịch vụ trên mạng viễn thông, mạng Internet, các dịch vụ giá trị gia tăng trên không gian mạng',
 '25.2':'Doanh nghiệp trong nước và nước ngoài',
 '27.4':'Bộ Công an','29.2':'Doanh nghiệp kinh doanh sản phẩm, dịch vụ an ninh mạng',
 '40.1':'Chủ quản hệ thống thông tin',
 '41.*':'doanh nghiệp cung cấp dịch vụ trên không gian mạng',
 '42.*':'cơ quan, tổ chức, cá nhân sử dụng không gian mạng',
}


def write_json(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')


def key(article, clause='', point=''):
    return f'{PREFIX}:d{article}' + (f':k{clause}' if clause else '') + (f':p{point}' if point else '')


def group_article(article):
    intro, clauses = [], []
    for para in article['paragraphs']:
        c = re.match(r'^(\d+)\. ', para['text'])
        p = re.match(r'^([a-zđ])\) ', para['text'])
        if c:
            clauses.append({'so_khoan':c[1], 'lead':[para], 'points':[]})
        elif p:
            assert clauses, 'Point without clause'
            clauses[-1]['points'].append({'ky_hieu_diem':p[1], 'paragraphs':[para]})
        elif not clauses:
            intro.append(para)
        elif clauses[-1]['points']:
            # Reviewed exception: the second paragraph in d20 k4 b belongs to b.
            clauses[-1]['points'][-1]['paragraphs'].append(para)
        else:
            clauses[-1]['lead'].append(para)
    assert [int(c['so_khoan']) for c in clauses] == list(range(1,len(clauses)+1))
    assert len(TYPES[article['so_dieu']]) == len(clauses)
    restored = list(intro)
    for c in clauses:
        assert [p['ky_hieu_diem'] for p in c['points']] == LETTERS[:len(c['points'])]
        restored.extend(c['lead'])
        for p in c['points']: restored.extend(p['paragraphs'])
    assert restored == article['paragraphs'], 'Paragraph lost, duplicated, or reordered'
    return intro, clauses


def unaccented(text):
    return ''.join(c for c in unicodedata.normalize('NFD', text.lower().replace('đ','d'))
                   if unicodedata.category(c) != 'Mn')


def build(source=None):
    source = source or json.loads((OUT/'extracted.json').read_text(encoding='utf-8'))
    assert source['source_sha256'] == SOURCE_SHA
    provisions, canonical, rules, keywords, links = [], [], [], [], []
    total_clauses = total_points = 0
    for article in source['articles']:
        a = article['so_dieu']
        intro, clauses = group_article(article)
        total_clauses += len(clauses)
        canonical.append(dict(article, cau_truc={'cau_dan':intro, 'khoan':clauses}))
        for clause in clauses:
            c = clause['so_khoan']
            total_points += len(clause['points'])
            for point in clause['points'] or [None]:
                letter = point['ky_hieu_diem'] if point else ''
                own = point['paragraphs'] if point else clause['lead']
                context = intro + (clause['lead'] if point else [])
                parts = context + own
                text = '\n'.join(p['text'] for p in parts)
                location = key(a,c,letter)
                pages = sorted({l['page'] for p in parts for l in p['lines']})
                fields = dict(chuong='Chương '+article['chuong'], so_dieu=a, so_khoan=c,
                              ky_hieu_diem=letter, tieu_de=article['tieu_de'], noi_dung=text,
                              trang_nguon=pages[0], thu_tu=len(provisions)+1)
                provisions.append({'khoa':location, 'du_lieu':fields, 'nguon':{
                    'trang_pdf':pages, 'trang_cong_bao':[n+3 for n in pages],
                    'trang_noi_dung_chinh':own[0]['lines'][0]['page'],
                    'doan_ngu_canh':[p['text'] for p in context],
                    'doan_noi_dung':[p['text'] for p in own],
                    'vi_tri_dong':[l for p in parts for l in p['lines']],
                    'sha256_noi_dung':hashlib.sha256(text.encode()).hexdigest(),
                    'khoa_dieu':key(a), 'khoa_khoan':key(a,c),
                    'pham_vi':'sua_luat_khac' if a=='43' else 'luat_116_ban_goc',
                }})
                subject = SUBJECTS.get(f'{a}.{c}', SUBJECTS.get(f'{a}.*'))
                if subject:
                    assert subject.casefold() in (article['tieu_de']+' '+text).casefold()
                rules.append({'khoa':location+':qd', 'dieu_khoan':location, 'du_lieu':{
                    'loai_quy_dinh':TYPE_NAMES[TYPES[a][int(c)-1]], 'chu_the':subject,
                    # Preserve the whole unit; don't pretend to have parsed every legal condition.
                    'hanh_vi':text, 'doi_tuong':None, 'dieu_kien':None, 'ngoai_le':None,
                    'trich_nguyen_van':'\n'.join(p['text'] for p in own),
                }})
                if a=='2':
                    definition = re.sub(r'^\d+\. ', '', own[0]['text'])
                    term = definition.split(' là ',1)[0]
                    assert term != definition
                    keywords.append({'khoa':'tk:'+unaccented(term).replace(' ','-'),
                        'dieu_khoan_dinh_nghia':location,
                        'du_lieu':{'cum_tu':term,'bien_the':[unaccented(term)],'dinh_nghia':definition}})
    # Additional exact keyphrases. These are search terms, not invented legal definitions.
    terms = [
        'bảo vệ dữ liệu cá nhân','bí mật nhà nước','bí mật cá nhân','đời sống riêng tư',
        'quyền trẻ em','xâm hại trẻ em','thông tin sai sự thật','tin giả','giả mạo',
        'định danh địa chỉ IP','cấp độ an ninh mạng','giám sát an ninh mạng',
        'kiểm tra an ninh mạng','thẩm định an ninh mạng','hệ thống thông tin quan trọng về an ninh quốc gia',
        'lưu trữ dữ liệu','giấy phép kinh doanh','bảo mật thông tin','chứng nhận hợp quy',
        'lỗ hổng bảo mật','xung đột thông tin','mật mã cơ yếu','dữ liệu cá nhân',
        'cơ sở hạ tầng không gian mạng quốc gia','lực lượng chuyên trách bảo vệ an ninh mạng',
        'Bộ Công an','Bộ Quốc phòng','Ban Cơ yếu Chính phủ','Ủy ban nhân dân cấp tỉnh',
        'chuyển đổi số','ngân sách nhà nước','trách nhiệm hình sự','bồi thường thiệt hại',
        'hiệu lực thi hành','điều khoản chuyển tiếp','hợp tác quốc tế','tài khoản ngân hàng',
    ]
    for term in terms:
        keywords.append({'khoa':'tk:'+unaccented(term).replace(' ','-'),
            'dieu_khoan_dinh_nghia':None,
            'du_lieu':{'cum_tu':term,'bien_the':[unaccented(term)],'dinh_nghia':None}})
    for keyword in keywords:
        pattern = re.compile(r'(?<!\w)'+re.escape(keyword['du_lieu']['cum_tu'])+r'(?!\w)', re.I)
        hits = []
        for row in provisions:
            f = row['du_lieu']
            if pattern.search(f['tieu_de']+'\n'+f['noi_dung']):
                hits.append({'dieu_khoan':row['khoa'],'tu_khoa':keyword['khoa']})
        assert hits, 'Ungrounded keyphrase: '+keyword['du_lieu']['cum_tu']
        links.extend(hits)
    document = {'so_hieu':'116/2025/QH15','tieu_de':'Luật An ninh mạng',
        'co_quan_ban_hanh':'Quốc hội','ngay_ban_hanh':'2025-12-10','ngay_hieu_luc':'2026-07-01',
        'ngay_het_hieu_luc':None,'lien_ket_nguon':PAGE_URL,
        'duong_dan_tep':'data/raw/laws/2025/official/116-2025-qh15-congbao.pdf',
        'phien_ban_noi_dung':1,'trang_thai':'draft'}
    bundle = {'dinh_dang':1,'phien_ban':'116-2025-ban-goc-v1','source_sha256':SOURCE_SHA,
        'van_ban':document,'dieu_khoan':provisions,'tu_khoa':keywords,
        'dieu_khoan_tu_khoa':links,'quy_dinh':rules}
    counts = {'van_ban':1,'chuong':len(source['chapters']),'dieu':len(canonical),'khoan':total_clauses,
        'diem':total_points,'doan_goc':sum(len(a['paragraphs']) for a in canonical),
        **{k:len(bundle[k]) for k in ('dieu_khoan','tu_khoa','dieu_khoan_tu_khoa','quy_dinh')}}
    return bundle, dict(source, articles=canonical), counts


def main():
    bundle, canonical, counts = build()
    DEST.mkdir(parents=True, exist_ok=True)
    write_json(DEST/'du-lieu-nap.json', bundle)
    write_json(DEST/'toan-van-cau-truc.json', canonical)
    chunks=[]
    for row in bundle['dieu_khoan']:
        f=row['du_lieu']
        chunks.append({'id':row['khoa'],'phien_ban':bundle['phien_ban'],'source_sha256':SOURCE_SHA,
            'duoc_phuc_vu':False,'trang_thai':'draft','van_ban':bundle['van_ban']['so_hieu'],
            'chuong':f['chuong'],'so_dieu':f['so_dieu'],'so_khoan':f['so_khoan'],'ky_hieu_diem':f['ky_hieu_diem'],
            'tieu_de':f['tieu_de'],'noi_dung':f['noi_dung'],'nguon':row['nguon'],'url':PDF_URL,
            'yeu_cau_ngu_canh':'Luôn kiểm tra toàn khoản/toàn điều và dẫn chiếu trước khi suy luận.'})
    (DEST/'ai-chunks.jsonl').write_text(''.join(json.dumps(x,ensure_ascii=False)+'\n' for x in chunks),encoding='utf-8',newline='\n')
    manifest={'phien_ban':bundle['phien_ban'],'trang_thai':'draft','nguon':PDF_URL,
        'source_sha256':SOURCE_SHA,'thong_ke':counts,'ngay_doi_chieu':'2026-09-30',
        'pham_vi':'Nguyên bản ban hành 10/12/2025; chưa phải văn bản hợp nhất hiện hành.',
        'gioi_han':['Phân loại quy định phục vụ điều hướng; chưa phải bộ luật suy diễn đầy đủ.',
            'NULL ở trường ngữ nghĩa có nghĩa chưa tách riêng; phải đọc nguyên văn, không suy ra không có điều kiện/ngoại lệ.',
            'Cần xác minh lịch sử sửa đổi trước công bố là luật hiện hành; không trộn 2018 hoặc 143 vào kho mặc định.',
            'Từ khóa ngoài Điều 2 chỉ là cụm tìm kiếm có xuất hiện trong nguồn; biến thể không dấu không phải định nghĩa/đồng nghĩa pháp lý.'],
        'tep':{name:hashlib.sha256((DEST/name).read_bytes()).hexdigest() for name in
            ['du-lieu-nap.json','toan-van-cau-truc.json','ai-chunks.jsonl']}}
    write_json(DEST/'manifest.json',manifest)
    print(json.dumps(counts))


if __name__=='__main__': main()
