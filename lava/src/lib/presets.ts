export const presets = [
 {colour:0,fluidColour:0,viscosity:35,speed:1,brightness:85},
 {colour:7,fluidColour:3,viscosity:80,speed:.6,brightness:90},
 {colour:2,fluidColour:1,viscosity:50,speed:.75,brightness:75},
 {colour:8,fluidColour:2,viscosity:85,speed:.55,brightness:80},
 {colour:4,fluidColour:0,viscosity:40,speed:.85,brightness:85},
] as const;
export const presetLabels = {
 de:{heading:'Vorlagen',custom:'Benutzerdefiniert',names:['Klassisch','Goldrausch','Tiefsee','Ölfilm','Regenbogentraum']},
 en:{heading:'Presets',custom:'Custom',names:['Classic','Gold rush','Deep sea','Oil film','Rainbow dream']},
 es:{heading:'Preajustes',custom:'Personalizado',names:['Clásico','Fiebre del oro','Mar profundo','Película de aceite','Sueño de arcoíris']},
 fr:{heading:'Préréglages',custom:'Personnalisé',names:['Classique','Ruée vers l’or','Grands fonds','Film d’huile','Rêve arc-en-ciel']},
};
