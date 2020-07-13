/*

00_basic.frag : (VERY) basic Fragment shader

author: Davide Gadia

Real-Time Graphics Programming - a.a. 2018/2019
Master degree in Computer Science
Universita' degli Studi di Milano

*/



#version 330 core

// output variable for the fragment shader. Usually, it is the final color of the fragment
out vec4 colorFrag;
in vec3 N;


float intensity = 5.0;
float kd = 0.8;

vec3 diffuseColor = vec3(1.0,0.0,0.0);
vec3 ambientColor = vec3(1.0,0.0,0.0);
float ambient = 0.3;

uniform float timer;


void main()
{    
    vec3 lightDirection = vec3(0.4,0.0,1.0);
    vec3 n = normalize(N);
    lightDirection = normalize(lightDirection);
    float phong = intensity * kd * dot(N,lightDirection); 
    vec3 phongVec = vec3(phong, phong, phong);
    vec3 pureAmbient = ambientColor * ambient;
    
    float r = smoothstep(0.2,0.3,max(0.0,phongVec.r * diffuseColor.r))*0.5 + smoothstep(0.5,0.6,max(0.0,phongVec.r * diffuseColor.r))*0.5;
    float g = smoothstep(0.2,0.3,max(0.0,phongVec.g * diffuseColor.g))*0.5 + smoothstep(0.5,0.6,max(0.0,phongVec.g * diffuseColor.g))*0.5;
    float b = smoothstep(0.2,0.3,max(0.0,phongVec.g * diffuseColor.g))*0.5 + smoothstep(0.5,0.6,max(0.0,phongVec.g * diffuseColor.g))*0.5;
    
  //  float r = max(0.0,phongVec.r * diffuseColor.r);
   // float g = max(0.0,phongVec.g * diffuseColor.g);
   // float b = max(0.0,phongVec.g * diffuseColor.g);
   
    vec3 purePhong = vec3(r, g,b);
    vec3 color = pureAmbient + purePhong;
    
    colorFrag = vec4(color,1.0);
}