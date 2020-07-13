
#version 330 core

// number of lights in the scene
#define NR_LIGHTS 3

// output shader variable
out vec4 colorFrag;

// array with lights incidence directions (calculated in vertex shader, interpolated by rasterization)
in vec3 lightDirs[NR_LIGHTS];
// the transformed normal has been calculated per-vertex in the vertex shader
in vec3 vNormal;
// vector from fragment to camera (in view coordinate)
in vec3 vViewPosition;
// interpolated texture coordinates
in vec2 interp_UV;

// texture repetitions
uniform float repeat;

// texture sampler
uniform sampler2D tex;
uniform sampler2D toonPalette;

// ambient, and specular components (passed from the application)
uniform vec3 ambientColor;
uniform vec3 specularColor;
// weight of the components
// in this case, we can pass separate values from the main application even if Ka+Kd+Ks>1. In more "realistic" situations, I have to set this sum = 1, or at least Kd+Ks = 1, by passing Kd as uniform, and then setting Ks = 1.0-Kd
uniform float Ka;
uniform float Kd;
uniform float Ks;
// attenuation parameters
uniform float constant;
uniform float linear;
uniform float quadratic;
// shininess coefficients (passed from the application)
uniform float shininess;

const int levels = 5;
const float scaleFactor = 1.0 / levels;


void main(){

  // we repeat the UVs and we sample the texture
  vec2 repeated_Uv = mod(interp_UV*repeat, 1.0);
  vec4 surfaceColor = texture(tex, repeated_Uv);



  // ambient component can be calculated at the beginning
  vec4 color = vec4(Ka*ambientColor,1.0);

  // normalization of the per-fragment normal
  vec3 N = normalize(vNormal);
    float lambAcc = 0.0;
    float specAcc = 0.0;
    //for all the lights in the scene
    for(int i = 0; i < NR_LIGHTS; i++)
    {
      // we take the distance from the light source (before normalization, for the attenuation parameter)
      float distanceL = length(lightDirs[i].xyz);
      // normalization of the per-fragment light incidence direction
      vec3 L = normalize(lightDirs[i].xyz);

      // we calculate the attenuation factor (based on the distance from light source)
      float attenuation = 1.0/(constant + linear*distanceL + quadratic*(distanceL*distanceL));

      // Lambert coefficient
      float lambertian = max(dot(L,N), 0.0);

      
      // if the lambert coefficient is positive, then I can calculate the specular component
      if(lambertian > 0.0) {
          // the view vector has been calculated in the vertex shader, already negated to have direction from the mesh to the camera
          vec3 V = normalize( vViewPosition );

          // in the Blinn-Phong model we do not use the reflection vector, but the half vector
          vec3 H = normalize(L + V);

          // we use H to calculate the specular component
          float specAngle = max(dot(H, N), 0.0);
          // shininess application to the specular component
          float specular = pow(specAngle, shininess);

          float surfaceColorToon = Kd * lambertian;

          vec2 UVToon = vec2(1,surfaceColorToon);

          // We add diffusive (= color sampled from texture) and specular components to the final color
          // N.B. ): in this implementation, the sum of the components can be different than 1
         // color += Kd * lambertian * surfaceColor +
         //                 vec4(Ks * specular * specularColor,1.0);
         // color*=attenuation;
         float specMask = (pow(dot(H, N), shininess) > 0.4) ? 1 : 0;

          
         lambAcc += floor(Kd * lambertian * attenuation * levels) * scaleFactor; 
         specAcc += Ks * specular * attenuation * specMask;
      }
    }
    lambAcc = smoothstep(0.2,0.3,lambAcc)*0.35 + smoothstep(0.6,0.7,lambAcc)*0.35 + 0.3;
    specAcc = smoothstep(0.4,0.5,specAcc)*0.4 + 0.2;

    colorFrag  = lambAcc * surfaceColor + vec4(specAcc * specularColor , 1.0) + 0.2 * surfaceColor;
    //colorFrag = vec4(lambAcc, lambAcc, lambAcc, 0);
}
