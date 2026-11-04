/* Save retention — preserve franchise decisions and all career/contract data.
   Only trims transient AI practice/snap detail not shown in game UI.
   No binary compression or schema migration: old JSON saves remain valid. */
(function(root){
'use strict';
const CONFIG={aiTrainingHistory:1,aiSnapHistory:0,aiEventHistory:1,newsEntries:250,leagueHeadlines:120};
function trim(arr,maximum){
 if(!Array.isArray(arr)||arr.length<=maximum)return 0;
 const removed=arr.length-maximum;arr.length=maximum;return removed;
}
function trimTail(arr,maximum){
 if(!Array.isArray(arr)||arr.length<=maximum)return 0;
 const removed=arr.length-maximum;arr.splice(0,removed);return removed;
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
 removed+=trim(s.leagueNarratives?.headlines,CONFIG.leagueHeadlines);
 // Game Reports & Media displays only the 12 most recent user games and 8
 // press conferences. Preserve two seasons of readable cards, while dropping
 // unused snapshots embedded in older cards. Player career stats and full
 // franchise yearbooks remain on their original records.
 const media=s.simPresentation;
 if(media&&Array.isArray(media.gameReports)){
   let own=0,other=0;
   const keep=[];
   for(const report of media.gameReports){
     const franchise=report.a===s.team||report.b===s.team;
     if(franchise?++own>20:++other>16){removed++;continue}
     if(Array.isArray(report.leaders)){
       for(const leader of report.leaders){
         if(Object.hasOwn(leader,'stats')){delete leader.stats;removed++}
       }
     }
     if(!franchise||report.year<s.year-1){
       if(Object.hasOwn(report,'originalReport')){delete report.originalReport;removed++}
     }
     keep.push(report);
   }
   media.gameReports=keep;
   removed+=trim(media.pressConferences,30);
   for(const rivalry of Object.values(media.rivalries||{}))
     removed+=trimTail(rivalry?.results,2);
 }
 return {entriesPruned:removed,playersExamined:s.players.length};
}
root.GMSaveRetention={CONFIG,compact};
root.Gridiron?.register?.('saveRetention',root.GMSaveRetention);
})(window);
