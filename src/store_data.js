import * as duckdb from '@duckdb/node-api';
import { readFile, readlink } from 'node:fs/promises';

const connection = await duckdb.DuckDBConnection.create();
await connection.run(`ATTACH 'process_metrics'; USE process_metrics;`);
await connection.run(`
  CREATE TABLE IF NOT EXISTS metrics(
    name VARCHAR,
    pid INTEGER,
    ppid INTEGER,
    ts TIMESTAMPTZ,
    RssAnonKB INTEGER,
    RssFileKB INTEGER,
    VmSizeKB INTEGER
  );
`);

async function read_metrics(pid) {
  const content = await readFile(`/proc/${pid}/status`, 'utf8');
  const raw = Object.fromEntries(
    content.split('\n')
      .filter(line => line.includes(':'))
      .map(line => {
        const [k, v] = line.split(/:\s+/);
        return [k.toLowerCase(), v.trim()];
      })
  );

  return {
    name: raw.name,
    pid: parseInt(raw.pid),
    ppid: parseInt(raw.ppid),
    ts: new Date(),
    RssAnonKB: parseInt(raw.rssanon) || 0,
    RssFileKB: parseInt(raw.rssfile) || 0,
    VmSizeKB: parseInt(raw.vmsize) || 0
  };
}

export async function get_metrics(pid, epoch_ms) {
  const sql = `
    select epoch_ms(ts)::DOUBLE as epoch_ms,RssAnonKB::REAL as RssAnonKB,
      VmSizeKB::REAL as VmSizeKB from metrics
    where pid = $pid and current_timestamp - ts <= '5 minutes'
      and ts > make_timestamp_ms(coalesce($epoch_ms, 0))
    `
  return (await connection.run(sql, {
      pid: pid,
      epoch_ms: epoch_ms ?? null
    })).getRowObjects()
}

export async function watch_process_and_store_data(pid) {
  for (;;) {
    try {
      const stats = await read_metrics(pid);

      await connection.run(
        `INSERT INTO metrics BY NAME
        SELECT $name as name, $pid as pid, $ppid as ppid, $ts as ts,
                $RssAnonKB as RssAnonKB, $RssFileKB as RssFileKB, $VmSizeKB as VmSizeKB`,
        {
          name: stats.name,
          pid: stats.pid,
          ppid: stats.ppid,
          ts: stats.ts.toISOString(),
          RssAnonKB: stats.RssAnonKB,
          RssFileKB: stats.RssFileKB,
          VmSizeKB: stats.VmSizeKB
        }
      );

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      if (err.code === 'ENOENT') break;
      throw err;
    }
  }
}