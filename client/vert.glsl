attribute vec2 position;
attribute vec3 aColor;

uniform mat3 modelViewProjectionMatrix;

varying vec3 vColor;

void main() {
    vColor = aColor;

    gl_Position = vec4(modelViewProjectionMatrix * vec3(position, 1.0), 1.0);
}
