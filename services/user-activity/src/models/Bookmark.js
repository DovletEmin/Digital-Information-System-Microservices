const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    index: true
  },
  contentType: {
    type: String,
    enum: ['article', 'book', 'dissertation'],
    required: true
  },
  contentId: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Уникальная комбинация: один пользователь не может добавить один и тот же контент дважды
bookmarkSchema.index({ userId: 1, contentType: 1, contentId: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
