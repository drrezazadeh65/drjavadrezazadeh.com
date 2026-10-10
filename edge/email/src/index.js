import { WorkerEntrypoint } from 'cloudflare:workers';

// Private service-binding RPC only. No publicly callable email-sending endpoint.
const FROM='info@drjavadrezazadeh.com';
const TYPES=new Set(['registration_verification','password_reset','order_receipt','consultation_notice']);
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY=/^[a-zA-Z0-9:_-]{8,200}$/;

export function validateMessage(message) {
  if (!message || typeof message !== 'object' || !TYPES.has(message.type)) throw new Error('unsupported_message_type');
  if (typeof message.to !== 'string' || message.to.length>254 || !EMAIL.test(message.to)) throw new Error('invalid_recipient');
  if (typeof message.subject !== 'string' || !message.subject.trim() || message.subject.length>180) throw new Error('invalid_subject');
  if (typeof message.text !== 'string' || !message.text.trim() || message.text.length>15000) throw new Error('invalid_body');
  if (typeof message.idempotencyKey !== 'string' || !KEY.test(message.idempotencyKey)) throw new Error('idempotency_key_required');
  return {from:FROM,to:[message.to],subject:message.subject,text:message.text};
}

export default class EmailService extends WorkerEntrypoint {
  async fetch() {
    return new Response(JSON.stringify({error:'not_found'}),{
      status:404,headers:{'content-type':'application/json','cache-control':'no-store'}
    });
  }
  async sendTransactional(message) {
    const payload=validateMessage(message);
    if (!this.env.RESEND_API_KEY) throw new Error('email_service_not_configured');
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{
        Authorization:'Bearer '+this.env.RESEND_API_KEY,
        'Content-Type':'application/json',
        'Idempotency-Key':message.idempotencyKey
      },
      body:JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('email_provider_failed_'+response.status);
    const result=await response.json();
    if (!result?.id) throw new Error('email_provider_invalid_response');
    return {id:result.id,status:'accepted'};
  }
}
