let three = {
  renderer: null,
  camera: null,
  scene: null,
}

let cesium = {
  viewer: null,
}

let minWGS84 = [115.23,39.55];
let maxWGS84 = [116.23,41.55];

let cesiumContainer = document.getElementById('cesiumContainer')
let ThreeContainer = document.getElementById('ThreeContainer')
let _3Dobjects = [] // Could be any Three.js object mesh

function _3DObject() {
  this.threeMesh = null // Three.js 3DObject.mesh
  this.minWGS84 = null // location bounding box
  this.maxWGS84 = null
}

function initCesium() {
  cesium.viewer = new Cesium.Viewer(cesiumContainer, {
    useDefaultRenderLoop: false,
    selectionIndicator: false,
    homeButton: false,
    sceneModePicker: false,
    infoBox: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    allowTextureFilterAnisotropic: false,
    baseLayerPicker: false,

    // contextOptions: {
    //   webgl: {
    //     alpha: false,
    //     antialias: true,
    //     preserveDrawingBuffer: true,
    //     failIfMajorPerformanceCaveat: false,
    //     depth: true,
    //     stencil: false,
    //     anialias: false,
    //   },
    // },

    targetFrameRate: 60,
    // resolutionScale: 0.1,
    orderIndependentTranslucency: true,
    geocoder: false,
    imageryProvider: new Cesium.ArcGisMapServerImageryProvider({
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
    }),
    automaticallyTrackDataSourceClocks: false,
    // creditContainer : "hidecredit", // Cannot read properties of null (reading 'appendChild')
    dataSources: null,
    clock: null,
    terrainShadows: Cesium.ShadowMode.DISABLED,
  })
  cesium.viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      (minWGS84[0] + maxWGS84[0]) / 2,
      (minWGS84[1] + maxWGS84[1]) / 2 - 1.25,
      200000
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-60),
      roll: Cesium.Math.toRadians(0),
    },
    duration: 3,
  })
}

function initThree() {
  let fov = 45
  let width = window.innerWidth
  let height = window.innerHeight
  let aspect = width / height
  let near = 1
  let far = 10 * 1000 * 1000
  three.scene = new THREE.Scene()
  three.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
  three.renderer = new THREE.WebGLRenderer({ alpha: true })
  ThreeContainer.appendChild(three.renderer.domElement)
}

function addBoxEntity() {
  cesium.viewer.entities.add({
    name: 'Box',
    position: Cesium.Cartesian3.fromDegrees(
      (minWGS84[0] + maxWGS84[0]) / 2,
      (minWGS84[1] + maxWGS84[1]) / 2 - 0.5,
      7000
    ),
    box: {
      dimensions: new Cesium.Cartesian3(16000.0, 16000.0, 16000.0),
      material: Cesium.Color.RED.withAlpha(0.5),
      fill: true,
      outline: true,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 1.0,
    },
  })
}

function addPolygonEntity() {
  cesium.viewer.entities.add({
    name: 'Polygon',
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray([
        minWGS84[0],
        minWGS84[1],
        maxWGS84[0],
        minWGS84[1],
        maxWGS84[0],
        maxWGS84[1],
        minWGS84[0],
        maxWGS84[1],
      ]),
      material: Cesium.Color.PINK.withAlpha(0.4),
    },
  })
}

function addBoxGeometry() {
  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshNormalMaterial()
  const dodecahedronMesh = new THREE.Mesh(geometry, material)
  dodecahedronMesh.scale.set(15000, 15000, 15000) // scale object to be visible at planet scale
  dodecahedronMesh.position.z += 7000.0 // translate "up" in Three.js space so the "bottom" of the mesh is the handle
  dodecahedronMesh.rotation.x = Math.PI / 2 // rotate mesh for Cesium's Y-up system
  let dodecahedronMeshYup = new THREE.Group()
  dodecahedronMeshYup.add(dodecahedronMesh)
  three.scene.add(dodecahedronMeshYup) // don’t forget to add it to the Three.js scene manually
  // Assign Three.js object mesh to our object array
  let _3DOB = new _3DObject()
  _3DOB.threeMesh = dodecahedronMeshYup
  _3DOB.minWGS84 = minWGS84
  _3DOB.maxWGS84 = maxWGS84
  _3Dobjects.push(_3DOB)
}

function init3DObject() {
  // Cesium entity
  addPolygonEntity()
  addBoxEntity()
  // Three.js Objects
  addBoxGeometry()
}

function renderCesium() {
  cesium.viewer.render()
}

function renderThreeObj() {
  // register Three.js scene with Cesium
  three.camera.fov = Cesium.Math.toDegrees(cesium.viewer.camera.frustum.fovy) // ThreeJS FOV is vertical
  // three.camera.updateProjectionMatrix();
  let cartToVec = function (cart) {
    return new THREE.Vector3(cart.x, cart.y, cart.z)
  }

  // Configure Three.js meshes to stand against globe center position up direction
  for (let id in _3Dobjects) {
    minWGS84 = _3Dobjects[id].minWGS84
    maxWGS84 = _3Dobjects[id].maxWGS84
    // convert lat/long center position to Cartesian3
    let center = Cesium.Cartesian3.fromDegrees(
      (minWGS84[0] + maxWGS84[0]) / 2,
      (minWGS84[1] + maxWGS84[1]) / 2
    )
    // get forward direction for orienting model
    let centerHigh = Cesium.Cartesian3.fromDegrees(
      (minWGS84[0] + maxWGS84[0]) / 2,
      (minWGS84[1] + maxWGS84[1]) / 2,
      1
    )
    // use direction from bottom left to top left as up-vector
    let bottomLeft = cartToVec(
      Cesium.Cartesian3.fromDegrees(minWGS84[0], minWGS84[1])
    )
    let topLeft = cartToVec(
      Cesium.Cartesian3.fromDegrees(minWGS84[0], maxWGS84[1])
    )
    let latDir = new THREE.Vector3().subVectors(bottomLeft, topLeft).normalize()
    // configure entity position and orientation
    _3Dobjects[id].threeMesh.position.copy(center)
    _3Dobjects[id].threeMesh.lookAt(centerHigh.x, centerHigh.y, centerHigh.z)
    _3Dobjects[id].threeMesh.up.copy(latDir)
  }
  // Clone Cesium Camera projection position so the
  // Three.js Object will appear to be at the same place as above the Cesium Globe
  three.camera.matrixAutoUpdate = false
  let cvm = cesium.viewer.camera.viewMatrix
  let civm = cesium.viewer.camera.inverseViewMatrix

  three.camera.lookAt(0, 0, 0)

  three.camera.matrixWorld.set(
    civm[0],
    civm[4],
    civm[8],
    civm[12],
    civm[1],
    civm[5],
    civm[9],
    civm[13],
    civm[2],
    civm[6],
    civm[10],
    civm[14],
    civm[3],
    civm[7],
    civm[11],
    civm[15]
  )

  three.camera.matrixWorldInverse.set(
    cvm[0],
    cvm[4],
    cvm[8],
    cvm[12],
    cvm[1],
    cvm[5],
    cvm[9],
    cvm[13],
    cvm[2],
    cvm[6],
    cvm[10],
    cvm[14],
    cvm[3],
    cvm[7],
    cvm[11],
    cvm[15]
  )

  let width = cesiumContainer.clientWidth
  let height = cesiumContainer.clientHeight

  let aspect = width / height
  three.camera.aspect = aspect
  three.camera.updateProjectionMatrix()
  three.renderer.setSize(width, height)
  three.renderer.clear()
  three.renderer.render(three.scene, three.camera)
}

function loop() {
  requestAnimationFrame(loop)
  renderCesium()
  renderThreeObj()
}

initCesium() // Initialize Cesium renderer
initThree() // Initialize Three.js renderer
init3DObject() // Initialize Three.js object mesh with Cesium Cartesian coordinate system
loop() // Looping renderer
