const express = require('express');
const multer = require('multer');
<<<<<<< HEAD
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3000;
const host = '0.0.0.0';

const JWT_SECRET = 'your_jwt_secret_key';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.use(express.json());

// In-memory user database (for simplicity)
const users = [
    {
        username: 'testuser',
        password: bcrypt.hashSync('password123', 10) 
    }
];

// Helper function to find user by username
const findUserByUsername = (username) => {
    return users.find(user => user.username === username);
};

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user;
        next();
    });
};

// User signup (optional if needed)
app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    if (findUserByUsername(username)) {
        return res.status(400).send('User already exists');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    users.push({ username, password: hashedPassword });
    
    res.status(201).send('User created successfully');
});

// User login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    const user = findUserByUsername(username);
    if (!user) {
        return res.status(400).send('User not found');
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
        return res.status(400).send('Invalid password');
    }

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
});

// Video transcoding route (authenticated)
app.post('/transcode', [authenticateToken, upload.single('file')], (req, res) => {
    const inputFilePath = req.file.path;
    const outputFilePath = path.join('uploads', `output-${Date.now()}.mp4`);

    ffmpeg(inputFilePath)
        .output(outputFilePath)
        .on('end', () => {
            res.send('Video transcoding completed');
            fs.unlinkSync(inputFilePath); // Optionally delete input file
        })
        .on('error', (err) => {
            console.error('Error in transcoding:', err);
            res.status(500).send('Transcoding failed');
        })
        .run();
});

// Optional: Serve transcoded files statically
app.use('/uploads', express.static('uploads'));

app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
=======
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
>>>>>>> 3e04f20 (update2)
});
