const mongoose = require('mongoose');

const viewSchema = new mongoose.Schema({
  userId: {
    type: Number,
    index: true,
    default: null // Может быть null для анонимных просмотров
  },
  contentType: {
    type: String,
    enum: ['article', 'book', 'dissertation'],
    required: true
  },
  contentId: {
    type: Number,
    required: true,
    index: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Индекс для подсчета просмотров
viewSchema.index({ contentType: 1, contentId: 1 });

module.exports = mongoose.model('View', viewSchema);
