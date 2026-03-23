import pytest
import sys

if __name__ == "__main__":
    # Run pytest and exit with its return code
    # This ensures CI fails if tests fail
    sys.exit(pytest.main(["-v"]))
