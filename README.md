# tiny-rtx
 A tiny Vulkan based Real-Time Ray Tracer

## Description

This is a little experiment, exploring NVIDIA's `Vk_NV_ray_tracing` extension, which allows Real-Time Ray Tracing. 

## Compatibility

This demo should run smooth on RTX cards, I've tested it with an external *RTX 2070*.

Though if you have a GTX card, you might be able to run the demo as well, as NVIDIA recently added RTX emulation for some cards of the GTX series (prepare for some sloppiness).

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

## TODOs

 - Texture support
 - PBR based scattering
 - Denoise filter (A-SVGF?)
 
