"""Local setuptools hook — pip install -r requirements.txt runs this once."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from setuptools import setup
from setuptools.command.install import install
from setuptools.command.develop import develop

ROOT = Path(__file__).resolve().parent.parent


def _provision_ephemeris() -> None:
    script = ROOT / "scripts" / "install_ephemeris.py"
    if not script.is_file():
        print(
            f"ephemeris_provision: skip — {script} not found (wrong install cwd?)",
            file=sys.stderr,
        )
        return
    subprocess.check_call(
        [sys.executable, str(script), "--extended"],
        cwd=str(ROOT),
    )


class InstallWithEphemeris(install):
    def run(self) -> None:
        install.run(self)
        # bdist_wheel runs "install" into a staging tree (self.root set); only
        # provision on a real target environment install.
        if self.root is None:
            _provision_ephemeris()


class DevelopWithEphemeris(develop):
    def run(self) -> None:
        develop.run(self)
        _provision_ephemeris()


setup(
    cmdclass={
        "install": InstallWithEphemeris,
        "develop": DevelopWithEphemeris,
    },
)
