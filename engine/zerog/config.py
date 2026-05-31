import os

DEFAULT_GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

GITHUB_REPO = "https://github.com/NIkhil-cmd-cmd/ZeroG"
PUBLIC_WEB_URL = os.environ.get("ZEROG_WEB_URL", "https://web-pi-nine-22.vercel.app")
PUBLIC_ENGINE_URL = os.environ.get(
    "ZEROG_PUBLIC_URL",
    os.environ.get("RAILWAY_PUBLIC_DOMAIN", "http://localhost:8000"),
)
if PUBLIC_ENGINE_URL and not PUBLIC_ENGINE_URL.startswith("http"):
    PUBLIC_ENGINE_URL = f"https://{PUBLIC_ENGINE_URL}"
