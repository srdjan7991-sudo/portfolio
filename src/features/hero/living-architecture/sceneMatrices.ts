import type { Transform, Vec3 } from './sceneTypes'

export function writeViewProjection(matrix: Float32Array, eye: Vec3, target: Vec3, fov: number, aspect: number) {
  const [eyeX, eyeY, eyeZ] = eye
  const backLength = Math.hypot(eyeX - target[0], eyeY - target[1], eyeZ - target[2]) || 1
  const backX = (eyeX - target[0]) / backLength
  const backY = (eyeY - target[1]) / backLength
  const backZ = (eyeZ - target[2]) / backLength
  const rightLength = Math.hypot(backX, backZ)
  const rightX = rightLength > 1e-6 ? backZ / rightLength : 1
  const rightZ = rightLength > 1e-6 ? -backX / rightLength : 0
  const upX = backY * rightZ
  const upY = backZ * rightX - backX * rightZ
  const upZ = -backY * rightX
  const shiftX = -(rightX * eyeX + rightZ * eyeZ)
  const shiftY = -(upX * eyeX + upY * eyeY + upZ * eyeZ)
  const shiftZ = -(backX * eyeX + backY * eyeY + backZ * eyeZ)

  const near = 0.12
  const far = 64
  const scaleY = 1 / Math.tan(fov / 2)
  const scaleX = scaleY / aspect
  const depthScale = (near + far) / (near - far)
  const depthOffset = (2 * near * far) / (near - far)

  // WebGL matrices are column-major. Fold perspective into the view basis.
  matrix[0] = scaleX * rightX
  matrix[1] = scaleY * upX
  matrix[2] = depthScale * backX
  matrix[3] = -backX
  matrix[4] = 0
  matrix[5] = scaleY * upY
  matrix[6] = depthScale * backY
  matrix[7] = -backY
  matrix[8] = scaleX * rightZ
  matrix[9] = scaleY * upZ
  matrix[10] = depthScale * backZ
  matrix[11] = -backZ
  matrix[12] = scaleX * shiftX
  matrix[13] = scaleY * shiftY
  matrix[14] = depthScale * shiftZ + depthOffset
  matrix[15] = -shiftZ
}

export function writeModel(matrix: Float32Array, transform: Transform) {
  const [x, y, z] = transform.rotation
  const [scaleX, scaleY, scaleZ] = transform.scale
  const sinX = Math.sin(x)
  const sinY = Math.sin(y)
  const sinZ = Math.sin(z)
  const cosX = Math.cos(x)
  const cosY = Math.cos(y)
  const cosZ = Math.cos(z)

  matrix[0] = cosZ * cosY * scaleX
  matrix[1] = sinZ * cosY * scaleX
  matrix[2] = -sinY * scaleX
  matrix[3] = 0
  matrix[4] = (cosZ * sinY * sinX - sinZ * cosX) * scaleY
  matrix[5] = (sinZ * sinY * sinX + cosZ * cosX) * scaleY
  matrix[6] = cosY * sinX * scaleY
  matrix[7] = 0
  matrix[8] = (cosZ * sinY * cosX + sinZ * sinX) * scaleZ
  matrix[9] = (sinZ * sinY * cosX - cosZ * sinX) * scaleZ
  matrix[10] = cosY * cosX * scaleZ
  matrix[11] = 0
  matrix[12] = transform.position[0]
  matrix[13] = transform.position[1]
  matrix[14] = transform.position[2]
  matrix[15] = 1
}
