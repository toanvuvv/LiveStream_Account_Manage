const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');
const dotenv = require('dotenv');

dotenv.config();

const accountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  cookies: {
    type: String,
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  cookie_expired: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Middleware để mã hóa cookies trước khi lưu
accountSchema.pre('save', function(next) {
  if (this.isModified('cookies')) {
    this.cookies = CryptoJS.AES.encrypt(this.cookies, process.env.CRYPTO_SECRET).toString();
  }
  next();
});

// Phương thức để giải mã cookies
accountSchema.methods.getDecryptedCookies = function() {
  const bytes = CryptoJS.AES.decrypt(this.cookies, process.env.CRYPTO_SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
};

module.exports = mongoose.model('Account', accountSchema); 