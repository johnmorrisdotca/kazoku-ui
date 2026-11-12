#!/usr/bin/env node
/// <reference types="node" />
import process from "node:process";
import { CI_IMAGE_USAGE, parseCiImageArgs, runCiImage } from "./ci-image.ts";

try {
  const line = parseCiImageArgs(process.argv.slice(2));
  if (line.help) console.log(CI_IMAGE_USAGE);
  else process.exitCode = await runCiImage(line);
} catch (error) {
  console.error(`kazoku-ci-image: ${(error as Error).message}`);
  process.exitCode = 2;
}
