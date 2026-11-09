import type { Locator, Page } from "@playwright/test";

/** The part of a picture that is followed, as shares of its width and height: left, right, top, bottom. */
export type Window = [number, number, number, number];
export interface Shift {
  x: number;
  y: number;
  error: number;
}
export function bestShift(before: ArrayLike<number>, after: ArrayLike<number>, w: number, h: number, reach: number, window?: Window): Shift;
export function groundShift(page: Page, before: Buffer, after: Buffer, reach?: number, window?: Window): Promise<Shift>;
export function windowAround(aim?: [number, number], span?: number): Window;
export function frames(page: Page, count?: number): Promise<void>;
export function settledPicture(page: Page, view: Locator, options?: { before?: Buffer; ready?: () => Promise<unknown>; settle?: number; timeout?: number }): Promise<Buffer>;
export function dragBy(page: Page, target: Locator, dx: number, dy: number, at?: [number, number]): Promise<void>;
export function movedBy(page: Page, view: Locator, act: () => Promise<void>, options?: { settle?: number; reach?: number; window?: Window; ready?: () => Promise<unknown>; timeout?: number }): Promise<Shift>;
export function checkFollowsTheHand(page: Page, options: { view: string; picture?: string; window?: Window; controls?: string; min?: number; settle?: number; ready?: () => Promise<unknown>; timeout?: number; keys?: boolean; autoTurn?: "right" | "left" | false; distance?: number }): Promise<void>;
export function checkExactGrab(page: Page, options: { view: string; picture?: string; radius: number; tolerance?: number; aim?: [number, number]; span?: number; window?: Window; settle?: number; ready?: () => Promise<unknown>; timeout?: number; reach?: number }): Promise<void>;
