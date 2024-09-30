const axios = require('axios');

// Configurations
const loginUrl = 'http://ec2-13-55-185-154.ap-southeast-2.compute.amazonaws.com:3000/login';
const transcodeUrl = 'http://ec2-13-55-185-154.ap-southeast-2.compute.amazonaws.com:3000/transcode';
const loginPayload = {
  username: 'testuser',
  password: 'password123'
};
const transcodePayload = {
  fileName: 'sample-video.mp4'
};

// Function to login and retrieve the token
async function login() {
  try {
    const response = await axios.post(loginUrl, loginPayload);
    const token = response.data.token;
    return token;
  } catch (error) {
    console.error('Error logging in:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Function to create a transcode request
async function createTranscodeRequest(token) {
  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    const response = await axios.post(transcodeUrl, transcodePayload, { headers });
    return response.data;
  } catch (error) {
    console.error('Error in transcode request:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Main function to login and send 10 transcode requests
(async () => {
  try {
    // Step 1: Login
    const token = await login();
    console.log('Login successful, token:', token);

    // Step 2: Create 10 transcode requests
    for (let i = 0; i < 100; i++) {
      const response = await createTranscodeRequest(token);
      console.log(`Transcode request #${i + 1} response:`, response);
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
})();