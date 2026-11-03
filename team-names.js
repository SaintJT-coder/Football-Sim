/* Team location presets: preserve fictional mascots, stable IDs and divisions. */
(function(){
'use strict';
const originals=TEAMS.map((t,i)=>window.GMRelocation?.originalName(i)||t[1]);
const locations={fictional:null,nfl:["Arizona","Atlanta","Baltimore","Buffalo","Carolina","Chicago","Cincinnati","Cleveland","Dallas","Denver","Detroit","Green Bay","Houston","Indianapolis","Jacksonville","Kansas City","Las Vegas","Los Angeles","Los Angeles","Miami","Minnesota","New England","New Orleans","New York","New York","Philadelphia","Pittsburgh","San Francisco","Seattle","Tampa Bay","Tennessee","Washington"],riverside:["Banning","Beaumont","Blythe","Calimesa","Canyon Lake","Cathedral City","Coachella","Corona","Desert Hot Springs","Eastvale","Hemet","Indian Wells","Indio","Jurupa Valley","La Quinta","Lake Elsinore","Menifee","Moreno Valley","Murrieta","Norco","Palm Desert","Palm Springs","Perris","Rancho Mirage","Riverside","San Jacinto","Temecula","Wildomar","Mead Valley","Rubidoux","Thermal","Winchester"]};
function apply(preset){
 if(!Object.prototype.hasOwnProperty.call(locations,preset))preset='fictional';
 const cities=locations[preset];
 TEAMS.forEach((t,i)=>{const mascot=originals[i].split(' ').slice(-1)[0];t[1]=cities?cities[i]+' '+mascot:originals[i]});
 window.gmTeamNamingPreset=preset;
 if(typeof render==='function'&&document.getElementById('app'))render();
}
window.gmSetTeamNamingPreset=apply;
window.gmTeamNamingChoices=Object.keys(locations);
window.gmTeamPresetName=i=>{
 const preset=window.gmTeamNamingPreset||'fictional',cities=locations[preset],
   mascot=originals[i]?.split(' ').slice(-1)[0];
 return mascot?(cities?.[i]?cities[i]+' '+mascot:originals[i]):null;
};
})();
