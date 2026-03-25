<<<<<<< HEAD
import sys
import pytest

if __name__ == "__main__":
    sys.exit(pytest.main(["-v", "backend/tests/"]))
=======
import subprocess
import sys

result = subprocess.run(
    [sys.executable, 'tests/test_post_mortem.py'],
    cwd='.'
)

sys.exit(result.returncode)
>>>>>>> 03f0d6388f049a12bd00d71a66aa6f3f9ff4eeb9
