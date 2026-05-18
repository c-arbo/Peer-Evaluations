const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectDB() {
    try {
        await client.connect();
        console.log('Connected to MongoDB!');
        return client.db('peer-evaluations');
    } catch (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
}

// Get scores
app.get('/api/scores', async (req, res) => {
    const db = await connectDB();
    const scores = await db.collection('scores').find({}).toArray();
    res.json(scores);
});

// Get comments
app.get('/api/comments', async (req, res) => {
    const db = await connectDB();
    const comments = await db.collection('comments').find({}).toArray();
    res.json(comments);
});

// Submit scores
app.post('/api/scores', async (req, res) => {
    const db = await connectDB();
    const scores = req.body.scores;
    await db.collection('scores').insertMany(scores);
    res.json({ success: true });
});

// Submit comment
app.post('/api/comments', async (req, res) => {
    const db = await connectDB();
    await db.collection('comments').insertOne(req.body);
    res.json({ success: true });
});

// Delete all data
app.delete('/api/data', async (req, res) => {
    const db = await connectDB();
    await db.collection('scores').deleteMany({});
    await db.collection('comments').deleteMany({});
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
