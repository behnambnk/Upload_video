const express = require('express');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const fs = require('fs');
require('dotenv').config();
const AWS = require('aws-sdk');
const User  = require('./models/User');
const ffmpeg = require('fluent-ffmpeg');
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
app.get('/signup', async (req, res) => { 
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
  cognito.signUp(params, async (err, data) => {
    if (err) return res.redirect(`/signup?error=${encodeURIComponent(err.message)}`);
    console.log(data);

    try {
      const user = await User.create({ name, email, cognito_id: 'cid' });
    } catch (error) {
      return res.redirect(`/signup?error=${encodeURIComponent('there is error message')}`);
    }

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
  if (!req.session.isAuthenticated) {
    return res.status(403).send('You must be logged in to upload videos.');
  }
  const s3 = new AWS.S3();
  // File is saved in 'uploads/' directory
  const file = req.file;
  // Upload the original video to S3
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: file.filename,
    Body: fs.createReadStream(file.path),
    ACL: 'public-read'
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error uploading video.');
    }
    // Delete the local file after uploading to S3
    fs.unlinkSync(file.path);
    const videoUrl = data.Location;

    // Send file details to SQS
    const sqs = new AWS.SQS();
    const sqsParams = {
      MessageBody: JSON.stringify({
        videoUrl: videoUrl,
        filename: file.filename,
        fileSize: file.size
      }),
      QueueUrl: process.env.SQS_QUEUE_URL
    };

    sqs.sendMessage(sqsParams, (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error sending file details to SQS.');
      }
      res.redirect(`/upload-success?videoUrl=${encodeURIComponent(videoUrl)}`);
    });
  });
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
