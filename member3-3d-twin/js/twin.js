(function () {
  "use strict";

  var SHIP_TYPES = {
    container: { color: "#e24b4a", label: "high", noiseColors: { ring1: 0xff3333, ring2: 0xff6666 }, ringRadii: [12, 20] },
    cargo:     { color: "#ef9f27", label: "medium", noiseColors: { ring1: 0xffd700, ring2: 0xffe066 }, ringRadii: [9, 14] },
    eco:       { color: "#63c47a", label: "low", noiseColors: { ring1: 0x32ff64, ring2: 0x7dffa0 }, ringRadii: [6, 9] }
  };

  var FLEET = [
    { name: "MV Cauveri",       type: "container", x: -38, z: -22, speed: 18, scale: 16 },
    { name: "MV Tuticorin Bay", type: "cargo",      x: 2,   z: 4,   speed: 12, scale: 13 },
    { name: "Aazhiyam Explorer", type: "eco",       x: 36,  z: -24, speed: 8,  scale: 11 }
  ];

  var container = document.getElementById("scene-container");
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1628);
  scene.fog = new THREE.FogExp2(0x0a1628, 0.0075);

  var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 46, 92);

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 20;
  controls.maxDistance = 220;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.target.set(0, 0, -5);

  scene.add(new THREE.AmbientLight(0x4a6b8a, 0.9));
  var moonLight = new THREE.DirectionalLight(0xaee0ff, 0.8);
  moonLight.position.set(-40, 60, 20);
  scene.add(moonLight);
  var fillLight = new THREE.DirectionalLight(0x0a3d5c, 0.4);
  fillLight.position.set(30, 20, -40);
  scene.add(fillLight);

  var OCEAN_SIZE = 400;
  var OCEAN_SEG = 120;
  var oceanGeo = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, OCEAN_SEG, OCEAN_SEG);
  oceanGeo.rotateX(-Math.PI / 2);

  var basePositions = oceanGeo.attributes.position.array.slice();
  var oceanColors = new Float32Array(oceanGeo.attributes.position.count * 3);
  oceanGeo.setAttribute("color", new THREE.BufferAttribute(oceanColors, 3));

  var oceanMat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.75, metalness: 0.05
  });
  var ocean = new THREE.Mesh(oceanGeo, oceanMat);
  scene.add(ocean);

  var deepColor = new THREE.Color(0x0c2033);
  var foamColor = new THREE.Color(0x6fa8c9);

  function updateOcean(t) {
    var pos = oceanGeo.attributes.position;
    var col = oceanGeo.attributes.color;
    var tmp = new THREE.Color();
    for (var i = 0; i < pos.count; i++) {
      var bx = basePositions[i * 3];
      var bz = basePositions[i * 3 + 2];
      var h = Math.sin(bx * 0.05 + t * 1.1) * 0.55
            + Math.sin(bz * 0.07 - t * 0.8) * 0.45
            + Math.sin((bx + bz) * 0.03 + t * 0.5) * 0.3;
      pos.setY(i, h);
      var foamAmt = Math.max(0, (h - 0.7) / 0.6);
      tmp.copy(deepColor).lerp(foamColor, Math.min(foamAmt, 1) * 0.4);
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }
  updateOcean(0);

  function makeShipCanvas(type) {
    var c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    var ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.scale(2, 2);

    function hull(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - h * 0.5, y + h);
      ctx.lineTo(x + h * 0.4, y + h);
      ctx.closePath();
      ctx.fill();
    }

    if (type === "container") {
      hull(60, 150, 400, 46, "#2c343d");
      ctx.fillStyle = "#1c2126";
      ctx.fillRect(60, 150, 400, 6);
      var containerColors = ["#c94f3f", "#3f7fae", "#e0a63a", "#4a8f5c", "#c94f3f", "#3f7fae"];
      var cw = 46, gap = 4, startX = 90, rows = 3;
      for (var r = 0; r < rows; r++) {
        for (var i = 0; i < 7; i++) {
          ctx.fillStyle = containerColors[(i + r) % containerColors.length];
          ctx.fillRect(startX + i * (cw + gap), 60 + r * 28, cw, 24);
        }
      }
      ctx.fillStyle = "#e7edf2";
      ctx.fillRect(400, 55, 55, 95);
      ctx.fillStyle = "#3a4854";
      for (var wnd = 0; wnd < 3; wnd++) ctx.fillRect(410 + wnd * 15, 65, 8, 8);
      ctx.fillStyle = "#c94f3f";
      ctx.fillRect(430, 20, 14, 40);
    } else if (type === "cargo") {
      hull(80, 150, 340, 44, "#3a4552");
      ctx.fillStyle = "#22282f";
      ctx.fillRect(80, 150, 340, 6);
      ctx.fillStyle = "#8a97a3";
      for (var d = 0; d < 5; d++) {
        ctx.fillRect(120 + d * 45, 105, 34, 45);
        ctx.beginPath();
        ctx.arc(137 + d * 45, 105, 17, Math.PI, 0);
        ctx.fillStyle = "#6b7784";
        ctx.fill();
        ctx.fillStyle = "#8a97a3";
      }
      ctx.fillStyle = "#e7edf2";
      ctx.fillRect(340, 60, 60, 90);
      ctx.fillStyle = "#c9873f";
      ctx.fillRect(370, 15, 16, 46);
    } else {
      hull(150, 155, 190, 34, "#1f5c4a");
      ctx.fillStyle = "#e7edf2";
      ctx.fillRect(220, 110, 45, 48);
      ctx.fillStyle = "#63c47a";
      ctx.beginPath();
      ctx.moveTo(255, 40);
      ctx.lineTo(268, 110);
      ctx.lineTo(255, 110);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#a8f0c0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(255, 40);
      ctx.lineTo(255, 110);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.ellipse(256, 200, 220, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    return c;
  }

  function makeWhaleGeometry() {
    var group = new THREE.Group();
    var bodyMat = new THREE.MeshBasicMaterial({ color: 0x0d1c2e });
    var body = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), bodyMat);
    body.scale.set(2.4, 0.9, 1);
    group.add(body);
    var tail = new THREE.Mesh(new THREE.ConeGeometry(2, 3, 4), bodyMat);
    tail.rotation.z = Math.PI / 2;
    tail.position.set(-7, 0, 0);
    tail.scale.set(0.5, 1, 1.6);
    group.add(tail);
    return group;
  }

  var vessels = [];

  FLEET.forEach(function (data) {
    var cfg = SHIP_TYPES[data.type];
    var canvas = makeShipCanvas(data.type);
    var tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.needsUpdate = true;

    var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
    var sprite = new THREE.Sprite(mat);
    sprite.scale.set(data.scale * 2, data.scale, 1);
    sprite.position.set(data.x, 3, data.z);
    sprite.userData = { name: data.name, type: data.type, speed: data.speed, label: cfg.label };
    scene.add(sprite);

    var ringGroup = new THREE.Group();
    ringGroup.position.set(data.x, 0.15, data.z);
    scene.add(ringGroup);

    var speedFactor = data.speed / 18;
    var r1 = cfg.ringRadii[0] * (0.7 + speedFactor * 0.5);
    var r2 = cfg.ringRadii[1] * (0.7 + speedFactor * 0.5);

    function makeRing(innerR, outerR, color) {
      var g = new THREE.RingGeometry(innerR, outerR, 64);
      g.rotateX(-Math.PI / 2);
      var m = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 0.65,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, depthTest: false
      });
      return new THREE.Mesh(g, m);
    }
    var ringInner = makeRing(r1 * 0.75, r1, cfg.noiseColors.ring1);
    var ringOuter = makeRing(r2 * 0.85, r2, cfg.noiseColors.ring2);
    ringGroup.add(ringInner, ringOuter);

    var wakeCount = 40;
    var wakeGeo = new THREE.BufferGeometry();
    var wakePos = new Float32Array(wakeCount * 3);
    for (var w = 0; w < wakeCount; w++) {
      wakePos[w * 3] = data.x - w * 0.6;
      wakePos[w * 3 + 1] = 0.4;
      wakePos[w * 3 + 2] = data.z + (Math.random() - 0.5) * 2;
    }
    wakeGeo.setAttribute("position", new THREE.BufferAttribute(wakePos, 3));
    var wakeMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, transparent: true, opacity: 0.5 });
    var wake = new THREE.Points(wakeGeo, wakeMat);
    scene.add(wake);

    vessels.push({
      data: data, sprite: sprite, ringGroup: ringGroup,
      ringInner: ringInner, ringOuter: ringOuter,
      baseY: 3, phase: Math.random() * Math.PI * 2,
      wake: wake, wakeCount: wakeCount
    });
  });
    function createVessel(data) {
    var cfg = SHIP_TYPES[data.type];
    var canvas = makeShipCanvas(data.type);
    var tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.needsUpdate = true;

    var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
    var sprite = new THREE.Sprite(mat);
    sprite.scale.set(data.scale * 2, data.scale, 1);
    sprite.position.set(data.x, 3, data.z);
    sprite.userData = { name: data.name, type: data.type, speed: data.speed, label: cfg.label };
    scene.add(sprite);

    var ringGroup = new THREE.Group();
    ringGroup.position.set(data.x, 0.15, data.z);
    scene.add(ringGroup);

    var speedFactor = data.speed / 18;
    var r1 = cfg.ringRadii[0] * (0.7 + speedFactor * 0.5);
    var r2 = cfg.ringRadii[1] * (0.7 + speedFactor * 0.5);

    function makeRing(innerR, outerR, color) {
      var g = new THREE.RingGeometry(innerR, outerR, 64);
      g.rotateX(-Math.PI / 2);
      var m = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 0.65,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, depthTest: false
      });
      return new THREE.Mesh(g, m);
    }
    var ringInner = makeRing(r1 * 0.75, r1, cfg.noiseColors.ring1);
    var ringOuter = makeRing(r2 * 0.85, r2, cfg.noiseColors.ring2);
    ringGroup.add(ringInner, ringOuter);

    var wakeCount = 40;
    var wakeGeo = new THREE.BufferGeometry();
    var wakePos = new Float32Array(wakeCount * 3);
    for (var w = 0; w < wakeCount; w++) {
      wakePos[w * 3] = data.x - w * 0.6;
      wakePos[w * 3 + 1] = 0.4;
      wakePos[w * 3 + 2] = data.z + (Math.random() - 0.5) * 2;
    }
    wakeGeo.setAttribute("position", new THREE.BufferAttribute(wakePos, 3));
    var wakeMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, transparent: true, opacity: 0.5 });
    var wake = new THREE.Points(wakeGeo, wakeMat);
    scene.add(wake);

    return {
      data: data, sprite: sprite, ringGroup: ringGroup,
      ringInner: ringInner, ringOuter: ringOuter,
      baseY: 3, phase: Math.random() * Math.PI * 2,
      wake: wake, wakeCount: wakeCount
    };
  }

  function disposeVessel(v) {
    scene.remove(v.sprite);
    v.sprite.material.map.dispose();
    v.sprite.material.dispose();
    scene.remove(v.ringGroup);
    v.ringInner.geometry.dispose();
    v.ringInner.material.dispose();
    v.ringOuter.geometry.dispose();
    v.ringOuter.material.dispose();
    scene.remove(v.wake);
    v.wake.geometry.dispose();
    v.wake.material.dispose();
  }

  function updateMetricsFromVessels() {
    if (vessels.length === 0) return;
    var totalSpeed = 0;
    var loudest = vessels[0];
    var order = { high: 3, medium: 2, low: 1 };
    vessels.forEach(function (v) {
      totalSpeed += v.data.speed;
      if (order[SHIP_TYPES[v.data.type].label] > order[SHIP_TYPES[loudest.data.type].label]) loudest = v;
    });
    document.getElementById("m-count").textContent = vessels.length;
    document.getElementById("m-speed").textContent = (totalSpeed / vessels.length).toFixed(1) + " kn";
    document.getElementById("m-loud").textContent = loudest.data.name;

    var label = SHIP_TYPES[loudest.data.type].label;
    var statusEl = document.getElementById("m-status");
    if (label === "high") {
      statusEl.textContent = "Elevated";
      statusEl.style.background = "rgba(255,51,51,0.18)";
      statusEl.style.color = "#ff8080";
    } else if (label === "medium") {
      statusEl.textContent = "Moderate";
      statusEl.style.background = "rgba(255,215,0,0.18)";
      statusEl.style.color = "#ffe066";
    } else {
      statusEl.textContent = "Quiet";
      statusEl.style.background = "rgba(50,255,100,0.18)";
      statusEl.style.color = "#8de8a5";
    }
  }
  updateMetricsFromVessels();

  function loadScenario(newFleet) {
    vessels.forEach(disposeVessel);
    vessels.length = 0;
    focusTarget = null;
    hovered = null;
    tooltip.style.display = "none";

    newFleet.forEach(function (data) {
      vessels.push(createVessel(data));
    });

    updateMetricsFromVessels();
  }

  function updateVesselNoise(name, updates) {
    var v = vessels.filter(function (x) { return x.data.name === name; })[0];
    if (!v) return false;

    if (updates.speed !== undefined) v.data.speed = updates.speed;
    if (updates.type !== undefined) v.data.type = updates.type;

    var cfg = SHIP_TYPES[v.data.type];
    var speedFactor = v.data.speed / 18;
    var r1 = cfg.ringRadii[0] * (0.7 + speedFactor * 0.5);
    var r2 = cfg.ringRadii[1] * (0.7 + speedFactor * 0.5);

    v.ringGroup.remove(v.ringInner, v.ringOuter);
    v.ringInner.geometry.dispose();
    v.ringInner.material.dispose();
    v.ringOuter.geometry.dispose();
    v.ringOuter.material.dispose();

    function makeRing(innerR, outerR, color) {
      var g = new THREE.RingGeometry(innerR, outerR, 64);
      g.rotateX(-Math.PI / 2);
      var m = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 0.65,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, depthTest: false
      });
      return new THREE.Mesh(g, m);
    }
    v.ringInner = makeRing(r1 * 0.75, r1, cfg.noiseColors.ring1);
    v.ringOuter = makeRing(r2 * 0.85, r2, cfg.noiseColors.ring2);
    v.ringGroup.add(v.ringInner, v.ringOuter);

    v.sprite.userData.speed = v.data.speed;
    v.sprite.userData.type = v.data.type;
    v.sprite.userData.label = cfg.label;

    updateMetricsFromVessels();
    return true;
  }

  var whale = makeWhaleGeometry();
  whale.position.set(-90, 1, -60);
  whale.rotation.y = 0.4;
  scene.add(whale);

  var mistCount = 260;
  var mistGeo = new THREE.BufferGeometry();
  var mistPos = new Float32Array(mistCount * 3);
  for (var mi = 0; mi < mistCount; mi++) {
    mistPos[mi * 3] = (Math.random() - 0.5) * OCEAN_SIZE;
    mistPos[mi * 3 + 1] = Math.random() * 4 + 0.5;
    mistPos[mi * 3 + 2] = (Math.random() - 0.5) * OCEAN_SIZE;
  }
  mistGeo.setAttribute("position", new THREE.BufferAttribute(mistPos, 3));
  var mistMat = new THREE.PointsMaterial({ color: 0xbfe9ff, size: 1.4, transparent: true, opacity: 0.22 });
  var mist = new THREE.Points(mistGeo, mistMat);
  scene.add(mist);

  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();
  var tooltip = document.getElementById("tooltip");
  var hovered = null;
  var focusTarget = null;
  var defaultCamPos = camera.position.clone();
  var defaultTarget = controls.target.clone();

  function onPointerMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    var sprites = vessels.map(function (v) { return v.sprite; });
    var hits = raycaster.intersectObjects(sprites);
    if (hits.length > 0) {
      hovered = hits[0].object;
      var ud = hovered.userData;
      tooltip.style.display = "block";
      tooltip.style.left = (e.clientX + 16) + "px";
      tooltip.style.top = (e.clientY + 12) + "px";
      var levelColor = ud.label === "high" ? "#ff8080" : ud.label === "medium" ? "#ffe066" : "#8de8a5";
      tooltip.innerHTML =
        '<div class="t-name">' + ud.name + '</div>' +
        '<div class="t-row"><span>Speed</span><span>' + ud.speed + ' kn</span></div>' +
        '<div class="t-row"><span>Noise level</span><span style="color:' + levelColor + '">' + ud.label + '</span></div>';
      document.body.style.cursor = "pointer";
    } else {
      hovered = null;
      tooltip.style.display = "none";
      document.body.style.cursor = "default";
    }
  }

  function onClick() {
    if (hovered) {
      var p = hovered.position;
      focusTarget = {
        camPos: new THREE.Vector3(p.x + 18, p.y + 12, p.z + 22),
        lookAt: new THREE.Vector3(p.x, p.y, p.z)
      };
    } else {
      focusTarget = { camPos: defaultCamPos.clone(), lookAt: defaultTarget.clone() };
    }
  }

  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("click", onClick);

  var slider = document.getElementById("time-slider");
  var timeLabel = document.getElementById("timeline-label");
  var playBtn = document.getElementById("play-btn");
  var playing = true;
  var simTime = 0;

  playBtn.addEventListener("click", function () {
    playing = !playing;
    playBtn.innerHTML = playing ? "&#9654;" : "&#10074;&#10074;";
  });
  slider.addEventListener("input", function () {
    simTime = (slider.value / 100) * 300;
  });

  function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return (m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    if (playing) simTime += dt;

    updateOcean(simTime);

    vessels.forEach(function (v) {
      v.sprite.position.y = v.baseY + Math.sin(simTime * 1.6 + v.phase) * 0.35;

      var pulse1 = 1 + Math.sin(simTime * (v.data.type === "container" ? 2.2 : v.data.type === "cargo" ? 1.5 : 1.0)) * 0.08;
      var pulse2 = 1 + Math.sin(simTime * (v.data.type === "container" ? 1.6 : v.data.type === "cargo" ? 1.1 : 0.7) + 1) * 0.1;
      v.ringInner.scale.set(pulse1, 1, pulse1);
      v.ringOuter.scale.set(pulse2, 1, pulse2);
      v.ringInner.material.opacity = 0.62 + Math.sin(simTime * 2 + v.phase) * 0.1;
      v.ringOuter.material.opacity = 0.45 + Math.sin(simTime * 1.4 + v.phase) * 0.08;

      var wp = v.wake.geometry.attributes.position;
      for (var i = v.wakeCount - 1; i > 0; i--) {
        wp.setXYZ(i, wp.getX(i - 1), 0.4, wp.getZ(i - 1));
      }
      wp.setXYZ(0, v.sprite.position.x, 0.4, v.sprite.position.z + (Math.random() - 0.5) * 0.4);
      wp.needsUpdate = true;
    });

    mist.rotation.y += 0.0003;

    if (focusTarget) {
      camera.position.lerp(focusTarget.camPos, 0.06);
      controls.target.lerp(focusTarget.lookAt, 0.06);
      if (camera.position.distanceTo(focusTarget.camPos) < 0.2) focusTarget = null;
    }

    controls.update();
    renderer.render(scene, camera);

    if (playing) {
      slider.value = Math.min(100, (simTime / 300) * 100);
    }
    timeLabel.textContent = formatTime(simTime % 300);
  }

    animate();

  window.AazhiyamTwin = {
    loadScenario: loadScenario,
    updateVesselNoise: updateVesselNoise,
    getFleetState: function () {
      return vessels.map(function (v) {
        return { name: v.data.name, type: v.data.type, speed: v.data.speed, x: v.data.x, z: v.data.z };
      });
    }
  };
})();
