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
    sidecars = set()
    for entry in entries:
        if entry.name == ".gitkeep":
            continue
        if entry.is_symlink() or not entry.is_file():
            raise ValueError(f"Expected a regular file in photos/: {entry.name}")
        if entry.suffix in {".txt", ".issue"}:
            sidecars.add(entry)
        elif PHOTO_NAME.fullmatch(entry.name):
            if entry.stat().st_size not in range(1, MAX_BYTES + 1):
                raise ValueError(f"Photo must be between 1 byte and 10 MB: {entry.name}")
            photos.append(entry)
        else:
            raise ValueError(f"Unsupported photo filename: {entry.name}")

    for sidecar in sidecars:
        if not any(photo.stem == sidecar.stem for photo in photos):
            raise ValueError(f"No matching photo for {sidecar.name}")

    for photo in photos:
        sidecar = photo.with_suffix(".txt")
        caption = sidecar.read_text(encoding="utf-8").strip() if sidecar in sidecars else ""
        if len(caption) > 1000:
            raise ValueError(f"Caption must be 1,000 characters or fewer: {sidecar.name}")
        thread_file = photo.with_suffix(".issue")
        thread = thread_file.read_text(encoding="utf-8").strip() if thread_file in sidecars else ""
        if thread_file in sidecars and not re.fullmatch(r"[1-9][0-9]{0,8}", thread):
            raise ValueError(f"Expected a GitHub issue number in {thread_file.name}")
        thread_attr = f' data-thread="{thread}"' if thread else ""
        src = "photos/" + quote(photo.name)
        alt = escape(caption, quote=True) if caption else "Shared photograph"
        figcaption = f'<figcaption class="post-caption">{escape(caption)}</figcaption>' if caption else ""
        card = (
            f'<figure class="post-card" data-shared="{src}"{thread_attr}><div class="post-header">'
            '<span class="author-avatar" aria-hidden="true">◈</span>'
            '<span class="author-name">Silverpost</span></div>'
            f'<div class="post-image-wrapper"><a href="{src}">'
            f'<img class="post-image" src="{src}" alt="{alt}" '
            f'loading="lazy" decoding="async"></a></div>{figcaption}</figure>'
        )
        yield photo, card


def main():
    gallery = list(gallery_cards())
    template = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
    empty = (
        '<section class="post-card empty"><h2>No photos yet</h2>'
        '<p>Share the first frame with your friends.</p>'
        '<div><button class="btn-primary" data-add-photo type="button">'
        'Add a photo</button></div></section>'
    )
    cards = "\n    ".join(card for _, card in gallery) or empty
    output_photos = OUTPUT / "photos"
    output_photos.mkdir(parents=True, exist_ok=True)
    for generated in output_photos.iterdir():
        if generated.is_file() and PHOTO_NAME.fullmatch(generated.name):
            generated.unlink()
    for photo, _ in gallery:
        copyfile(photo, output_photos / photo.name)
    copyfile(ROOT / "site" / "app.js", OUTPUT / "app.js")
    (OUTPUT / "index.html").write_text(
        template.replace("<!-- GALLERY -->", cards),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
