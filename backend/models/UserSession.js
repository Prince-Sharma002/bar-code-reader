const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  refresh_token: { 
    type: String, 
    required: true, 
    unique: true 
  },
  device_info: { 
    type: String 
  },
  ip_address: { 
    type: String 
  },
  expires_at: { 
    type: Date, 
    required: true 
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('UserSession', userSessionSchema);
