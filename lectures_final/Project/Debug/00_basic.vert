/*

00_basic.vert : basic Vertex shader

author: Davide Gadia

Real-Time Graphics Programming - a.a. 2018/2019
Master degree in Computer Science
Universita' degli Studi di Milano

*/


#version 330 core

// vertex position in world coordinates
layout (location = 0) in vec3 position;

layout (location = 2) in vec3 normal;

out vec3 N;

void main()
{
    // transformations are applied to each vertex 
    gl_Position = vec4(position.x, position.y, position.z, 1.0);
    
    N = normal;
}
