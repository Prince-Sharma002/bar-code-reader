const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password_hash: { 
    type: String, 
    required: true 
  },
  first_name: { 
    type: String 
  },
  last_name: { 
    type: String 
  },
  phone: { 
    type: String 
  },
  status: { 
    type: String, 
    enum: ['active', 'suspended', 'pending_verification'], 
    default: 'active' 
  },
  last_login_at: { 
    type: Date 
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('User', userSchema);
