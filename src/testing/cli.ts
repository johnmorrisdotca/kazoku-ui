#!/usr/bin/env node
/// <reference types="node" />
import { availableParallelism, loadavg } from "node:os";
import process from "node:process";
import { browserLockStatus, browserQueueStatus, clearBrowserLock } from "./lock.ts";
import { CI_IMAGE_USAGE, parseCiImageArgs, runCiImage } from "./ci-image.ts";
import { describeRun, setBrowserPriority } from "./queue.ts";
import { slotsFile } from "./slots.ts";

const command = process.argv[2];
const force = process.argv.includes("--force");

function show(): number {
  const { slots, configured, queue, priority, imagePriority, warnings } = browserQueueStatus();
  const native = slots.filter((slot) => slot.kind === "native");
  const image = slots.filter((slot) => slot.kind === "image");
  const held = (slot: (typeof slots)[number], label: string): void => {
    const { holder, stale, heldMinutes, file } = slot;
    if (!holder) return console.log(`${label} is free (${file})`);
    const why = stale ? ` (stale: its pid is gone or it is over three hours old; the next run takes it over, or run: kazoku-browser-lock clear)` : "";
    console.log(`${label} is held by ${describeRun(holder)}, pid ${holder.pid}, for ${heldMinutes} min${why}\n  command: ${holder.command}\n  folder: ${holder.cwd}\n  file: ${file}`);
  };
  native.forEach((slot, index) => held(slot, native.length === 1 ? "the browser" : `native slot ${index + 1} of ${native.length}`));
  if (configured.image === 0 && image.length === 0) console.log(`image slots: none set up on this machine (${slotsFile()}; for example {"native": 1, "image": 4})`);
  else {
    console.log(`image slots: ${image.filter((slot) => slot.holder).length} of ${Math.max(configured.image, image.length)} in use (runs in the CI image, ${slotsFile()})`);
    image.forEach((slot, index) => held(slot, `image slot ${index + 1}`));
  }
  const kinds = [["native", priority], ["image", imagePriority]] as const;
  for (const [kind, first] of kinds) {
    const line = queue.filter((entry) => entry.kind === kind);
    if (kind === "image" && configured.image === 0 && line.length === 0) continue;
    const name = kind === "native" ? "" : "for an image slot ";
    console.log(line.length ? `waiting ${name}in the order they will be served (${line.length}):` : kind === "native" ? "nobody is waiting" : "nobody is waiting for an image slot");
    for (const { place, ticket, waitedMinutes, byPriority } of line) console.log(`  ${place}. ${describeRun(ticket)}, pid ${ticket.pid}, ${waitedMinutes} min${byPriority ? ", first by priority" : ""}\n     folder: ${ticket.cwd}`);
    if (first) console.log(`${kind === "image" ? "image " : ""}priority: ${first}${line.some((one) => one.byPriority) ? "" : " (nobody from there is waiting; it is spent when one takes a slot)"}`);
  }
  const [one, five, fifteen] = loadavg().map((value) => value.toFixed(1));
  console.log(`load: ${one} ${five} ${fifteen} (1, 5 and 15 min) on ${availableParallelism()} cores`);
  for (const line of warnings) console.log(`WARNING: ${line}`);
  // Exit 1 while a live run holds a native slot (the machine's own browser is busy). Runs in the CI image do not count: they are fenced.
  return native.some((slot) => slot.holder && !slot.stale) ? 1 : 0;
}

if (command === "status") process.exitCode = show();
else if (command === "clear") {
  const { holder, stale } = browserLockStatus();
  if (holder && !stale && !force) {
    console.log(`the browser lock is held by ${holder.repo} pid ${holder.pid}, which is running; stop that run, or use: kazoku-browser-lock clear --force`);
    process.exitCode = 1;
  } else console.log(clearBrowserLock({ force }) ? "cleared the browser lock" : "no browser lock to clear");
} else if (command === "first") {
  const rest = process.argv.slice(3);
  const kind = rest.includes("--image") ? "image" : "native";
  const target = rest.find((word) => word !== "--image");
  const where = kind === "image" ? "the image line" : "the line for the browser";
  if (!target) {
    console.error("usage: kazoku-browser-queue first <folder> [--image] | first --clear [--image]");
    process.exitCode = 2;
  } else if (target === "--clear") {
    setBrowserPriority(null, kind);
    console.log(`no waiter in ${where} is first by priority now`);
  } else {
    setBrowserPriority(target, kind);
    console.log(`in ${where}, the oldest waiter from ${target} (or inside it) is served first; the priority is spent when it takes a slot`);
  }
} else if (command === "ci-image") {
  try {
    const line = parseCiImageArgs(process.argv.slice(3));
    if (line.help) console.log(CI_IMAGE_USAGE);
    else process.exitCode = await runCiImage(line);
  } catch (error) {
    console.error(`kazoku-ci-image: ${(error as Error).message}`);
    process.exitCode = 2;
  }
} else {
  console.error("usage: kazoku-browser-lock status | clear [--force] | first <folder> [--image] | first --clear [--image] | ci-image [options] -- <playwright arguments>   (also installed as kazoku-browser-queue; ci-image is also kazoku-ci-image)");
  process.exitCode = 2;
}
