import * as duckdb from '@duckdb/node-api';
import { readFile } from 'node:fs/promises';

const connection = await duckdb.DuckDBConnection.create();
await connection.run(`ATTACH 'process_metrics'; USE process_metrics;`);
await connection.run(`
  CREATE TABLE IF NOT EXISTS process_metrics(
    name VARCHAR,
    pid INTEGER,
    ppid INTEGER,
    ts TIMESTAMPTZ,
    rss_anon_kb INTEGER,
    rss_file_kb INTEGER,
    vm_size_kb INTEGER,
    rchar BIGINT,
    wchar BIGINT,
    syscr BIGINT,
    syscw BIGINT,
    read_bytes BIGINT,
    write_bytes BIGINT,
    voluntary_ctxt_switches BIGINT,
    nonvoluntary_ctxt_switches BIGINT,
    minflt BIGINT,
    majflt BIGINT,
    utime_microseconds BIGINT,
    stime_microseconds BIGINT,
    num_threads INT
  );
`);

// In the future consider getting this programatically.
const _SC_CLK_TCK = 100;

const microseconds_in_second = 1e6;

function getProcessMetrics(content) {
  try {
    const fields = content.trim().split(' ');

    return {
      minflt: parseInt(fields[9]),
      majflt: parseInt(fields[11]),
      utime_microseconds: Math.floor((parseInt(fields[13])/_SC_CLK_TCK)/microseconds_in_second),
      stime_microseconds: Math.floor((parseInt(fields[14])/_SC_CLK_TCK)/microseconds_in_second),
      num_threads: parseInt(fields[19])
    };
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function read_metrics(pid) {
  const [status_content,iostat,stat_content] = await Promise.all(
    [
      readFile(`/proc/${pid}/status`, 'utf8'),
      readFile(`/proc/${pid}/io`,'utf8'),
      readFile(`/proc/${pid}/stat`,'utf8')
    ])
  const content = status_content + iostat;

  const kvraw = Object.fromEntries(
    content.split('\n')
      .filter(line => line.includes(':'))
      .map(line => {
        const [k, v] = line.split(/:\s+/);
        return [k.toLowerCase(), v.trim()];
      })
  );
  const rawstat = getProcessMetrics(stat_content)
  const raw = Object.assign(kvraw, rawstat);


  return {
    name: raw.name,
    pid: parseInt(raw.pid),
    ppid: parseInt(raw.ppid),
    ts: new Date(),
    rss_anon_kb: parseInt(raw.rssanon), // parseInt('40 KB') = 40
    rss_file_kb: parseInt(raw.rssfile),
    vm_size_kb: parseInt(raw.vmsize),
    rchar: parseInt(raw.rchar),
    wchar: parseInt(raw.wchar),
    syscr: parseInt(raw.syscr),
    syscw: parseInt(raw.syscw),
    read_bytes: parseInt(raw.read_bytes),
    write_bytes: parseInt(raw.write_bytes),
    voluntary_ctxt_switches: parseInt(raw.voluntary_ctxt_switches),
    nonvoluntary_ctxt_switches: parseInt(raw.nonvoluntary_ctxt_switches),
    utime_microseconds: raw.utime_microseconds,
    stime_microseconds: raw.stime_microseconds,
    minflt: raw.minflt,
    majflt: raw.majflt,
    num_threads: raw.num_threads
  };
}

export async function get_metrics(pid, epoch_ms) {
  const sql = `
    select
      epoch_ms(ts)::DOUBLE as epoch_ms,
      rss_anon_kb::REAL as rss_anon_kb,
      vm_size_kb::REAL as vm_size_kb
    from process_metrics
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
        `INSERT INTO process_metrics BY NAME
        SELECT $name as name, $pid as pid, $ppid as ppid, $ts as ts,
                $rss_anon_kb as rss_anon_kb, $rss_file_kb as rss_file_kb,
                $vm_size_kb as vm_size_kb,
                $rchar as rchar, $wchar as wchar, $syscr as syscr, $syscw as syscw,
                $read_bytes as read_bytes, $write_bytes as write_bytes,
                $voluntary_ctxt_switches as voluntary_ctxt_switches,
                $nonvoluntary_ctxt_switches as nonvoluntary_ctxt_switches,
                $utime_microseconds as utime_microseconds,
                $stime_microseconds as stime_microseconds,
                $minflt as minflt,
                $majflt as majflt,
                $num_threads as num_threads
        `,
        {...stats, ts: stats.ts.toISOString()}
      );

      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      if (err.code === 'ENOENT') break;
      throw err;
    }
  }
}