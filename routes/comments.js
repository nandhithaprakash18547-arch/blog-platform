const router = require('express').Router();
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { auth, wrap } = require('../middleware/auth');

// Comment author OR the post's author can delete a comment
router.delete('/:id', auth, wrap(async (req, res) => {
  const c = await Comment.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'Comment not found' });
  const post = await Post.findById(c.post);
  const isOwner = String(c.author) === req.user.id;
  const isPostAuthor = post && String(post.author) === req.user.id;
  if (!isOwner && !isPostAuthor) return res.status(403).json({ error: 'Not allowed' });
  await c.deleteOne();
  res.json({ success: true });
}));

module.exports = router;
