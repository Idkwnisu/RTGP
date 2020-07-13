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

mat4 rotationAxisAngle( vec3 v, float angle )
{
    float s = sin( angle );
    float c = cos( angle );
    float ic = 1.0 - c;

    return mat4( v.x*v.x*ic + c,     v.y*v.x*ic - s*v.z, v.z*v.x*ic + s*v.y, 0.0,
                 v.x*v.y*ic + s*v.z, v.y*v.y*ic + c,     v.z*v.y*ic - s*v.x, 0.0,
                 v.x*v.z*ic - s*v.y, v.y*v.z*ic + s*v.x, v.z*v.z*ic + c,     0.0,
			     0.0,                0.0,                0.0,                1.0 );
}

mat4 translate( float x, float y, float z )
{
    return mat4( 1.0, 0.0, 0.0, 0.0,
				 0.0, 1.0, 0.0, 0.0,
				 0.0, 0.0, 1.0, 0.0,
				 x,   y,   z,   1.0 );
}


struct Ray {
    vec3 origin;
    vec3 direction;
};

struct Light {
    vec3 color;
    vec3 direction;
};

struct Material {
    vec3 color;
    float diffuse;
    float specular;
};

struct Intersect {
    float len;
    vec3 normal;
    Material material;
};

struct Sphere {
    float radius;
    vec3 position;
    Material material;
};

struct Box {
	vec3 boxSize;
	vec3 position;
	Material material;
};

struct Plane {
    vec3 normal;
	vec3 position;
    Material material;
};

const float epsilon = 1e-3;

const int iterations = 16;

const float exposure = 1e-2;
const float gamma = 2.2;
const float intensity = 100.0;
const vec3 ambient = vec3(0.6, 0.8, 1.0) * intensity / gamma;

const Intersect miss = Intersect(0.0, vec3(0.0), Material(vec3(0.0), 0.0, 0.0));


vec3 rotate(vec3 vector, vec3 rotation)
{
	vec4 vex = vec4(vector,1.0);
	vex = vex * rotationX(rotation.x) * rotationX(rotation.y) * rotationX(rotation.z);
	return vex.xyz;
}

Intersect intersect(Ray ray, Sphere sphere) {
    // Check for a Negative Square Root
    vec3 oc = sphere.position - ray.origin;
    float l = dot(ray.direction, oc);
    float det = pow(l, 2.0) - dot(oc, oc) + pow(sphere.radius, 2.0);
    if (det < 0.0) return miss;

    // Find the Closer of Two Solutions
             float len = l - sqrt(det);
    if (len < 0.0) len = l + sqrt(det);
    if (len < 0.0) return miss;
    return Intersect(len, (ray.origin + len*ray.direction - sphere.position) / sphere.radius, sphere.material);
}
//DA RIFARE CON LE SLAB -> normale?
Intersect intersect( Ray ray,mat4 txx, mat4 txi, Box box ) {
    vec3 origin = (txx*vec4(ray.origin+box.position,1.0)).xyz;
    vec3 direction = (txx*vec4(ray.direction,1.0)).xyz;
    vec3 m = sign(direction)/max(abs(direction), 1e-8);
    vec3 n = m*(origin);
    vec3 k = abs(m)*box.boxSize;
	
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;

	float tN = max( max( t1.x, t1.y ), t1.z );
	float tF = min( min( t2.x, t2.y ), t2.z );
	
	if (tN > tF || tF <= 0.) {
        return miss;
    } else {
            vec3 normal = -sign(direction)*step(t1.yzx,t1.xyz)*step(t1.zxy,t1.xyz);
            normal =  (txi * vec4(normal,1.0)).xyz;
			return Intersect(tN,normal,box.material);
    }
}


Intersect intersect(Ray ray, Plane plane) {
	vec3 origin = ray.origin + plane.position;
    float len = -dot(origin, plane.normal) / dot(ray.direction, plane.normal);
    if (len < 0.0) return miss;
    return Intersect(len, plane.normal, plane.material);
}

Intersect trace(Ray ray) {
    const int num_spheres = 15;
    Sphere spheres[num_spheres];

   // spheres[0] = Sphere(2.0, vec3( 6 * cos(timer*2), 3.0 + sin(timer), 3*cos(timer)), Material(vec3(1.0, 0.8, 0.2), 1.0, 0.001));
   // spheres[1] = Sphere(3.0, vec3( 4.0 + 3*cos(timer), 3.0 + sin(timer), sin(timer*2)*2), Material(vec3(0.3, 0.7, 1.0), 1.0, 0.0));
   // spheres[2] = Sphere(1.0, vec3( 2 * cos(timer), 1.0 + 3*sin(timer), 6.0 -abs(10*sin(timer))),                  Material(vec3(1.0, 1.0, 1.0), 0.5, 0.25));
    for(int i = 0; i < num_spheres; i++)
    {
        spheres[i] = Sphere(0.5, vec3( 5.0 * cos(timer/8 + i)*sin(timer/10 * i), 3.0 + 2*sin(timer/10*i), 6 *cos(timer/13+i)), Material(vec3(fract(i / 0.231), fract(i / 0.145), fract(i / 0.341)), fract(i / 0.431),fract(i / 0.1421)/10));

    }
	float closestIntersectionDistance = 1e10;
    Intersect intersection = miss;
    Intersect plane = intersect(ray, Plane(vec3(0,1, 0), vec3(0,1,0),Material(vec3(1.0, 1.0, 1.0), 1.0, 0.0)));
    if (plane.material.diffuse > 0.0 || plane.material.specular > 0.0) { intersection = plane; closestIntersectionDistance = plane.len;}

    for (int i = 0; i < num_spheres; i++) {
        Intersect sphere = intersect(ray, spheres[i]);
        if (sphere.material.diffuse > 0.0 || sphere.material.specular > 0.0)
		{	
			if(sphere.len < closestIntersectionDistance)
            {
				closestIntersectionDistance = sphere.len;
				intersection = sphere;
			}
		}
    }

    Box box = Box(vec3(1.0,1.0,1.0),vec3(0.0,-3.0,0.0), Material(vec3(0.1,0.1,0.1),0.6,0.9));

    mat4 rot = rotationX(0.0)*rotationY(timer)*rotationZ(0.0);

    mat4 txx = rot;
    mat4 txi = inverse(txx);

    Intersect boxInt = intersect(ray,txx,txi,box);
	if(boxInt.material.diffuse > 0.0 || boxInt.material.specular > 0.0)
	{
		if(boxInt.len < closestIntersectionDistance)
		{
			closestIntersectionDistance = boxInt.len;
			intersection = boxInt;
		}
	}

	// 
	// Intersect boxInt = intersect(ray,box);
	// if(boxInt.material.diffuse > 0.0 || boxInt.material.specular > 0.0)
	// {
	// 	if(boxInt.len < closestIntersectionDistance)
	// 	{
	// 		closestIntersectionDistance = boxInt.len;
	// 		intersection = boxInt;
	// 	}
	// }
    return intersection;
}

vec3 radiance(Ray ray) {
	 Light light = Light(vec3(1.0) * intensity, normalize(
                vec3(-1.0 + 4.0 * cos(timer), 4.75,
                      1.0 + 4.0 * sin(timer))));
    vec3 color = vec3(0.0), fresnel = vec3(0.0);
    vec3 mask = vec3(1.0);
    for (int i = 0; i <= iterations; ++i) {
        Intersect hit = trace(ray);


        if (hit.material.diffuse > 0.0 || hit.material.specular > 0.0) {


            vec3 r0 = hit.material.color.rgb * hit.material.specular;
            float hv = clamp(dot(hit.normal, -ray.direction), 0.0, 1.0);
            fresnel = r0 + (1.0 - r0) * pow(1.0 - hv, 5.0);
            mask *= fresnel;

            if (trace(Ray(ray.origin + hit.len * ray.direction + epsilon * light.direction, light.direction)) == miss) {
                color += clamp(dot(hit.normal, light.direction), 0.0, 1.0) * light.color
                       * hit.material.color.rgb * hit.material.diffuse
                       * (1.0 - fresnel) * mask / fresnel;
            }

            vec3 reflection = reflect(ray.direction, hit.normal);
            ray = Ray(ray.origin + hit.len * ray.direction + epsilon * reflection, reflection);

        } else {

            vec3 spotlight = vec3(1e6) * pow(abs(dot(ray.direction, light.direction)), 250.0);
            color += mask * (ambient + spotlight); break;
        }
    }
    return color;
}


void main()
{    
	float iTime = 0.0;
    vec2 iResolution = vec2(800.0,600.0);
	vec2 uv    = gl_FragCoord.xy / iResolution.xy - vec2(0.5);
         uv.x *= iResolution.x / iResolution.y;

    Ray ray = Ray(vec3(0.0, 2.5, 12.0), normalize(vec3(uv.x, uv.y, -1.0)));
    vec4 fragColor = vec4(pow(radiance(ray) * exposure, vec3(1.0 / gamma)), 1.0);
    color = fragColor;
}