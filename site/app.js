'use strict';

const byId = id => document.getElementById(id);
const feed = document.querySelector('main');
const composer = byId('composer');
const photoStatus = byId('photoStatus');
const preview = byId('preview');
const savePost = byId('savePost');
const siteStatus = byId('siteStatus');
const uploadUrl = 'https://github.com/Kladikor/silverpost/upload/main/photos';
const initialProfile = { name: 'Silverpost', bio: 'A photo feed to share with friends.' };
let profile = initialProfile;
let selectedPhoto = null;
let previewUrl = '';
let selection = 0;

function element(tag, content, className = '') {
  const node = document.createElement(tag);
  node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

const database = new Promise((resolve, reject) => {
  const request = indexedDB.open('silverpost', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('entries');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function read(key) {
  const db = await database;
  return new Promise((resolve, reject) => {
    const store = db.transaction('entries').objectStore('entries');
    const request = key === undefined ? store.getAll() : store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function change(key, update) {
  const db = await database;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('entries', 'readwrite');
    const store = transaction.objectStore('entries');
    const request = store.get(key);
    let value;
    request.onsuccess = () => {
      value = update(request.result);
      if (value === undefined) store.delete(key);
      else store.put(value, key);
    };
    transaction.oncomplete = () => resolve(value);
    transaction.onabort = () => reject(transaction.error);
  });
}

function reportError() {
  siteStatus.textContent = 'Could not save to this browser. Check that site storage is available and try again.';
}

function addReactions(card, key) {
  const tools = element('div', undefined, 'post-tools');
  const heart = element('button', '♡', 'icon-btn');
  heart.type = 'button';
  heart.setAttribute('aria-label', 'Like on this device');
  heart.setAttribute('aria-pressed', 'false');
  tools.append(heart, element('span', 'Likes and comments stay on this device.', 'post-note'));

  const comments = element('div', undefined, 'comments');
  const list = element('ul');
  const form = element('form', undefined, 'comment-form');
  const input = element('input', undefined, 'form-input');
  input.required = true;
  input.maxLength = 500;
  input.placeholder = 'Add a comment…';
  input.setAttribute('aria-label', 'Local comment');
  const submit = element('button', 'Post', 'btn-primary');
  form.append(input, submit);
  comments.append(list, form);
  card.append(tools, comments);

  function render(state) {
    heart.textContent = state?.liked ? '♥' : '♡';
    heart.setAttribute('aria-pressed', String(!!state?.liked));
    list.replaceChildren(...(state?.comments ?? []).map(comment => {
      const item = element('li');
      item.append(element('strong', comment.author), document.createTextNode(' ' + comment.text));
      return item;
    }));
  }
  read(key).then(render, reportError);
  heart.onclick = async () => {
    try {
      render(await change(key, state => ({ ...state, liked: !state?.liked })));
    } catch { reportError(); }
  };
  form.onsubmit = async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || submit.disabled) return;
    submit.disabled = true;
    try {
      render(await change(key, state => ({
        ...state, comments: [...(state?.comments ?? []), { author: profile.name, text }]
      })));
      input.value = '';
    } catch { reportError(); }
    finally { submit.disabled = false; }
  };
}

function exportLink(label, filename, blob) {
  const link = element('a', label);
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  return link;
}

function renderPost(post) {
  const card = element('figure', undefined, 'post-card');
  const header = element('div', undefined, 'post-header');
  header.append(element('span', '◈', 'author-avatar'), element('strong', post.author, 'author-name'),
    element('span', 'On this device', 'post-note'));
  header.firstChild.setAttribute('aria-hidden', 'true');
  const image = element('img', undefined, 'post-image');
  const photo = exportLink('Download JPEG', post.filename, post.photo);
  image.src = photo.href;
  image.alt = post.caption || 'Photo saved on this device';
  const wrapper = element('div', undefined, 'post-image-wrapper');
  wrapper.append(image);
  card.append(header, wrapper);
  if (post.caption) card.append(element('figcaption', post.caption, 'post-caption'));
  addReactions(card, post.id);

  const tools = element('div', undefined, 'post-tools');
  const publish = element('a', 'Upload on GitHub');
  publish.href = uploadUrl;
  const file = new File([post.photo], post.filename, { type: 'image/jpeg' });
  const shareData = { files: [file], text: post.caption };
  if (navigator.canShare?.(shareData)) {
    const share = element('button', 'Send photo', 'icon-btn');
    share.type = 'button';
    share.onclick = async () => {
      try { await navigator.share(shareData); }
      catch (error) {
        if (error.name !== 'AbortError') siteStatus.textContent = 'Could not send the photo. Download the JPEG and attach it to a message.';
      }
    };
    tools.append(share);
  }
  const remove = element('button', 'Delete local post', 'icon-btn');
  remove.type = 'button';
  const caption = post.caption
    ? exportLink('Download caption', post.filename.replace(/\.jpg$/, '.txt'), new Blob([post.caption], { type: 'text/plain' }))
    : null;
  tools.append(photo);
  if (caption) tools.append(caption);
  tools.append(publish, remove);
  remove.onclick = async () => {
    try {
      await change(post.id, () => undefined);
      URL.revokeObjectURL(photo.href);
      if (caption) URL.revokeObjectURL(caption.href);
      card.remove();
      updateEmpty();
    } catch { reportError(); }
  };
  card.append(tools);
  feed.prepend(card);
}

function updateEmpty() {
  const empty = feed.querySelector('.empty');
  if (empty) empty.hidden = !!feed.querySelector('figure');
}

async function prepare(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 30 * 1024 * 1024) {
    throw new Error('Choose a JPEG, PNG or WebP under 30 MB.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!jpeg || jpeg.size > 10 * 1024 * 1024) throw new Error('Could not create a JPEG under 10 MB.');
    return jpeg;
  } finally { URL.revokeObjectURL(url); }
}

document.querySelectorAll('[data-add-photo]').forEach(button => {
  button.onclick = () => composer.showModal();
});

byId('photo').onchange = async event => {
  const revision = ++selection;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  selectedPhoto = null;
  preview.hidden = true;
  savePost.disabled = true;
  const file = event.target.files[0];
  if (!file) return;
  photoStatus.textContent = 'Preparing photo…';
  try {
    const photo = await prepare(file);
    if (revision !== selection) return;
    selectedPhoto = photo;
    previewUrl = URL.createObjectURL(photo);
    preview.src = previewUrl;
    preview.hidden = false;
    savePost.disabled = false;
    photoStatus.textContent = 'Ready to save on this device. The JPEG export omits the original file metadata.';
  } catch (error) {
    if (revision === selection) photoStatus.textContent = error.message;
  }
};

savePost.onclick = async () => {
  if (!selectedPhoto || savePost.disabled) return;
  savePost.disabled = true;
  byId('photo').disabled = true;
  const uid = crypto.randomUUID();
  const created = new Date().toISOString();
  const post = {
    id: 'post:' + uid,
    filename: created.slice(0, 10) + '-' + uid.slice(0, 8) + '.jpg',
    created, photo: selectedPhoto, author: profile.name, caption: byId('caption').value.trim()
  };
  try {
    await change(post.id, () => post);
    renderPost(post);
    updateEmpty();
    selectedPhoto = null;
    URL.revokeObjectURL(previewUrl);
    preview.hidden = true;
    byId('photo').value = '';
    byId('caption').value = '';
    photoStatus.textContent = 'Choose a photo to start a new local post.';
    composer.close();
    siteStatus.textContent = 'Photo saved on this device.';
  } catch {
    photoStatus.textContent = 'Could not save the photo. Check your browser storage and try again.';
    savePost.disabled = false;
  } finally { byId('photo').disabled = false; }
};

function renderProfile() {
  byId('profileName').textContent = profile.name;
  byId('profileBio').textContent = profile.bio;
}

byId('editProfile').onclick = () => {
  byId('name').value = profile.name;
  byId('bio').value = profile.bio;
  byId('profileEditor').showModal();
};

byId('profileForm').onsubmit = async event => {
  event.preventDefault();
  const name = byId('name').value.trim();
  if (!name) return;
  try {
    profile = await change('profile', () => ({ name, bio: byId('bio').value.trim() }));
    renderProfile();
    byId('profileEditor').close();
  } catch { reportError(); }
};

byId('themeToggle').onclick = event => {
  const isLight = document.documentElement.dataset.theme === 'light';
  document.documentElement.dataset.theme = isLight ? 'dark' : 'light';
  event.currentTarget.textContent = isLight ? '☾' : '☀';
};

function addPublicThread(card) {
  const thread = card.dataset.thread;
  if (!thread) {
    card.append(element('p', 'No public comment thread yet.', 'comments post-note'));
    return;
  }
  const details = element('details', undefined, 'comments');
  const summary = element('summary', 'Public comments');
  const list = element('ul');
  const notice = element('p', '', 'post-note');
  const link = element('a', 'Read or post on GitHub');
  link.href = 'https://github.com/Kladikor/silverpost/issues/' + thread;
  details.append(summary, notice, list, link);
  card.append(details);

  let loaded = false;
  let loading = false;
  details.ontoggle = async () => {
    if (!details.open || loaded || loading) return;
    loading = true;
    notice.textContent = 'Loading public comments…';
    try {
      const response = await fetch('https://api.github.com/repos/Kladikor/silverpost/issues/' +
        thread + '/comments?per_page=100', { credentials: 'omit' });
      if (!response.ok) throw new Error('GitHub could not load this thread');
      const comments = await response.json();
      list.replaceChildren(...comments.map(comment => {
        const item = element('li');
        item.append(element('strong', comment.user?.login ?? 'GitHub user'),
          element('p', comment.body ?? ''));
        return item;
      }));
      notice.textContent = comments.length ? '' : 'No public comments yet.';
      loaded = true;
    } catch {
      notice.textContent = 'Comments could not load here. Open the public thread on GitHub.';
    } finally { loading = false; }
  };
}

document.querySelectorAll('[data-shared]').forEach(addPublicThread);
Promise.all([read('profile'), read()]).then(([storedProfile, entries]) => {
  profile = storedProfile ?? initialProfile;
  renderProfile();
  entries.filter(entry => entry.id?.startsWith('post:'))
    .sort((left, right) => left.created.localeCompare(right.created))
    .forEach(renderPost);
  updateEmpty();
}, reportError);
