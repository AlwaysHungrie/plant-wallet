
import axios from 'axios';

async function test() {
    console.log("Starting test...");
    try {
        // This will likely hang or take time if it's waiting for input or a long command
        // We want to see if the server kills it after 30s
        const response = await axios.post('http://localhost:3000/wallet/create', {}, { timeout: 40000 });
        console.log("Response:", response.data);
    } catch (error: any) {
        if (error.code === 'ECONNABORTED') {
            console.log("Request timed out (client side)");
        } else {
            console.error("Error:", error.message);
        }
    }
}

test();
