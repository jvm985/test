import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_CLIENT_ID = '339058057860-i6ne31mqs27mqm2ulac7al9vi26pmgo1.apps.googleusercontent.com';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-123';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/testdb';

mongoose.connect(MONGO_URI);

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Schema voor de testdata
const TestDataSchema = new mongoose.Schema({
  content: { type: String, default: 'Bewerk mij...' },
  lastModifiedBy: String,
  updatedAt: { type: Date, default: Date.now }
});
const TestData = mongoose.model('TestData', TestDataSchema);

// Auth Middleware
const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Unauthorized');
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).send('Invalid token');
  }
};

// Routes
app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new Error('No payload');

    const token = jwt.sign(
      { email: payload.email, name: payload.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { email: payload.email, name: payload.name } });
  } catch (err) {
    console.error(err);
    res.status(400).send('Login failed');
  }
});

app.get('/api/data', authenticate, async (req, res) => {
  let data = await TestData.findOne();
  if (!data) data = await TestData.create({ content: 'Initial data' });
  res.json(data);
});

app.post('/api/data', authenticate, async (req, res) => {
  const { content } = req.body;
  let data = await TestData.findOne();
  if (!data) {
    data = await TestData.create({ content, lastModifiedBy: (req as any).user.email });
  } else {
    data.content = content;
    data.lastModifiedBy = (req as any).user.email;
    data.updatedAt = new Date();
    await data.save();
  }
  res.json(data);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
