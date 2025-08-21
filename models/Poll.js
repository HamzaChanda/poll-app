import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: { type: Number, default: 0 },
});

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    maxLength: 120,
  },
  options: [optionSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  voterFingerprints: [{
    type: String,
  }],
});

const Poll = mongoose.model('Poll', pollSchema);

export default Poll;