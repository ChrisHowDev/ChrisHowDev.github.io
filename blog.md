---
layout: default
title: grass Page
permalink: /grass/
---


# Procedual grass modeling and rending using quadratic bezier curves

## [Live Demo](https://ruby-steep-kilometer.glitch.me/) 🔴

![](https://github.com/ChrisHow9/WebGLProcedualGrass/blob/main/readme/grass.gif)
*Grass in action* 


## How to Run Locally 

To set up the project, ensure you have the necessary npm packages and build tools. Follow these steps:

1. Install the required npm packages:
   ```bash
   npm install
   
2. Build and Serve project using vite
   ```bash
   npx vite

## Goals of project - 

The main goal of this project is to provide a non-trivial implementation of grass generation and rendering using quadratic Bezier curves. The solution is designed to be time-efficient in terms of implementation, focusing on quick development over extensive performance optimizations. The project aims to be accessible online for anyone who wants to view it, taking into account performance considerations and platform compatibility.

## Research and Implementation - 

My initial curiosity arose from watching a GDC talk on the implementation of grass in "Ghost of Tsushima." From there, I explored developer blogs and technical papers to delve deeper into the details and understand how to translate this into a browser-native application.

Multiple web-based graphics APIs were considered for the project. WebGPU, one of the newest and most advanced APIs, supports compute shaders that could accelerate the initial generation of grass blades. However, it is still relatively early in development and is not supported on some major browsers, such as Safari. Therefore, I opted to use the library Three.js, which provides a modern interface for WebGL and offers comprehensive math libraries out of the box.

The model of a grass blade is defined as a straight, vertically aligned entity on the cpu. The horizontal values of its vertices are then offset in the vertex shader based on evaluation against a Bezier curve. The Bezier curve has three control points: P0, representing the base of the blade; P1, representing its height; and P2, indicating how far the grass blade should bend. P0 and P1 remain static, while P2 is modified over time to create the effect of movement and wind influencing the grass blade. The derivative of the Bezier curve is used to calculate the normal and is passed to the fragment shader for lighting calculations.

![](https://github.com/ChrisHow9/WebGLProcedualGrass/blob/main/readme/bezier.png)

*Diagram showing how the wind (in this case a sine wave) will affect the bezier curve* 

To create the effect of wind, multiple passes of Perlin noise at different scales are used and then scrolled across the blades of grass using a time variable passed to the shader. Perlin noise is also employed to create the effect of clouds by darkening each grass blade based on its position. To render the numerous grass blades in the scene, instanced rendering is used, allowing all the grass to be rendered in a single call. This approach, however, comes with the downside of losing frustum culling. Implementing frustum culling for instanced rendering is possible but is out of scope for this project.

![](https://github.com/ChrisHow9/WebGLProcedualGrass/blob/main/readme/perlin.png)
*Visualisation of Perlin noise where the light value of each grass blade represents the intensity of the wind force.* 

## Core Deliverables

- [x] Representation of grass using Bezier curves
- [x] Instance rendering for the field
- [x] Grass should retain length
- [x] Wind patterns using noise



## Extensions

- [ ] Level of detail
- [ ] Frustum culling
- [x] Shading
- [x] Anti-aliasing
- [x] Debug UI
- [ ] Clumping
- [x] Varying each blade's properties
- [ ] Grass blade thickening depending on view space



## Further Exploration

- While I have found splines used for creating and rendering, I have not encountered the use of Bezier curves for short fur rendering—at least not from a rudimentary search.

- Use Seiler’s Interpolation for evaluating a Bezier curve. This is a new method that can calculate a Bezier curve with fewer linear interpolations than de Casteljau's algorithm.

- Implement frustum culling to further improve performance.



## References and Resources

- [Three.js Shader Examples](https://stemkoski.github.io/Three.js/#shader-simple)
- [SimonDev video on grass](https://www.youtube.com/watch?v=bp7REZBV4P4)
- [Eric Wohllaib - sucker punch gdc talk](https://www.youtube.com/watch?v=Ibe1JBF5i5Y)
- [GPUOpen: Procedural Grass Rendering with Mesh Shaders](https://gpuopen.com/learn/mesh_shaders/mesh_shaders-procedural_grass_rendering/)
- [ACM: Efficient Rendering of Grass](https://dl.acm.org/doi/abs/10.1145/2856400.2876008)
- [Grass Model Representation](https://www.researchgate.net/figure/Representation-of-grass-model-a-A-grass-shape-is-determined-by-a-cubic-Bezier-curve-b_fig7_302916177)
