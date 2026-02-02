const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
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
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Уникальная комбинация: один рейтинг на пользователя на контент
ratingSchema.index({ userId: 1, contentType: 1, contentId: 1 }, { unique: true });
ratingSchema.index({ contentType: 1, contentId: 1 });

ratingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Rating', ratingSchema);
