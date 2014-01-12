attribute vec2 position;

uniform mat3 modelViewProjectionMatrix;

void main() {
    gl_Position = vec4(modelViewProjectionMatrix * vec3(position, 1.0), 1.0);
}
