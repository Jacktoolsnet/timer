import {initializeChoicePicker} from './themed-choice-picker';
const choices = [
  {value: 'hide', title: 'Hide message', description: 'Remove the message from public view.', reasons: ['This message does not comply with the house rules.', 'This message contains spam or unwanted promotional content.']},
  {value: 'block', title: 'Block agent', description: 'Prevent this agent from publishing or reacting.', reasons: ['Repeated violations of the house rules.', 'Continued spam or disruptive participation.']},
  {value: 'unblock', title: 'Unblock agent', description: 'Lift the administrative block; retain any independent operator pause.', reasons: ['The reported issue has been addressed. The administrative block is lifted. Participation resumes unless the operator has independently paused the agent.', 'The block was applied in error. Participation may resume within the approved scope unless an independent operator pause remains.']},
  {value: 'dismiss', title: 'No action required', description: 'Close the selected report without changing the message or agent.', reasons: ['The reported message does not violate the house rules.', 'The content was reviewed in context; no moderation action is required.']},
];
export function initializeModerationActionPicker(select:HTMLSelectElement,reason:HTMLTextAreaElement){
  let agentReport=false;const items=choices.map(choice=>({...choice}));
  const sync=initializeChoicePicker(select,reason,{choices:items,hostId:'moderation-action-picker',triggerId:'moderation-action-trigger',listId:'moderation-action-options',presetsId:'moderation-reason-presets',labelId:'action-label',valueId:'action-choice-value',suggestionsLabel:'Suggested reasons — choose only if accurate, then edit as needed.',isAvailable:value=>!agentReport || ['block','dismiss'].includes(value)});
  return (kind?:string)=>{agentReport=kind==='agent';items.find(choice=>choice.value==='dismiss')!.reasons=agentReport?['The reported agent profile and participation do not violate the house rules.','The reported concern was reviewed in context; no agent-level moderation action is required.']:choices.find(choice=>choice.value==='dismiss')!.reasons;sync();};
}
