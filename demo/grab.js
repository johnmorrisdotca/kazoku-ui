// A drawn globe turned by <kazoku-view-controls> with exact grab (grab-radius): the globe is 120 pixels in radius, the view's controls say `grab-radius="120"`, and a drag of N pixels
// moves the ground at the middle of the globe by N pixels. The page draws the sphere, orthographic, from the events: the surface moves the way the hand does (yaw is minus the longitude at
// the middle, tilt is minus its latitude). ?grab=off leaves the fixed angle across the view, for comparison.
import "./dist/view-controls/define.js";
import "./dist/theme-switch/define.js";

const RADIUS = 120;
const controls = document.getElementById("controls");
const canvas = document.getElementById("globe");
const ctx = canvas.getContext("2d");
const size = canvas.width;
const image = ctx.createImageData(size, size);

if (new URLSearchParams(location.search).get("grab") !== "off") controls.setAttribute("grab-radius", String(RADIUS));

/** The ground at a longitude and latitude (radians): rough blotches in two greys and a colour, with no two neighbouring places alike. */
function ground(lon, lat) {
  const v = Math.sin(lon * 7 + Math.sin(lat * 9) * 2) + Math.sin(lat * 11 - lon * 3) + Math.sin((lon + lat) * 17) * 0.7 + Math.sin(lon * 23 - lat * 5) * 0.5;
  const grid = Math.abs(Math.sin(lon * 6)) < 0.06 || Math.abs(Math.sin(lat * 6)) < 0.06 ? 60 : 0;
  const base = 120 + v * 38 - grid;
  return [base, base * 0.9 + (v > 0.6 ? 40 : 0), base * 0.8 + (v < -0.6 ? 50 : 0)];
}

function draw(state) {
  const lon0 = (-state.yaw * Math.PI) / 180;
  const lat0 = (-state.tilt * Math.PI) / 180;
  const sinLat0 = Math.sin(lat0);
  const cosLat0 = Math.cos(lat0);
  const data = image.data;
  const centre = size / 2;
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const x = (px + 0.5 - centre) / RADIUS;
      const y = (centre - py - 0.5) / RADIUS;
      const rho = Math.hypot(x, y);
      const at = (py * size + px) * 4;
      if (rho > 1) {
        data[at + 3] = 0;
        continue;
      }
      const c = Math.asin(rho);
      const sinC = Math.sin(c);
      const cosC = Math.cos(c);
      const lat = rho === 0 ? lat0 : Math.asin(cosC * sinLat0 + (y * sinC * cosLat0) / rho);
      const lon = lon0 + Math.atan2(x * sinC, rho * cosLat0 * cosC - y * sinLat0 * sinC);
      const [r, g, b] = ground(lon, lat);
      data[at] = r;
      data[at + 1] = g;
      data[at + 2] = b;
      data[at + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  document.getElementById("readout").textContent = `yaw ${state.yaw.toFixed(1)}  tilt ${state.tilt.toFixed(1)}`;
}

controls.addEventListener("kazoku-viewchange", (event) => draw(event.detail));
draw({ yaw: 0, tilt: 0 });
