// ============================================
// models/Threat.js
// ============================================
const mongoose = require('mongoose');

const threatSchema = new mongoose.Schema({
  // Source information
  source: {
    type: String,
    required: true,
    enum: ['AlienVault', 'PhishTank', 'AbuseIPDB', 'URLhaus', 'MalwareBazaar', 'Manual'],
    index: true
  },
  sourceId: {
    type: String, // External ID from the source
    sparse: true
  },
  // Threat type and value
  type: {
    type: String,
    required: true,
    enum: ['IP', 'Domain', 'URL', 'Hash', 'Email', 'FileHash'],
    index: true
  },
  value: {
    type: String,
    required: true,
    index: true
  },
  // Classification
  severity: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low', 'Info'],
    default: 'Medium',
    index: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  // Threat details
  malwareFamily: {
    type: String,
    index: true
  },
  category: {
    type: String,
    enum: ['Malware', 'Phishing', 'C2', 'Scanning', 'Spam', 'Botnet', 'Ransomware', 'APT', 'Other'],
    index: true
  },
  tags: [{
    type: String,
    index: true
  }],
  // Geographic data
  country: {
    type: String,
    index: true
  },
  city: String,
  asn: String,
  asnName: String,
  // Temporal data
  dateDetected: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  firstSeen: {
    type: Date,
    default: Date.now
  },
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  // Additional context
  description: String,
  references: [{
    url: String,
    title: String
  }],
  // Metadata for aggregation
  rawData: mongoose.Schema.Types.Mixed, // Store original API response
  hitCount: {
    type: Number,
    default: 1
  },
  reportedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date,
    notes: String
  }]
}, {
  timestamps: true
});

// Compound indexes for common queries
threatSchema.index({ type: 1, value: 1 });
threatSchema.index({ source: 1, dateDetected: -1 });
threatSchema.index({ severity: 1, isActive: 1 });
threatSchema.index({ country: 1, category: 1 });
threatSchema.index({ malwareFamily: 1, dateDetected: -1 });

// Text index for search
threatSchema.index({ 
  value: 'text', 
  description: 'text', 
  malwareFamily: 'text',
  tags: 'text'
});

// Update lastSeen when threat is observed again
threatSchema.methods.markAsSeen = function() {
  this.lastSeen = new Date();
  this.hitCount += 1;
  return this.save();
};

// Check if threat is stale (not seen in 30 days)
threatSchema.methods.isStale = function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return this.lastSeen < thirtyDaysAgo;
};

module.exports = mongoose.model('Threat', threatSchema);

