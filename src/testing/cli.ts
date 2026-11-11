#!/usr/bin/env node
/// <reference types="node" />
import process from "node:process";
import { browserLockStatus, browserQueueStatus, clearBrowserLock } from "./lock.ts";
import { describeRun, setBrowserPriority } from "./queue.ts";

const command = process.argv[2];
const force = process.argv.includes("--force");

function show(): number {
  const { file, holder, stale, heldMinutes, queue, priority, warnings } = browserQueueStatus();
  if (!holder) console.log(`the browser is free (${file})`);
  else {
    const why = stale ? ` (stale: its pid is gone or it is over three hours old; the next run takes it over, or run: kazoku-browser-lock clear)` : "";
    console.log(`the browser is held by ${describeRun(holder)}, pid ${holder.pid}, for ${heldMinutes} min${why}\n  command: ${holder.command}\n  folder: ${holder.cwd}\n  file: ${file}`);
  }
  console.log(queue.length ? `waiting, in the order they will be served (${queue.length}):` : "nobody is waiting");
  for (const { place, ticket, waitedMinutes, byPriority } of queue) console.log(`  ${place}. ${describeRun(ticket)}, pid ${ticket.pid}, ${waitedMinutes} min${byPriority ? ", first by priority" : ""}\n     folder: ${ticket.cwd}`);
  if (priority) console.log(`priority: ${priority}${queue.some((one) => one.byPriority) ? "" : " (nobody from there is waiting; it is spent when one takes the lock)"}`);
  for (const line of warnings) console.log(`WARNING: ${line}`);
  return holder && !stale ? 1 : 0;
}

if (command === "status") process.exitCode = show();
else if (command === "clear") {
  const { holder, stale } = browserLockStatus();
  if (holder && !stale && !force) {
    console.log(`the browser lock is held by ${holder.repo} pid ${holder.pid}, which is running; stop that run, or use: kazoku-browser-lock clear --force`);
    process.exitCode = 1;
  } else console.log(clearBrowserLock({ force }) ? "cleared the browser lock" : "no browser lock to clear");
} else if (command === "first") {
  const target = process.argv[3];
  if (!target) {
    console.error("usage: kazoku-browser-queue first <folder> | first --clear");
    process.exitCode = 2;
  } else if (target === "--clear") {
    setBrowserPriority(null);
    console.log("no waiter is first by priority now");
  } else {
    setBrowserPriority(target);
    console.log(`the oldest waiter from ${target} (or inside it) is served first; the priority is spent when it takes the lock`);
  }
} else {
  console.error("usage: kazoku-browser-lock status | clear [--force] | first <folder> | first --clear   (also installed as kazoku-browser-queue)");
  process.exitCode = 2;
}
