const { Schema, model } = require('mongoose');

const subscriptionSchema = new Schema({
  name: { type: String, required: true },
  subscribedAt: { type: Date, default: Date.now }
}, { _id: false });

const UserPreferenceSchema = new Schema({
  chatId: { type: Number, required: true, unique: true, index: true },
  username: String,
  firstName: String,
  lastName: String,
  categories: [subscriptionSchema],
  lastActive: { type: Date, default: Date.now },
  settings: {
    receiveWelcome: { type: Boolean, default: true },
    notifyUpdates: { type: Boolean, default: true },
    digestFormat: { type: String, enum: ['compact', 'detailed'], default: 'compact' }
  },
  createdAt: { type: Date, default: Date.now }
});

// Index for categories and digestTime
UserPreferenceSchema.index({ 'categories.name': 1 });


module.exports = model('UserPreference', UserPreferenceSchema);