const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('./User');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'yourSuperSecretKey';

const mongoURI = 'mongodb+srv://omollojeremy08_db_user:0790831644Jeremy3@cluster0.buvt9zs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use(cors());
app.use(express.json());

// ✅ Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',       // 🔐 Replace with your Gmail address
    pass: 'your-app-password'           // 🔐 Use Gmail App Password
  }
});

app.get('/', (req, res) => {
  res.send('Hello from your backend!');
});

// ✅ Signup route with confirmation code and email
app.post('/signup', async (req, res) => {
  try {
    const { email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const confirmationCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g. "A1B2C3"

    const newUser = new User({
      email,
      password: hashedPassword,
      phone,
      confirmationCode,
      isConfirmed: false
    });

    await newUser.save();

    // ✅ Send confirmation email
    await transporter.sendMail({
      from: '"Anon E-Commerce" <your-email@gmail.com>',
      to: email,
      subject: 'Your Confirmation Code',
      text: `Welcome! Your confirmation code is: ${confirmationCode}`,
      html: `<p>Welcome to Anon E-Commerce!</p><p>Your confirmation code is: <strong>${confirmationCode}</strong></p>`
    });

    res.status(201).json({
      message: 'User created successfully. Confirmation code sent to email.'
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
});

// ✅ Confirmation route
app.post('/confirm', async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.confirmationCode !== code) {
      return res.status(400).json({ message: 'Invalid confirmation code' });
    }

    user.isConfirmed = true;
    await user.save();

    res.status(200).json({ message: 'Account confirmed successfully' });
  } catch (err) {
    console.error('Confirmation error:', err.message);
    res.status(500).json({ message: 'Error confirming account', error: err.message });
  }
});

// ✅ Login route
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isConfirmed) {
      return res.status(403).json({ message: 'Please confirm your account before logging in' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Login successful', token });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Login error', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
