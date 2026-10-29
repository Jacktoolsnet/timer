#!/usr/bin/env python3
"""Create upload-ready ZIPs from completed static builds (standard library only).

Run from any directory: python3 scripts/package-dist.py [company timer ...]
Without arguments, package every project used by VS Code's Build: Alle Seiten.
"""
from pathlib import Path
import argparse
import os
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = ('company', 'timer', 'clock', 'metronome', 'stopwatch', 'breathe',
            'relax', 'calculator', 'scenescript', 'lava')
PROJECT_DIRS = {project: ROOT / project for project in PROJECTS}
# Optional neighboring website; intentionally not part of the default full build.
PROJECT_DIRS['messagedrop'] = ROOT.parent / 'messagedrop/platform/messagedrop'


def package_dist(dist: Path, project: str) -> Path:
    """Archive dist contents, including dotfiles; atomically replace an old ZIP."""
    if not dist.is_dir() or not (dist / 'index.html').is_file():
        raise ValueError(f'{project}: missing dist/index.html; build the project first')
    destination = dist / f'{project}-deploy.zip'
    # Snapshot before creating the temporary archive. Never include the previous ZIP.
    entries = sorted(path for path in dist.rglob('*') if path != destination)
    for path in entries:
        if path.is_symlink():
            raise ValueError(f'{project}: refusing to package a symbolic link: {path}')
    # Keep temporary output outside dist, including after an interrupted run.
    fd, temporary_name = tempfile.mkstemp(prefix=f'.{project}-deploy-', suffix='.tmp', dir=dist.parent)
    temporary = Path(temporary_name)
    os.close(fd)
    try:
        with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED,
                             compresslevel=9, strict_timestamps=False) as archive:
            for path in entries:
                archive.write(path, arcname=path.relative_to(dist).as_posix())
        # Publish only a completed, readable archive.
        with zipfile.ZipFile(temporary) as archive:
            if archive.testzip() is not None:
                raise ValueError(f'{project}: ZIP integrity check failed')
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('projects', nargs='*', help='Project names; default: all static tools')
    args = parser.parse_args()
    projects = list(dict.fromkeys(args.projects or PROJECTS))
    unknown = set(projects) - set(PROJECT_DIRS)
    if unknown:
        parser.error('Unknown projects: ' + ', '.join(sorted(unknown)))
    # Fail before packaging anything if a selected build is missing.
    for project in projects:
        if not (PROJECT_DIRS[project] / 'dist' / 'index.html').is_file():
            parser.error(f'{project}: missing dist/index.html; build the project first')
    for project in projects:
        print(f'{project}: ZIP wird erstellt …', flush=True)
        archive = package_dist(PROJECT_DIRS[project] / 'dist', project)
        print(f'{project}: {os.path.relpath(archive, ROOT)} ({archive.stat().st_size / 1024 / 1024:.2f} MiB)')


if __name__ == '__main__':
    main()
