import express from 'express';
import * as data from './src/store_data.js';

const app = express();
const PORT = 3000;

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// Parse JSON bodies
app.use(express.json());

app.post('/api/calculate', (req, res) => {
    const { numbers } = req.body;
    const sum = numbers.reduce((a, b) => a + b, 0);
    res.json({ result: sum });
});

const pid = 'self';

data.watch_process_and_store_data(pid)

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});