import { createArchitectureGeometry } from './sceneGeometry'
import { writeModel, writeViewProjection } from './sceneMatrices'
import { surface } from './sceneTypes'
import type { ArchitectureFrame, ArchitecturePart } from './sceneTypes'

const vertexShader = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in float a_surface;

uniform mat4 u_model;
uniform mat4 u_viewProjection;
uniform vec3 u_inverseScaleSquared;

out vec3 v_world;
out vec3 v_normal;
out vec2 v_plane;
flat out int v_surface;

void main() {
  vec4 world = u_model * vec4(a_position, 1.0);
  v_world = world.xyz;
  v_normal = mat3(u_model) * (a_normal * u_inverseScaleSquared);
  v_plane = a_position.xz;
  v_surface = int(a_surface);
  gl_Position = u_viewProjection * world;
}`

const fragmentShader = `#version 300 es
precision highp float;
precision highp int;

in vec3 v_world;
in vec3 v_normal;
in vec2 v_plane;
flat in int v_surface;

uniform vec3 u_eye;
uniform vec4 u_palette[10];
uniform float u_opacity;

out vec4 pixel;

void main() {
  vec4 material = u_palette[v_surface];
  vec3 tone = material.rgb;
  float alpha = material.a;

  if (v_surface == ${surface.shadow}) {
    float distance = length(v_plane / vec2(3.6, 2.15));
    alpha *= 1.0 - smoothstep(0.16, 1.0, distance);
  } else if (v_surface != ${surface.grid}) {
    vec3 normal = normalize(v_normal);
    float key = max(0.0, dot(normal, normalize(vec3(-4.0, 7.0, 5.0))));
    float fill = max(0.0, dot(normal, normalize(vec3(5.0, 2.0, -4.0))));
    float exposure = 0.56 + 0.39 * key + 0.17 * fill;

    if (v_surface == ${surface.glass}) {
      vec3 toEye = normalize(u_eye - v_world);
      float edge = 1.0 - abs(dot(normal, toEye));
      edge *= edge;
      tone = mix(tone, u_palette[${surface.accent}].rgb, 0.3 * edge);
      alpha *= 0.48 + 0.52 * edge;
    } else {
      tone *= pow(exposure, 0.66);
    }
  }

  alpha *= u_opacity;
  if (alpha < 0.003) discard;
  pixel = vec4(tone, alpha);
}`

const floatsPerVertex = 7
const stride = floatsPerVertex * Float32Array.BYTES_PER_ELEMENT

type Batch = {
  vertexArray: WebGLVertexArrayObject
  buffer: WebGLBuffer
  count: number
  part: ArchitecturePart
  translucent: boolean
  depth: number
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  gl.deleteShader(shader)
  return null
}

function createProgram(gl: WebGL2RenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexShader)
  if (!vertex) return null
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentShader)
  if (!fragment) {
    gl.deleteShader(vertex)
    return null
  }

  const program = gl.createProgram()
  if (program) {
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    gl.detachShader(program, vertex)
    gl.detachShader(program, fragment)
  }
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  if (program && gl.getProgramParameter(program, gl.LINK_STATUS)) return program
  gl.deleteProgram(program)
  return null
}

function farFirst(a: Batch, b: Batch) {
  return b.depth - a.depth
}

export function createArchitectureRenderer(canvas: HTMLCanvasElement) {
  let context
  try {
    context = canvas.getContext('webgl2', {
      alpha: true, depth: true, stencil: false, antialias: true, powerPreference: 'low-power',
    })
  } catch {
    return null
  }
  if (!context) return null
  const gl = context

  const program = createProgram(gl)
  if (!program) return null
  const uniforms = {
    viewProjection: gl.getUniformLocation(program, 'u_viewProjection'),
    model: gl.getUniformLocation(program, 'u_model'),
    inverseScaleSquared: gl.getUniformLocation(program, 'u_inverseScaleSquared'),
    eye: gl.getUniformLocation(program, 'u_eye'),
    palette: gl.getUniformLocation(program, 'u_palette[0]'),
    opacity: gl.getUniformLocation(program, 'u_opacity'),
  }
  if (Object.values(uniforms).some(location => location === null)) {
    gl.deleteProgram(program)
    return null
  }
  gl.enable(gl.DEPTH_TEST)
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.clearColor(0, 0, 0, 0)

  const viewportLimit: Int32Array = gl.getParameter(gl.MAX_VIEWPORT_DIMS)
  if (!viewportLimit) {
    gl.deleteProgram(program)
    return null
  }
  const viewProjection = new Float32Array(16)
  const model = new Float32Array(16)
  const batches: Batch[] = []
  const transparent: Batch[] = []
  let compactGeometry: boolean | undefined
  let disposed = false

  function clearGeometry() {
    gl.bindVertexArray(null)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    for (const batch of batches) {
      gl.deleteVertexArray(batch.vertexArray)
      gl.deleteBuffer(batch.buffer)
    }
    batches.length = 0
    transparent.length = 0
  }

  function upload(part: ArchitecturePart, vertices: Float32Array, translucent: boolean) {
    if (vertices.length === 0) return true
    const buffer = gl.createBuffer()
    const vertexArray = gl.createVertexArray()
    if (!buffer || !vertexArray) {
      gl.deleteBuffer(buffer)
      gl.deleteVertexArray(vertexArray)
      return false
    }

    gl.bindVertexArray(vertexArray)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.enableVertexAttribArray(1)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12)
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 24)
    batches.push({ vertexArray, buffer, count: vertices.length / floatsPerVertex, part, translucent, depth: 0 })
    return gl.getError() === gl.NO_ERROR
  }

  function resize(width: number, height: number, dpr: number, compact: boolean) {
    if (disposed || gl.isContextLost() || width <= 0 || height <= 0) return false
    if (compactGeometry !== compact) {
      clearGeometry()
      compactGeometry = undefined
      for (const mesh of createArchitectureGeometry(compact)) {
        if (!upload(mesh.part, mesh.opaque, false) ||
            (mesh.translucent && !upload(mesh.part, mesh.translucent, true))) {
          clearGeometry()
          return false
        }
      }
      gl.bindVertexArray(null)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      compactGeometry = compact
    }

    const ratio = Math.min(dpr, viewportLimit[0] / width, viewportLimit[1] / height)
    const pixelsWide = Math.max(1, Math.floor(width * ratio))
    const pixelsHigh = Math.max(1, Math.floor(height * ratio))
    if (canvas.width !== pixelsWide) canvas.width = pixelsWide
    if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    return !gl.isContextLost()
  }

  function draw(batch: Batch, frame: ArchitectureFrame) {
    const transform = frame.parts[batch.part]
    writeModel(model, transform)
    const [sx, sy, sz] = transform.scale
    gl.uniformMatrix4fv(uniforms.model, false, model)
    gl.uniform3f(uniforms.inverseScaleSquared, 1 / Math.max(1e-6, sx * sx), 1 / Math.max(1e-6, sy * sy),
      1 / Math.max(1e-6, sz * sz))
    gl.uniform1f(uniforms.opacity, transform.opacity)
    gl.bindVertexArray(batch.vertexArray)
    gl.drawArrays(gl.TRIANGLES, 0, batch.count)
  }

  function render(frame: ArchitectureFrame, palette: Float32Array) {
    if (disposed || compactGeometry === undefined || gl.isContextLost()) return 0
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight
    if (!(aspect > 0)) return 0
    writeViewProjection(viewProjection, frame.eye, frame.target, frame.fov, aspect)

    gl.useProgram(program)
    gl.uniformMatrix4fv(uniforms.viewProjection, false, viewProjection)
    gl.uniform3fv(uniforms.eye, frame.eye)
    gl.uniform4fv(uniforms.palette, palette)
    gl.depthMask(true)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.disable(gl.BLEND)

    let draws = 0
    transparent.length = 0
    for (const batch of batches) {
      const transform = frame.parts[batch.part]
      if (transform.opacity <= 0.003) continue
      if (!batch.translucent && transform.opacity >= 1) {
        draw(batch, frame)
        draws += 1
      } else {
        const [x, y, z] = transform.position
        batch.depth = viewProjection[3] * x + viewProjection[7] * y + viewProjection[11] * z + viewProjection[15]
        transparent.push(batch)
      }
    }
    if (transparent.length > 0) {
      // A fading slab's hidden back face would otherwise paint over its visible front face.
      transparent.sort(farFirst)
      gl.enable(gl.BLEND)
      gl.enable(gl.CULL_FACE)
      gl.depthMask(false)
      for (const batch of transparent) {
        draw(batch, frame)
        draws += 1
      }
      gl.depthMask(true)
      gl.disable(gl.CULL_FACE)
    }
    gl.bindVertexArray(null)
    return draws
  }

  function dispose() {
    if (disposed) return
    disposed = true
    clearGeometry()
    gl.useProgram(null)
    gl.deleteProgram(program)
  }

  return { resize, render, dispose }
}
