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
  digestTime: { 
    type: String, 
    default: '08:00',
    validate: {
      validator: function(v) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format (HH:MM)`
    }
  },
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
UserPreferenceSchema.index({ digestTime: 1 });

module.exports = model('UserPreference', UserPreferenceSchema);