#!/usr/bin/env node
/// <reference types="node" />
import process from "node:process";
import { browserLockStatus, clearBrowserLock } from "./lock.ts";

const command = process.argv[2];
const force = process.argv.includes("--force");

function show(): number {
  const { file, holder, stale } = browserLockStatus();
  if (!holder) {
    console.log(`the browser lock is free (${file})`);
    return 0;
  }
  const why = stale ? ` (stale: its pid is gone or it is over three hours old; the next run takes it over, or run: kazoku-browser-lock clear)` : "";
  console.log(`the browser lock is held by ${holder.repo} pid ${holder.pid} since ${new Date(holder.startedAt).toLocaleString()}${why}\n  command: ${holder.command}\n  folder: ${holder.cwd}\n  file: ${file}`);
  return stale ? 0 : 1;
}

if (command === "status") process.exitCode = show();
else if (command === "clear") {
  const { holder, stale } = browserLockStatus();
  if (holder && !stale && !force) {
    console.log(`the browser lock is held by ${holder.repo} pid ${holder.pid}, which is running; stop that run, or use: kazoku-browser-lock clear --force`);
    process.exitCode = 1;
  } else console.log(clearBrowserLock({ force }) ? "cleared the browser lock" : "no browser lock to clear");
} else {
  console.error("usage: kazoku-browser-lock status | clear [--force]");
  process.exitCode = 2;
}
