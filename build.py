"""Build the Silverpost gallery from the photos committed to this repository."""

from html import escape
from pathlib import Path
from shutil import copyfile
import re
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
PHOTO_DIR = ROOT / "photos"
OUTPUT = ROOT / "_site"
PHOTO_NAME = re.compile(r"[a-z0-9][a-z0-9_-]*\.(jpg|jpeg|png|webp)", re.IGNORECASE)
MAX_BYTES = 10 * 1024 * 1024


def gallery_cards():
    entries = sorted(PHOTO_DIR.iterdir(), key=lambda path: path.name, reverse=True)
    photos = []
    captions = set()
    for entry in entries:
        if entry.name == ".gitkeep":
            continue
        if entry.is_symlink() or not entry.is_file():
            raise ValueError(f"Expected a regular file in photos/: {entry.name}")
        if entry.suffix == ".txt":
            captions.add(entry)
        elif PHOTO_NAME.fullmatch(entry.name):
            if entry.stat().st_size not in range(1, MAX_BYTES + 1):
                raise ValueError(f"Photo must be between 1 byte and 10 MB: {entry.name}")
            photos.append(entry)
        else:
            raise ValueError(f"Unsupported photo filename: {entry.name}")

    for caption in captions:
        if not any(photo.stem == caption.stem for photo in photos):
            raise ValueError(f"No matching photo for {caption.name}")

    for photo in photos:
        sidecar = photo.with_suffix(".txt")
        caption = sidecar.read_text(encoding="utf-8").strip() if sidecar in captions else ""
        if len(caption) > 1000:
            raise ValueError(f"Caption must be 1,000 characters or fewer: {sidecar.name}")
        src = "photos/" + quote(photo.name)
        alt = escape(caption, quote=True) if caption else "Shared photograph"
        figcaption = f"<figcaption>{escape(caption)}</figcaption>" if caption else ""
        card = (
            f'<figure><a href="{src}"><img src="{src}" alt="{alt}" '
            f'loading="lazy" decoding="async"></a>{figcaption}</figure>'
        )
        yield photo, card


def main():
    gallery = list(gallery_cards())
    template = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
    cards = "\n    ".join(card for _, card in gallery)
    output_photos = OUTPUT / "photos"
    output_photos.mkdir(parents=True, exist_ok=True)
    for generated in output_photos.iterdir():
        if generated.is_file() and PHOTO_NAME.fullmatch(generated.name):
            generated.unlink()
    for photo, _ in gallery:
        copyfile(photo, output_photos / photo.name)
    (OUTPUT / "index.html").write_text(
        template.replace("<!-- GALLERY -->", cards or '<p class="empty">No photos posted yet.</p>'),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
