# Silverpost

Silverpost is a small photo gallery hosted on GitHub Pages. The repository,
gallery, and photos are public. Visitors can open the site and save photos
without signing in. The site asks search engines to skip indexing.

## Post a photo

1. On Silverpost, press **+**, select a photo, write an optional caption, and
   choose **Post on this device**. The post is saved in your current browser.
2. Use **Download JPEG** and, if present, **Download caption** on the post.
   Silverpost re-encodes the JPEG without the original file metadata.
3. Choose **Upload on GitHub**, select the downloaded files, and commit to
   `main`. GitHub Actions rebuilds the shared feed.

You can also upload files straight to GitHub.

1. Export a JPEG, PNG or WebP up to 10 MB with private metadata removed.
2. In GitHub, open the `photos` folder and use **Add file → Upload files**.
   Use a name such as `2026-11-05-coast.jpg`. Photos appear in reverse filename
   order, so a date prefix puts recent posts first.
3. For a caption, add a text file in the same folder with the matching base
   name, such as `2026-11-05-coast.txt`. The caption is optional.
4. Commit to `main`. GitHub Actions rebuilds the gallery and publishes it.

To take a photo off the gallery, delete it and its matching caption and issue files from `main`.
Previously committed copies can remain in the public Git history.

Profile edits, likes, comments and local posts are stored in the browser.
They stay on that device and can be lost if you clear site data. The shared
feed contains photos and captions committed to GitHub.

## Preview locally

Run `python3 build.py`, then `python3 -m http.server --directory _site 8000`.
Visit `http://localhost:8000`. The build uses only Python's standard library.

## Submissions from friends

Friends can press **+**, choose a photo and save a local post. On a device
that supports file sharing, **Send photo** opens the device's share menu.
On other devices they can download the JPEG and send it in a message.
A maintainer uploads the received photo to GitHub to publish it in the feed.

## Public comments

To enable public comments on a shared photo, create a public issue in
Kladikor/silverpost and add a matching `.issue` file in `photos/` containing
only its issue number. For example, `2026-11-05-coast.issue` can contain `12`.
Visitors can expand **Public comments** in Silverpost or read the thread on
GitHub. A GitHub account is required to post a public comment.
