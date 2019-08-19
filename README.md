# tiny-rtx
 A tiny Vulkan based Real-Time Ray Tracer

## Description

This is a little experiment, exploring NVIDIA's `Vk_NV_ray_tracing` extension, which allows Real-Time Ray Tracing. 

## Requirements

This demo should run smooth on RTX cards, I've tested it with an external *RTX 2070*.

If you have a GTX card, then you might be able to run the demo as well, as NVIDIA recently added RTX emulation for some cards of the GTX series (but prepare for some sloppiness).

I recommend using the latest version of node, as this project depends heavely on [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt), [N-API](https://nodejs.org/api/n-api.html), [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly) and [ESM](https://nodejs.org/api/esm.html)

## Controls

 - Use your mouse buttons to rotate the camera
 - Use your mouse wheel to zoom in/out

## Screenshots

<p align="center">
  <img src="https://i.imgur.com/pKerS1J.gif" height="288">
</p>

|  |  |
:-------------------------:|:-------------------------:
<img src="https://i.imgur.com/H8nIv6r.png">  |  <img src="https://i.imgur.com/0LWCzJW.png">
<img src="https://i.imgur.com/5KOxFS1.png">  |  <img src="https://i.imgur.com/wPr1TH5.png">

## Create your own Scene

Simply edit the `main.js` file in the repository

## TODOs

 - Texture support
 - PBR based scattering
 - Denoise filter (A-SVGF?)
 
