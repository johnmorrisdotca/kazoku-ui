// The shared 3D renderer: one WebGL context per page for the focused view, shared assets with reference counts, stills in a budgeted list, drawing on demand,
// a pixel budget and context-loss handling. three.js is not imported here: the page passes `load: () => import("three")`. Nothing touches the DOM until a view is made, so it imports on a server.
export { createAssetCache, disposeDeep, type AssetCache, type AssetCacheOptions, type AssetCacheStats, type AssetScope, type Timers } from "./cache.ts";
export { MAX_PIXELS, MAX_RATIO, MAX_SIDE, pixelRatioFor, type PixelLimits } from "./pixels.ts";
export { createSharedRenderer, type BuildContext, type GLRenderer, type Item3D, type RendererStats, type Scene3D, type SharedRenderer, type SharedRendererOptions, type ThreeLike, type View, type ViewOptions } from "./renderer.ts";
export { browserClock, createScheduler, MAX_FPS, type FrameClock, type Job, type Priority, type Scheduler, type SchedulerOptions, type SchedulerStats } from "./scheduler.ts";
export { createStillCache, STILL_BYTES, type Still, type StillCache, type StillCacheOptions } from "./stills.ts";
