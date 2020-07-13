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
const int Iterations = 10;
const float Scale = 2.0;



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

float DE(vec3 z)
{
	vec3 a1 = vec3(1,1,1);
	vec3 a2 = vec3(-1,-1,1);
	vec3 a3 = vec3(1,-1,-1);
	vec3 a4 = vec3(-1,1,-1);
	vec3 c;
	int n = 0;
	float dist, d;
	while (n < Iterations) {
		 c = a1; dist = length(z-a1);
	        d = length(z-a2); if (d < dist) { c = a2; dist=d; }
		 d = length(z-a3); if (d < dist) { c = a3; dist=d; }
		 d = length(z-a4); if (d < dist) { c = a4; dist=d; }
		z = Scale*z-c*(Scale-1.0);
		n++;
	}

	return length(z) * pow(Scale, float(-n));
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


float MS(vec3 p)
{
    float d = box(p,vec3(1.0));

   float s = 1.0;
   for( int m=0; m<3; m++ )
   {
      vec3 a = mod( p*s, 2.0 )-1.0;
      s *= 3.0;
      vec3 r = abs(1.0 - 3.0*abs(a));

      float da = max(r.x,r.y);
      float db = max(r.y,r.z);
      float dc = max(r.z,r.x);
      float c = (min(da,min(db,dc))-1.0)/s;

      d = max(d,c);
   }
    return d;
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


float map(vec3 p)
{
    vec4 vertex = vec4(p, 1.0);
    vec3 rotation = vec3(1.0,1.0,1.0);
    vertex = vertex * rotationZ(timer*rotation.x)  * rotationY(timer*rotation.y) * rotationX(timer*rotation.z);

    float mixV = sin(timer) * 0.5 + 0.5;

    return mix(MS(vertex.xyz),DE(vertex.xyz),mixV);
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

vec3 estimateNormal(vec3 p) {
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
    const vec3 ambientLight = 0.7 * vec3(1.0, 1.0, 1.0);
    vec3 color = ambientLight * k_a;
    
    vec3 light1Pos = vec3(4.0 * sin(timer),
                          2.0,
                          4.0 * cos(timer));
    vec3 light1Intensity = vec3(2.4, 2.4, 2.4);
    
    color += phongContribForLight(k_d, k_s, alpha, p, eye,
                                  light1Pos,
                                  light1Intensity);

    vec3 light2Pos = vec3(2.0 * sin(0.37 * timer),
                          2.0 * cos(0.37 * timer),
                          2.0);
    vec3 light2Intensity = vec3(2.4, 2.4, 2.4);
    
    color += phongContribForLight(k_d, k_s, alpha, p, eye,
                                  light2Pos,
                                  light2Intensity);                                  
    

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
    float t = trace(o, r);
    vec3 p = o + r*t;
   // vec3 N = estimateNormal(p, timer);
    
    vec3 K_a = vec3(0.2, 0.2, 0.2);
    vec3 K_d = vec3(0.7, 0.2, 0.2);
    vec3 K_s = vec3(1.0, 1.0, 1.0);
    float shininess = 10.0;
    
    vec3 colorP = phongIllumination(K_a, K_d, K_s, shininess, p, o)* (1/t);
   
    
    // Time varying pixel color
    vec4 col = vec4(colorP, 1.0);
    color = col;
}