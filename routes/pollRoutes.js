import express from 'express';
import { createPoll, getPoll, addVote } from '../controller/pollController.js';

const router = express.Router();

router.post('/polls', createPoll);
router.get('/polls/:id', getPoll);
router.post('/polls/:id/vote', addVote);

export default router;