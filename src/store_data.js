

import duckdb from '@duckdb/node-api';
import * as fs from 'node:fs/promises';

const connection = await duckdb.DuckDBConnection.create();
await connection.run(`ATTACH 'process_metrics'; USE process_metrics;`);
await connection.run(`
  CREATE TABLE IF NOT EXISTS metrics(
    name VARCHAR,
    pid INT,
    ppid INT,
    ts TIMESTAMPTZ,
    RssAnonKB INT,
    RssFileKB INT,
    VmSizeKB INT
  );
  `)


function split_kb(str) {
  return str.split(' ')[0]
}

async function read_process_metrics(pid_) {
  const fh = await fs.open(`/proc/${pid_}/status`);
  let name;
  let pid;
  let rssanon;
  let rssfile;
  let ppid;
  let ts = new Date().toISOString();
  let vmsize;
  for await (const line of fh.readLines()) {
    let [k,v] = line.split(':')
    k = k.trim().toLowerCase();
    v = v.trim();
    if (k == "name") {
      name = v
    } else if (k == "vmsize") {
      vmsize = split_kb(v)
    } else if (k == "rssanon") {
      rssanon = split_kb(v)
    } else if (k == "rssfile") {
      rssfile = split_kb(v)
    } else if (k == "ppid") {
      ppid = v
    } else if (k == "name") {
      name = v
    } else if (k == "pid") {
      pid = v
    }
  }

  const sql = `
  INSERT INTO metrics BY NAME
  SELECT '${name}' as name, '${ts}'::timestamp as ts, ${ppid} as ppid,
    ${rssanon} as RssAnonKB, ${rssfile} as RssFileKB, ${vmsize} as VmSizeKB,
    ${pid} as pid
  `

  await connection.run(sql)

}

export async function watch_process_and_store_data(pid) {
  for (;;) {
    await new Promise(r => setTimeout(r, 1000));
    await read_process_metrics(pid);
  }
}