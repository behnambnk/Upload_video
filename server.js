const express = require('express');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const fs = require('fs');
require('dotenv').config();
const AWS = require('aws-sdk');

AWS.config.update({ region: 'ap-southeast-2' });

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

function isAuthenticated(req, res, next) {
  console.log(req.session);
  if (req.session.isAuthenticated) {
    next();
  } else {
    res.redirect('/login');
  }
}

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
  const { username, password, email, name } = req.body;
  console.log(name);

  const params = {
      ClientId: process.env.COGNITO_CLIENT_ID, 
      Username: username,
      Password: password,
      UserAttributes: [
          {
              Name: 'email',
              Value: email
          },
          {
            Name: 'name',
            Value: name
          }
      ]
  };

  cognito.signUp(params, (err, data) => {
      if (err) {
          return res.status(400).json({ success: false, message: err.message });
      }
    req.session.username = username;
    req.session.isAuthenticated = true;
    res.redirect('/upload');
  });
});

// Route: GET Login Page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route: POST Login
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
    if (err) {
      if (err) {
        return res.status(401).send('Invalid username or password');
      }
    }
    req.session.username = username;
    req.session.isAuthenticated = true;
    res.redirect('/upload');
    console.log(req.session);  
  });
});

// Route: GET Upload Page (Only if logged in)
app.get('/upload', (req, res) => {
  console.log(req.session)
  if (req.session.isAuthenticated) {
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
