const bcrypt = require('bcryptjs');

// Hardcoded user
const users = [
    {
        username: 'testuser',
        password: 'password123' // hashed password for 'password123'
    }
];

// Function to find user by username
const findUserByUsername = (username) => {
    return users.find(user => user.username === username);
};

// Export the function
module.exports = {
    findUserByUsername
};