const express = require('express');
const multer = require('multer');
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
});
