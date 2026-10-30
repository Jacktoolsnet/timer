import {lightCollectorStoryboard} from './light-collector-storyboard.ts';
import {demoProject,newScene,type Project} from './model.ts';
import {defaultStage2D} from './stage2d.ts';
/** The shipped default is an ordinary editable, serializable SceneScript project. */
export function lightCollectorProject():Project{
 const project=demoProject(),scene=newScene('light-collector');
 scene.name='Der kleine Lichtsammler';scene.duration=16;scene.transition='none';scene.background='#123c37';scene.stage2d=defaultStage2D();
 return {...project,storyboard:lightCollectorStoryboard(),title:'Der kleine Lichtsammler',description:'Ein kleiner Roboter entdeckt einen Funken. Eine 2D-Puppenanimation mit Gestik, Sprung und einem leuchtenden Nachtgarten.',scenes:[scene]};
}
