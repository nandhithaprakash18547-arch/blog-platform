const router = require('express').Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { auth, wrap } = require('../middleware/auth');

function clean(b) {
  return { title: String(b.title || '').trim(), content: String(b.content || '').trim() };
}

// Public: all posts (newest first) with comment counts
router.get('/', wrap(async (req, res) => {
  const posts = await Post.find().populate('author', 'name').sort({ createdAt: -1 }).lean();
  const counts = await Comment.aggregate([{ $group: { _id: '$post', n: { $sum: 1 } } }]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json(posts.map((p) => ({ ...p, commentCount: map[String(p._id)] || 0 })));
}));

// Public: one post
router.get('/:id', wrap(async (req, res) => {
  const post = await Post.findById(req.params.id).populate('author', 'name');
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
}));

// Logged in: create
router.post('/', auth, wrap(async (req, res) => {
  const { title, content } = clean(req.body);
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
  const post = await Post.create({ title, content, author: req.user.id });
  res.status(201).json(post);
}));

// Only the author can edit / delete
router.put('/:id', auth, wrap(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (String(post.author) !== req.user.id) return res.status(403).json({ error: 'You can only edit your own posts' });
  const { title, content } = clean(req.body);
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
  post.title = title; post.content = content;
  await post.save();
  res.json(post);
}));

router.delete('/:id', auth, wrap(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (String(post.author) !== req.user.id) return res.status(403).json({ error: 'You can only delete your own posts' });
  await Comment.deleteMany({ post: post._id });
  await post.deleteOne();
  res.json({ success: true });
}));

// ----- comments -----
router.get('/:id/comments', wrap(async (req, res) => {
  res.json(await Comment.find({ post: req.params.id }).populate('author', 'name').sort({ createdAt: 1 }));
}));

router.post('/:id/comments', auth, wrap(async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Comment cannot be empty' });
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const c = await Comment.create({ post: post._id, author: req.user.id, text });
  res.status(201).json(await c.populate('author', 'name'));
}));

module.exports = router;
