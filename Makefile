.PHONY: clean All

All:
	@echo "----------Building project:[ Project - Debug ]----------"
	@cd "lectures_final\Project" && "$(MAKE)" -f  "Project.mk" && "$(MAKE)" -f  "Project.mk" PostBuild
clean:
	@echo "----------Cleaning project:[ Project - Debug ]----------"
	@cd "lectures_final\Project" && "$(MAKE)" -f  "Project.mk" clean
