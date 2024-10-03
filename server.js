const express = require('express');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const fs = require('fs');
require('dotenv').config();
const AWS = require('aws-sdk');

// AWS Cognito Configuration
AWS.config.update({ 
  region: 'ap-southeast-2',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN
});
const cognito = new AWS.CognitoIdentityServiceProvider();

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

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath); // Create uploads folder if it doesn't exist
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Routes

// Signup Route
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html')); // Serve signup HTML page
});

app.post('/signup', (req, res) => {
  const { username, password, email, name } = req.body;
  const params = {
    ClientId: process.env.COGNITO_CLIENT_ID,
    Username: username,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name },
    ],
  };
  cognito.signUp(params, (err, data) => {
    if (err) return res.redirect(`/signup?error=${encodeURIComponent(err.message)}`);
    req.session.username = username;
    req.session.isAuthenticated = true;
    res.redirect('/upload');
  });
});

// Login Route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.COGNITO_CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };
  cognito.initiateAuth(params, (err, data) => {
    if (err) return res.redirect('/login?error=Invalid%20username%20or%20password');
    req.session.username = username;
    req.session.isAuthenticated = true;
    res.redirect('/upload');
  });
});

// Upload Route (Only for authenticated users)
app.get('/upload', (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'upload.html')); // Serve upload form HTML
});

app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const videoUrl = `/uploads/${req.file.filename}`;

  // Redirect to upload-success page with video link
  res.redirect(`/upload-success?videoUrl=${encodeURIComponent(videoUrl)}`);
});

// Success Route to Show the Video Link
app.get('/upload-success', (req, res) => {
  const videoUrl = req.query.videoUrl;
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Upload Successful</title>
      <link rel="stylesheet" href="style.css">
    </head>
    <body>
      <h1>Upload Successful!</h1>
      <p>Your video has been successfully uploaded.</p>
      <p>Download your video: <a href="${videoUrl}" download>Click here</a></p>
      <br>
      <a href="/upload">Upload Another Video</a>
      <br><br>
      <a href="/logout">Logout</a>
    </body>
    </html>
  `);
});

// Logout Route
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
