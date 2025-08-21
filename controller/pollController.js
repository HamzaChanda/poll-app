import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Poll from '../models/Poll.js';

// Simple rules engine for auto-insight generation
const generateInsight = (poll) => {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  if (totalVotes < 20) {
    return null;
  }

  const sortedOptions = [...poll.options].sort((a, b) => b.votes - a.votes);
  const topOption = sortedOptions[0];
  const secondOption = sortedOptions[1];
  const topOptionPct = Math.round((topOption.votes / totalVotes) * 100);

  if (topOption.votes === secondOption.votes) {
    return `The vote is currently tied between "${topOption.text}" and "${secondOption.text}".`;
  }

  const margin = topOption.votes - secondOption.votes;
  if ((margin / totalVotes) > 0.10) { // More than 10% margin
    return `"${topOption.text}" is the clear favorite, securing ${topOptionPct}% of the votes.`;
  } else {
    return `It's a close race, but "${topOption.text}" has a slight edge with ${topOptionPct}%.`;
  }
};

export const createPoll = async (req, res) => {
  const { question, options } = req.body;

  if (!question || !options || options.length < 2 || options.length > 4) {
    return res.status(400).json({ message: 'Invalid poll data.' });
  }

  try {
    const newPoll = new Poll({
      question,
      options: options.map(opt => ({ text: opt, votes: 0 })),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });
    await newPoll.save();
    res.status(201).json({ pollId: newPoll._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating poll.' });
  }
};

export const getPoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found.' });
    }

    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
    const insight = generateInsight(poll);
    
    // Check if the user has already voted via cookie
    let userVote = null;
    const voteToken = req.cookies[`poll_vote_${req.params.id}`];
    if (voteToken) {
        try {
            const decoded = jwt.verify(voteToken, process.env.JWT_SECRET);
            userVote = decoded.optionId;
        } catch (err) {
            // Invalid token, ignore
        }
    }

    res.json({ ...poll.toObject(), totalVotes, insight, userVote });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching poll.' });
  }
};

export const addVote = async (req, res) => {
  try {
    const { optionId } = req.body;
    const pollId = req.params.id;
    const poll = await Poll.findById(pollId);

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found.' });
    }
    if (new Date() > poll.expiresAt) {
      return res.status(400).json({ message: 'This poll has expired.' });
    }

    // Layer 1: Check for signed cookie
    if (req.cookies[`poll_vote_${pollId}`]) {
        return res.status(403).json({ message: 'You have already voted in this poll.' });
    }

    // Layer 2: Soft device fingerprint check
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.connection.remoteAddress;
    const fingerprint = crypto.createHash('sha256').update(ip + userAgent + pollId).digest('hex');

    if (poll.voterFingerprints.includes(fingerprint)) {
      return res.status(403).json({ message: 'You have already voted in this poll.' });
    }
    
    const option = poll.options.id(optionId);
    if (!option) {
        return res.status(400).json({ message: 'Invalid option.' });
    }

    option.votes += 1;
    poll.voterFingerprints.push(fingerprint);
    await poll.save();
    
    // Set a signed cookie to prevent re-voting
    const token = jwt.sign({ pollId, optionId }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie(`poll_vote_${pollId}`, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    
    // Emit event to all clients in the room
    const io = req.app.get('socketio');
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
    const insight = generateInsight(poll);
    io.to(pollId).emit('pollUpdate', { ...poll.toObject(), totalVotes, insight });

    res.status(200).json({ message: 'Vote registered successfully.', poll });
  } catch (error) {
    res.status(500).json({ message: 'Server error processing vote.' });
  }
};