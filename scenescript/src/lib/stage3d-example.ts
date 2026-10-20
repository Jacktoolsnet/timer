/** Original block-style robots and scenery; no Roblox assets or dependencies. */
export const stage3DExample={
 version:'1.0',title:'Zwei Roboter entdecken ihre Bauklotz-Welt',format:'landscape',
 description:'Begleite die Roboter Mika und Bo auf ihrem ersten Ausflug durch eine bunte Bauklotz-Welt. Eine kurze, verspielte 3D-Begegnung für Fans blockiger Roboter und kleiner Animationsgeschichten.',
 firstComment:'Welches Abenteuer sollen Mika und Bo als Nächstes erleben?',hashtags:'#Roboter, #3DAnimation, #Bauklotzwelt',
 characters:{mika:{name:'Mika',bodyColor:'#238dcc',headColor:'#e3f4ff',limbColor:'#416987',accentColor:'#ffd34d',height:3},bo:{name:'Bo',bodyColor:'#f28b32',headColor:'#fff1d0',limbColor:'#875845',accentColor:'#6cf0d0',height:2.7}},
 stages:{plaza:{name:'Bunte Bauklotz-Plaza',skyColor:'#9bd6f4',groundColor:'#83b957',blockColor:'#e9bd77'}},
 scenes:[
 {id:'meet',name:'Treffen auf der Plaza',duration:7,transition:'none',stage3d:{stage:'plaza',camera:{yaw:18,pitch:17,distance:18,orbit:-1.5},actors:[{id:'mika',character:'mika',x:-4,z:0,toX:-1.7,toZ:0,rotation:25,action:'walk',duration:4},{id:'bo',character:'bo',x:2,z:0,rotation:-20,action:'wave',at:1,duration:5}]},elements:[{id:'title3d',type:'text',space:'screen',x:8,y:5,width:84,height:10,fontSize:58,bold:true,color:'#173247',text:'Hallo, Bauklotz-Welt!',animation:'none'}]},
 {id:'hello',name:'Ein gemeinsames Hallo',duration:6,transition:'crossfade',transitionDuration:.6,stage3d:{stage:'plaza',camera:{yaw:-15,pitch:12,distance:12,targetY:1.8,orbit:1},actors:[{id:'mika',character:'mika',x:-1.7,z:0,rotation:0,action:'wave',duration:5},{id:'bo',character:'bo',x:2,z:0,rotation:-15,action:'wave',at:.5,duration:5}]},elements:[{id:'outro3d',type:'text',space:'screen',x:8,y:82,width:84,height:10,fontSize:52,bold:true,color:'#173247',text:'Mika & Bo — bereit fürs nächste Abenteuer!',animation:'none'}]}
 ]
};
