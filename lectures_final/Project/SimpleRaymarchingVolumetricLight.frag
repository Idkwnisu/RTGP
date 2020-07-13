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

float lightValue(vec3 pos, vec3 lightpos)
{
	float lightIntensity = 1;

	float kL = 1.3;

	float dist = distance(pos, lightpos);

	return lightIntensity * kL / dist;
}


float map(vec3 p)
{
    float planet = sphere(p,1.1);
    return planet;
}


bool traceToLight(vec3 origin, vec3 lightPosition)
{
	vec3 ray = normalize(lightPosition - origin);
    float t = 0.0;
	float stepSize = distance(origin, lightPosition)/16;
    for (int i = 0; i < 16; i++)
    {
        vec3 p = origin + ray * t;
		float lightDistance = distance(p, lightPosition);
		if(lightDistance < 0.01)
			return true;
        float d = map(p);
		if(d < 0.001)
			return false;
        t += stepSize;
    }
    return true;
}

vec3 traceLight(vec3 origin, vec3 ray, float timer)
{
	vec3 lightPosition = vec3(2.5*sin(timer),2.5*cos(timer),0.0);
    float t = 0.0;
    float stepSize = 0.1;
    float T = 1.0;
    vec3 color = vec3(0.0,0.0,0.0);
    vec3 pointColor = vec3(1.0,1.0,1.0);

	float lightAcc = 0;
    for (int i = 0; i < 64; i++)
    {
        
        vec3 p = origin + ray * stepSize * i;
		bool canSeeLight = traceToLight(p, lightPosition);
		if(canSeeLight)
        	lightAcc += lightValue(p, lightPosition);
    }
	lightAcc /= 64;
    return vec3(lightAcc);
}

float trace(vec3 origin, vec3 ray)
{
    float t = 0.0;
    for (int i = 0; i < 32; i++)
    {
        vec3 p = origin + ray * t;
        float d = map(p);
        t += d*0.5;
    }
    return t;
}

vec3 estimateNormal(vec3 p)
{
    return normalize(vec3(
        map(vec3(p.x + EPSILON, p.y, p.z)) - map(vec3(p.x - EPSILON, p.y, p.z)),
        map(vec3(p.x, p.y + EPSILON, p.z)) - map(vec3(p.x, p.y - EPSILON, p.z)),
        map(vec3(p.x, p.y, p.z  + EPSILON)) - map(vec3(p.x, p.y, p.z - EPSILON))
    ));
}


vec3 phongContribForLight(vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye,
                          vec3 lightPos, vec3 lightIntensity) {
    vec3 N = estimateNormal(p);
    vec3 L = normalize(lightPos - p);
    vec3 V = normalize(eye - p);
    vec3 R = normalize(reflect(-L, N));
    
    float dotLN = dot(L, N);
    float dotRV = dot(R, V);
    
    if (dotLN < 0.0) {
        // Light not visible from this point on the surface
        return vec3(0.0, 0.0, 0.0);
    } 
    
    if (dotRV < 0.0) {
        // Light reflection in opposite direction as viewer, apply only diffuse
        // component
        return lightIntensity * (k_d * dotLN);
    }
    return lightIntensity * (k_d * dotLN + k_s * pow(dotRV, alpha));
}

vec3 phongIllumination(vec3 k_a, vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye) {
    const vec3 ambientLight = 0.5 * vec3(1.0, 1.0, 1.0);
    vec3 color = ambientLight * k_a;
    
    vec3 light1Pos = vec3(sin(timer),cos(timer),-1.5);
    vec3 light1Intensity = vec3(0.4, 0.4, 0.4);
    
    color += phongContribForLight(k_d, k_s, alpha, p, eye,
                                  light1Pos,
                                  light1Intensity);
    

    return color;
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
    vec3 c = traceLight(o, r, timer);
	float t = trace(o,r);
   // vec3 p = o + r*t;
  //  vec3 N = estimateNormal(p, timer);


   // The closest point on the surface to the eyepoint along the view ray
    vec3 p = o + t * r;
    
    vec3 K_a = vec3(0.2, 0.2, 0.2);
    vec3 K_d = vec3(0.2, 0.2, 0.2);
    vec3 K_s = vec3(1.0, 1.0, 1.0);
    float shininess = 10.0;
	vec3 colorP;
    float fog = 1.0 / (1.0 + t * t * 0.1);


    if(fog > 0.01)
	{
		colorP = phongIllumination(K_a, K_d, K_s, shininess, p, o);
	}
	else
	{
		colorP = vec3(0.0);
	}
    
    
    
    
    // Time varying pixel color
    vec4 col = vec4(c+colorP, 1.0);
    color = col;
}