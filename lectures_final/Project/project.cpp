

#ifdef _WIN32
    #define __USE_MINGW_ANSI_STDIO 0
#endif
#include <string>

#ifdef _WIN32
    #define APIENTRY __stdcall
#endif

#include <glad/glad.h>

#include <glfw/glfw3.h>

#ifdef _WINDOWS_
    #error windows.h was included!
#endif

#include <utils/shader_v1.h>
#include <utils/model_v2.h>
#include <utils/camera.h>

#include <math.h>
#include <utils/marching_cubes.h>
#include <utils/METABALL.h>

#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/matrix_inverse.hpp>
#include <glm/gtc/type_ptr.hpp>

#define STB_IMAGE_IMPLEMENTATION
#include <stb_image/stb_image.h>

// number of lights in the scene
#define NR_LIGHTS 3

const int marching = 0;
const int cel = 1;
const int ray_march = 2;
const int ray_trace = 3;

int current = marching;


// dimensions of application's window
GLuint screenWidth = 800, screenHeight = 600;

// callback functions for keyboard and mouse events
void key_callback(GLFWwindow* window, int key, int scancode, int action, int mode);
void mouse_callback(GLFWwindow* window, double xpos, double ypos);

void apply_camera_movements();

// setup of Shader Programs for the shaders used in the application
void SetupShaders();
// delete Shader Programs whan application ends
void DeleteShaders();
// print on console the name of current shader
void PrintCurrentShader(int shader);

// load image from disk and create an OpenGL texture
GLint LoadTexture(const char* path);

// we initialize an array of booleans for each keybord key
bool keys[1024];

// we set the initial position of mouse cursor in the application window
GLfloat lastX = 400, lastY = 300;
// when rendering the first frame, we do not have a "previous state" for the mouse, so we need to manage this situation
bool firstMouse = true;

// parameters for time calculation (for animations)
GLfloat deltaTime = 0.0f;
GLfloat lastFrame = 0.0f;

// rotation angle on Y axis
GLfloat orientationY = 0.0f;
// rotation speed on Y axis
GLfloat spin_speed = 30.0f;
// boolean to start/stop animated rotation on Y angle
GLboolean spinning = GL_TRUE;

// boolean to activate/deactivate wireframe rendering
GLboolean wireframe = GL_FALSE;

// enum data structure to manage indices for shaders swapping
enum available_ShaderPrograms{ CEL_SHADING, CROSS_HATCH_SHADING};
// strings with shaders names to print the name of the current one on console
const char * print_available_ShaderPrograms[] = { "Cel Shading", "Cross-hatch shading"};

// index of the current shader (= 0 in the beginning)
GLuint current_program = CEL_SHADING;
int current_raymarch = 0;
// a vector for all the Shader Programs used and swapped in the application
vector<Shader> shaders;
vector<Shader> marchingShaders;

// we create a camera. We pass the initial position as a paramenter to the constructor. The last boolean tells that we want a camera "anchored" to the ground
Camera camera(glm::vec3(0.0f, 0.0f, 7.0f), GL_TRUE);

// Uniforms to be passed to shaders
// pointlights positions
glm::vec3 lightPositions[] = {
    glm::vec3(5.0f, 10.0f, 10.0f),
    glm::vec3(-5.0f, 10.0f, 10.0f),
    glm::vec3(5.0f, 10.0f, -10.0f),
};

// specular and ambient components
GLfloat specularColor[] = {1.0,1.0,1.0};
GLfloat ambientColor[] = {0.1,0.1,0.1};
// weights for the diffusive, specular and ambient components
GLfloat Kd = 0.8f;
GLfloat Ks = 0.5f;
GLfloat Ka = 0.1f;
// shininess coefficient for Blinn-Phong shader
GLfloat shininess = 25.0f;

// attenuation parameters for Blinn-Phong shader
GLfloat constant = 1.0f;
GLfloat linear = 0.02f;
GLfloat quadratic = 0.001f;

// roughness index for Cook-Torrance shader
GLfloat alpha = 0.2f;
// Fresnel reflectance at 0 degree (Schlik's approximation)
GLfloat F0 = 0.9f;

// vector for the textures IDs
vector<GLint> textureID;

// UV repetitions
GLfloat repeat = 10.0;

/////////////////// MAIN function ///////////////////////
int main()
{
  // Initialization of OpenGL context using GLFW
  glfwInit();
  // We set OpenGL specifications required for this application
  // In this case: 3.3 Core
  // It is possible to raise the values, in order to use functionalities of OpenGL 4.x
  // If not supported by your graphics HW, the context will not be created and the application will close
  // N.B.) creating GLAD code to load extensions, try to take into account the specifications and any extensions you want to use,
  // in relation also to the values indicated in these GLFW commands
  glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
  glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
  glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
  glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
  // we set if the window is resizable
  glfwWindowHint(GLFW_RESIZABLE, GL_FALSE);

  // we create the application's window
    GLFWwindow* window = glfwCreateWindow(screenWidth, screenHeight, "RTGP Project", nullptr, nullptr);
    if (!window)
    {
        std::cout << "Failed to create GLFW window" << std::endl;
        glfwTerminate();
        return -1;
    }
    glfwMakeContextCurrent(window);

    // we put in relation the window and the callbacks
    glfwSetKeyCallback(window, key_callback);
    glfwSetCursorPosCallback(window, mouse_callback);

    // we disable the mouse cursor
    glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_DISABLED);

    // GLAD tries to load the context set by GLFW
    if (!gladLoadGLLoader((GLADloadproc) glfwGetProcAddress))
    {
        std::cout << "Failed to initialize OpenGL context" << std::endl;
        return -1;
    }


    // we define the viewport dimensions
    int width, height;
    glfwGetFramebufferSize(window, &width, &height);
    glViewport(0, 0, width, height);

	//size of marching cube grid
	int gridSize=60;
	float threshold=1.0f;

	//metaballs 
	const int numMetaballs=3;
	METABALL metaballs[numMetaballs];
	
	Marching marching_cubes(gridSize);
	
	
	//set up metaballs
	for(int i=0; i<numMetaballs; i++)
		metaballs[i].Init(VECTOR3D(0.0f, 0.0f, 0.0f), 5.0f+float(i));

	Shader shaderMarch("00_basic.vert", "00_basic.frag"); //shader for marching cubes
	
	Shader rayTracing("basic.vert", "ray_tracing.frag");

    // we enable Z test
   

    //the "clear" color for the frame buffer
	
   

    // we create the Shader Programs used in the application
    SetupShaders();

    // we create the Shader Program used for the plane (fixed)
    Shader plane_shader("18_phong_tex_multiplelights.vert", "19a_blinnphong_tex_multiplelights.frag");
	Shader pitch_black("pitch_black.vert","pitch_black.frag");
    // we load the model(s) (code of Model class is in include/utils/model_v2.h)
    Model sakuraModel("../../../models/sakura.obj");
    Model planeModel("../../../models/plane.obj");

    // we load the images and store them in a vector
    textureID.push_back(LoadTexture("../../../textures/sakura.jpg"));
    textureID.push_back(LoadTexture("../../../textures/Grass.png"));
	textureID.push_back(LoadTexture("../../../textures/lowHatch.png"));
	textureID.push_back(LoadTexture("../../../textures/midHatch.png"));
	textureID.push_back(LoadTexture("../../../textures/highHatch.png"));


    // we print on console the name of the first shader used
    PrintCurrentShader(current_program);
	//////////////////////////////////////////////////////////////////////////////quad////////////////////////////////////////////////////////////////////////
	
	
	
	GLfloat vertices[] = {
         2.5f,  2.5f, 0.0f,  // Top Right
         2.5f, -2.5f, 0.0f,  // Bottom Right
        -2.5f, -2.5f, 0.0f,  // Bottom Left
        -2.5f,  2.5f, 0.0f   // Top Left
    };
    GLuint indices[] = {  // Note that we start from 0!
        0, 1, 3,  // First Triangle
        1, 2, 3   // Second Triangle
    };
    GLuint VBO, VAO, EBO;
    glGenVertexArrays(1, &VAO);
    glGenBuffers(1, &VBO);
    glGenBuffers(1, &EBO);

    glBindVertexArray(VAO);

    glBindBuffer(GL_ARRAY_BUFFER, VBO);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);

    glEnableVertexAttribArray(0);
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(GLfloat), (GLvoid*)0);

    glBindBuffer(GL_ARRAY_BUFFER, 0); 

    glBindVertexArray(0); 





    // Projection matrix: FOV angle, aspect ratio, near and far planes
    glm::mat4 projection = glm::perspective(45.0f, (float)screenWidth/(float)screenHeight, 0.1f, 10000.0f);

	glm::mat4 view = glm::lookAt(glm::vec3(0.0f, 0.0f, 7.0f), glm::vec3(0.0f, 0.0f, -7.0f), glm::vec3(0.0f, 1.0f, 7.0f));
	
	double lastTime = glfwGetTime();
	int nbFrames = 0;
	
    // Rendering loop
    while(!glfwWindowShouldClose(window))
    {
		
		double currentTime = glfwGetTime();
		
		nbFrames++;
		if( currentTime - lastTime >= 1.0)
		{
			GLfloat count = 1000.0/(float)nbFrames;
			cout << count;
			cout << "ms";
			cout << "\n";
			nbFrames = 0;
			lastTime += 1.0;
		}
		if(current == cel)
		{
			 glEnable(GL_DEPTH_TEST);
	
			glEnable(GL_STENCIL_TEST);
			glStencilFunc(GL_NOTEQUAL, 1, 0xFF);
			glStencilOp(GL_KEEP, GL_KEEP, GL_REPLACE);
		}
		else
		{
			glDisable(GL_DEPTH_TEST);
			glDisable(GL_STENCIL_TEST);
		}
        // we determine the time passed from the beginning
        // and we calculate time difference between current frame rendering and the previous one
        GLfloat currentFrame = glfwGetTime();
        deltaTime = currentFrame - lastFrame;
        lastFrame = currentFrame;

        // Check is an I/O event is happening
        glfwPollEvents();
		if(current == cel)
		{
        // we apply FPS camera movements
        apply_camera_movements();
        // View matrix (=camera): position, view direction, camera "up" vector
        glm::mat4 view = camera.GetViewMatrix();
		
		if(current_program == CEL_SHADING)
			glClearColor(0.0f, 0.843f, 1.0f, 1.0f);
		else
			glClearColor(1.0f,1.0f,1.0f,1.0f);

        // clar color, depth and stencil buffer
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);

        // if animated rotation is activated, than we increment the rotation angle using delta time and the rotation speed parameter
        if (spinning)
            orientationY+=(deltaTime*spin_speed);


		glStencilMask(0x00);
		plane_shader.Use();
        glActiveTexture(GL_TEXTURE1);
        glBindTexture(GL_TEXTURE_2D, textureID[1]);
		

        // we pass projection and view matrices to the Shader Program of the plane
        glUniformMatrix4fv(glGetUniformLocation(plane_shader.Program, "projectionMatrix"), 1, GL_FALSE, glm::value_ptr(projection));
        glUniformMatrix4fv(glGetUniformLocation(plane_shader.Program, "viewMatrix"), 1, GL_FALSE, glm::value_ptr(view));

        // we determine the position in the Shader Program of the uniform variables
        GLint kdLocation = glGetUniformLocation(plane_shader.Program, "Kd");
        GLint textureLocation = glGetUniformLocation(plane_shader.Program, "tex");
		GLint lowHatchLocation = glGetUniformLocation(plane_shader.Program, "lowHatch");
		GLint midHatchLocation = glGetUniformLocation(plane_shader.Program, "midHatch");
		GLint highHatchLocation = glGetUniformLocation(plane_shader.Program, "highHatch");
        GLint repeatLocation = glGetUniformLocation(plane_shader.Program, "repeat");
        GLint matAmbientLocation = glGetUniformLocation(plane_shader.Program, "ambientColor");
        GLint matSpecularLocation = glGetUniformLocation(plane_shader.Program, "specularColor");
        GLint kaLocation = glGetUniformLocation(plane_shader.Program, "Ka");
        GLint ksLocation = glGetUniformLocation(plane_shader.Program, "Ks");
        GLint shineLocation = glGetUniformLocation(plane_shader.Program, "shininess");
        GLint constantLocation = glGetUniformLocation(plane_shader.Program, "constant");
        GLint linearLocation = glGetUniformLocation(plane_shader.Program, "linear");
        GLint quadraticLocation = glGetUniformLocation(plane_shader.Program, "quadratic");

        // we pass each light position to the shader
        for (GLuint i = 0; i < NR_LIGHTS; i++)
        {
            string number = to_string(i);
            glUniform3fv(glGetUniformLocation(plane_shader.Program, ("lights[" + number + "]").c_str()), 1, glm::value_ptr(lightPositions[i]));
        }

        // we assign the value to the uniform variables
        glUniform1f(kdLocation, Kd);
		if(current_program == CEL_SHADING)
			glUniform1i(textureLocation, 1);
		else
			glUniform1i(textureLocation, 2);
        glUniform1f(repeatLocation, 80.0);
        glUniform3fv(matAmbientLocation, 1, ambientColor);
        glUniform3fv(matSpecularLocation, 1, specularColor);
        glUniform1f(kaLocation, Ka);
        glUniform1f(ksLocation, 0.0f);
        glUniform1f(shineLocation, 1.0f);
        glUniform1f(constantLocation, constant);
        glUniform1f(linearLocation, linear);
        glUniform1f(quadraticLocation, quadratic);

        // we create the transformation matrix by defining the Euler's matrices, and the matrix for normals transformation
        glm::mat4 planeModelMatrix;
        glm::mat3 planeNormalMatrix;
        planeModelMatrix = glm::translate(planeModelMatrix, glm::vec3(0.0f, -1.0f, 0.0f));
        planeModelMatrix = glm::scale(planeModelMatrix, glm::vec3(10.0f, 1.0f, 10.0f));
        planeNormalMatrix = glm::inverseTranspose(glm::mat3(view*planeModelMatrix));
        glUniformMatrix4fv(glGetUniformLocation(plane_shader.Program, "modelMatrix"), 1, GL_FALSE, glm::value_ptr(planeModelMatrix));
        glUniformMatrix3fv(glGetUniformLocation(plane_shader.Program, "normalMatrix"), 1, GL_FALSE, glm::value_ptr(planeNormalMatrix));

        // we render the plane
        planeModel.Draw(plane_shader);


        shaders[current_program].Use();
        

        // we determine the position in the Shader Program of the uniform variable
        kdLocation = glGetUniformLocation(shaders[current_program].Program, "Kd");
		if(current_program == CEL_SHADING)
        {	
			glActiveTexture(GL_TEXTURE0);
			glBindTexture(GL_TEXTURE_2D, textureID[0]);
			textureLocation = glGetUniformLocation(shaders[current_program].Program, "tex");
			
			glUniform1i(textureLocation, 0);
			repeatLocation = glGetUniformLocation(shaders[current_program].Program, "repeat");
			glUniform1f(repeatLocation, 1);
	    }
		else
		{	
			glActiveTexture(GL_TEXTURE2);
			glBindTexture(GL_TEXTURE_2D, textureID[2]);
			lowHatchLocation = glGetUniformLocation(shaders[current_program].Program, "lowHatch");
			
			glUniform1i(lowHatchLocation, 2);
			
			glActiveTexture(GL_TEXTURE3);
			glBindTexture(GL_TEXTURE_2D, textureID[3]);
			midHatchLocation = glGetUniformLocation(shaders[current_program].Program, "midHatch");
			
			glUniform1i(midHatchLocation, 3);
			
			glActiveTexture(GL_TEXTURE4);
			glBindTexture(GL_TEXTURE_2D, textureID[4]);
			highHatchLocation = glGetUniformLocation(shaders[current_program].Program, "highHatch");
			
			glUniform1i(highHatchLocation, 4);
			
			repeatLocation = glGetUniformLocation(shaders[current_program].Program, "repeat");
			glUniform1f(repeatLocation, repeat);
		}
		
		

        // we assign the value to the uniform variable
        glUniform1f(kdLocation, Kd);
        

        // we pass each light position to the shader
        for (GLuint i = 0; i < NR_LIGHTS; i++)
        {
            string number = to_string(i);
            glUniform3fv(glGetUniformLocation(shaders[current_program].Program, ("lights[" + number + "]").c_str()), 1, glm::value_ptr(lightPositions[i]));
        }

        // the other uniforms are passed only to the corresponding shader
        if (true)
        {
            // we determine the position in the Shader Program of the uniform variable
            GLint matAmbientLocation = glGetUniformLocation(shaders[current_program].Program, "ambientColor");
            GLint matSpecularLocation = glGetUniformLocation(shaders[current_program].Program, "specularColor");
            GLint kaLocation = glGetUniformLocation(shaders[current_program].Program, "Ka");
            GLint ksLocation = glGetUniformLocation(shaders[current_program].Program, "Ks");
            GLint shineLocation = glGetUniformLocation(shaders[current_program].Program, "shininess");
            GLint constantLocation = glGetUniformLocation(shaders[current_program].Program, "constant");
            GLint linearLocation = glGetUniformLocation(shaders[current_program].Program, "linear");
            GLint quadraticLocation = glGetUniformLocation(shaders[current_program].Program, "quadratic");

            // we assign the value to the uniform variable
            glUniform3fv(matAmbientLocation, 1, ambientColor);
            glUniform3fv(matSpecularLocation, 1, specularColor);
            glUniform1f(kaLocation, Ka);
            glUniform1f(ksLocation, Ks);
            glUniform1f(shineLocation, shininess);
            glUniform1f(constantLocation, constant);
            glUniform1f(linearLocation, linear);
            glUniform1f(quadraticLocation, quadratic);

        }


        // we pass projection and view matrices to the Shader Program
        glUniformMatrix4fv(glGetUniformLocation(shaders[current_program].Program, "projectionMatrix"), 1, GL_FALSE, glm::value_ptr(projection));
        glUniformMatrix4fv(glGetUniformLocation(shaders[current_program].Program, "viewMatrix"), 1, GL_FALSE, glm::value_ptr(view));
		
		
		glStencilFunc(GL_ALWAYS, 1, 0xFF);
        glStencilMask(0xFF);
        glm::mat4 sakuraModelMatrix;
        glm::mat3 sakuraNormalMatrix;
        sakuraModelMatrix = glm::translate(sakuraModelMatrix, glm::vec3(-3.0f, 6.0f, 0.0f));
        sakuraModelMatrix = glm::rotate(sakuraModelMatrix, glm::radians(orientationY), glm::vec3(0.0f, 1.0f, 0.0f));
        sakuraModelMatrix = glm::scale(sakuraModelMatrix, glm::vec3(0.3f, 0.3f, 0.3f));
        // if we cast a mat4 to a mat3, we are automatically considering the upper left 3x3 submatrix
        sakuraNormalMatrix = glm::inverseTranspose(glm::mat3(view*sakuraModelMatrix));
        glUniformMatrix4fv(glGetUniformLocation(shaders[current_program].Program, "modelMatrix"), 1, GL_FALSE, glm::value_ptr(sakuraModelMatrix));
        glUniformMatrix3fv(glGetUniformLocation(shaders[current_program].Program, "normalMatrix"), 1, GL_FALSE, glm::value_ptr(sakuraNormalMatrix));

        // we render the sphere
        sakuraModel.Draw(shaders[current_program]);
		if (current_program == CEL_SHADING)
        {
		glStencilFunc(GL_NOTEQUAL, 1, 0xFF);//il test che esegui - ovvero disegna tutto ciò che è diverso dallo 0xFF del buffer, quindi tutto quello "nuovo" rispetto al modello normale
        glStencilMask(0x00);//cosa scrivi nel buffer - nulla 
		pitch_black.Use();
		glUniformMatrix4fv(glGetUniformLocation(pitch_black.Program, "projectionMatrix"), 1, GL_FALSE, glm::value_ptr(projection));
        glUniformMatrix4fv(glGetUniformLocation(pitch_black.Program, "viewMatrix"), 1, GL_FALSE, glm::value_ptr(view));

		
		glDisable(GL_DEPTH_TEST);
		sakuraModelMatrix = glm::scale(sakuraModelMatrix, glm::vec3(1.12f, 1.01f, 1.12f));
		sakuraNormalMatrix = glm::inverseTranspose(glm::mat3(view*sakuraModelMatrix));
		glUniformMatrix4fv(glGetUniformLocation(pitch_black.Program, "modelMatrix"), 1, GL_FALSE, glm::value_ptr(sakuraModelMatrix));
        glUniformMatrix3fv(glGetUniformLocation(pitch_black.Program, "normalMatrix"), 1, GL_FALSE, glm::value_ptr(sakuraNormalMatrix));
		sakuraModel.Draw(pitch_black);
		
		
		glStencilMask(0xFF);
		glEnable(GL_DEPTH_TEST);
		}
       
		}
		else if(current == marching)
		{
			//update balls' position
		float c = 2.0f*(float)cos(currentFrame*200/600);
		
	  
		metaballs[0].position.x=-4.0f*(float)cos(currentFrame*200/700) - c;
	 	metaballs[0].position.y=4.0f*(float)sin(currentFrame*200/600) - c;

	 	metaballs[1].position.x=5.0f*(float)sin(currentFrame*200/400) + c;
	 	metaballs[1].position.y=5.0f*(float)cos(currentFrame*200/400) - c;

	 	metaballs[2].position.x=-5.0f*(float)cos(currentFrame*200/400) - 0.2f*(float)sin(currentFrame*200/600);
	 	metaballs[2].position.y=5.0f*(float)sin(currentFrame*200/500) - 0.2f*(float)sin(currentFrame*200/400);
			
		
	//clear the field
		for(int i=0; i<marching_cubes.numVertices; i++)
		{
			marching_cubes.cvertices[i].value=0.0f;
			marching_cubes.cvertices[i].normal.LoadZero();
		}
		
		//evaluate the scalar field at each point
	VECTOR3D ballToPoint;
	float squaredRadius;
	VECTOR3D ballPosition;
	float normalScale;
	for(int i=0; i<numMetaballs; i++)
	{ 	
		squaredRadius=metaballs[i].squaredRadius;
		ballPosition=metaballs[i].position;

		for(int j=0; j<marching_cubes.numVertices; j++)
		{
			
			ballToPoint.x=marching_cubes.cvertices[j].position.x-ballPosition.x;
			ballToPoint.y=marching_cubes.cvertices[j].position.y-ballPosition.y;
			ballToPoint.z=marching_cubes.cvertices[j].position.z-ballPosition.z;
			
			//get squared distance from ball to point
			float squaredDistance=	ballToPoint.x*ballToPoint.x +
									ballToPoint.y*ballToPoint.y +
									ballToPoint.z*ballToPoint.z;
			if(squaredDistance==0.0f)
				squaredDistance=0.0001f;
			
			marching_cubes.cvertices[j].value+=squaredRadius/squaredDistance;

			
			normalScale=squaredRadius/(squaredDistance*squaredDistance);
			
			marching_cubes.cvertices[j].normal.x+=ballToPoint.x*normalScale;
			marching_cubes.cvertices[j].normal.y+=ballToPoint.y*normalScale;
			marching_cubes.cvertices[j].normal.z+=ballToPoint.z*normalScale;
		}
	}
		
        // Render
        // Clear the colorbuffer
        glClearColor(0.2f, 0.3f, 0.3f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

		shaderMarch.Use();

        glUseProgram(shaderMarch.Program);
        
		marching_cubes.DrawSurface(threshold);
		}
		else if(current == ray_trace || current == ray_march)
		{
			Shader toUse = Shader("basic.vert","00_basic.frag");
			if(current == ray_trace)
			{
				toUse = rayTracing;
			}
			else
			{
				toUse = marchingShaders[current_raymarch];
			}
			toUse.Use();
			
			 glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

        // we pass the matrices as uniform variables to the shaders
        glUniformMatrix4fv(glGetUniformLocation(toUse.Program, "projectionMatrix"), 1, GL_FALSE, glm::value_ptr(projection));
        glUniformMatrix4fv(glGetUniformLocation(toUse.Program, "viewMatrix"), 1, GL_FALSE, glm::value_ptr(view));


         glm::mat4 matrixTracing; //needed for raytracing
         matrixTracing = glm::translate(matrixTracing, glm::vec3(0.0f, 0.0f, 0.0f));
         matrixTracing = glm::scale(matrixTracing, glm::vec3(2.3f, 2.3f, 2.3f));	// It's a bit too big for our scene, so scale it down

         glUniformMatrix4fv(glGetUniformLocation(toUse.Program, "modelMatrix"), 1, GL_FALSE, glm::value_ptr(matrixTracing));
		
            GLint timerLocation = glGetUniformLocation(toUse.Program, "timer");

            glUniform1f(timerLocation, currentFrame);
		

        glBindVertexArray(VAO);
        glDrawArrays(GL_TRIANGLES, 0, 6);
        glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);
        glBindVertexArray(0);


		}
		 glfwSwapBuffers(window);
    }


	marching_cubes.CleanFrame();
    DeleteShaders();
    
    glfwTerminate();
    return 0;
}


//////////////////////////////////////////
// we create and compile shaders (code of Shader class is in include/utils/shader_v1.h), and we add them to the list of available shaders
void SetupShaders()
{
    Shader shader1("nrr.vert", "cel_shading.frag");
    shaders.push_back(shader1);
    Shader shader2("nrr.vert", "cross_hatch_shading.frag");
    shaders.push_back(shader2);
	
	Shader raymarch1("00_basic.vert","morph.frag");
	marchingShaders.push_back(raymarch1);
	
	Shader raymarch2("00_basic.vert","Fog_Cube.frag");
	marchingShaders.push_back(raymarch2);
	
	Shader raymarch3("00_basic.vert","SimpleRaymarchingVolumetricLight.frag");
	marchingShaders.push_back(raymarch3);
	
	Shader raymarch4("00_basic.vert","infinite_grid.frag");
	marchingShaders.push_back(raymarch4);
	
	Shader raymarch5("00_basic.vert","Modifiers.frag");
	marchingShaders.push_back(raymarch5);
	
	Shader raymarch6("00_basic.vert","morph_Fractals.frag");
	marchingShaders.push_back(raymarch6);
	
}


GLint LoadTexture(const char* path)
{
    GLuint textureImage;
    int w, h, channels;
    unsigned char* image;
    image = stbi_load(path, &w, &h, &channels, STBI_rgb);

    if (image == nullptr)
        std::cout << "Failed to load texture!" << std::endl;

    glGenTextures(1, &textureImage);
    glBindTexture(GL_TEXTURE_2D, textureImage);
    // 3 channels = RGB ; 4 channel = RGBA
    if (channels==3)
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, w, h, 0, GL_RGB, GL_UNSIGNED_BYTE, image);
    else if (channels==4)
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, image);
    glGenerateMipmap(GL_TEXTURE_2D);
	
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
	
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST_MIPMAP_NEAREST);

    // we free the memory once we have created an OpenGL texture
    stbi_image_free(image);

    return textureImage;

}

/////////////////////////////////////////
// delete all the Shaders Programs
void DeleteShaders()
{
    for(GLuint i = 0; i < shaders.size(); i++)
        shaders[i].Delete();
	for(GLuint i = 0; i < marchingShaders.size(); i++)
        marchingShaders[i].Delete();
}

//////////////////////////////////////////
// print on console the name of the currently used shader
void PrintCurrentShader(int shader)
{
    std::cout << "Current shader:" << print_available_ShaderPrograms[shader]  << std::endl;

}

//////////////////////////////////////////
// callback for keyboard events
void key_callback(GLFWwindow* window, int key, int scancode, int action, int mode)
{
    // if ESC is pressed, we close the application
    if(key == GLFW_KEY_ESCAPE && action == GLFW_PRESS)
        glfwSetWindowShouldClose(window, GL_TRUE);

    // if P is pressed, we start/stop the animated rotation of models
    if(key == GLFW_KEY_P && action == GLFW_PRESS)
        spinning=!spinning;
		
	if(key == GLFW_KEY_N && action == GLFW_PRESS)
        current = ray_march;
	if(key == GLFW_KEY_M && action == GLFW_PRESS)
        current = marching;
	if(key == GLFW_KEY_C && action == GLFW_PRESS)
		current = cel;
	if(key == GLFW_KEY_T && action == GLFW_PRESS)
		current = ray_trace;
		
	cout << "\n Changed \n";
		

    // pressing a key between 1 and 2, we change the shader applied to the models
    if((key >= GLFW_KEY_1 && key <= GLFW_KEY_2) && action == GLFW_PRESS)
    {
        current_program = (key-'0'-1);
        PrintCurrentShader(current_program);
    }
	
	if(current == ray_march)
	{
		if(keys[GLFW_KEY_A])
        {
			current_raymarch = (current_raymarch+1)%((int)marchingShaders.size());
			
		}
		if(keys[GLFW_KEY_D])
        {
			current_raymarch--;
			if(current_raymarch < 0)
			{
				current_raymarch = (int)marchingShaders.size() - 1;
				
			}
		
		}
	}

    if(action == GLFW_PRESS)
        keys[key] = true;
    else if(action == GLFW_RELEASE)
        keys[key] = false;
}

//////////////////////////////////////////
// If one of the WASD keys is pressed, the camera is moved accordingly (the code is in utils/camera.h)
void apply_camera_movements()
{
    if(keys[GLFW_KEY_W])
        camera.ProcessKeyboard(FORWARD, deltaTime);
    if(keys[GLFW_KEY_S])
        camera.ProcessKeyboard(BACKWARD, deltaTime);
    if(keys[GLFW_KEY_A])
        camera.ProcessKeyboard(LEFT, deltaTime);
    if(keys[GLFW_KEY_D])
        camera.ProcessKeyboard(RIGHT, deltaTime);
}

//////////////////////////////////////////
// callback for mouse events
void mouse_callback(GLFWwindow* window, double xpos, double ypos)
{
      // we move the camera view following the mouse cursor
      // we calculate the offset of the mouse cursor from the position in the last frame
      // when rendering the first frame, we do not have a "previous state" for the mouse, so we set the previous state equal to the initial values (thus, the offset will be = 0)
      if(firstMouse)
      {
          lastX = xpos;
          lastY = ypos;
          firstMouse = false;
      }

      // offset of mouse cursor position
      GLfloat xoffset = xpos - lastX;
      GLfloat yoffset = lastY - ypos;

      // the new position will be the previous one for the next frame
      lastX = xpos;
      lastY = ypos;

      // we pass the offset to the Camera class instance in order to update the rendering
      camera.ProcessMouseMovement(xoffset, yoffset);

}
