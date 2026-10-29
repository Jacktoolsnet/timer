"""Run: python3 -m unittest discover -s scripts -p 'test_package_dist.py'."""
from pathlib import Path
import json
import tempfile
import unittest
import zipfile
from importlib.util import module_from_spec, spec_from_file_location

spec = spec_from_file_location('package_dist', Path(__file__).with_name('package-dist.py'))
module = module_from_spec(spec)
spec.loader.exec_module(module)


class PackageDistTests(unittest.TestCase):
    def test_includes_server_files_at_archive_root_and_replaces_previous_archive(self):
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp) / 'dist'
            (dist / '_astro').mkdir(parents=True)
            (dist / '.well-known').mkdir()
            (dist / 'empty').mkdir()
            files = {'index.html': '<h1>Test</h1>', '.htaccess': 'RewriteEngine On',
                     '_astro/app.js': 'console.log(1)', '.well-known/example.txt': 'ok',
                     'download.zip': 'An application asset, not our deployment ZIP',
                     'Grüße.txt': 'UTF-8 content'}
            for name, content in files.items():
                (dist / name).write_text(content, encoding='utf-8')
            for _ in range(2):
                result = module.package_dist(dist, 'test')
                with zipfile.ZipFile(result) as archive:
                    self.assertIsNone(archive.testzip())
                    self.assertEqual(set(archive.namelist()), set(files) | {'_astro/', '.well-known/', 'empty/'})
                    for name, content in files.items():
                        self.assertEqual(archive.read(name).decode('utf-8'), content)
                    self.assertNotIn('test-deploy.zip', archive.namelist())
            self.assertEqual(list(dist.parent.glob('.*-deploy-*.tmp')), [])

    def test_requires_successful_build(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                module.package_dist(Path(tmp), 'test')

    def test_refuses_symlinks(self):
        with tempfile.TemporaryDirectory() as tmp:
            dist = Path(tmp)
            (dist / 'index.html').write_text('ok')
            (dist / 'link').symlink_to(dist / 'index.html')
            with self.assertRaises(ValueError):
                module.package_dist(dist, 'test')

    def test_build_all_packages_the_same_projects_after_successful_builds(self):
        launch = json.loads((module.ROOT / '.vscode/launch.json').read_text())
        command = next(item['command'] for item in launch['configurations'] if item['name'] == 'Build: Alle Seiten')
        self.assertTrue(command.endswith(' && python3 scripts/package-dist.py'))
        for project in module.PROJECTS:
            self.assertIn(f'npm --prefix {project} run build', command)


if __name__ == '__main__':
    unittest.main()
