const axios = require('axios');
const config = require('./config');

const api = axios.create({
  baseURL: 'https://envdock.cloud/api', // CHANGE THIS to your production URL later
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});


// Auto-inject token
api.interceptors.request.use((req) => {
  const userConfig = config.get();
  if (userConfig && userConfig.token) {
    req.headers.Authorization = `Bearer ${userConfig.token}`;
  }
  return req;
});

api.interceptors.response.use(
    response => response,
    error => {
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return Promise.reject({ message: "Network unreachable. Check your internet connection." });
        }
        return Promise.reject(error);
    }
);

module.exports = api;