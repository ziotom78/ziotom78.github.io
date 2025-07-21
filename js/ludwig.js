// main.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.module.js';

export function initLudwigViewer(containerId) {
    const container = document.getElementById(containerId);

    const scene = new THREE.Scene();

    // We use an orthographic camera to avoid perspective illusions
    const aspect = container.clientWidth / container.clientHeight;
    const zoom = 2.0; // Adjust zoom to control visible area
    const camera = new THREE.OrthographicCamera(
        -zoom * aspect, // left
        zoom * aspect, // right
        zoom, // top
        -zoom, // bottom
        0.1, // near
        100 // far
    );
    const cameraTarget = new THREE.Vector3(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setClearColor(0xffffff, 1);
    container.appendChild(renderer.domElement);

    function addAxis(x, y, z, color) {
        const material = new THREE.LineBasicMaterial({
	    color: color
        });
        const points = [];
        points.push(new THREE.Vector3(0, 0, 0));
        points.push(new THREE.Vector3(x, y, z));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const line = new THREE.Line(geometry, material);
        scene.add(line);
    }

    addAxis(1.5, 0, 0, 0x88ff88);
    addAxis(0, 1.5, 0, 0x8888ff);
    addAxis(0, 0, 1.5, 0xff8888);

    // Vectors
    const arrowHeadLength = 0.1;
    const arrowHeadWidth = 0.05;
    const arrowLength = 1;

    // I picked the three colors using the command
    //
    //    pastel distinct 3 'hsl(120, 100.0%, 30.0%)'
    //
    // See <https://github.com/sharkdp/pastel>

    const rArrow = new THREE.ArrowHelper(
        new THREE.Vector3(),
        new THREE.Vector3(),
        1,
        0xff004d,
        arrowHeadLength,
        arrowHeadWidth
    );
    const e1Arrow = new THREE.ArrowHelper(
        new THREE.Vector3(),
        new THREE.Vector3(),
        1,
        0x009900,
        arrowHeadLength,
        arrowHeadWidth
    );
    const e2Arrow = new THREE.ArrowHelper(
        new THREE.Vector3(),
        new THREE.Vector3(),
        1,
        0x0300ff,
        arrowHeadLength,
        arrowHeadWidth
    );

    scene.add(rArrow, e1Arrow, e2Arrow);

    const rLabel = createTextLabel('r');
    const e1Label = createTextLabel('co');
    const e2Label = createTextLabel('cx');

    scene.add(rLabel, e1Label, e2Label);

    const boresightCylinderGeom = new THREE.CylinderGeometry(0.005, 0.005, 0.5, 32);
    const boresightCylinderMat = new THREE.MeshBasicMaterial({
        color: 0x000000
    });
    const boresightCylinder = new THREE.Mesh(boresightCylinderGeom, boresightCylinderMat);
    boresightCylinder.rotation.x = Math.PI / 2; // rotate from y to x axis
    boresightCylinder.position.z = 0.25;

    scene.add(boresightCylinder);

    const polCylinderGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.5, 32);
    const polCylinderMat = new THREE.MeshBasicMaterial({
        color: 0x888888
    });
    const polCylinder = new THREE.Mesh(polCylinderGeom, polCylinderMat);
    polCylinder.rotation.z = Math.PI / 2; // rotate from y to x axis

    scene.add(polCylinder);

    const sphereMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 32),
        new THREE.MeshBasicMaterial({
            color: 0xaaaaaa,
            wireframe: true,
            opacity: 0.3,
            transparent: true
        })
    );
    sphereMesh.rotateX(Math.PI / 2);
    scene.add(sphereMesh);

    // scene.add(new THREE.AxesHelper(1.5));

    // Sliders
    const controlsDiv = document.createElement('div');
    controlsDiv.innerHTML = `
<div class="slider-row">
  <label for="theta">θ (colatitude):</label>
  <span id="theta-val" class="value-display">90</span>
  <input type="range" id="theta" min="0" max="180" value="0">
</div>

<div class="slider-row">
  <label for="phi">φ (azimuth):</label>
  <span id="phi-val" class="value-display">0</span>
  <input type="range" id="phi" min="0" max="360" value="0">
</div>
    `;
    controlsDiv.style.position = 'absolute';
    controlsDiv.style.top = '10px';
    controlsDiv.style.left = '10px';
    controlsDiv.style.background = 'white';
    controlsDiv.style.padding = '10px';
    controlsDiv.style.borderRadius = '8px';
    controlsDiv.style.zIndex = '1';
    container.appendChild(controlsDiv);

    const thetaSlider = controlsDiv.querySelector('#theta');
    const phiSlider = controlsDiv.querySelector('#phi');
    const thetaVal = controlsDiv.querySelector('#theta-val');
    const phiVal = controlsDiv.querySelector('#phi-val');

    function createTextLabel(text) {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        context.font = '48px sans-serif';
        context.fillStyle = 'black';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, size / 2, size / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.3, 0.3, 1); // size of the label
        return sprite;
    }

    function updateVectors(thetaDeg, phiDeg) {
        const theta = THREE.MathUtils.degToRad(thetaDeg);
        const phi = THREE.MathUtils.degToRad(phiDeg);
        const cos_theta = Math.cos(theta);
        const sin_theta = Math.sin(theta);
        const cos_phi = Math.cos(phi);
        const sin_phi = Math.sin(phi);

        const r = new THREE.Vector3(
            sin_theta * cos_phi,
            sin_theta * sin_phi,
            cos_theta
        );
        /* Ludwig’s basis is defined as
         *
         * e_co = e_θ · cosφ - e_φ sinφ
         * e_cx = e_θ · sinφ + e_φ cosφ
         *
         * The two expressions below are just the same, but where e_θ
         * and e_φ have been replaced with their cartesian
         * expressions:
         *
         * e_θ = e_x · cosθ cosφ + e_y · cosθ sinφ - e_z sinθ
         * e_φ = −e_x · sinφ + e_y · cosθ
         */
        const e1 = new THREE.Vector3(
            cos_theta * cos_phi * cos_phi + sin_phi * sin_phi,
            (cos_theta - 1) * cos_phi * sin_phi,
            -sin_theta * cos_phi
        ); // Ludwig co-polar
        const e2 = new THREE.Vector3(
            (cos_theta - 1) * cos_phi * sin_phi,
            cos_phi * cos_phi + cos_theta * sin_phi * sin_phi,
            -sin_theta * sin_phi
        ); // Ludwig cross-polar

        rArrow.position.set(0, 0, 0);
        e1Arrow.position.set(0, 0, 0);
        e2Arrow.position.set(0, 0, 0);

        rArrow.setDirection(r);
        e1Arrow.setDirection(e1);
        e2Arrow.setDirection(e2);

        // Update the position of the labels too
        rLabel.position.copy(r.clone().multiplyScalar(1.1));
        e1Label.position.copy(e1.clone().multiplyScalar(1.02));
        e2Label.position.copy(e2.clone().multiplyScalar(1.02));
    }

    function onSliderChange() {
        const theta = parseFloat(thetaSlider.value);
        const phi = parseFloat(phiSlider.value);
        thetaVal.textContent = theta.toString();
        phiVal.textContent = phi.toString();
        updateVectors(theta, phi);
    }

    thetaSlider.addEventListener('input', onSliderChange);
    phiSlider.addEventListener('input', onSliderChange);
    onSliderChange();

    // Resize and aspect ratio
    function resize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height);

        const aspect = width / height;
        camera.left = -zoom * aspect;
        camera.right = zoom * aspect;
        camera.top = zoom;
        camera.bottom = -zoom;
        // camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    window.addEventListener('resize', resize);
    resize();

    // Trackball-like camera rotation
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let azimuth = Math.PI / 6;
    let elevation = Math.PI / 3;
    let distance = 4;

    function updateCamera() {
        camera.position.set(
            distance * Math.sin(elevation) * Math.sin(azimuth),
            distance * Math.cos(elevation),
            distance * Math.sin(elevation) * Math.cos(azimuth)
        );
        camera.lookAt(cameraTarget);
    }
    updateCamera();

    function onPointerDown(event) {
        isDragging = true;
        lastX = event.clientX || event.touches?.[0]?.clientX;
        lastY = event.clientY || event.touches?.[0]?.clientY;
    }

    function onPointerMove(event) {
        if (!isDragging) return;
        const x = event.clientX || event.touches?.[0]?.clientX;
        const y = event.clientY || event.touches?.[0]?.clientY;
        const dx = x - lastX;
        const dy = y - lastY;
        lastX = x;
        lastY = y;

        azimuth -= dx * 0.01;
        elevation -= dy * 0.01;
        elevation = Math.max(0.01, Math.min(Math.PI - 0.01, elevation));

        updateCamera();
    }

    function onPointerUp() {
        isDragging = false;
    }

    function onWheel(event) {
        event.preventDefault();
        distance *= 1 + event.deltaY * 0.001;
        distance = Math.max(1.5, Math.min(10, distance));
        updateCamera();
    }

    renderer.domElement.addEventListener('mousedown', onPointerDown);
    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('mouseup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, {
        passive: false
    });

    renderer.domElement.addEventListener('touchstart', onPointerDown, {
        passive: true
    });
    renderer.domElement.addEventListener('touchmove', onPointerMove, {
        passive: true
    });
    renderer.domElement.addEventListener('touchend', onPointerUp);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
}
