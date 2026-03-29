import os
from convex import ConvexClient
from dotenv import load_dotenv

load_dotenv()

CONVEX_URL = os.getenv("CONVEX_URL")

if not CONVEX_URL:
    # Fallback to the user's provided URL if not in .env yet
    CONVEX_URL = "https://affable-crocodile-876.convex.cloud"

# Initialize the global Convex Client
client = ConvexClient(CONVEX_URL)
