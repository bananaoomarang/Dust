attribute vec2 position;

uniform mat3 projectionMatrix;
uniform mat3 modelViewMatrix;

void main() {
    gl_Position = vec4((projectionMatrix * modelViewMatrix * vec3(position, 1.0)), 1.0);
}
