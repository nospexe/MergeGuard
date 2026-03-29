import os
from dotenv import load_dotenv

load_dotenv()

CONVEX_URL = os.getenv("CONVEX_URL", "")

# Lazy-init: client is None when CONVEX_URL isn't configured
# (e.g. in CI, tests, or local-only mode).
client = None
if CONVEX_URL:
    from convex import ConvexClient
    client = ConvexClient(CONVEX_URL)
