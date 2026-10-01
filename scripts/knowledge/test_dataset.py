import copy
import json
import unittest
from build_dataset import ROOT, build, key, group_article
from validate_dataset import validate


class DatasetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle, cls.canonical, _ = build()

    def test_valid_source_and_all_fields(self):
        self.assertEqual(434, validate(self.bundle,self.canonical)['dieu_khoan'])

    def test_rejects_missing_duplicate_wrong_source_and_unapproved_fields(self):
        def missing(b): b['dieu_khoan'].pop()
        def duplicate(b): b['tu_khoa'].append(b['tu_khoa'][0])
        def foreign_key(b): b['quy_dinh'][0]['dieu_khoan']='not-a-source'
        def fabricated(b): b['quy_dinh'][0]['du_lieu']['trich_nguyen_van']='Tự thêm hình phạt'
        def publication(b): b['van_ban']['trang_thai']='published'
        def path(b): b['van_ban']['duong_dan_tep']='../../.env'
        def fields(b): b['van_ban']['ma_van_ban']=1
        def truncation(b): b['dieu_khoan'][0]['du_lieu']['noi_dung']='x'*16777216
        for mutate in [missing,duplicate,foreign_key,fabricated,publication,path,fields,truncation]:
            with self.subTest(case=mutate.__name__):
                b=copy.deepcopy(self.bundle)
                mutate(b)
                with self.assertRaises(ValueError): validate(b,self.canonical)

    def test_source_paragraphs_round_trip_all_articles(self):
        for article in self.canonical['articles']:
            group_article(article)

    def test_missing_clause_and_point_sequence_fail(self):
        a=copy.deepcopy(self.canonical['articles'][0])
        a['paragraphs'].pop(1)
        with self.assertRaises(AssertionError): group_article(a)
        a=copy.deepcopy(self.canonical['articles'][0])
        a['paragraphs'].pop(2)
        with self.assertRaises(AssertionError): group_article(a)

    def test_only_116_corpus_no_demo(self):
        self.assertTrue(all(r['khoa'].startswith('116-2025-qh15:') for r in self.bundle['dieu_khoan']))
        self.assertEqual(23, sum(k['dieu_khoan_dinh_nghia'] is not None for k in self.bundle['tu_khoa']))

    def test_development_questions_keep_real_source_quotes_and_are_not_a_test_score(self):
        rows=[json.loads(l) for l in (ROOT/'data/evaluation/luat-116-phat-trien-v1.jsonl').read_text(encoding='utf-8').splitlines()]
        sources={r['khoa']:r['du_lieu']['noi_dung'] for r in self.bundle['dieu_khoan']}
        self.assertEqual(28,len(rows))
        self.assertEqual(28,len({r['id'] for r in rows}))
        for row in rows:
            self.assertEqual('development',row['tap'])
            self.assertEqual([sources[k] for k in row['can_cu']],row['doan_doi_chieu'])


if __name__=='__main__': unittest.main()
