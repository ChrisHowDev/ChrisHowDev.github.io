import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
scene.background = new THREE.Color(0x87CEEB);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


/*

TODO:
tips of grass 
debug convert degrees to xy vector 
grass geo generator?? level of detail
bend normal vector -- NEED TEXTURE COORDS

*/


const vertexShader = /* glsl */ `
uniform float time;
uniform float windSpeed;
uniform vec2 windDirection;
uniform float grassLength;
uniform float turbolance;
uniform float grassLean;
varying float groundRand;


attribute vec3 instancePosition;
varying float vY; // Varying variable to pass Y position to fragment shader
varying vec3 bladeNormal;
varying vec3 rotatedNormal1;
varying vec3 rotatedNormal2;
varying vec3 vPosition;
varying float leanIntesity;
varying float cloudColor;

void MakePersistentLength(in vec3 v0, inout vec3 v1, inout vec3 v2, in float height)
{
    //Persistent length
    vec3 v01 = v1 - v0;
    vec3 v12 = v2 - v1;
    float lv01 = length(v01);
    float lv12 = length(v12);

    float L1 = lv01 + lv12;
    float L0 = length(v2-v0);
    float L = (2.0f * L0 + L1) / 3.0f; //http://steve.hollasch.net/cgindex/curves/cbezarclen.html

    float ldiff = height / L;
    v01 = v01 * ldiff;
    v12 = v12 * ldiff;
    v1 = v0 + v01;
    v2 = v1 + v12;
}

vec3 Lerp(vec3 a, vec3 b, float t) {
    return a + t * (b - a);
}

vec3 bezierDerivative(vec3 p0, vec3 p1, vec3 p2, float t)
{
    return 2. * (1. - t) * (p1 - p0) + 2. * t * (p2 - p1);
}
// taken from https://www.shadertoy.com/view/4djSRW
float hash(vec2 p)
{
    // Two typical hashes...
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    
    // This one is better, but it still stretches out quite quickly...
    // But it's really quite bad on my Mac(!)
    //return fract(sin(dot(p, vec2(1.0,113.0)))*43758.5453123);

}


mat3 rotation3dY(float angle) {
    float s = sin(angle);
    float c = cos(angle);
  
    return mat3(
      c, 0.0, -s,
      0.0, 1.0, 0.0,
      s, 0.0, c
    );
  }
  
float easeOut(float x, float power) {
    return 1.0 - pow(1.0 - x, power);
}

float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))
                 * 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    // Smooth Interpolation

    // Cubic Hermine Curve.  Same as SmoothStep()
    vec2 u = f*f*(3.0-2.0*f);
     u = smoothstep(0.,1.,f);

    // Mix 4 coorners percentages
    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}
//
// GLSL textureless classic 2D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Author:  Stefan Gustavson (stefan.gustavson@liu.se)
// Version: 2011-08-22
//
// Many thanks to Ian McEwan of Ashima Arts for the
// ideas for permutation and gradient selection.
//
// Copyright (c) 2011 Stefan Gustavson. All rights reserved.
// Distributed under the MIT license. See LICENSE file.
// https://github.com/stegu/webgl-noise
//

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+10.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec2 fade(vec2 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise
float cnoise(vec2 P)
{
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi); // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;

  vec4 i = permute(permute(ix) + iy);

  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0 ;
  vec4 gy = abs(gx) - 0.5 ;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;

  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);

  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;  
  g01 *= norm.y;  
  g10 *= norm.z;  
  g11 *= norm.w;  

  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));

  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

// Classic Perlin noise, periodic variant
float pnoise(vec2 P, vec2 rep)
{
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, rep.xyxy); // To create noise with explicit period
  Pi = mod289(Pi);        // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;

  vec4 i = permute(permute(ix) + iy);

  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0 ;
  vec4 gy = abs(gx) - 0.5 ;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;

  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);

  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;  
  g01 *= norm.y;  
  g10 *= norm.z;  
  g11 *= norm.w;  

  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));

  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

void main() {
    vec3 pos = position;

    mat3 roty = rotation3dY(hash(instancePosition.xz)*20.);
   
    pos = pos * roty;
    
    vec2 windPos;
    windPos.x = instancePosition.x *turbolance +time *windSpeed * windDirection.x;
    windPos.y = instancePosition.z *turbolance +time *windSpeed *  windDirection.y;

    float noiseValue = cnoise(windPos);

    windPos.x = instancePosition.x *turbolance*4. +time *windSpeed*4. * windDirection.x;
    windPos.y = instancePosition.z *turbolance*4. +time *windSpeed*4. *  windDirection.y;
    float noiseValue2 = cnoise(windPos);

    windPos.x = instancePosition.x *0.01 +time *windSpeed/10. * windDirection.x;
    windPos.y = instancePosition.z *0.01 +time *windSpeed/10.*  windDirection.y;

    cloudColor  = cnoise(windPos);
    cloudColor = ((cloudColor + 1.0) / 2.0  );
   
    leanIntesity =( ((noiseValue + 1.0) / 2.0  )+ ((noiseValue2 + 1.0) / 2.0  ))/2.;

    windPos.x = instancePosition.x *0.02;
    windPos.y = instancePosition.z *0.02;

    groundRand = cnoise(windPos);
    groundRand = clamp(((groundRand+ 1.0) / 2.0  ),0.5,1.);

    vec3 bladeDirection = normalize(vec3(-windDirection.x,0,-windDirection.y));
    vec3 bladeHeight = vec3(0, grassLength, 0);
    
    float grassLeaning = grassLean+2.5;

    vec3 p0 = vec3(0, 0, 0);
    vec3 p1 = bladeHeight ;
    vec3 p2 = grassLeaning * (leanIntesity+0.2 ) * bladeDirection + bladeHeight;

    float t = clamp(pos.y, 0.0, 1.0);

    MakePersistentLength(p0,p1,p2,grassLength);

    vec3 a = Lerp(p0, p1, t);
    vec3 b = Lerp(p1, p2, t);
    vec3 c = Lerp(a, b, t);

    vY = pos.y; 

    pos += c;
    pos += instancePosition;
    pos.y -= sin(hash(instancePosition.xz)); //randomise height by sinking into terrain
  
   // vY = pos.y/grassLength; // Pass Y position to fragment shader

    vec3 tangent = bezierDerivative(p0, p1, p2, t);
    vec3 newDirection = p1 - p2; //might be opposite 
    vec3 sideVec = normalize(vec3(newDirection.z,newDirection.y,-newDirection.x));
    
    vec3 normal = normalize(cross(sideVec, tangent));

    bladeNormal = normal;
    bladeNormal = roty * normal;
    vPosition = pos;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShaders = {
    phong_shading: /* glsl */ `
        varying float vY; // Receiving the Y position from vertex shader
        varying vec3 bladeNormal; // Receiving the normal from vertex shader
        varying vec3 vPosition;
        varying float leanIntesity;
        varying float groundRand;
        varying float cloudColor;
        varying vec3 rotatedNormal1;
        varying vec3 rotatedNormal2;

        uniform vec3 lightPosition; // Light position
        uniform vec3 viewPosition; // Viewer position

        void main() {
            // Phong shading components
            vec3 ambientColor = vec3(0.2, 0.4, 0.2); // Ambient color (dark green)
            vec3 diffuseColor = vec3(0.2, 0.5+ groundRand, 0.2); // Diffuse color (green)
    
            float shininess = 128.0; // Shininess factor for specular highlight

            // Normalize the normal vector
            vec3 N = normalize(bladeNormal);

            // Calculate the light direction
          // vec3 L = normalize(lightPosition - vPosition);

            vec3 L = normalize(-lightPosition );

            // Calculate the reflection direction
            vec3 R = reflect(-L, N);

            // Ambient component
            vec3 ambient = ambientColor;

            // Diffuse component
            float diff = max(dot(N, L), 0.0);
            vec3 diffuse = diff * diffuseColor * cloudColor;

            // Combine the components
            vec3 color =  (diffuse + ambient) ;

            gl_FragColor = vec4(color, 1.0);
        }
    `,
    perlin_wind_vis: /* glsl */ `
    varying float vY; // Receiving the Y position from vertex shader
    varying vec3 bladeNormal; // Receiving the normal from vertex shader
    varying vec3 vPosition;
    varying float leanIntesity;

    uniform vec3 lightPosition; // Light position
    uniform vec3 viewPosition; // Viewer position

    void main() {
        // Basic shading components
        vec3 color = vec3(0.2, 0.8, 0.2); // Basic green color
        gl_FragColor = vec4(
            (vec3(leanIntesity,leanIntesity,leanIntesity)), 1.0);
    }
    `,
    normals_vis: /* glsl */ `
    varying float vY; // Receiving the Y position from vertex shader
    varying vec3 bladeNormal; // Receiving the normal from vertex shader
    varying vec3 vPosition;
    varying float leanIntesity;

    uniform vec3 lightPosition; // Light position
    uniform vec3 viewPosition; // Viewer position

    void main() {
        // Basic shading components
        vec3 color = vec3(0.2, 0.8, 0.2); // Basic green color
        gl_FragColor = vec4(abs(bladeNormal), 1.0);
    }
    `,

    flat_shading: /* glsl */ `
        varying float vY; // Receiving the Y position from vertex shader
        varying vec3 bladeNormal; // Receiving the normal from vertex shader
        varying vec3 vPosition;
        varying float leanIntesity;
        varying float cloudColor;
        

        uniform vec3 lightPosition; // Light position
        uniform vec3 viewPosition; // Viewer position

        void main() {
            float greenIntensity =  1. * vY; // Gradient from darker (0.4) to brighter (1.0)
            float redIntensity =  0.2 * vY;
            vec3 ambientColor = vec3(redIntensity, greenIntensity, 0.1)* (cloudColor+0.5); 
            gl_FragColor = vec4(ambientColor, 1.0);
        }
    `
};

function updateShader() {
    material.fragmentShader = fragmentShaders[options.shader];
    material.needsUpdate = true;
}

const lightPos = new THREE.Vector3(1, -100, 1);


const options = {
    shader: 'phong_shading',
    windSpeed: 0.3,
    grassLength: 8,
    turbolance: 0.05,
    grassLean: 10,
    windAngle: 0.0,
    grassArea: 50,
    grassDensity: 10000

};
// Initialize dat.GUI
const gui = new dat.GUI();

gui.add(options, 'shader', Object.keys(fragmentShaders)).name('Debug View').onChange(updateShader);

gui.add(options, 'windSpeed', 0, 2.5).name('Wind Speed');
gui.add(options, 'turbolance', 0, 0.1).name('Wind Turbolance');
gui.add(options, 'grassLength', 0.5, 10).name('Grass Length');
gui.add(options, 'grassLean', 0, 25).name('Grass Leaning');
gui.add(options, 'grassArea', 50, 500).name('Grass Area').onChange(updateGrass);
gui.add(options, 'grassDensity', 1000, 800000).name('Grass Blades').onChange(updateGrass);

const windDirection = { x: 1.0, y: 1.0 };

gui.add(options, 'windAngle', 0, 360).name('Wind Direction').onChange(() => {
    const radians = options.windAngle * Math.PI / 180; // Convert angle to radians
    windDirection.x = Math.sin(radians);
    windDirection.y = Math.cos(radians);

    material.uniforms.windDirection.value.set(windDirection.x, windDirection.y);
});


const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShaders[options.shader],
    side: THREE.DoubleSide,
    uniforms: {
        time: { value: 0.0 },
        cameraPosition: { value: camera.position },
        lightPosition: { value: lightPos },
        windSpeed: { value: options.windSpeed },
        grassLength: { value: options.grassLength },
        turbolance: {value: options.turbolance},
        grassLean: {value: options.grassLean},
        windDirection: {value: new THREE.Vector2(1.0, 1.0)}

    }
});

const grassGeometry = new THREE.PlaneGeometry(0.17,1, 1,12);

let instancedMesh;
function updateGrass() {
    const grassCount = options.grassDensity;
    const positions = [];
    for (let i = 0; i < grassCount; i++) {
        positions.push(Math.random() * options.grassArea - options.grassArea / 2); // x position
        positions.push(0.5); // y position
        positions.push(Math.random() * options.grassArea - options.grassArea / 2); // z position
    }

    const instancedGeometry = new THREE.InstancedBufferGeometry().copy(grassGeometry);
    instancedGeometry.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(new Float32Array(positions), 3));

    if (instancedMesh) {
        scene.remove(instancedMesh);
    }
    instancedMesh = new THREE.InstancedMesh(instancedGeometry, material, grassCount);
    scene.add(instancedMesh);
}

updateGrass();

const groundGeometry = new THREE.PlaneGeometry(500, 500);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22 }); // Forest green
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

camera.position.z = 10;
camera.position.y = 10;
camera.up.set(0, 1, 0);
camera.lookAt(20,10000,0);
camera.updateProjectionMatrix();

let controls;

controls = new OrbitControls( camera, renderer.domElement );

const clock = new THREE.Clock();

camera.position.z = 40;
camera.position.y = 10;
camera.up.set(0, 1, 0);
camera.lookAt(0,10,0);
camera.updateProjectionMatrix();


function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

   
    material.uniforms.lightPosition.value = lightPos;

 
    material.uniforms.windSpeed.value = options.windSpeed;
    material.uniforms.grassLength.value = options.grassLength;
    material.uniforms.turbolance.value = options.turbolance;
    material.uniforms.grassLean.value = options.grassLean;

    material.uniforms.time.value = clock.getElapsedTime();
    material.uniforms.cameraPosition.value.copy(camera.position); // Update camera position uniform
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});