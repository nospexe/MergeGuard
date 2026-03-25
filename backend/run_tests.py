import subprocess
import sys

result = subprocess.run(
    [sys.executable, 'tests/test_post_mortem.py'],
    cwd='.'
)

sys.exit(result.returncode)
