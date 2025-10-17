const mv = document.getElementById('mv');
const hue = document.getElementById('hue');
const hueVal = document.getElementById('hueVal');
const disp = document.getElementById('disp');
const dispVal = document.getElementById('dispVal');

// Hue rotation via CSS filter (viewer only; not iOS Quick Look AR)
function applyHue(deg) {
	mv.style.filter = `hue-rotate(${deg}deg)`;
	hueVal.textContent = deg;
}

hue.addEventListener('input', () => applyHue(hue.value));
applyHue(hue.value);

// Geometry displacement (viewer only; not iOS Quick Look AR)
const originalGeometry = new WeakMap();

function cacheGeometry(mesh) {
	const geom = mesh.geometry;
	if (!geom || originalGeometry.has(geom)) return;
	const pos = geom.getAttribute('position');
	const norm = geom.getAttribute('normal');
	if (!pos || !norm) return;
	originalGeometry.set(geom, {
		positions: pos.array.slice(0),
		normals: norm.array.slice(0)
	});
}

function applyDisplacement(cm) {
	const d = (cm / 100); // cm -> meters

	const scene = mv.model?.scene;
	if (!scene) return;

	scene.traverse((obj) => {
		if (!obj.isMesh || !obj.geometry) return;

		const geom = obj.geometry;
		const pos = geom.getAttribute('position');
		const norm = geom.getAttribute('normal');
		if (!pos || !norm) return;

		cacheGeometry(obj);
		const cached = originalGeometry.get(geom);
		if (!cached) return;

		const pArr = pos.array;
		const nArr = norm.array;
		const p0 = cached.positions;

		for (let i = 0; i < pArr.length; i += 3) {
			pArr[i]     = p0[i]     + nArr[i]     * d;
			pArr[i + 1] = p0[i + 1] + nArr[i + 1] * d;
			pArr[i + 2] = p0[i + 2] + nArr[i + 2] * d;
		}

		pos.needsUpdate = true;
		geom.computeVertexNormals();
		geom.computeBoundingSphere?.();
		geom.computeBoundingBox?.();
	});
}

function updateDisp() {
	const cm = Number(disp.value) * 0.1; // 0..10 steps => 0..1.0 cm
	dispVal.textContent = cm.toFixed(1);
	applyDisplacement(cm);
}

// Ensure model is loaded before manipulating geometry
mv.addEventListener('load', () => {
	mv.model?.scene?.traverse((obj) => obj.isMesh && cacheGeometry(obj));
	updateDisp();
});

disp.addEventListener('input', updateDisp);