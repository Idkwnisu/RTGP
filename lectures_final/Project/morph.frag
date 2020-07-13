/*

00_basic.frag : (VERY) basic Fragment shader

author: Davide Gadia

Real-Time Graphics Programming - a.a. 2018/2019
Master degree in Computer Science
Universita' degli Studi di Milano

*/



#version 330 core

// output variable for the fragment shader. Usually, it is the final color of the fragment
out vec4 color;

in vec2 interp_UV;

uniform float timer;
const float EPSILON = 0.0001;


mat4 rotationX( in float angle ) {
	return mat4(	1.0,		0,			0,			0,
			 		0, 	cos(angle),	-sin(angle),		0,
					0, 	sin(angle),	 cos(angle),		0,
					0, 			0,			  0, 		1);
}

mat4 rotationY( in float angle ) {
	return mat4(	cos(angle),		0,		sin(angle),	0,
			 				0,		1.0,			 0,	0,
					-sin(angle),	0,		cos(angle),	0,
							0, 		0,				0,	1);
}

mat4 rotationZ( in float angle ) {
	return mat4(	cos(angle),		-sin(angle),	0,	0,
			 		sin(angle),		cos(angle),		0,	0,
							0,				0,		1,	0,
							0,				0,		0,	1);
}

float sphere(vec3 p, float r) //radius
{
	return length(p) - r;  
}

float sphereRotation(vec3 p, float r,vec3 rotation, float timer) //radius
{
    vec4 vertex = vec4(p, 1.0);
    vertex = vertex * rotationZ(timer*rotation.x)  * rotationY(timer*rotation.y) * rotationX(timer*rotation.z);
	return length(vertex.xyz) - r;  
}


float box(vec3 p, vec3 b) //box dimension
{
	vec3 d = abs(p) - b;
	return length(max(d, 0.0)) + min(max(d.x,max(d.y,d.z)),0.0);
}

float boxRotation(vec3 p, vec3 b, vec3 rotation, float timer) //box dimension
{
    vec4 vertex = vec4(p, 1.0);
    vertex = vertex * rotationZ(timer*rotation.x)  * rotationY(timer*rotation.y) * rotationX(timer*rotation.z);
	vec3 d = abs(vertex.xyz) - b;
	return length(max(d, 0.0)) + min(max(d.x,max(d.y,d.z)),0.0);
}

float torus(vec3 p, vec2 t) // (size of the torus, thickness)
{
	vec2 q = vec2(length(p.xz)-t.x,p.y);
	return length(q) - t.y;
}


float map(vec3 p,float timer)
{
    float value = sin(timer)*0.5+0.5;
    return mix(sphereRotation(p,0.7,vec3(0.1,0.2,0.8),timer),boxRotation(p, vec3(0.7,0.7,0.7),vec3(0.1,0.2,0.8),timer),value);
 // return min(sphere(p,0.7),torus(p, vec2(1.3,0.07))) ;
}


float trace(vec3 origin, vec3 ray, float timer)
{
    float t = 0.0;
    for (int i = 0; i < 32; i++)
    {
        vec3 p = origin + ray * t;
        float d = map(p, timer);
        t += d*0.5;
    }
    return t;
}

vec3 estimateNormal(vec3 p, float timer) {
    return normalize(vec3(
        map(vec3(p.x + EPSILON, p.y, p.z),timer) - map(vec3(p.x - EPSILON, p.y, p.z),timer),
        map(vec3(p.x, p.y + EPSILON, p.z),timer) - map(vec3(p.x, p.y - EPSILON, p.z),timer),
        map(vec3(p.x, p.y, p.z  + EPSILON),timer) - map(vec3(p.x, p.y, p.z - EPSILON),timer)
    ));
}



void main()
{    
   // vec2 iResolution = vec2(550.0,550.0);
  //  float iTime = timer;
	float iTime = 0.0;
    vec2 iResolution = vec2(800.0,600.0);
    //vec2 uv = interp_UV/iResolution.xy;
	vec2 uv = gl_FragCoord.xy / iResolution.xy;
    uv = uv * 2.0 - 1.0;
    
   
    uv.x *= iResolution.x / iResolution.y;
    
    vec3 r = normalize(vec3(uv, 1.0));
    
//    float the = iTime * 0.25;
 //   r.xz *= mat2(cos(the), -sin(the), sin(the), cos(the));
    
    vec3 o = vec3(0.0, iTime, iTime);
    o = vec3(0.0,0.0,-3.0);
    float t = trace(o, r, timer);
    vec3 p = o + r*t;
    vec3 N = estimateNormal(p, timer);
    
    float fog = 1.0 / (1.0 + t * t * 0.1);
	
    vec3 fc = vec3(fog);
   
    
    // Time varying pixel color
    vec4 col = vec4(fc, 1.0);
    color = col;
}