

#version 330 core

// output variable for the fragment shader. Usually, it is the final color of the fragment
out vec4 color;

in vec2 interp_UV;

uniform float timer;
const float EPSILON = 0.0001;
vec3 random3(vec3 c) {
	float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
	vec3 r;
	r.z = fract(512.0*j);
	j *= .125;
	r.x = fract(512.0*j);
	j *= .125;
	r.y = fract(512.0*j);
	return r-0.5;
}

/* skew constants for 3d simplex functions */
const float F3 =  0.3333333;
const float G3 =  0.1666667;

/* 3d simplex noise */
float simplex3d(vec3 p) {
	 /* 1. find current tetrahedron T and it's four vertices */
	 /* s, s+i1, s+i2, s+1.0 - absolute skewed (integer) coordinates of T vertices */
	 /* x, x1, x2, x3 - unskewed coordinates of p relative to each of T vertices*/
	 
	 /* calculate s and x */
	 vec3 s = floor(p + dot(p, vec3(F3)));
	 vec3 x = p - s + dot(s, vec3(G3));
	 
	 /* calculate i1 and i2 */
	 vec3 e = step(vec3(0.0), x - x.yzx);
	 vec3 i1 = e*(1.0 - e.zxy);
	 vec3 i2 = 1.0 - e.zxy*(1.0 - e);
	 	
	 /* x1, x2, x3 */
	 vec3 x1 = x - i1 + G3;
	 vec3 x2 = x - i2 + 2.0*G3;
	 vec3 x3 = x - 1.0 + 3.0*G3;
	 
	 /* 2. find four surflets and store them in d */
	 vec4 w, d;
	 
	 /* calculate surflet weights */
	 w.x = dot(x, x);
	 w.y = dot(x1, x1);
	 w.z = dot(x2, x2);
	 w.w = dot(x3, x3);
	 
	 /* w fades from 0.6 at the center of the surflet to 0.0 at the margin */
	 w = max(0.6 - w, 0.0);
	 
	 /* calculate surflet components */
	 d.x = dot(random3(s), x);
	 d.y = dot(random3(s + i1), x1);
	 d.z = dot(random3(s + i2), x2);
	 d.w = dot(random3(s + 1.0), x3);
	 
	 /* multiply d by w^4 */
	 w *= w;
	 w *= w;
	 d *= w;
	 
	 /* 3. return the sum of the four surflets */
	 return dot(d, vec4(52.0));
}



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


float mapFog(vec3 p,float timer)
{
    float value = sin(timer)*0.5+0.5;

    float rotating = boxRotation(p, vec3(1.4,1.4,1.4),vec3(0.1,0.2,0.8),timer);
    
    return rotating;
}

float mapNormal(vec3 p, float timer)
{
    p = p + vec3(0.0,0.0,-2.0);
    float planet = sphere(p,1.7);
    return planet;
}


vec3 trace(vec3 origin, vec3 ray, float timer)
{
    float t = 0.0;
    float stepSize = 0.02;
    float T = 1.0;
    vec3 color = vec3(0.0,0.0,0.0);
    vec3 pointColor = vec3(1.0,1.0,1.0);
    for (int i = 0; i < 256; i++)
    {
        
        vec3 p = origin + ray * stepSize * i;
        float d = mapFog(p, timer);
        float dSolid = mapNormal(p, timer);

        float density;
        if(dSolid < 0.001)
        {
            density = 1.0;
        }
        else if(d < 0.001)
        {
           density = 0.35 * simplex3d(0.4*(p+vec3(timer)))+0.15;
        }
        else
        {
            density = 0.0;
        }
        float kapa = 1.0;
        float deltaT = exp(-kapa*stepSize*density);
        T *= deltaT;
        if(T < 1e-6)
            break;

        float precomputedTransmittance = 1.0;
        color += (1 - deltaT)/kapa*pointColor*T*precomputedTransmittance;
    }
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
    vec3 c = trace(o, r, timer);
   // vec3 p = o + r*t;
  //  vec3 N = estimateNormal(p, timer);
    
  //  float fog = 1.0 / (1.0 + t * t * 0.1);
	
  //  vec3 fc = vec3(fog);
   
    
    // Time varying pixel color
    vec4 col = vec4(c, 1.0);
    color = col;
}