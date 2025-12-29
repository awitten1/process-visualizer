import { useState, useEffect } from 'react';
import './App.css';
import Graph from './components/graph';

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (isPaused) return;
      try {
        let url = '/memory';
        const params = new URLSearchParams();
        if (startTime) params.append('start', startTime);
        if (endTime) params.append('end', endTime);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url);
        const json = await response.json();
        setData(json.data);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [startTime, endTime, isPaused]);

  return (
    <div className="content">
      <h1>Process Visualizer</h1>
      <div className="controls">
        <label>
          Start TS:
          <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
        </label>
        <label>
          End TS:
          <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </label>
        <button
          className={`pause-btn ${isPaused ? 'paused' : ''}`}
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>
      {loading ? (
        <p>Loading metrics...</p>
      ) : (
        <Graph data={data} />
      )}
    </div>
  );
};

export default App;
