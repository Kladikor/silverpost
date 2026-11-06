# Silverpost

Silverpost is a small photo gallery hosted on GitHub Pages. The repository,
gallery, and photos are public. Visitors can open the site and save photos
without signing in. The site asks search engines to skip indexing.

## Post a photo

1. Export a JPEG, PNG or WebP up to 10 MB. If your original has location or other
   private metadata, export a copy with that metadata removed before uploading.
2. In GitHub, open the `photos` folder and use **Add file → Upload files**.
   Use a name such as `2026-11-05-coast.jpg`. Photos appear in reverse filename
   order, so a date prefix puts recent posts first.
3. For a caption, add a text file in the same folder with the matching base
   name, such as `2026-11-05-coast.txt`. The caption is optional.
4. Commit to `main`. GitHub Actions rebuilds the gallery and publishes it.

To take a photo off the gallery, delete it and its caption from `main`.
Previously committed copies can remain in the public Git history.

## Preview locally

Run `python3 build.py` and open `_site/index.html`. The build uses only Python's
standard library. GitHub Pages serves the generated gallery and images.
