// A page that imports the renderer but never needs 3D until asked: the import of "three" is inside `load`, so it is not fetched before the first focus.
import { createSharedRenderer } from "./dist/renderer/index.js";

const renderer = createSharedRenderer({ load: () => import("three") });
const host = document.getElementById("host");
const view = renderer.view(host, {
  key: "ball",
  build: ({ three, assets, width, height }) => {
    const geometry = assets.acquire("geometry:ball", () => new three.SphereGeometry(1, 24, 16), (g) => g.dispose());
    const material = assets.acquire("material:ball", () => new three.MeshNormalMaterial(), (m) => m.dispose());
    const scene = new three.Scene();
    scene.add(new three.Mesh(geometry, material));
    const camera = new three.PerspectiveCamera(35, width / height, 0.1, 50);
    camera.position.z = 4;
    return { scene, camera, resize: (w, h) => { camera.aspect = w / h; camera.updateProjectionMatrix(); } };
  },
});
document.getElementById("go").addEventListener("click", () => view.focus());
window.kazokuDemo = { renderer, view };
