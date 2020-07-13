#pragma once

using namespace std;

#include <glad/glad.h>
#include <fstream>
#include "Maths/maths.h"
#include "classical_marching_tables.h"





class Marching{
public:
		int grid_size; //grandezza griglia
		GLuint VBO, VAO, EBO, NBO;
		GLfloat *vertices; //buffer di disegno(forse da moltiplicare per ogni cubo)
		GLfloat *normals; //normal buffer
		int VAOVerticesArraySize; //quanti ha ogni cubo
		GLuint *indices;  //buffer di disegno indici
		int numVertices; //quanti vertici ha il campo scalare
		int numTriangles; //quanti triangoli ha il buffer
		int numCubes; //quanti cubi ci sono nella griglia
		int numFacesDrawn;
		int maxGridSize;
		
		int currentindexTriangles = 0;
		int currentindexCubes = 0;
		
		ofstream myfile;
		
		CUBE_GRID_VERTEX * cvertices; //vertici del campo scalare
		
		CUBE_GRID_CUBE * cubes; //cubi della griglia
		
		Marching(int gridSize)
		{
			maxGridSize = 200;
			numVertices = 36;
			VAOVerticesArraySize = gridSize*gridSize*gridSize;
			CreateMemory();
			//VERTICES
	numVertices=(gridSize+1)*(gridSize+1)*(gridSize+1);
	
	int currentVertex=0;

	for(int i=0; i<gridSize+1; i++)
	{
		for(int j=0; j<gridSize+1; j++)
		{
			for(int k=0; k<gridSize+1; k++)
			{
				cvertices[currentVertex].position.Set((i*20.0f)/(gridSize)-10.0f, (j*20.0f)/(gridSize)-10.0f, (k*20.0f)/(gridSize)-10.0f);
			
				currentVertex++;
			}
		}
	}

	//CUBES
	numCubes=(gridSize)*(gridSize)*(gridSize);

	int currentCube=0;

	for(int i=0; i<gridSize; i++)
	{
		for(int j=0; j<gridSize; j++)
		{
			for(int k=0; k<gridSize; k++)
			{
				cubes[currentCube].vertices[0]=&cvertices[(i*(gridSize+1)+j)*(gridSize+1)+k];
				cubes[currentCube].vertices[1]=&cvertices[(i*(gridSize+1)+j)*(gridSize+1)+k+1];
				cubes[currentCube].vertices[2]=&cvertices[(i*(gridSize+1)+(j+1))*(gridSize+1)+k+1];
				cubes[currentCube].vertices[3]=&cvertices[(i*(gridSize+1)+(j+1))*(gridSize+1)+k];
				cubes[currentCube].vertices[4]=&cvertices[((i+1)*(gridSize+1)+j)*(gridSize+1)+k];
				cubes[currentCube].vertices[5]=&cvertices[((i+1)*(gridSize+1)+j)*(gridSize+1)+k+1];
				cubes[currentCube].vertices[6]=&cvertices[((i+1)*(gridSize+1)+(j+1))*(gridSize+1)+k+1];
				cubes[currentCube].vertices[7]=&cvertices[((i+1)*(gridSize+1)+(j+1))*(gridSize+1)+k];

				currentCube++;
			}
		}
	}
			
		
			
			
		}
		
		void CreateMemory()
		{
			cvertices=new CUBE_GRID_VERTEX[(maxGridSize+1)*(maxGridSize+1)*(maxGridSize+1)];

			cubes=new CUBE_GRID_CUBE[maxGridSize*maxGridSize*maxGridSize];
			
			vertices = (GLfloat*) malloc(sizeof(GLfloat)*VAOVerticesArraySize*12*3);
			normals = (GLfloat*) malloc(sizeof(GLfloat)*VAOVerticesArraySize*12*3);
		    indices = (GLuint*) malloc(sizeof(GLuint)*VAOVerticesArraySize*5*3);
			
			glGenVertexArrays(1, &VAO);
			glGenBuffers(1, &VBO);
			glGenBuffers(1, &EBO);
			glGenBuffers(1, &NBO);
			
		}
		
		
		void DrawSurface(float threshold)
		{
			currentindexTriangles = 0;
			currentindexCubes = 0;
			numFacesDrawn=0;

	static SURFACE_VERTEX edgeVertices[12];
		//loop through cubes
		for(int i=0; i<numCubes; i++)
		{
			//calculate which vertices are inside the surface
			unsigned char cubeIndex=0;
	
			if(cubes[i].vertices[0]->value < threshold)
				cubeIndex |= 1;
			if(cubes[i].vertices[1]->value < threshold)
				cubeIndex |= 2;
			if(cubes[i].vertices[2]->value < threshold)
				cubeIndex |= 4;
			if(cubes[i].vertices[3]->value < threshold)
				cubeIndex |= 8;
			if(cubes[i].vertices[4]->value < threshold)
				cubeIndex |= 16;
			if(cubes[i].vertices[5]->value < threshold)
				cubeIndex |= 32;
			if(cubes[i].vertices[6]->value < threshold)
				cubeIndex |= 64;
			if(cubes[i].vertices[7]->value < threshold)
				cubeIndex |= 128;
	
			//look this value up in the edge table to see which edges to interpolate along
			int usedEdges=edgeTable[cubeIndex];
		
			//if the cube is entirely within/outside surface, no faces			
			if(usedEdges==0 || usedEdges==255)
				continue;

			//update these edges
			for(int currentEdge=0; currentEdge<12; currentEdge++)
			{
				if(usedEdges & 1<<currentEdge)
				{
					CUBE_GRID_VERTEX * v1=cubes[i].vertices[verticesAtEndsOfEdges[currentEdge*2  ]];
					CUBE_GRID_VERTEX * v2=cubes[i].vertices[verticesAtEndsOfEdges[currentEdge*2+1]];
				
					float delta=(threshold - v1->value)/(v2->value - v1->value);
					//edgeVertices[currentEdge].position=v1->position + delta*(v2->position - v1->position);
					edgeVertices[currentEdge].position.x=v1->position.x + delta*(v2->position.x - v1->position.x);
					edgeVertices[currentEdge].position.y=v1->position.y + delta*(v2->position.y - v1->position.y);
					edgeVertices[currentEdge].position.z=v1->position.z + delta*(v2->position.z - v1->position.z);
					//edgeVertices[currentEdge].normal=v1->normal + delta*(v2->normal - v1->normal);
					edgeVertices[currentEdge].normal.x=v1->normal.x + delta*(v2->normal.x - v1->normal.x);
					edgeVertices[currentEdge].normal.y=v1->normal.y + delta*(v2->normal.y - v1->normal.y);
					edgeVertices[currentEdge].normal.z=v1->normal.z + delta*(v2->normal.z - v1->normal.z);
					
				}
			}

			passSurfaceIndex(edgeVertices,triTable[cubeIndex],indicesTable[cubeIndex]);
		 	
			
		}
			DrawVertices();
		}
		
		void Update(float currentFrame)
		{
			
		}
		
		void UpdateIndexesVertices(float currentFrame)
		{
			
			
		}
		
		void passSurfaceIndex(SURFACE_VERTEX vertexes[], const int indicesArray[], int numIndicesToPass)
		{
			for(int i = 0; i < 12; i++)
			{
				vertices[currentindexCubes + 3*i] = vertexes[i].position.x * 0.1f;
				vertices[currentindexCubes + 3*i+1] = vertexes[i].position.y * 0.1f;
				vertices[currentindexCubes + 3*i+2] = vertexes[i].position.z * 0.1f;
				normals[currentindexCubes + 3*i] = vertexes[i].normal.x;
				normals[currentindexCubes + 3*i+1] = vertexes[i].normal.y;
				normals[currentindexCubes + 3*i+2] = vertexes[i].normal.z;
			}
			
			for(int i = 0; i < numIndicesToPass; i++)
			{
				indices[currentindexTriangles + i] = (currentindexCubes/3)+indicesArray[i];
			}
			currentindexTriangles += numIndicesToPass;
			currentindexCubes += 36;
		}
		
		void BindVertices()
		{

			// Bind the Vertex Array Object first, then bind and set vertex buffer(s) and attribute pointer(s).
			glBindVertexArray(VAO);

			glEnableVertexAttribArray(0);
			glBindBuffer(GL_ARRAY_BUFFER, VBO);
			glBufferData(GL_ARRAY_BUFFER, sizeof(vertices)*currentindexCubes, vertices, GL_DYNAMIC_DRAW);

			
			glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
			glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices)*currentindexTriangles, indices, GL_DYNAMIC_DRAW);
			
			glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(GLfloat), (GLvoid*)0);



			glEnableVertexAttribArray(2);
			glBindBuffer(GL_ARRAY_BUFFER, NBO);
			glBufferData(GL_ARRAY_BUFFER, sizeof(normals)*currentindexCubes, normals, GL_DYNAMIC_DRAW);
			
			glVertexAttribPointer(2, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(GLfloat), (GLvoid*)0);
		
			glBindBuffer(GL_ARRAY_BUFFER, 0); // Note that this is allowed, the call to glVertexAttribPointer registered VBO as the currently bound vertex buffer object so afterwards we can safely unbind

			glBindVertexArray(0); // Unbind VAO (it's always a good thing to unbind any buffer/array to prevent strange bugs), remember: do NOT unbind the EBO, keep it bound to this VAO
		}
		
		void Draw()
		{
			glBindVertexArray(VAO);
        //glDrawArrays(GL_TRIANGLES, 0, 6);
			
			glDrawElements(GL_TRIANGLES, currentindexTriangles, GL_UNSIGNED_INT, 0);
			glBindVertexArray(0);
		}
		
		void DrawVertices()
		{
			BindVertices();
		  	Draw();
			//CleanFrame();
		}
		
		void CleanFrame()
		{
			glDeleteVertexArrays(1, &VAO);
			glDeleteBuffers(1, &VBO);
			glDeleteBuffers(1, &EBO);
		}
		
private:

	
};