import express from 'express';
import * as data from './src/store_data.js';
import { readlink } from 'node:fs/promises';

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

let pid = 'self';
if (pid === 'self') {
  pid = await readlink('/proc/self')
}
const npid = parseInt(pid)

data.watch_process_and_store_data(npid)

app.get('/memory',async (req,res) => {
  const metrics = await data.get_metrics(npid)
  res.send({data: metrics})
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});