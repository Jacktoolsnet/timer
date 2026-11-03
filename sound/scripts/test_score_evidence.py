"""Regression tests for the offline evidence checker; fixtures stay in /tmp."""
import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('evidence', Path(__file__).with_name('check-score-evidence.py'))
EVIDENCE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EVIDENCE)


class ScoreEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.docs = Path(self.temp.name) / 'docs'
        shutil.copytree(EVIDENCE.DOCS, self.docs)
        self.manifest = self.docs / 'sources/coffeehouse/manifest.json'

    def mutate_manifest(self, edit):
        data = json.loads(self.manifest.read_text())
        edit(data['records'][0])
        self.manifest.write_text(json.dumps(data))

    def test_checked_in_evidence(self):
        self.assertEqual(EVIDENCE.check(), [])

    def test_changed_pdf_rejected(self):
        pdf = self.docs / 'sources/coffeehouse/schumann-edition-extract.pdf'
        pdf.write_bytes(pdf.read_bytes() + b'changed')
        self.assertTrue(any('SHA-256 mismatch' in e for e in EVIDENCE.check(self.docs)))

    def test_missing_pdf_rejected(self):
        (self.docs / 'sources/coffeehouse/schumann-edition-extract.pdf').unlink()
        self.assertTrue(EVIDENCE.check(self.docs))

    def test_page_mismatch_rejected(self):
        self.mutate_manifest(lambda r: r['scoreLocation'].update(pdfPage=99))
        self.assertTrue(any('page mapping' in e for e in EVIDENCE.check(self.docs)))

    def test_path_escape_rejected(self):
        self.mutate_manifest(lambda r: r['evidencePdf'].update(path='../../library-expansion-plan.json'))
        self.assertTrue(any('unsafe evidence path' in e for e in EVIDENCE.check(self.docs)))

    def test_unready_publication_rejected(self):
        path = self.docs / 'library-expansion-plan.json'
        plan = json.loads(path.read_text())
        tracks = next(s['tracks'] for s in plan['styles'] if s['style'] == 'coffeehouse')
        tracks[0]['production']['catalogPublished'] = True
        path.write_text(json.dumps(plan))
        self.assertTrue(any('unready source published' in e for e in EVIDENCE.check(self.docs)))


if __name__ == '__main__':
    unittest.main()
