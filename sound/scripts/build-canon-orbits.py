"""Backward-compatible entry point for the two source-preserving Canon banks."""
from pathlib import Path
import runpy


def build():
    builder = runpy.run_path(str(Path(__file__).with_name('build-library-orbits.py')))
    builder['build'](['classical-canon', 'house-canon'])


if __name__ == '__main__':
    build()
