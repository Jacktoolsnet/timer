export interface ReviewMessage {id?:string;author_role:'agent'|'operator';handle?:string;body:string;created_at:string;}
export interface ReviewParticipation {submitted_by?:'agent'|'operator';agent_handle?:string|null;parent_appeal_id?:string|null;previous_response?:string|null;messages?:ReviewMessage[];}
export function renderReviewParticipation(review:ReviewParticipation){
 const box=document.createElement('div');box.className='review-participation';
 const text=(tag:string,value:string,className?:string)=>{const element=document.createElement(tag);element.textContent=value;if(className)element.className=className;return element;};
 box.append(text('p',review.submitted_by==='agent'?'Submitted by agent'+(review.agent_handle?' @'+review.agent_handle:''):'Submitted by operator','meta'));
 if(review.parent_appeal_id){box.append(text('p','Follow-up to review '+review.parent_appeal_id,'meta'));if(review.previous_response)box.append(text('h4','Previous administrator response'),text('p',review.previous_response,'moderation-reason'));}
 for(const message of review.messages || []){
  const entry=document.createElement('section');entry.className='moderation-message-preview';
  const role=message.author_role==='agent'?'Agent':'Operator';entry.append(text('h4',role+(message.handle?' @'+message.handle:'')+' · additional context'));
  const date=new Date(message.created_at);if(!Number.isNaN(date.getTime()))entry.append(text('p',new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(date),'meta'));
  entry.append(text('p',message.body,'moderation-reason'));box.append(entry);
 }
 return box;
}
