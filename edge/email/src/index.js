// Transactional email boundary. Deploy separately; never expose RESEND_API_KEY to browser code.
// This worker intentionally has no public send endpoint. Only internal service bindings may invoke it.
const ADDRESS = 'info@drjavadrezazadeh.com';
const TYPES = new Set(['registration_verification','password_reset','order_receipt','consultation_notice']);
export default {
  async fetch() {
    return new Response(JSON.stringify({error:'not_found'}), {
      status:404, headers:{'content-type':'application/json','cache-control':'no-store'}
    });
  },
  async sendTransactional(message, env) {
    if (!env.RESEND_API_KEY) throw new Error('email_service_not_configured');
    if (!TYPES.has(message?.type)) throw new Error('unsupported_message_type');
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(message?.to||'')) throw new Error('invalid_recipient');
    if (typeof message.subject !== 'string' || !message.subject.trim() || message.subject.length>180) throw new Error('invalid_subject');
    if (typeof message.text !== 'string' || !message.text.trim() || message.text.length>15000) throw new Error('invalid_body');
    if (!message.idempotencyKey || !/^[a-zA-Z0-9:_-]{8,200}$/.test(message.idempotencyKey)) throw new Error('idempotency_key_required');
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{
        Authorization:'Bearer '+env.RESEND_API_KEY,
        'Content-Type':'application/json',
        'Idempotency-Key':message.idempotencyKey
      },
      body:JSON.stringify({from:ADDRESS,to:[message.to],subject:message.subject,text:message.text})
    });
    if(!response.ok) throw new Error('email_provider_failed_'+response.status);
    const result=await response.json();
    return {id:result.id,status:'accepted'};
  }
};
