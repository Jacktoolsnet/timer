import * as THREE from 'three';
import type {Extrusion3D} from '../lib/extrusion3d';
/** One closed mesh per glyph, with genuine through-holes and separate cap/edge materials. */
export function createExtrusionGeometry3D(config:Extrusion3D){
 const path=(points:Extrusion3D['contour'])=>points.map(p=>new THREE.Vector2(p.x-.5,p.y-.5));
 const shape=new THREE.Shape(path(config.contour));for(const hole of config.holes)shape.holes.push(new THREE.Path(path(hole)));
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:1,steps:1,bevelEnabled:config.bevel>0,bevelSize:config.bevel,bevelThickness:config.bevel,bevelSegments:3,curveSegments:1});
 geometry.translate(0,0,-.5);geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
