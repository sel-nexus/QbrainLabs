
const axios = require('axios');

async function testAxios() {
    const baseURL = '/api';
    const instance = axios.create({ baseURL });

    // We can't actually make a request, but we can see the resulting URL
    // via a request interceptor or by looking at the config in a catch block
    instance.interceptors.request.use(config => {
        console.log(`Input: '/join', BaseURL: '${baseURL}' -> Resulting URL: '${config.url}'`);
        // To see the full URL axios would use, we'd need to see how it's dispatched
        return config;
    });

    try {
        await instance.post('/join');
    } catch (e) {
        // Ignored
    }

    const instance2 = axios.create({ baseURL });
    instance2.interceptors.request.use(config => {
        console.log(`Input: 'join', BaseURL: '${baseURL}' -> Resulting URL: '${config.url}'`);
        return config;
    });

    try {
        await instance2.post('join');
    } catch (e) {
        // Ignored
    }
}

testAxios();
