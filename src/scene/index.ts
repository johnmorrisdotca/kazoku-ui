// One scene, one camera and one clock for the layers of many packages, on the shared renderer's one WebGL context. three.js is not imported here: the page passes its own copy. Imports on a server.
export { composeScene, type ComposedScene, type ComposeOptions, type SceneCamera, type SceneCameraState, type SceneLook, type SceneStats } from "./compose.ts";
export { AU_KM, fitDistanceKm, lengthKm, lowPrecisionSun, orbitOffsetKm, placeInFrame, planSlices, SKY_FAR, SKY_NEAR, SKY_RADIUS, subKm, type DepthSlice, type SliceBody, type SliceOptions } from "./frame.ts";
export type { CameraLike, Credit, Object3DLike, SceneBody, SceneFrame, SceneLayer, SceneLike, SceneThree, Vec3Km } from "./types.ts";
