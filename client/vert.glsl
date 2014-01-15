precision highp float;

attribute vec2 position;
attribute float aColor;

uniform mat3 modelViewProjectionMatrix;

varying vec3 vColor;

// Credit to 'AHM' on StackOverflow
vec3 unpackColor(float f) {
    vec3 color;

    color.b = floor(f / (256.0 * 256.0));
    color.g = floor((f - color.b * 256.0 * 256.0) / 256.0);
    color.r = floor(mod(f, 256.0));

    return color / 10.0;
}

void main() {
    vColor = unpackColor(aColor);

    gl_Position = vec4(modelViewProjectionMatrix * vec3(position, 1.0), 1.0);
}

