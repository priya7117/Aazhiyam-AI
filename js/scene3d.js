// scene3d.js
// Three.js digital twin: realistic procedural vessel hulls + smooth pulsing
// acoustic rings, synced to window.AppState.classification.

const Scene3D = (function () {

  const container = document.getElementById('scene-container');

  let scene, camera, renderer, clock;
  let vessels = [];

  const NOISE_COLORS = {
    low: 0x4ade80,
    medium: 0xfbbf24,
    high: 0xf87171
  };

  const RING_PERIOD = 2.6; // seconds per pulse cycle
  const RING_MAX_SCALE = 7;

  function init() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x041a26);
    scene.fog = new THREE.Fog(0x041a26, 30, 70);

    camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    camera.position.set(0, 22, 32);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting — hemisphere for sky/water ambient + directional "sun"
    const hemi = new THREE.HemisphereLight(0xbde8ea, 0x0b2b3d, 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff3d9, 0.9);
    sun.position.set(15, 25, 10);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8fd3e8, 0.3);
    fill.position.set(-15, 10, -10);
    scene.add(fill);

    createWater();

    clock = new THREE.Clock();

    // Vessel 0 = the vessel tied to live classification results.
    createVessel({ x: 0, z: 0 }, { noiseClass: 'low', frequency: null, status: 'Awaiting analysis', vesselType: 'research vessel' }, true);
    // Ambient context vessels — scenery, not synced to classifier.
    createVessel({ x: -14, z: -9 }, { noiseClass: 'medium', frequency: 118, status: 'Elevated', vesselType: 'cargo ship' }, false);
    createVessel({ x: 13, z: 10 }, { noiseClass: 'low', frequency: 82, status: 'Normal', vesselType: 'fishing boat' }, false);

    animate();
    window.addEventListener('resize', onResize);
    window.AppState.sceneReady = true;

    document.addEventListener('azhiyam:classificationResult', (e) => {
      updateMonitoredVessel(e.detail);
    });
  }

  function createWater() {
    const geo = new THREE.PlaneGeometry(90, 90, 60, 60);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0b3a52,
      roughness: 0.35,
      metalness: 0.15,
      side: THREE.DoubleSide
    });
    const water = new THREE.Mesh(geo, mat);
    water.rotation.x = -Math.PI / 2;
    water.userData.isWater = true;
    scene.add(water);
  }

  // Builds a hull silhouette (pointed bow, flat stern) as an extruded shape.
  function buildHull(length, beam, height, color, roughness) {
    const shape = new THREE.Shape();
    const hb = beam / 2;
    shape.moveTo(-length / 2, -hb);
    shape.lineTo(length / 2 - beam * 0.35, -hb);
    shape.quadraticCurveTo(length / 2, -hb * 0.25, length / 2, 0);
    shape.quadraticCurveTo(length / 2, hb * 0.25, length / 2 - beam * 0.35, hb);
    shape.lineTo(-length / 2, hb);
    shape.lineTo(-length / 2 - beam * 0.12, 0);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({ color, roughness: roughness || 0.55, metalness: 0.25 });
    const hull = new THREE.Mesh(geo, mat);
    hull.position.y = -height * 0.55; // sit mostly in the water
    return hull;
  }

  // Cargo ship / tanker: larger hull, bridge + funnel at stern, deck cargo detail.
  function buildCargoVessel(isTanker) {
    const group = new THREE.Group();
    const hull = buildHull(6.2, 1.7, 0.9, isTanker ? 0xb0413e : 0x8a8f94, 0.5);
    group.add(hull);

    // Bridge / superstructure toward stern
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 1.3),
      new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.4 })
    );
    bridge.position.set(-2.1, 0.55, 0);
    group.add(bridge);

    const funnel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 0.5, 12),
      new THREE.MeshStandardMaterial({ color: 0xb0413e, roughness: 0.6 })
    );
    funnel.position.set(-2.4, 1.15, 0);
    group.add(funnel);

    if (isTanker) {
      // Tank domes along the deck
      for (let i = -1; i <= 1.5; i += 1.2) {
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.45, 1.3, 16),
          new THREE.MeshStandardMaterial({ color: 0xd6d9dc, roughness: 0.35, metalness: 0.4 })
        );
        tank.rotation.z = Math.PI / 2;
        tank.position.set(i, 0.35, 0);
        group.add(tank);
      }
    } else {
      // Stacked cargo containers
      const containerColors = [0x2f6f76, 0xb45f2c, 0x3d6b3a, 0x8a2f3e];
      let idx = 0;
      for (let x = -1.4; x <= 1.6; x += 0.75) {
        for (let layer = 0; layer < 2; layer++) {
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.3, 1.2),
            new THREE.MeshStandardMaterial({ color: containerColors[idx % containerColors.length], roughness: 0.7 })
          );
          box.position.set(x, 0.25 + layer * 0.32, 0);
          group.add(box);
          idx++;
        }
      }
    }
    return group;
  }

  // Fishing / research boat: smaller hull, single cabin, thin mast.
  function buildBoatVessel(isResearch) {
    const group = new THREE.Group();
    const hull = buildHull(2.8, 1.0, 0.55, isResearch ? 0xe8ecef : 0x2f6f76, 0.5);
    group.add(hull);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.55, 0.7),
      new THREE.MeshStandardMaterial({ color: isResearch ? 0x1f4a5c : 0xf4f1ea, roughness: 0.45 })
    );
    cabin.position.set(0.2, 0.42, 0);
    group.add(cabin);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
    );
    mast.position.set(-0.6, 0.9, 0);
    group.add(mast);

    return group;
  }

  function buildVesselModel(vesselType) {
    const type = (vesselType || '').toLowerCase();
    if (type.includes('tanker')) return buildCargoVessel(true);
    if (type.includes('cargo')) return buildCargoVessel(false);
    if (type.includes('research')) return buildBoatVessel(true);
    return buildBoatVessel(false); // fishing boat / default
  }

  // Creates a vessel with model + 3 continuously pulsing ring meshes.
  function createVessel(position, data, isMonitored) {
    const group = new THREE.Group();

    const model = buildVesselModel(data.vesselType);
    // Face bow toward a varied heading so vessels don't all point the same way
    model.rotation.y = Math.random() * Math.PI * 2;
    group.add(model);

    const ringGeo = new THREE.RingGeometry(0.85, 1, 48);
    const ringColor = NOISE_COLORS[data.noiseClass] || 0x999999;
    const ringMeshes = [];
    for (let i = 0; i < 3; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      group.add(ring);
      ringMeshes.push(ring);
    }

    group.position.set(position.x, 0, position.z);
    scene.add(group);

    const vessel = {
      group,
      model,
      ringMeshes,
      isMonitored: !!isMonitored,
      phaseOffset: Math.random() * RING_PERIOD,
      bobPhase: Math.random() * Math.PI * 2,
      data
    };
    vessels.push(vessel);
    return vessel;
  }

  // Rebuilds the monitored vessel's ship model (if type changed) and updates
  // its ring color — called whenever a new classification result arrives.
  function updateMonitoredVessel(result) {
    const monitored = vessels.find((v) => v.isMonitored);
    if (!monitored) return;

    monitored.data = result;

    const currentType = monitored.data.vesselType;
    if (monitored.model.userData.builtType !== currentType) {
      monitored.group.remove(monitored.model);
      const newModel = buildVesselModel(currentType);
      newModel.userData.builtType = currentType;
      newModel.rotation.y = monitored.model.rotation.y;
      monitored.model = newModel;
      monitored.group.add(newModel);
    }

    const color = NOISE_COLORS[result.noiseClass] || 0x999999;
    monitored.ringMeshes.forEach((ring) => ring.material.color.setHex(color));
  }

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    vessels.forEach((v) => {
      // Gentle bobbing for realism
      v.group.position.y = Math.sin(t * 0.8 + v.bobPhase) * 0.06;
      v.group.rotation.z = Math.sin(t * 0.6 + v.bobPhase) * 0.015;

      // Continuous smooth pulse per ring, staggered by 1/3 period each
      v.ringMeshes.forEach((ring, i) => {
        const phase = (t + v.phaseOffset + (i * RING_PERIOD) / 3) % RING_PERIOD;
        const progress = phase / RING_PERIOD; // 0 -> 1
        const scale = 1 + progress * RING_MAX_SCALE;
        const opacity = (1 - progress) * 0.55;
        ring.scale.set(scale, scale, scale);
        ring.material.opacity = Math.max(opacity, 0);
      });
    });

    renderer.render(scene, camera);
  }

  function onResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  // Forces a fresh render then returns a PNG data URL — used by report.js.
  function captureSnapshot() {
    if (!renderer) return null;
    try {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    } catch (err) {
      console.error('Scene snapshot failed:', err);
      return null;
    }
  }

  // Summary of everything currently on screen — used by report.js.
  function getSceneSummary() {
    return vessels.map((v) => ({
      monitored: v.isMonitored,
      vesselType: v.data.vesselType,
      noiseClass: v.data.noiseClass,
      frequency: v.data.frequency,
      status: v.data.status
    }));
  }

  init();

  return { createVessel, updateMonitoredVessel, captureSnapshot, getSceneSummary };

})();