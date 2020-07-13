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
	return length(p) - 0.25;  
}

float sdOctahedron(vec3 p, float s)
{
    p = abs(p);
    return (p.x+p.y+p.z-s)*0.57735027;
}

float box(vec3 p, vec3 b) //box dimension
{
	vec3 d = abs(p) - b;
	return length(max(d, 0.0)) + min(max(d.x,max(d.y,d.z)),0.0);
}

float torus(vec3 p, vec2 t) // (size of the torus, thickness)
{
	vec2 q = vec2(length(p.xz)-t.x,p.y);
	return length(q) - t.y;
}


float ElongateOctahedron(vec3 p,vec3 h, float s )
{
    vec3 q = p - clamp( p, -h, h );
    p = abs(q);
    return (p.x+p.y+p.z-s)*0.57735027;
}

float displacement(vec3 p, float timer)
{
    return sin(20*p.x*sin(timer*0.5)*5)*sin(20*p.y*sin(timer*0.5)*5)*sin(20*p.z*sin(timer*0.5)*5);
}

//vec3 opTx(vec3 p, mat4 t, in sdf3d primitive )
//{
    //return primitive( invert(t)*p );
//}

float OctaDisplace( vec3 p, float s, float timer )
{
    p = abs(p);
    float d1 = (p.x+p.y+p.z-s)*0.57735027;
    float d2 = displacement(p,timer);
    return d1+d2;
}

float OctaDisplaceTrans( vec3 p, float s, float timer )
{
    vec4 vertex = vec4(p, 1.0);
    vertex = vertex * rotationZ(timer*0.3)  * rotationY(timer) * rotationX(timer*0.2);
    p = abs(vertex.xyz);
    float d1 = (p.x+p.y+p.z-s)*0.57735027;
    float d2 = displacement(p,timer);
    return d1+d2;
}

float torusDisplaceTrans(vec3 p, vec2 t, float timer) // (size of the torus, thickness)
{
    vec4 vertex = vec4(p, 1.0);
    vertex = vertex * rotationX(timer*0.2);
    p = abs(vertex.xyz);
	vec2 q = vec2(length(p.xz)-t.x,p.y);
	float d1 = length(q) - t.y;
    float d2 = displacement(p,timer);
    return d1+d2;
}



float map(vec3 p, float timer)
{
  return  min(OctaDisplaceTrans(p,0.3,timer),torusDisplaceTrans(p, vec2(0.8,0.01),timer)) ;
}


float trace(vec3 origin, vec3 ray, float timer)
{
    float t = 0.0;
    for (int i = 0; i < 32; i++)
    {
        vec3 p = origin + ray * t;
        float d = map(p,timer);
        t += d*0.5;
    }
    return t;
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
    float t = trace(o, r,timer);
    
    float fog = 1.0 / (1.0 + t * t * 0.1);
	
    vec3 fc = vec3(fog);
    
    // Time varying pixel color
    vec4 col = vec4(fc, 1.0);
    color = col;
}