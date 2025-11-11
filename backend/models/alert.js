
// ============================================
// models/Alert.js
// ============================================
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  // User who owns this alert
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Alert configuration
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  // Trigger conditions
  conditions: {
    type: {
      type: String,
      enum: ['IP', 'Domain', 'URL', 'Hash', 'Email', 'FileHash', 'Any'],
      default: 'Any'
    },
    value: String, // Specific IoC to watch (optional)
    severity: [{
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low', 'Info']
    }],
    sources: [{
      type: String,
      enum: ['AlienVault', 'PhishTank', 'AbuseIPDB', 'URLhaus', 'MalwareBazaar', 'Manual']
    }],
    categories: [{
      type: String,
      enum: ['Malware', 'Phishing', 'C2', 'Scanning', 'Spam', 'Botnet', 'Ransomware', 'APT', 'Other']
    }],
    countries: [String],
    malwareFamilies: [String],
    keywords: [String] // Match in description or tags
  },
  // Alert delivery
  deliveryMethod: {
    type: String,
    enum: ['email', 'webhook', 'both'],
    default: 'email'
  },
  webhookUrl: String,
  // Status and tracking
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastTriggered: Date,
  triggerCount: {
    type: Number,
    default: 0
  },
  // Recent matches (store last 10)
  recentMatches: [{
    threatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Threat'
    },
    matchedAt: Date,
    notified: Boolean
  }],
  // Rate limiting
  cooldownMinutes: {
    type: Number,
    default: 0 // 0 = no cooldown
  },
  nextTriggerAllowed: Date
}, {
  timestamps: true
});

// Compound indexes
alertSchema.index({ userId: 1, isActive: 1 });
alertSchema.index({ isActive: 1, 'conditions.severity': 1 });

// Check if alert should trigger for a given threat
alertSchema.methods.shouldTrigger = function(threat) {
  if (!this.isActive) return false;
  
  // Check cooldown
  if (this.nextTriggerAllowed && this.nextTriggerAllowed > new Date()) {
    return false;
  }
  
  const cond = this.conditions;
  
  // Check type match
  if (cond.type !== 'Any' && cond.type !== threat.type) return false;
  
  // Check specific value match
  if (cond.value && cond.value !== threat.value) return false;
  
  // Check severity
  if (cond.severity.length > 0 && !cond.severity.includes(threat.severity)) return false;
  
  // Check source
  if (cond.sources.length > 0 && !cond.sources.includes(threat.source)) return false;
  
  // Check category
  if (cond.categories.length > 0 && !cond.categories.includes(threat.category)) return false;
  
  // Check country
  if (cond.countries.length > 0 && !cond.countries.includes(threat.country)) return false;
  
  // Check malware family
  if (cond.malwareFamilies.length > 0 && 
      (!threat.malwareFamily || !cond.malwareFamilies.includes(threat.malwareFamily))) {
    return false;
  }
  
  // Check keywords
  if (cond.keywords.length > 0) {
    const searchText = `${threat.description} ${threat.tags.join(' ')} ${threat.value}`.toLowerCase();
    const hasKeyword = cond.keywords.some(kw => searchText.includes(kw.toLowerCase()));
    if (!hasKeyword) return false;
  }
  
  return true;
};

// Record a trigger
alertSchema.methods.recordTrigger = function(threatId) {
  this.lastTriggered = new Date();
  this.triggerCount += 1;
  
  // Add to recent matches (keep last 10)
  this.recentMatches.unshift({
    threatId,
    matchedAt: new Date(),
    notified: false
  });
  
  if (this.recentMatches.length > 10) {
    this.recentMatches = this.recentMatches.slice(0, 10);
  }
  
  // Set cooldown
  if (this.cooldownMinutes > 0) {
    this.nextTriggerAllowed = new Date(Date.now() + this.cooldownMinutes * 60000);
  }
  
  return this.save();
};

module.exports = mongoose.model('Alert', alertSchema);