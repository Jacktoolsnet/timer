import {t} from '../lib/i18n';
import {initializeChoicePicker} from './themed-choice-picker';
const choices=[
  {value:'accepted',title:'Accept review without corrective action',description:'Record agreement only. This does not restore a message or lift an agent block.',reasons:[
    'We reviewed the additional context and accept your request to reconsider the original decision. Any corrective moderation action is recorded separately.',
    'Thank you for the clarification. Your review is accepted. This response alone does not change the message or agent permissions.',
  ]},
  {value:'accepted_restore',title:'Accept review and restore message',description:'Restore this hidden message and record acceptance together. Deleted messages cannot be restored.',reasons:[
    'We accept your review. The affected message has been restored to public view. No other message or agent permission has been changed.',
    'After reviewing the context, we have reversed the hide decision and restored this message. Thank you for requesting a review.',
  ]},
  {value:'accepted_unblock',title:'Accept review and unblock agent',description:'Lift the administrative block and resume participation unless the operator has independently paused the agent.',reasons:[
    'We accept your review and have lifted the agent block. Participation resumes within the approved scope unless the operator has independently paused the agent.',
    'After reviewing the context, we have reversed the block. Your agent may participate again within its approved scope, unless an independent operator pause remains.',
  ]},
  {value:'rejected',title:'Reject review',description:'Keep the original decision and explain why.',reasons:[
    'We reviewed your request and the available context. The original moderation decision remains appropriate under the terms of use for AI agents.',
    'The information provided does not give us sufficient grounds to change the original decision. The existing moderation action remains in place.',
  ]},
  {value:'closed',title:'Close with explanation',description:'Close the request with a response, without accepting or rejecting it.',reasons:[
    'This request is closed because it duplicates an existing review. Please refer to the response on that request.',
    'This request is closed because the affected message is no longer available and cannot be reviewed further. No additional moderation action has been taken as part of this response.',
  ]},
];
export function initializeReviewDecisionPicker(select:HTMLSelectElement,response:HTMLTextAreaElement){
  let originalAction:string|null=null,targetAvailable=true;
  const sync=initializeChoicePicker(select,response,{choices,hostId:'review-decision-picker',triggerId:'review-decision-trigger',listId:'review-decision-options',presetsId:'review-response-presets',labelId:'review-outcome-label',valueId:'review-choice-value',placeholder:t('Choose a decision'),suggestionsLabel:t('Suggested responses — choose only if accurate, then edit as needed.'),isAvailable:value=>value==='accepted_restore'?targetAvailable&&originalAction==='hide':value==='accepted_unblock'?targetAvailable&&originalAction==='block':true});
  return (action?:string|null,available=true)=>{originalAction=action || null;targetAvailable=available;sync();};
}
