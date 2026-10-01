// ---------- helpers ----------
function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach((c) => { if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); });
  return e;
}
const $view = document.getElementById('view');
const fmt = (d) => new Date(d).toLocaleString();
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2200);
}

// ---------- state + API ----------
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || 'null');

async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) logout(false);
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
function setSession(d) {
  token = d.token; user = d.user;
  localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user));
}
function logout(redirect = true) {
  token = null; user = null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  renderNav(); if (redirect) location.hash = '#/';
}

function renderNav() {
  document.getElementById('nav').replaceChildren(
    el('a', { class: 'brand', href: '#/' }, '✍️ My Blog'),
    el('a', { href: '#/' }, 'Home'),
    user && el('a', { href: '#/new' }, 'Write a post'),
    user
      ? el('span', {}, `Hi, ${user.name} `, el('button', { class: 'small', onclick: () => logout() }, 'Logout'))
      : el('a', { href: '#/login' }, 'Login / Register'));
}

// ---------- views ----------
async function homeView() {
  $view.replaceChildren(el('h2', {}, 'Latest posts'));
  try {
    const posts = await api('/posts');
    if (!posts.length) $view.append(el('p', { class: 'muted' }, 'No posts yet. Be the first to write one!'));
    posts.forEach((p) => {
      const excerpt = p.content.length > 180 ? p.content.slice(0, 180) + '…' : p.content;
      $view.append(el('div', { class: 'card' },
        el('h3', { class: 'post-title' }, el('a', { href: '#/post/' + p._id }, p.title)),
        el('p', { class: 'muted' }, `by ${p.author ? p.author.name : 'unknown'} · ${fmt(p.createdAt)} · ${p.commentCount} comment${p.commentCount === 1 ? '' : 's'}`),
        el('p', { class: 'content' }, excerpt),
        el('a', { href: '#/post/' + p._id }, 'Read more →')));
    });
  } catch (e) { $view.append(el('p', { class: 'error' }, e.message)); }
}

async function postView(id) {
  $view.replaceChildren(el('p', { class: 'muted' }, 'Loading...'));
  try {
    const [post, comments] = await Promise.all([api('/posts/' + id), api(`/posts/${id}/comments`)]);
    const mine = user && post.author && post.author._id === user.id;

    const commentsBox = el('div');
    const err = el('p', { class: 'error' });
    const text = el('textarea', { rows: 3, placeholder: 'Write a comment...' });
    const add = el('button', { class: 'primary', onclick: async () => {
      try { await api(`/posts/${id}/comments`, 'POST', { text: text.value }); postView(id); }
      catch (e) { err.textContent = e.message; }
    } }, 'Post comment');

    comments.forEach((c) => {
      const canDelete = user && ((c.author && c.author._id === user.id) || mine);
      commentsBox.append(el('div', { class: 'comment' },
        el('strong', {}, c.author ? c.author.name : 'deleted user'), ' ', el('span', { class: 'muted' }, fmt(c.createdAt)),
        el('p', {}, c.text),
        canDelete && el('button', { class: 'small danger', onclick: async () => {
          if (confirm('Delete this comment?')) { await api('/comments/' + c._id, 'DELETE'); postView(id); }
        } }, 'Delete')));
    });

    $view.replaceChildren(
      el('div', { class: 'card' },
        el('h2', { class: 'post-title' }, post.title),
        el('p', { class: 'muted' }, `by ${post.author ? post.author.name : 'unknown'} · ${fmt(post.createdAt)}`),
        el('p', { class: 'content' }, post.content),
        mine && el('div', { class: 'row' },
          el('button', { onclick: () => (location.hash = '#/edit/' + id) }, 'Edit'),
          el('button', { class: 'danger', onclick: async () => {
            if (confirm('Delete this post and its comments?')) { await api('/posts/' + id, 'DELETE'); toast('Post deleted'); location.hash = '#/'; }
          } }, 'Delete'))),
      el('div', { class: 'card' },
        el('h3', {}, `Comments (${comments.length})`),
        commentsBox,
        user ? el('div', {}, text, add, err) : el('p', { class: 'muted' }, el('a', { href: '#/login' }, 'Login'), ' to leave a comment.')));
  } catch (e) { $view.replaceChildren(el('p', { class: 'error' }, e.message), el('a', { href: '#/' }, 'Back home')); }
}

async function editorView(id) {
  if (!user) return (location.hash = '#/login');
  const title = el('input', { placeholder: 'Post title' });
  const content = el('textarea', { rows: 12, placeholder: 'Write your post...' });
  const err = el('p', { class: 'error' });
  if (id) {
    try { const p = await api('/posts/' + id); title.value = p.title; content.value = p.content; }
    catch (e) { return $view.replaceChildren(el('p', { class: 'error' }, e.message)); }
  }
  const save = el('button', { class: 'primary', onclick: async () => {
    try {
      const p = await api(id ? '/posts/' + id : '/posts', id ? 'PUT' : 'POST', { title: title.value, content: content.value });
      toast('Saved'); location.hash = '#/post/' + p._id;
    } catch (e) { err.textContent = e.message; }
  } }, id ? 'Save changes' : 'Publish');
  $view.replaceChildren(el('div', { class: 'card' }, el('h2', {}, id ? 'Edit post' : 'New post'), title, content, el('div', { class: 'row' }, save, el('button', { onclick: () => history.back() }, 'Cancel')), err));
}

function loginView() {
  let mode = 'login';
  const name = el('input', { placeholder: 'Full name', hidden: true });
  const email = el('input', { type: 'email', placeholder: 'Email' });
  const pass = el('input', { type: 'password', placeholder: 'Password (min 6 chars)' });
  const err = el('p', { class: 'error' });
  const submit = el('button', { class: 'primary', style: 'width:100%' }, 'Login');
  const toggle = el('a', { href: '#/login', onclick: (e) => {
    e.preventDefault(); mode = mode === 'login' ? 'register' : 'login';
    name.hidden = mode === 'login'; submit.textContent = mode === 'login' ? 'Login' : 'Create account';
    toggle.textContent = mode === 'login' ? 'New here? Register' : 'Have an account? Login'; err.textContent = '';
  } }, 'New here? Register');
  submit.onclick = async () => {
    try {
      setSession(await api('/auth/' + mode, 'POST', { name: name.value, email: email.value, password: pass.value }));
      renderNav(); location.hash = '#/';
    } catch (e) { err.textContent = e.message; }
  };
  $view.replaceChildren(el('div', { class: 'card narrow' }, el('h2', {}, 'Welcome'), name, email, pass, submit, err, toggle));
}

// ---------- router ----------
function route() {
  const h = location.hash || '#/';
  renderNav();
  let m;
  if (h === '#/login') loginView();
  else if (h === '#/new') editorView();
  else if ((m = h.match(/^#\/edit\/(\w+)$/))) editorView(m[1]);
  else if ((m = h.match(/^#\/post\/(\w+)$/))) postView(m[1]);
  else homeView();
}
window.addEventListener('hashchange', route);
route();
