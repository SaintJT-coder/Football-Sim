/* Save retention — preserve franchise decisions and all career/contract data.
   Only trims transient AI practice/snap detail not shown in game UI.
   No binary compression or schema migration: old JSON saves remain valid. */
(function(root){
'use strict';
const CONFIG={aiTrainingHistory:3,aiSnapHistory:2,aiEventHistory:2,newsEntries:500};
function trim(arr,maximum){
 if(!Array.isArray(arr)||arr.length<=maximum)return 0;
 const removed=arr.length-maximum;arr.length=maximum;return removed;
}
function compact(s){
 if(!s||!Array.isArray(s.players))return {entriesPruned:0,playersExamined:0};
 let removed=0;
 for(const p of s.players){
   if(p.team===s.team)continue; // Never trim the user's training or snap history.
   removed+=trim(p.development?.trainingHistory,CONFIG.aiTrainingHistory);
   removed+=trim(p.personalityProfile?.snaps?.history,CONFIG.aiSnapHistory);
   removed+=trim(p.personalityProfile?.events,CONFIG.aiEventHistory);
 }
 removed+=trim(s.news,CONFIG.newsEntries);
 return {entriesPruned:removed,playersExamined:s.players.length};
}
root.GMSaveRetention={CONFIG,compact};
root.Gridiron?.register?.('saveRetention',root.GMSaveRetention);
})(window);
