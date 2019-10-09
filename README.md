# tiny-rtx

## Description

This is a little experiment, mainly for learning about NVIDIA's `Vk_NV_ray_tracing` extension, which allows Real-Time Ray Tracing. 

## Requirements

This demo should run smooth on RTX cards, I've tested it with an external *RTX 2070*.

If you have a GTX card, then you might be able to run the demo as well, as NVIDIA recently added RTX emulation for some cards of the GTX series (but prepare for some sloppiness).

I recommend using the latest version of node, as this project heavily depends on [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt), [N-API](https://nodejs.org/api/n-api.html), [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly) and [ESM](https://nodejs.org/api/esm.html)

## Screenshots

<p align="center">
  <a href="https://www.youtube.com/watch?v=ak2bvDGjzdM"><img src="https://i.imgur.com/pKerS1J.gif" height="288"></a>
</p>

|  |  |
:-------------------------:|:-------------------------:
<img src="https://i.imgur.com/Lnnk68k.png">  |  <img src="https://i.imgur.com/H8nIv6r.png">
<img src="https://i.imgur.com/5KOxFS1.png">  |  <img src="https://i.imgur.com/wPr1TH5.png">

## Installation

````
git clone https://github.com/maierfelix/tiny-rtx.git
cd tiny-rtx
npm install
npm run start
````

## Releasing

````
npm run release --node-binary="window-x64-12.9.1"
````

Flags:
  - `--node-binary`: The node version to use
  - `--build-node`: Build node from scratch instead of using a pre-built version (from [here](https://github.com/nexe/nexe/releases))

## Controls

 - Use your mouse buttons to rotate the camera
 - Use your mouse wheel to zoom in/out

## Create your own Scene

Simply edit the `main.js` file in the repository

## TODOs

 - Texture support
 - PBR based scattering
 - Denoise filter (A-SVGF?)
 
