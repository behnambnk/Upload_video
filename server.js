const express = require('express');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const fs = require('fs');

// Initialize app
const app = express();

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false
}));

// Simulated database for storing users (in-memory for simplicity)
let users = [];

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Routes

// Route: GET Signup Page
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Route: POST Signup
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  
  req.session.user = username; // Automatically log the user in
  res.redirect('/upload');
});

// Route: GET Login Page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route: POST Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find(u => u.username === username);
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = username;  // Create session
    res.redirect('/upload');
  } else {
    res.send('Invalid username or password.');
  }
});

// Route: GET Upload Page (Only if logged in)
app.get('/upload', (req, res) => {
  if (req.session.user) {
    res.sendFile(path.join(__dirname, 'public', 'upload.html'));
  } else {
    res.redirect('/login');  // Redirect to login if not logged in
  }
});

// Route: POST Upload Video
app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.session.user) {
    return res.status(403).send('You must be logged in to upload videos.');
  }
  
  // File is saved in 'uploads/' directory
  res.send('Video uploaded successfully: ' + req.file.filename);
});

// Route: Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send('Error logging out.');
    res.redirect('/login');
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);

});
